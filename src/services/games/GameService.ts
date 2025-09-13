import { supabase } from '../supabase/client'
import type { Tables, TablesInsert, TablesUpdate } from '../supabase/types'

/** Game entity type from database schema */
export type Game = Tables<'games'>

/** Insert type for creating new games */
export type GameInsert = TablesInsert<'games'>

/** Update type for modifying existing games */
export type GameUpdate = TablesUpdate<'games'>

/** Player entity type from database schema */
export type Player = Tables<'players'>

/** Insert type for adding new players */
export type PlayerInsert = TablesInsert<'players'>

/** Buzz entity type from database schema */
export type Buzz = Tables<'buzzes'>

/** Insert type for recording new buzzes */
export type BuzzInsert = TablesInsert<'buzzes'>

/** Answer entity type from database schema */
export type Answer = Tables<'answers'>

/** Insert type for submitting new answers */
export type AnswerInsert = TablesInsert<'answers'>

/** Wager entity type from database schema */
export type Wager = Tables<'wagers'>

/** Insert type for placing new wagers */
export type WagerInsert = TablesInsert<'wagers'>

/** Clue state entity type from database schema */
export type ClueState = Tables<'clue_states'>

/** Insert type for tracking clue states */
export type ClueStateInsert = TablesInsert<'clue_states'>

/**
 * Service class for managing all game-related database operations in Euno's Jeopardy.
 *
 * This service handles the complete game lifecycle including creation, player management,
 * buzzer system, scoring, and real-time game state updates. All operations include
 * proper authentication checks and Row Level Security (RLS) policy enforcement.
 *
 * **Security Considerations:**
 * - All game operations require host authorization via getGame() method
 * - RLS policies enforce data isolation between different games and users
 * - Host-only operations are protected by explicit authorization checks
 *
 * **Database Integration:**
 * - Uses Supabase client for all database operations
 * - Implements proper error handling with descriptive error messages
 * - Supports real-time subscriptions for live game updates
 *
 * @example
 * ```typescript
 * // Create a new game
 * const game = await GameService.createGame(hostId, clueSetId);
 *
 * // Add players to the game
 * const player = await GameService.addPlayer(game.id, playerId, "Player Name");
 *
 * // Control buzzer system
 * await GameService.toggleBuzzerLock(game.id, hostId);
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export class GameService {
  /**
   * Creates a new Jeopardy game with the specified clue set and host.
   *
   * Initializes a new game in the lobby state with the buzzer locked by default.
   * The game starts in the Jeopardy round and requires host authorization for
   * all subsequent operations.
   *
   * **Database Operations:**
   * - Inserts new game record with proper foreign key relationships
   * - Enforces RLS policies for data isolation
   * - Returns complete game object for immediate use
   *
   * **Security Notes:**
   * - Host ID is validated against authenticated user session
   * - Clue set ownership is enforced by RLS policies
   * - Game access is restricted to host and authorized players
   *
   * @param hostId - UUID of the authenticated user who will host the game
   * @param clueSetId - UUID of the clue set to use for this game
   * @returns Promise resolving to the newly created game object
   * @throws {Error} When database operation fails or invalid parameters provided
   *
   * @example
   * ```typescript
   * const hostId = "123e4567-e89b-12d3-a456-426614174000";
   * const clueSetId = "987fcdeb-51a2-43d1-b789-123456789abc";
   *
   * try {
   *   const newGame = await GameService.createGame(hostId, clueSetId);
   *   console.log(`Game created with ID: ${newGame.id}`);
   *   console.log(`Status: ${newGame.status}`); // "lobby"
   *   console.log(`Buzzer locked: ${newGame.is_buzzer_locked}`); // true
   * } catch (error) {
   *   console.error("Failed to create game:", error.message);
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async createGame(hostId: string, clueSetId: string): Promise<Game> {
    // Initialize game with default Jeopardy settings
    // Buzzer starts locked to prevent premature buzzing during setup
    const gameData: GameInsert = {
      host_id: hostId,
      clue_set_id: clueSetId,
      status: 'lobby', // Game starts in lobby for player joining
      current_round: 'jeopardy', // Always begin with Jeopardy round
      is_buzzer_locked: true // Prevent buzzing until host is ready
    }

    // Insert game with immediate return of created record
    // Using .single() ensures we get exactly one result or error
    const { data, error } = await supabase
      .from('games')
      .insert(gameData)
      .select()
      .single()

    if (error) {
      // Provide context-specific error message for debugging
      throw new Error(`Failed to create game: ${error.message}`)
    }

    // Defensive programming: ensure database returned expected data
    if (!data) {
      throw new Error('No game data returned from database')
    }

    return data
  }

  /**
   * Retrieves a game by ID with strict host authorization enforcement.
   *
   * This method serves as the primary authorization gate for all host-only
   * operations. It ensures that only the game host can access and modify
   * game state, implementing a critical security boundary.
   *
   * **Security Implementation:**
   * - Validates user ID against game host_id field
   * - Prevents unauthorized access to game data
   * - Used by all host-only operations for consistent authorization
   *
   * **Database Operations:**
   * - Single query with immediate authorization check
   * - Leverages RLS policies for additional data protection
   * - Returns complete game object for subsequent operations
   *
   * @param gameId - UUID of the game to retrieve
   * @param userId - UUID of the user requesting access (must be game host)
   * @returns Promise resolving to the game object if user is authorized
   * @throws {Error} When game not found, database error, or unauthorized access
   *
   * @example
   * ```typescript
   * try {
   *   const game = await GameService.getGame(gameId, hostId);
   *   console.log(`Game status: ${game.status}`);
   *   console.log(`Current round: ${game.current_round}`);
   * } catch (error) {
   *   if (error.message.includes("Only the game host")) {
   *     console.error("Unauthorized: User is not the game host");
   *   } else {
   *     console.error("Failed to retrieve game:", error.message);
   *   }
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async getGame(gameId: string, userId: string): Promise<Game> {
    // Fetch game data with all fields for complete game state
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single()

    if (error) {
      // Provide specific error context for debugging
      throw new Error(`Failed to fetch game: ${error.message}`)
    }

    // Ensure game exists before authorization check
    if (!data) {
      throw new Error('Game not found')
    }

    // Critical security check: only game host can access game data
    // This prevents players from accessing host-only information
    if (data.host_id !== userId) {
      throw new Error('Only the game host can access this game')
    }

    return data
  }

  /**
   * Updates game state with host authorization and atomic operations.
   *
   * Provides a secure way to modify game properties while ensuring only
   * the game host can make changes. Uses the getGame method for authorization
   * and performs atomic updates to prevent race conditions.
   *
   * **Security Features:**
   * - Mandatory host authorization before any updates
   * - Atomic database operations prevent partial updates
   * - Returns updated game state for immediate use
   *
   * **Common Use Cases:**
   * - Changing game status (lobby → active → completed)
   * - Advancing rounds (jeopardy → double_jeopardy → final_jeopardy)
   * - Toggling buzzer lock state
   * - Updating current clue or player turn
   *
   * @param gameId - UUID of the game to update
   * @param updates - Partial game object with fields to update
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to the updated game object
   * @throws {Error} When unauthorized, game not found, or database error
   *
   * @example
   * ```typescript
   * // Start the game
   * const activeGame = await GameService.updateGame(gameId, {
   *   status: 'active',
   *   started_at: new Date().toISOString()
   * }, hostId);
   *
   * // Advance to Double Jeopardy
   * const doubleJeopardyGame = await GameService.updateGame(gameId, {
   *   current_round: 'double_jeopardy'
   * }, hostId);
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async updateGame(gameId: string, updates: GameUpdate, hostId: string): Promise<Game> {
    // Authorization check: ensure user is the game host before allowing updates
    // This call will throw if user is not authorized
    await this.getGame(gameId, hostId)

    // Perform atomic update with immediate return of updated data
    // Using .single() ensures we get exactly the updated record
    const { data, error } = await supabase
      .from('games')
      .update(updates)
      .eq('id', gameId)
      .select()
      .single()

    if (error) {
      // Provide context for debugging update failures
      throw new Error(`Failed to update game: ${error.message}`)
    }

    // Defensive check: ensure database returned updated data
    if (!data) {
      throw new Error('No game data returned from update')
    }

    return data
  }

  /**
   * Toggles the buzzer lock state for real-time buzzer control.
   *
   * This is a critical game control method that allows the host to enable/disable
   * player buzzing. The buzzer lock prevents players from buzzing in during
   * clue reading, between questions, or when the host needs to maintain control.
   *
   * **Game Flow Integration:**
   * - Buzzer starts locked when game is created
   * - Host unlocks buzzer when clue is fully read
   * - Host locks buzzer after player buzzes or time expires
   * - Essential for maintaining authentic Jeopardy gameplay flow
   *
   * **Real-time Considerations:**
   * - State change is immediately reflected in database
   * - Real-time subscriptions notify all connected clients
   * - Prevents race conditions in buzzer timing
   *
   * @param gameId - UUID of the game to control
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game with new buzzer state
   * @throws {Error} When unauthorized or database operation fails
   *
   * @example
   * ```typescript
   * // Unlock buzzer for player responses
   * const unlockedGame = await GameService.toggleBuzzerLock(gameId, hostId);
   * console.log(`Buzzer is now: ${unlockedGame.is_buzzer_locked ? 'locked' : 'unlocked'}`);
   *
   * // Lock buzzer after player buzzes
   * const lockedGame = await GameService.toggleBuzzerLock(gameId, hostId);
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async toggleBuzzerLock(gameId: string, hostId: string): Promise<Game> {
    // Get current game state and verify host authorization
    const game = await this.getGame(gameId, hostId)

    // Toggle the buzzer lock state and return updated game
    // This leverages updateGame for consistent authorization and error handling
    return this.updateGame(gameId, {
      is_buzzer_locked: !game.is_buzzer_locked
    }, hostId)
  }

  /**
   * Retrieves all players in a game with their profile information.
   *
   * Returns a comprehensive list of all players who have joined the game,
   * including their scores, join times, and associated profile data. Players
   * are ordered by join time to maintain consistent display order.
   *
   * **Data Relationships:**
   * - Joins with profiles table for display names and usernames
   * - Includes all player game-specific data (score, nickname, join time)
   * - Maintains referential integrity through foreign key relationships
   *
   * **Performance Considerations:**
   * - Single query with join to minimize database round trips
   * - Ordered by join time for consistent UI display
   * - Returns empty array rather than null for easier handling
   *
   * **Security Notes:**
   * - No host authorization required (players visible to all game participants)
   * - RLS policies ensure players only see data for games they're part of
   * - Profile data is limited to display-safe fields only
   *
   * @param gameId - UUID of the game to get players for
   * @returns Promise resolving to array of players with profile data
   * @throws {Error} When database operation fails
   *
   * @example
   * ```typescript
   * const players = await GameService.getPlayers(gameId);
   * players.forEach(player => {
   *   console.log(`${player.nickname || player.profiles?.display_name}: $${player.score}`);
   *   console.log(`Joined: ${new Date(player.joined_at).toLocaleString()}`);
   * });
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async getPlayers(gameId: string): Promise<Player[]> {
    const { data, error } = await supabase
      .from('players')
      .select(`
        *,
        profiles:user_id (
          display_name,
          username
        )
      `)
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch players: ${error.message}`)
    }

    return data || []
  }

  /**
   * Add a player to a game
   */
  static async addPlayer(gameId: string, userId: string, nickname?: string): Promise<Player> {
    const playerData: PlayerInsert = {
      game_id: gameId,
      user_id: userId,
      nickname: nickname || null,
      score: 0
    }

    const { data, error } = await supabase
      .from('players')
      .insert(playerData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to add player: ${error.message}`)
    }

    if (!data) {
      throw new Error('No player data returned from database')
    }

    return data
  }

  /**
   * Get available clue sets for game creation
   */
  static async getAvailableClueSets(userId: string): Promise<Tables<'clue_sets'>[]> {
    const { data, error } = await supabase
      .from('clue_sets')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch clue sets: ${error.message}`)
    }

    return data || []
  }

  /**
   * Get buzzes for a specific clue in order
   */
  static async getBuzzesForClue(gameId: string, clueId: string): Promise<Buzz[]> {
    const { data, error } = await supabase
      .from('buzzes')
      .select(`
        *,
        profiles:user_id (
          display_name,
          username
        )
      `)
      .eq('game_id', gameId)
      .eq('clue_id', clueId)
      .order('created_at', { ascending: true })

    if (error) {
      throw new Error(`Failed to fetch buzzes: ${error.message}`)
    }

    return data || []
  }

  /**
   * Record a buzz for a clue
   */
  static async recordBuzz(gameId: string, clueId: string, userId: string): Promise<Buzz> {
    const buzzData: BuzzInsert = {
      game_id: gameId,
      clue_id: clueId,
      user_id: userId
    }

    const { data, error } = await supabase
      .from('buzzes')
      .insert(buzzData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to record buzz: ${error.message}`)
    }

    if (!data) {
      throw new Error('No buzz data returned from database')
    }

    return data
  }

  /**
   * Clear all buzzes for a clue (reset buzzer)
   */
  static async clearBuzzesForClue(gameId: string, clueId: string, hostId: string): Promise<void> {
    // Verify host authorization
    await this.getGame(gameId, hostId)

    const { error } = await supabase
      .from('buzzes')
      .delete()
      .eq('game_id', gameId)
      .eq('clue_id', clueId)

    if (error) {
      throw new Error(`Failed to clear buzzes: ${error.message}`)
    }
  }

  /**
   * Update player score
   */
  static async updatePlayerScore(gameId: string, userId: string, scoreChange: number, hostId: string): Promise<Player> {
    // Verify host authorization
    await this.getGame(gameId, hostId)

    // Get current player data
    const { data: currentPlayer, error: fetchError } = await supabase
      .from('players')
      .select('score')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      throw new Error(`Failed to fetch player: ${fetchError.message}`)
    }

    if (!currentPlayer) {
      throw new Error('Player not found')
    }

    const newScore = currentPlayer.score + scoreChange

    const { data, error } = await supabase
      .from('players')
      .update({ score: newScore })
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update score: ${error.message}`)
    }

    if (!data) {
      throw new Error('No player data returned from update')
    }

    return data
  }
}
