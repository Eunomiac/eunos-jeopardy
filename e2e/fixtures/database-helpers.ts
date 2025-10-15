import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TEST_USERS } from './test-users';
import type { Database, GameStatus } from '../../src/services/supabase/types';

// Re-export Tables type for convenience
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];

/**
 * Database Helper Functions for E2E Tests
 *
 * These utilities manage test data in Supabase to ensure tests start from a clean state.
 * They run before tests to clean up any leftover data from previous runs or manual testing.
 *
 * LEARNING NOTE: This is a common pattern in E2E testing - ensuring a known starting state.
 * Without cleanup, tests become "flaky" (sometimes pass, sometimes fail) because they
 * depend on what data happens to be in the database.
 */

/**
 * Create Supabase client for test operations
 *
 * Uses the same credentials as the application, but for administrative tasks.
 *
 * LEARNING NOTE: We use environment variables so tests work in both:
 * - Local development (reads from .env.local file)
 * - CI (reads from GitHub Secrets)
 *
 * This is a function (not a constant) because environment variables are loaded
 * in global-setup.ts, which runs before this file is imported.
 */
function getSupabaseClient(): SupabaseClient<Database> {
  if (!process.env["VITE_SUPABASE_URL"] || !process.env["VITE_SUPABASE_ANON_KEY"]) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient<Database>(
    process.env["VITE_SUPABASE_URL"],
    process.env["VITE_SUPABASE_ANON_KEY"]
  );
}

/**
 * Clean up all test data before running tests
 *
 * This function ensures tests start from a clean slate by:
 * 1. Ending any active games for test users
 * 2. Removing test players from games
 * 3. Clearing any other test-related data
 *
 * LEARNING NOTE: This runs ONCE before all tests (global setup), not before each test.
 * This is faster and simpler than cleaning up before every individual test.
 *
 * @returns Promise that resolves when cleanup is complete
 */
export async function cleanupAllTestData(): Promise<void> {
  console.log('🧹 Cleaning up test data...');

  try {
    const supabase = getSupabaseClient();

    // Get all test user IDs
    const testUserIds = Object.values(TEST_USERS)
      .map((user) => user.id);

    if (testUserIds.length === 0) {
      console.warn('⚠️  No test user IDs configured. Skipping cleanup.');
      console.warn('   Update e2e/fixtures/test-users.ts with actual Supabase user IDs.');
      return;
    }

    // 1. Cancel any active games hosted by test users
    const { error: gamesError } = await supabase
      .from('games')
      .update({ status: 'cancelled' })
      .in('host_id', testUserIds)
      .in('status', ['lobby', 'game_intro', 'introducing_categories', 'in_progress', 'round_transition']);

    if (gamesError) {
      console.error('❌ Error cancelling test games:', gamesError);
      throw gamesError;
    }

    // 2. Remove test users from any games they joined as players
    const { error: playersError } = await supabase
      .from('players')
      .delete()
      .in('user_id', testUserIds);

    if (playersError) {
      console.error('❌ Error removing test players:', playersError);
      throw playersError;
    }

    // 3. Clean up any other test data as needed
    // Add more cleanup operations here as your app grows
    // Examples:
    // - Delete test clue sets
    // - Clear test game reports
    // - Remove test buzzer entries

    console.log('✅ Test data cleaned successfully');
  } catch (error) {
    console.error('❌ Failed to clean up test data:', error);
    throw error; // Fail fast - don't run tests with dirty data
  }
}

/**
 * Clean up data for a specific test user
 *
 * Use this if you need to clean up during a test (rare).
 * Most of the time, global cleanup is sufficient.
 *
 * @param userId - The UUID of the test user to clean up
 */
export async function cleanupTestUser(userId: string): Promise<void> {
  if (!userId) {
    console.warn('⚠️  No user ID provided to cleanupTestUser');
    return;
  }

  const supabase = getSupabaseClient();

  // Cancel any active games for this user
  await supabase
    .from('games')
    .update({ status: 'cancelled' })
    .eq('host_id', userId)
    .in('status', ['lobby', 'game_intro', 'introducing_categories', 'in_progress', 'round_transition']);

  // Remove this user from any games as a player
  await supabase
    .from('players')
    .delete()
    .eq('user_id', userId);
}

/**
 * Verify test users exist in Supabase
 *
 * Checks that all test users are properly configured.
 * Useful for debugging test setup issues.
 *
 * @returns Object with verification results
 */
export function verifyTestUsers(): {
  configured: number;
  total: number;
  missing: string[];
} {
  const allUsers = Object.entries(TEST_USERS);

  // All test users should have valid UUIDs (non-empty strings)
  const configured = allUsers.filter(([, user]) => user.id.length > 0);
  const missing = allUsers
    .filter(([, user]) => user.id.length === 0)
    .map(([key]) => key);

  return {
    configured: configured.length,
    total: allUsers.length,
    missing,
  };
}

// ============================================================
// Game State Query Helpers
// ============================================================

/**
 * Get the current game for a host user
 *
 * @param hostId - The UUID of the host user
 * @returns The active game or null if none exists
 */
export async function getHostGame(hostId: string): Promise<Tables<'games'> | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('host_id', hostId)
    .in('status', ['lobby', 'game_intro', 'introducing_categories', 'in_progress', 'round_transition'])
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - this is expected when no active game exists
      return null;
    }
    console.error('Error fetching host game:', error);
    throw error;
  }

  return data;
}

/**
 * Get all clues for a game with their states
 *
 * @param gameId - The UUID of the game
 * @returns Array of clues with their state information
 */
export async function getGameClues(gameId: string): Promise<Array<Tables<'clues'> & { state?: Tables<'clue_states'> }>> {
  const supabase = getSupabaseClient();

  // First get the game to find the clue set
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('clue_set_id')
    .eq('id', gameId)
    .single();

  if (gameError) {
    console.error('Error fetching game:', gameError);
    throw gameError;
  }

  if (!game.clue_set_id) {
    return [];
  }

  // Get all categories for this clue set
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id')
    .eq('clue_set_id', game.clue_set_id);

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
    throw categoriesError;
  }

  const categoryIds = categories.map((cat) => cat.id);

  // Get all clues for these categories
  const { data: clues, error: cluesError } = await supabase
    .from('clues')
    .select('*')
    .in('category_id', categoryIds)
    .order('category_id')
    .order('position');

  if (cluesError) {
    console.error('Error fetching clues:', cluesError);
    throw cluesError;
  }

  // Get clue states for this game
  const { data: clueStates, error: statesError } = await supabase
    .from('clue_states')
    .select('*')
    .eq('game_id', gameId);

  if (statesError) {
    console.error('Error fetching clue states:', statesError);
    throw statesError;
  }

  // Merge clues with their states
  return clues.map((clue) => {
    const state = clueStates?.find((cState) => cState.clue_id === clue.id);
    return state ? { ...clue, state } : clue;
  });
}

/**
 * Find Daily Double clue indices for a specific round
 *
 * @param gameId - The UUID of the game
 * @param round - The round type ('jeopardy' or 'double')
 * @returns Array of clue indices (0-based) that are Daily Doubles
 */
export async function getDailyDoubleIndices(gameId: string, round: 'jeopardy' | 'double'): Promise<number[]> {
  const supabase = getSupabaseClient();

  // Get the game to find the clue set
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('clue_set_id')
    .eq('id', gameId)
    .single();

  if (gameError) {
    console.error('Error fetching game:', gameError);
    throw gameError;
  }

  if (!game.clue_set_id) {
    return [];
  }

  // Get the board for this clue set and round
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('daily_double_cells')
    .eq('clue_set_id', game.clue_set_id)
    .eq('round', round)
    .single();

  if (boardError) {
    console.error('Error fetching board:', boardError);
    throw boardError;
  }

  // daily_double_cells is a JSON array of indices
  if (!board.daily_double_cells || !Array.isArray(board.daily_double_cells)) {
    return [];
  }

  return board.daily_double_cells as number[];
}

// ============================================================
// Game State Manipulation Helpers
// ============================================================

/**
 * Mark a clue as completed in the database
 *
 * @param gameId - The UUID of the game
 * @param clueId - The UUID of the clue to mark as completed
 */
export async function markClueCompleted(gameId: string, clueId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('clue_states')
    .update({ completed: true })
    .eq('game_id', gameId)
    .eq('clue_id', clueId);

  if (error) {
    console.error('Error marking clue as completed:', error);
    throw error;
  }
}

/**
 * Mark all clues in a specific round as completed
 *
 * Useful for testing round transitions without playing through all clues.
 *
 * @param gameId - The UUID of the game
 * @param round - The round type ('jeopardy' or 'double')
 */
export async function markRoundCompleted(gameId: string, round: 'jeopardy' | 'double'): Promise<void> {
  const supabase = getSupabaseClient();

  // Get the game to find the clue set
  const { data: game, error: gameError } = await supabase
    .from('games')
    .select('clue_set_id')
    .eq('id', gameId)
    .single();

  if (gameError) {
    console.error('Error fetching game:', gameError);
    throw gameError;
  }

  if (!game.clue_set_id) {
    throw new Error('Game has no clue set');
  }

  // Get the board for this clue set and round
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .select('id')
    .eq('clue_set_id', game.clue_set_id)
    .eq('round', round)
    .single();

  if (boardError) {
    console.error('Error fetching board:', boardError);
    throw boardError;
  }

  // Get all categories for this board
  const { data: categories, error: categoriesError } = await supabase
    .from('categories')
    .select('id')
    .eq('board_id', board.id);

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
    throw categoriesError;
  }

  const categoryIds = categories.map((cat) => cat.id);

  // Get all clues for these categories
  const { data: clues, error: cluesError } = await supabase
    .from('clues')
    .select('id')
    .in('category_id', categoryIds);

  if (cluesError) {
    console.error('Error fetching clues:', cluesError);
    throw cluesError;
  }

  const clueIds = clues.map((clue) => clue.id);

  // Mark all clue states as completed
  const { error: updateError } = await supabase
    .from('clue_states')
    .update({ completed: true })
    .eq('game_id', gameId)
    .in('clue_id', clueIds);

  if (updateError) {
    console.error('Error marking round as completed:', updateError);
    throw updateError;
  }

  console.log(`\u2705 Marked ${clueIds.length} clues as completed for ${round} round`);
}

/**
 * Get players in a game
 *
 * @param gameId - The UUID of the game
 * @returns Array of players with their information
 */
export async function getGamePlayers(gameId: string): Promise<Tables<'players'>[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('game_id', gameId)
    .order('created_at');

  if (error) {
    console.error('Error fetching players:', error);
    throw error;
  }

  return data || [];
}

/**
 * Update game status
 *
 * @param gameId - The UUID of the game
 * @param status - The new status
 */
export async function updateGameStatus(
  gameId: string,
  status: GameStatus
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('games')
    .update({ status })
    .eq('id', gameId);

  if (error) {
    console.error('Error updating game status:', error);
    throw error;
  }
}

/**
 * Update game round
 *
 * @param gameId - The UUID of the game
 * @param round - The new round ('jeopardy', 'double', or 'final')
 */
export async function updateGameRound(
  gameId: string,
  round: 'jeopardy' | 'double' | 'final'
): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from('games')
    .update({ current_round: round })
    .eq('id', gameId);

  if (error) {
    console.error('Error updating game round:', error);
    throw error;
  }
}
