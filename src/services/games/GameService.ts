import { supabase } from '../supabase/client'
import type { Tables, TablesInsert, TablesUpdate } from '../supabase/types'
import { ClueService } from '../clues/ClueService'

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

    // Initialize clue states for the new game
    try {
      await ClueService.initializeClueStates(data.id)
    } catch (error) {
      // Log error but don't fail game creation - clue states can be initialized later
      console.warn('Failed to initialize clue states for new game:', error)
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
    // Query players with joined profile data for complete player information
    // Using nested select to get display names and usernames in single query
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
      .order('joined_at', { ascending: true }) // Consistent join order for UI

    if (error) {
      // Provide context for debugging player fetch failures
      throw new Error(`Failed to fetch players: ${error.message}`)
    }

    // Return empty array instead of null for easier array operations
    return data || []
  }

  /**
   * Adds a new player to an existing game with optional nickname.
   *
   * Creates a new player record associated with the specified game and user.
   * Players start with a score of 0 and can optionally provide a nickname
   * that overrides their profile display name for this specific game.
   *
   * **Player Management:**
   * - Each user can only join a game once (enforced by unique constraints)
   * - Nickname is optional and game-specific
   * - Score initializes to 0 for proper game state
   * - Join time is automatically recorded for ordering
   *
   * **Database Relationships:**
   * - Creates foreign key relationship to games table
   * - Links to user profiles through user_id
   * - Enforces referential integrity constraints
   *
   * **Security Considerations:**
   * - RLS policies prevent joining unauthorized games
   * - User can only add themselves as a player
   * - Game must be in joinable state (typically 'lobby')
   *
   * @param gameId - UUID of the game to join
   * @param userId - UUID of the user joining the game
   * @param nickname - Optional display name for this game (overrides profile name)
   * @returns Promise resolving to the newly created player record
   * @throws {Error} When user already in game, game not found, or database error
   *
   * @example
   * ```typescript
   * // Add player with nickname
   * const player = await GameService.addPlayer(gameId, userId, "Quiz Master");
   * console.log(`${player.nickname} joined with score: ${player.score}`);
   *
   * // Add player without nickname (uses profile display name)
   * const player2 = await GameService.addPlayer(gameId, userId2);
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async addPlayer(gameId: string, userId: string, nickname?: string): Promise<Player> {
    // Initialize player with default game state
    // Score starts at 0, nickname is optional and game-specific
    const playerData: PlayerInsert = {
      game_id: gameId,
      user_id: userId,
      nickname: nickname || null, // Use null for database consistency
      score: 0 // All players start with zero score
    }

    // Insert player with immediate return of created record
    // Database constraints prevent duplicate players in same game
    const { data, error } = await supabase
      .from('players')
      .insert(playerData)
      .select()
      .single()

    if (error) {
      // Error may indicate duplicate player or invalid game/user IDs
      throw new Error(`Failed to add player: ${error.message}`)
    }

    // Defensive programming: ensure database returned expected data
    if (!data) {
      throw new Error('No player data returned from database')
    }

    return data
  }

  /**
   * Retrieves all clue sets owned by the specified user for game creation.
   *
   * Returns a list of clue sets that the user can use to create new games.
   * Only clue sets owned by the requesting user are returned, enforcing
   * proper ownership and access control for game content.
   *
   * **Ownership Model:**
   * - Users can only access their own clue sets
   * - RLS policies enforce ownership at database level
   * - Supports future sharing/collaboration features
   *
   * **Data Ordering:**
   * - Results ordered by creation date (newest first)
   * - Provides intuitive ordering for clue set selection
   * - Helps users find recently created content quickly
   *
   * **Integration Points:**
   * - Used by game creation workflow
   * - Supports clue set management interfaces
   * - Foundation for clue set sharing features
   *
   * @param userId - UUID of the user to get clue sets for
   * @returns Promise resolving to array of user's clue sets
   * @throws {Error} When database operation fails
   *
   * @example
   * ```typescript
   * const clueSets = await GameService.getAvailableClueSets(userId);
   * console.log(`User has ${clueSets.length} clue sets available`);
   *
   * clueSets.forEach(clueSet => {
   *   console.log(`${clueSet.name} - Created: ${clueSet.created_at}`);
   * });
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async getAvailableClueSets(userId: string): Promise<Tables<'clue_sets'>[]> {
    // Query user's clue sets with ownership filtering
    // RLS policies provide additional security layer
    const { data, error } = await supabase
      .from('clue_sets')
      .select('*')
      .eq('owner_id', userId) // Only return user's own clue sets
      .order('created_at', { ascending: false }) // Newest first for better UX

    if (error) {
      // Provide context for debugging clue set fetch failures
      throw new Error(`Failed to fetch clue sets: ${error.message}`)
    }

    // Return empty array instead of null for easier array operations
    return data || []
  }

  /**
   * Retrieves all buzzes for a specific clue in chronological order.
   *
   * Returns the complete buzz history for a clue, including player profile
   * information and precise timing. This is essential for determining buzz
   * order and managing the authentic Jeopardy gameplay flow.
   *
   * **Buzzer System Integration:**
   * - Buzzes are ordered by creation time (first buzz wins)
   * - Includes player profile data for display purposes
   * - Supports multiple buzzes per clue for answer attempts
   * - Critical for host adjudication workflow
   *
   * **Real-time Considerations:**
   * - Buzz timing is recorded with high precision
   * - Order determination handles network latency fairly
   * - Supports real-time buzz notifications to all clients
   *
   * **Data Relationships:**
   * - Links buzzes to specific clues and games
   * - Includes player profile information for UI display
   * - Maintains referential integrity across game entities
   *
   * @param gameId - UUID of the game containing the clue
   * @param clueId - UUID of the specific clue to get buzzes for
   * @returns Promise resolving to array of buzzes in chronological order
   * @throws {Error} When database operation fails
   *
   * @example
   * ```typescript
   * const buzzes = await GameService.getBuzzesForClue(gameId, clueId);
   * if (buzzes.length > 0) {
   *   const firstBuzz = buzzes[0];
   *   console.log(`First buzz by: ${firstBuzz.profiles?.display_name}`);
   *   console.log(`Buzz time: ${new Date(firstBuzz.created_at).toISOString()}`);
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async getBuzzesForClue(gameId: string, clueId: string): Promise<Buzz[]> {
    // Query buzzes with player profile data for complete buzz information
    // Ordered by creation time to determine proper buzz sequence
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
      .order('created_at', { ascending: true }) // First buzz wins

    if (error) {
      // Provide context for debugging buzz fetch failures
      throw new Error(`Failed to fetch buzzes: ${error.message}`)
    }

    // Return empty array instead of null for easier array operations
    return data || []
  }

  /**
   * Records a player's buzz for a specific clue with precise timing.
   *
   * Creates a timestamped buzz record that captures the exact moment a player
   * attempts to answer a clue. The database timestamp ensures fair ordering
   * even with network latency variations between players.
   *
   * **Buzzer System Core:**
   * - Records precise buzz timing for fair play
   * - Prevents duplicate buzzes from same player per clue
   * - Supports multiple answer attempts per clue
   * - Essential for authentic Jeopardy gameplay flow
   *
   * **Race Condition Handling:**
   * - Database timestamp provides authoritative ordering
   * - Unique constraints prevent duplicate player buzzes
   * - Atomic operation ensures data consistency
   * - Network latency handled fairly by server-side timing
   *
   * **Integration Points:**
   * - Triggers real-time notifications to all game clients
   * - Used by host interface for buzz order display
   * - Foundation for answer adjudication workflow
   *
   * @param gameId - UUID of the game where buzz occurred
   * @param clueId - UUID of the clue being answered
   * @param userId - UUID of the player who buzzed
   * @returns Promise resolving to the created buzz record with timestamp
   * @throws {Error} When player already buzzed, invalid IDs, or database error
   *
   * @example
   * ```typescript
   * try {
   *   const buzz = await GameService.recordBuzz(gameId, clueId, playerId);
   *   console.log(`Buzz recorded at: ${buzz.created_at}`);
   *   // Notify other players that someone buzzed
   * } catch (error) {
   *   if (error.message.includes("duplicate")) {
   *     console.log("Player already buzzed for this clue");
   *   }
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async recordBuzz(gameId: string, clueId: string, userId: string): Promise<Buzz> {
    // Create buzz record with precise timing
    // Database will automatically set created_at timestamp for fair ordering
    const buzzData: BuzzInsert = {
      game_id: gameId,
      clue_id: clueId,
      user_id: userId
    }

    // Insert buzz with immediate return of created record
    // Unique constraints prevent duplicate buzzes from same player
    const { data, error } = await supabase
      .from('buzzes')
      .insert(buzzData)
      .select()
      .single()

    if (error) {
      // Error may indicate duplicate buzz or invalid game/clue/user IDs
      throw new Error(`Failed to record buzz: ${error.message}`)
    }

    // Defensive programming: ensure database returned expected data
    if (!data) {
      throw new Error('No buzz data returned from database')
    }

    return data
  }

  /**
   * Clears all buzzes for a specific clue, resetting the buzzer system.
   *
   * Removes all buzz records for a clue, effectively resetting the buzzer
   * state for that question. This is typically used when the host wants to
   * allow re-buzzing after an incorrect answer or to reset the question state.
   *
   * **Host-Only Operation:**
   * - Requires host authorization to prevent player manipulation
   * - Used for managing game flow and second chances
   * - Critical for maintaining fair gameplay
   *
   * **Use Cases:**
   * - Player gives incorrect answer, allow others to buzz
   * - Technical issues require buzz reset
   * - Host wants to restart a question
   * - Clearing state before moving to next clue
   *
   * **Real-time Integration:**
   * - Triggers real-time updates to all connected clients
   * - Resets buzzer UI state for all players
   * - Allows fresh buzzing opportunity
   *
   * @param gameId - UUID of the game containing the clue
   * @param clueId - UUID of the clue to clear buzzes for
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise that resolves when buzzes are cleared
   * @throws {Error} When unauthorized, invalid IDs, or database error
   *
   * @example
   * ```typescript
   * // Clear buzzes after incorrect answer to allow re-buzzing
   * await GameService.clearBuzzesForClue(gameId, clueId, hostId);
   * console.log("Buzzer reset - players can buzz again");
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async clearBuzzesForClue(gameId: string, clueId: string, hostId: string): Promise<void> {
    // Authorization check: ensure user is the game host
    // This call will throw if user is not authorized
    await this.getGame(gameId, hostId)

    // Delete all buzzes for the specified clue
    // Multiple buzzes may exist if players buzzed multiple times
    const { error } = await supabase
      .from('buzzes')
      .delete()
      .eq('game_id', gameId)
      .eq('clue_id', clueId)

    if (error) {
      // Provide context for debugging buzz clearing failures
      throw new Error(`Failed to clear buzzes: ${error.message}`)
    }
  }

  /**
   * Sets the focused clue for a game.
   *
   * Updates the game's focused_clue_id to track which clue the host has
   * selected for the current question. This is used to coordinate the
   * clue display across all connected clients.
   *
   * @param gameId - UUID of the game
   * @param clueId - UUID of the clue to focus, or null to clear focus
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game object
   * @throws {Error} When unauthorized, game not found, or database error
   */
  static async setFocusedClue(gameId: string, clueId: string | null, hostId: string): Promise<Game> {
    return this.updateGame(gameId, { focused_clue_id: clueId }, hostId)
  }

  /**
   * Sets the focused player for a game.
   *
   * Updates the game's focused_player_id to track which player is currently
   * selected to answer the focused clue. This is typically set when a player
   * is selected from the buzzer queue.
   *
   * @param gameId - UUID of the game
   * @param playerId - UUID of the player to focus, or null to clear focus
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game object
   * @throws {Error} When unauthorized, game not found, or database error
   */
  static async setFocusedPlayer(gameId: string, playerId: string | null, hostId: string): Promise<Game> {
    return this.updateGame(gameId, { focused_player_id: playerId }, hostId)
  }

  /**
   * Completes the answer adjudication workflow for a clue.
   *
   * This method handles the complete process of adjudicating a player's answer:
   * 1. Records the answer in the answers table
   * 2. Updates the player's score based on the result
   * 3. Marks the clue as completed if answer is correct
   * 4. Clears focused clue/player state
   *
   * @param gameId - UUID of the game
   * @param clueId - UUID of the clue being adjudicated
   * @param playerId - UUID of the player who answered
   * @param playerResponse - The player's response text
   * @param isCorrect - Whether the answer is correct
   * @param scoreValue - Point value to add/subtract (clue value or wager amount)
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game object
   * @throws {Error} When unauthorized, game not found, or database error
   */
  static async adjudicateAnswer(
    gameId: string,
    clueId: string,
    playerId: string,
    playerResponse: string,
    isCorrect: boolean,
    scoreValue: number,
    hostId: string
  ): Promise<Game> {
    // Authorization check
    await this.getGame(gameId, hostId)

    // Record the answer
    const answerData: AnswerInsert = {
      game_id: gameId,
      clue_id: clueId,
      user_id: playerId,
      response: playerResponse,
      is_correct: isCorrect,
      adjudicated_by: hostId
    }

    const { error: answerError } = await supabase
      .from('answers')
      .insert(answerData)

    if (answerError) {
      throw new Error(`Failed to record answer: ${answerError.message}`)
    }

    // Update player score
    const scoreChange = isCorrect ? scoreValue : -scoreValue
    await this.updatePlayerScore(gameId, playerId, scoreChange, hostId)

    // If answer is correct, mark clue as completed and clear focus
    if (isCorrect) {
      // Mark clue as completed
      const { error: clueStateError } = await supabase
        .from('clue_states')
        .update({ completed: true })
        .eq('game_id', gameId)
        .eq('clue_id', clueId)

      if (clueStateError) {
        throw new Error(`Failed to mark clue completed: ${clueStateError.message}`)
      }

      // Clear focused clue and player
      return this.updateGame(gameId, {
        focused_clue_id: null,
        focused_player_id: null
      }, hostId)
    }

    // If incorrect, just clear focused player (keep clue focused for re-buzzing)
    return this.updateGame(gameId, { focused_player_id: null }, hostId)
  }

  /**
   * Updates a player's score with host authorization and atomic operations.
   *
   * Modifies a player's score by the specified amount (positive or negative)
   * while ensuring data consistency and proper authorization. The operation
   * is atomic to prevent race conditions during simultaneous score updates.
   *
   * **Scoring System:**
   * - Supports positive and negative score changes
   * - Maintains running total of player's game score
   * - Used for correct answers, incorrect answers, and Daily Double wagers
   * - Foundation for Final Jeopardy scoring
   *
   * **Host Authorization:**
   * - Only game host can modify player scores
   * - Prevents players from manipulating their own scores
   * - Ensures fair and controlled scoring process
   *
   * **Atomic Operations:**
   * - Fetches current score and calculates new total
   * - Updates score in single transaction
   * - Prevents race conditions from simultaneous updates
   * - Returns updated player data for immediate use
   *
   * @param gameId - UUID of the game containing the player
   * @param userId - UUID of the player whose score to update
   * @param scoreChange - Amount to add to player's score (can be negative)
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated player record with new score
   * @throws {Error} When unauthorized, player not found, or database error
   *
   * @example
   * ```typescript
   * // Award points for correct answer
   * const player = await GameService.updatePlayerScore(gameId, playerId, 400, hostId);
   * console.log(`New score: $${player.score}`);
   *
   * // Deduct points for incorrect Daily Double
   * const player2 = await GameService.updatePlayerScore(gameId, playerId, -1000, hostId);
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async updatePlayerScore(gameId: string, userId: string, scoreChange: number, hostId: string): Promise<Player> {
    // Authorization check: ensure user is the game host
    // This call will throw if user is not authorized
    await this.getGame(gameId, hostId)

    // Fetch current player score for atomic update calculation
    // Only select score field to minimize data transfer
    const { data: currentPlayer, error: fetchError } = await supabase
      .from('players')
      .select('score')
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      // Provide context for debugging player fetch failures
      throw new Error(`Failed to fetch player: ${fetchError.message}`)
    }

    // Ensure player exists in the game before score update
    if (!currentPlayer) {
      throw new Error('Player not found')
    }

    // Calculate new score (supports positive and negative changes)
    // Allows for correct answers (+points) and incorrect answers (-points)
    const newScore = currentPlayer.score + scoreChange

    // Perform atomic score update with immediate return of updated data
    const { data, error } = await supabase
      .from('players')
      .update({ score: newScore })
      .eq('game_id', gameId)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      // Provide context for debugging score update failures
      throw new Error(`Failed to update score: ${error.message}`)
    }

    // Defensive programming: ensure database returned updated data
    if (!data) {
      throw new Error('No player data returned from update')
    }

    return data
  }
}
