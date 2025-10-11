import { createClient } from '@supabase/supabase-js';
import { TEST_USERS } from './test-users';

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
function getSupabaseClient() {
  if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
    throw new Error('Supabase credentials not configured');
  }
  return createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY
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
  const configured = allUsers;
  const missing = allUsers
    .map(([key]) => key);

  return {
    configured: configured.length,
    total: allUsers.length,
    missing,
  };
}
