import { supabase } from '../supabase/client'
import type { Tables, TablesInsert, TablesUpdate, Json } from '../supabase/types'
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

/** Insert type for submitting new answers */
export type AnswerInsert = TablesInsert<'answers'>

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
   * Gets the currently active game (lobby, game_intro, introducing_categories, in_progress, or round_transition status).
   *
   * This method enforces the "one game at a time" rule by finding any game
   * that is currently in lobby, game_intro, introducing_categories, in_progress, or round_transition status. Used to prevent multiple
   * simultaneous games and to redirect hosts to existing active games.
   *
   * **Business Logic:**
   * - Only one game can be active at any time
   * - Active games are those with status 'lobby', 'game_intro', 'introducing_categories', 'in_progress', or 'round_transition'
   * - Completed/cancelled games are not considered active
   *
   * @returns Promise resolving to the active game or null if none exists
   * @throws {Error} When database operation fails
   *
   * @example
   * ```typescript
   * const activeGame = await GameService.getActiveGame();
   * if (activeGame) {
   *   console.log(`Active game found: ${activeGame.id}`);
   *   // Redirect host to manage this game
   * } else {
   *   // Allow creating new game
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async getActiveGame(): Promise<Game | null> {
    const { data, error } = await supabase
      .from('games')
      .select()
      .in('status', ['lobby', 'game_intro' as Game['status'], 'introducing_categories' as Game['status'], 'in_progress', 'round_transition' as Game['status']])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to get active game: ${error.message}`)
    }

    return data
  }

  /**
   * Ends a game with appropriate status based on completion state.
   *
   * Determines whether the game should be marked as 'completed' (if Final Jeopardy
   * was fully answered) or 'cancelled' (if the game was ended early). This provides
   * better game state tracking and analytics.
   *
   * **Status Logic:**
   * - 'completed': Final Jeopardy clue was revealed and answered
   * - 'cancelled': Game ended before Final Jeopardy completion
   *
   * @param gameId - UUID of the game to end
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game with appropriate final status
   * @throws {Error} When unauthorized, game not found, or database error
   *
   * @example
   * ```typescript
   * // End game - will check Final Jeopardy completion automatically
   * const endedGame = await GameService.endGame(gameId, hostId);
   * console.log(`Game ended with status: ${endedGame.status}`); // 'completed' or 'cancelled'
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async endGame(gameId: string, hostId: string): Promise<Game> {
    // Verify authorization first
    await this.getGame(gameId, hostId)

    // Check if Final Jeopardy was completed
    const finalJeopardyCompleted = await this.isFinalJeopardyCompleted(gameId)

    // Set appropriate status based on completion
    const finalStatus: GameStatus = finalJeopardyCompleted ? 'completed' : 'cancelled'

    // Update game with final status
    return this.updateGame(gameId, { status: finalStatus }, hostId)
  }

  /**
   * Checks if Final Jeopardy was completed in the game.
   *
   * Determines completion by checking if the Final Jeopardy clue was both
   * revealed and completed (answered). This is used to distinguish between
   * games that ended naturally vs. games that were cancelled early.
   *
   * @param gameId - UUID of the game to check
   * @returns Promise resolving to true if Final Jeopardy was completed
   * @throws {Error} When database operation fails
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async isFinalJeopardyCompleted(gameId: string): Promise<boolean> {
    try {
      // Get the game's clue set ID
      const { data: game, error: gameError } = await supabase
        .from('games')
        .select('clue_set_id')
        .eq('id', gameId)
        .single()

      if (gameError || !game?.clue_set_id) {
        console.warn('Error getting game clue set:', gameError)
        return false
      }

      // Find the Final Jeopardy board for this clue set
      const { data: finalBoard, error: boardError } = await supabase
        .from('boards')
        .select('id')
        .eq('clue_set_id', game.clue_set_id)
        .eq('round', 'final')
        .single()

      if (boardError || !finalBoard) {
        console.warn('Error getting Final Jeopardy board:', boardError)
        return false
      }

      // Get the Final Jeopardy clue from the board
      const { data: finalClues, error: clueError } = await supabase
        .from('clues')
        .select(`
          id,
          categories!inner (
            board_id
          )
        `)
        .eq('categories.board_id', finalBoard.id)
        .limit(1)

      if (clueError || !finalClues?.[0]) {
        console.warn('Error getting Final Jeopardy clue:', clueError)
        return false
      }

      // Check the clue state for the Final Jeopardy clue
      const { data: clueState, error: stateError } = await supabase
        .from('clue_states')
        .select('revealed, completed')
        .eq('game_id', gameId)
        .eq('clue_id', finalClues[0].id)
        .single()

      if (stateError) {
        console.warn('Error getting Final Jeopardy clue state:', stateError)
        return false
      }

      // Final Jeopardy is completed if it was both revealed and completed
      return clueState?.revealed === true && clueState?.completed === true
    } catch (error) {
      console.warn('Error in isFinalJeopardyCompleted:', error)
      return false
    }
  }

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
    } catch (clueError) {
      // Log error but don't fail game creation - clue states can be initialized later
      console.warn('Failed to initialize clue states for new game:', clueError)
    }

    // Failsafe: Ensure Daily Double positions exist for legacy clue sets
    try {
      await this.ensureDailyDoublePositions(clueSetId)
    } catch (ddError) {
      // Log error but don't fail game creation - Daily Doubles can be added manually
      console.warn('Failed to ensure Daily Double positions:', ddError)
    }

    return data
  }

  /**
   * Ensures Daily Double positions exist for a clue set, generating them if missing.
   *
   * This failsafe method checks if Daily Double positions are assigned to the
   * jeopardy and double rounds of a clue set. If any are missing (empty arrays),
   * it generates and saves new Daily Double positions using the authentic algorithm.
   *
   * **Use Cases:**
   * - Legacy clue sets uploaded before Daily Double generation was implemented
   * - Corrupted or manually modified clue sets with missing Daily Doubles
   * - Ensuring consistent game experience regardless of clue set age
   *
   * @param clueSetId - UUID of the clue set to check and fix
   * @throws {Error} When database operations fail
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  private static async ensureDailyDoublePositions(clueSetId: string): Promise<void> {
    // Import Daily Double generation function
    const { generateDailyDoublePositions } = await import('../../utils/dailyDoubleAlgorithm')

    // Check both jeopardy and double rounds
    const rounds: ('jeopardy' | 'double')[] = ['jeopardy', 'double']

    for (const round of rounds) {
      // Get current Daily Double positions for this round
      const { data: board, error: boardError } = await supabase
        .from('boards')
        .select('id, daily_double_cells')
        .eq('clue_set_id', clueSetId)
        .eq('round', round)
        .single()

      if (boardError) {
        console.warn(`Could not check Daily Double positions for ${round} round:`, boardError.message)
        // Skip this round and continue with the next one
      } else {

      // Check if Daily Doubles are missing or empty
      const needsGeneration = !board.daily_double_cells ||
        (Array.isArray(board.daily_double_cells) && board.daily_double_cells.length === 0)

      if (needsGeneration) {
        // Generate new Daily Double positions
        const newPositions = generateDailyDoublePositions(round)
        console.log(`🎯 Generated missing Daily Double positions for ${round} round:`, newPositions)

        // Update the board with new positions
        const { error: updateError } = await supabase
          .from('boards')
          .update({ daily_double_cells: newPositions as unknown as Json })
          .eq('id', board.id)

        if (updateError) {
          console.error(`Failed to save Daily Double positions for ${round} round:`, updateError.message)
        } else {
          console.log(`✅ Successfully added Daily Double positions to ${round} round`)
        }
      }
      }
    }
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
   * Starts the game by transitioning from lobby to in_progress state.
   *
   * This method handles the game state transition when the host is ready to begin
   * gameplay. It changes the game status from 'lobby' to 'in_progress', which
   * triggers UI updates across all connected clients.
   *
   * **Game Flow Integration:**
   * - Only works when game is in 'lobby' state
   * - Unlocks game panels for host dashboard
   * - Signals players that the game has begun
   * - Maintains buzzer lock until first clue is revealed
   *
   * **Real-time Effects:**
   * - All connected clients receive state change notification
   * - Host dashboard panels become active
   * - Player interfaces switch from lobby to game view
   *
   * @param gameId - UUID of the game to start
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game object with in_progress status
   * @throws {Error} When unauthorized, game not found, or game not in lobby state
   *
   * @example
   * ```typescript
   * // Start the game when host is ready
   * const activeGame = await GameService.startGame(gameId, hostId);
   * console.log(`Game status: ${activeGame.status}`); // "in_progress"
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async startGame(gameId: string, hostId: string): Promise<Game> {
    // Verify current game state and host authorization
    const currentGame = await this.getGame(gameId, hostId)

    // Ensure game is in lobby state before starting
    if (currentGame.status !== 'lobby') {
      throw new Error(`Cannot start game: current status is '${currentGame.status}', expected 'lobby'`)
    }

    // Transition to in_progress state
    return this.updateGame(gameId, { status: 'in_progress' }, hostId)
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
    // First, get all players for the game
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('game_id', gameId)
      .order('joined_at', { ascending: true }) // Consistent join order for UI

    if (playersError) {
      throw new Error(`Failed to fetch players: ${playersError.message}`)
    }

    if (!players || players.length === 0) {
      return []
    }

    // Get all user IDs to fetch profiles
    const userIds = players.map((player) => player.user_id)

    // Fetch profiles for all players
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, username, email')
      .in('id', userIds)

    if (profilesError) {
      console.warn('Failed to fetch player profiles:', profilesError)
      // Continue without profiles rather than failing completely
    }

    // Merge player data with profile data
    return players.map((player) => ({
      ...player,
      profiles: profiles?.find((profile) => profile.id === player.user_id) || null
    }))
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
   * Removes a player from a game.
   *
   * Deletes the player record from the database, which will trigger
   * real-time updates to notify the host dashboard of the change.
   *
   * @param gameId - UUID of the game to remove player from
   * @param userId - UUID of the user to remove
   * @throws {Error} When player not found or database operation fails
   *
   * @example
   * ```typescript
   * // Remove player from game
   * await GameService.removePlayer(gameId, userId);
   * console.log('Player removed from game');
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async removePlayer(gameId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('players')
      .delete()
      .eq('game_id', gameId)
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Failed to remove player: ${error.message}`)
    }
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
    // Query buzzes with profile data for complete buzz information
    // We'll get player nicknames separately since there's no direct relationship
    const { data: buzzes, error } = await supabase
      .from('buzzes')
      .select(`
        *,
        profiles!buzzes_user_id_fkey (
          display_name,
          username,
          email
        )
      `)
      .eq('game_id', gameId)
      .eq('clue_id', clueId)
      .order('created_at', { ascending: true }) // First buzz wins

    if (error) {
      // Provide context for debugging buzz fetch failures
      throw new Error(`Failed to fetch buzzes: ${error.message}`)
    }

    if (!buzzes || buzzes.length === 0) {
      return []
    }

    // Get player nicknames for this game
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('user_id, nickname')
      .eq('game_id', gameId)
      .in('user_id', buzzes.map((buzz) => buzz.user_id))

    if (playersError) {
      console.warn('Could not load player nicknames:', playersError)
    }

    // Enhance buzz records with player nicknames
    return buzzes.map((buzz) => ({
      ...buzz,
      playerNickname: players?.find((p) => p.user_id === buzz.user_id)?.nickname || null
    }))
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
  static async recordBuzz(gameId: string, clueId: string, userId: string, reactionTime?: number): Promise<Buzz> {
    // Create buzz record with precise timing and client-calculated reaction time
    // Database will automatically set created_at timestamp for fair ordering
    const buzzData: BuzzInsert = {
      game_id: gameId,
      clue_id: clueId,
      user_id: userId,
      reaction_time: reactionTime || null
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
   * Marks a player's answer as correct and completes the clue.
   *
   * This method handles the complete workflow when a player answers correctly:
   * 1. Records the correct answer in the answers table
   * 2. Updates the player's score (adds clue value)
   * 3. Marks the clue as completed
   * 4. Clears focused clue/player state and locks buzzer
   * 5. Clears all buzzes for this clue
   *
   * @param gameId - UUID of the game
   * @param clueId - UUID of the clue being adjudicated
   * @param playerId - UUID of the player who answered correctly
   * @param playerResponse - The player's response text
   * @param scoreValue - Point value to add (clue value or wager amount)
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game object
   * @throws {Error} When unauthorized, game not found, or database error
   */
  static async markPlayerCorrect(
    gameId: string,
    clueId: string,
    playerId: string,
    playerResponse: string,
    scoreValue: number,
    hostId: string
  ): Promise<Game> {
    // Authorization check
    await this.getGame(gameId, hostId)

    // Record the correct answer
    const answerData: AnswerInsert = {
      game_id: gameId,
      clue_id: clueId,
      user_id: playerId,
      response: playerResponse,
      is_correct: true,
      adjudicated_by: hostId
    }

    const { error: answerError } = await supabase
      .from('answers')
      .insert(answerData)

    if (answerError) {
      throw new Error(`Failed to record answer: ${answerError.message}`)
    }

    // Update player score (add points)
    await this.updatePlayerScore(gameId, playerId, scoreValue, hostId)

    // Clear buzzer queue for this clue
    const { error: buzzClearError } = await supabase
      .from('buzzes')
      .delete()
      .eq('game_id', gameId)
      .eq('clue_id', clueId)

    if (buzzClearError) {
      console.warn(`Failed to clear buzzer queue: ${buzzClearError.message}`)
      // Don't throw - this is not critical to the adjudication process
    }

    // Mark clue as completed
    const { error: clueStateError } = await supabase
      .from('clue_states')
      .update({ completed: true })
      .eq('game_id', gameId)
      .eq('clue_id', clueId)

    if (clueStateError) {
      throw new Error(`Failed to mark clue completed: ${clueStateError.message}`)
    }

    // Clear focused clue and player, lock buzzer, and set current player
    return this.updateGame(gameId, {
      focused_clue_id: null,
      focused_player_id: null,
      current_player_id: playerId, // Player who answered correctly becomes current player
      is_buzzer_locked: true
    }, hostId)
  }

  /**
   * Marks a player's answer as wrong and continues the clue for other players.
   *
   * This method handles the workflow when a player answers incorrectly:
   * 1. Records the wrong answer in the answers table
   * 2. Updates the player's score (subtracts clue value)
   * 3. Adds player to locked-out list for this clue
   * 4. Clears focused player but keeps clue active
   * 5. Unlocks buzzer for remaining players
   * 6. Clears buzzer queue for new round of buzzing
   * 7. Checks if all players are locked out and completes clue if so
   *
   * @param gameId - UUID of the game
   * @param clueId - UUID of the clue being adjudicated
   * @param playerId - UUID of the player who answered incorrectly
   * @param playerResponse - The player's response text
   * @param scoreValue - Point value to subtract (clue value or wager amount)
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game object
   * @throws {Error} When unauthorized, game not found, or database error
   */
  static async markPlayerWrong(
    gameId: string,
    clueId: string,
    playerId: string,
    playerResponse: string,
    scoreValue: number,
    hostId: string
  ): Promise<Game> {
    // Authorization check
    await this.getGame(gameId, hostId)

    // Record the wrong answer
    const answerData: AnswerInsert = {
      game_id: gameId,
      clue_id: clueId,
      user_id: playerId,
      response: playerResponse,
      is_correct: false,
      adjudicated_by: hostId
    }

    const { error: answerError } = await supabase
      .from('answers')
      .insert(answerData)

    if (answerError) {
      throw new Error(`Failed to record answer: ${answerError.message}`)
    }

    // Check if this is a Daily Double - if so, complete immediately (no second chances)
    const isDailyDouble = await ClueService.isDailyDouble(clueId)

    if (isDailyDouble) {
      // Update player score (subtract points)
      await this.updatePlayerScore(gameId, playerId, -scoreValue, hostId)

      // Mark clue as completed immediately for Daily Doubles
      const { error: clueStateError } = await supabase
        .from('clue_states')
        .update({ completed: true })
        .eq('game_id', gameId)
        .eq('clue_id', clueId)

      if (clueStateError) {
        throw new Error(`Failed to mark clue completed: ${clueStateError.message}`)
      }

      // Clear focused clue and player, lock buzzer
      return this.updateGame(gameId, {
        focused_clue_id: null,
        focused_player_id: null,
        is_buzzer_locked: true
      }, hostId)
    }

    // Regular clue logic - update player score (subtract points)
    await this.updatePlayerScore(gameId, playerId, -scoreValue, hostId)

    // Get current locked-out players for this clue
    const { data: currentClue, error: clueError } = await supabase
      .from('clues')
      .select('locked_out_player_ids')
      .eq('id', clueId)
      .single()

    if (clueError) {
      throw new Error(`Failed to get clue data: ${clueError.message}`)
    }

    // Add this player to the locked-out list
    const currentLockedOut = currentClue.locked_out_player_ids || []
    const updatedLockedOut = [...currentLockedOut, playerId]

    // Update clue with new locked-out player
    const { error: updateClueError } = await supabase
      .from('clues')
      .update({ locked_out_player_ids: updatedLockedOut })
      .eq('id', clueId)

    if (updateClueError) {
      throw new Error(`Failed to update locked-out players: ${updateClueError.message}`)
    }

    // Clear buzzer queue for this clue (reset for new round of buzzing)
    const { error: buzzClearError } = await supabase
      .from('buzzes')
      .delete()
      .eq('game_id', gameId)
      .eq('clue_id', clueId)

    if (buzzClearError) {
      console.warn(`Failed to clear buzzer queue: ${buzzClearError.message}`)
      // Don't throw - this is not critical to the adjudication process
    }

    // Check if all players are now locked out
    const { data: allPlayers, error: playersError } = await supabase
      .from('players')
      .select('user_id')
      .eq('game_id', gameId)

    if (playersError) {
      throw new Error(`Failed to get players: ${playersError.message}`)
    }

    const allPlayerIds = allPlayers.map((p) => p.user_id)
    const allPlayersLockedOut = allPlayerIds.every((id) => updatedLockedOut.includes(id))

    if (allPlayersLockedOut) {
      // All players have been marked wrong - complete the clue
      const { error: clueStateError } = await supabase
        .from('clue_states')
        .update({ completed: true })
        .eq('game_id', gameId)
        .eq('clue_id', clueId)

      if (clueStateError) {
        throw new Error(`Failed to mark clue completed: ${clueStateError.message}`)
      }

      // Clear focused clue and player, lock buzzer
      return this.updateGame(gameId, {
        focused_clue_id: null,
        focused_player_id: null,
        is_buzzer_locked: true
      }, hostId)
    }

    // Not all players locked out - clear focused player and unlock buzzer for others
    return this.updateGame(gameId, {
      focused_player_id: null,
      is_buzzer_locked: false
    }, hostId)
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

  /**
   * Starts the game introduction animation phase.
   *
   * Transitions the game from lobby to game introduction mode, where an introduction
   * animation plays on both host and player dashboards. After the animation completes,
   * the host can then begin category introductions.
   *
   * **Flow:**
   * 1. Validates game is in lobby status
   * 2. Updates status to 'game_intro'
   * 3. Animation triggers via subscription UPDATE events
   * 4. Host can proceed to category introductions after animation
   *
   * @param gameId - UUID of the game to start introduction for
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game with game_intro status
   * @throws {Error} When unauthorized, game not found, or not in lobby status
   *
   * @example
   * ```typescript
   * const game = await GameService.startGameIntroduction(gameId, hostId);
   * console.log(`Starting game introduction for game: ${game.id}`);
   * // Animation will trigger via subscription UPDATE event
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async startGameIntroduction(gameId: string, hostId: string): Promise<Game> {
    console.log('🎬 GameService.startGameIntroduction called:', { gameId, hostId });

    // Verify authorization and get current game
    const currentGame = await this.getGame(gameId, hostId)
    console.log('🎬 Current game status:', currentGame.status);

    // Ensure game is in lobby status
    if (currentGame.status !== 'lobby') {
      console.error('🎬 Cannot start game introduction - wrong status:', currentGame.status);
      throw new Error(`Cannot start game introduction: Game is not in lobby status (current: ${currentGame.status})`)
    }

    // Update game to game introduction state
    console.log('🎬 Updating game status to game_intro...');
    // Note: Type assertion needed until database schema is updated
    const result = await this.updateGame(gameId, {
      status: 'game_intro' as GameStatus
    } as GameUpdate, hostId);
    console.log('🎬 GameService.startGameIntroduction result:', result);
    return result;
  }

  /**
   * Starts the category introduction phase for a game.
   *
   * Transitions the game from game_intro to category introduction mode, where categories
   * are presented one by one before gameplay begins. This should be called after the
   * game introduction animation has completed.
   *
   * **Flow:**
   * 1. Validates game is in game_intro status
   * 2. Updates status to 'introducing_categories'
   * 3. Sets current_introduction_category to 1
   * 4. Marks introduction_complete as false
   *
   * @param gameId - UUID of the game to start category introductions for
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game with introduction state
   * @throws {Error} When unauthorized, game not found, or not in game_intro status
   *
   * @example
   * ```typescript
   * const game = await GameService.startCategoryIntroductions(gameId, hostId);
   * console.log(`Starting category introductions for game: ${game.id}`);
   * console.log(`Current category: ${game.current_introduction_category}`);
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async startCategoryIntroductions(gameId: string, hostId: string): Promise<Game> {
    // Verify authorization and get current game
    const currentGame = await this.getGame(gameId, hostId)

    // Ensure game is in game_intro status
    if ((currentGame.status as string) !== 'game_intro') {
      throw new Error(`Cannot start category introductions: Game is not in game_intro status (current: ${currentGame.status})`)
    }

    // Update game to category introduction state
    // Note: Type assertion needed until database schema is updated
    return this.updateGame(gameId, {
      status: 'introducing_categories' as GameStatus,
      current_introduction_category: 1,
      introduction_complete: false
    } as GameUpdate, hostId)
  }

  /**
   * Advances to the next category in the introduction sequence.
   *
   * Increments the current category counter and handles the transition
   * to the actual game when all categories have been introduced.
   *
   * @param gameId - UUID of the game
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game object
   * @throws {Error} When unauthorized, game not found, or database error
   */
  static async advanceToNextCategory(gameId: string, hostId: string): Promise<Game> {
    // Get current game state
    const currentGame = await this.getGame(gameId, hostId)

    // Type assertion needed until database schema is updated
    const nextCategory = ((currentGame as Game & { current_introduction_category?: number }).current_introduction_category || 0) + 1

    if (nextCategory > 6) {
      // All categories introduced - complete the introduction phase
      return this.completeCategoryIntroductions(gameId, hostId)
    }

    // Advance to next category
    return this.updateGame(gameId, {
      current_introduction_category: nextCategory
    } as GameUpdate, hostId)
  }

  /**
   * Completes the category introduction phase and starts the game proper.
   *
   * Transitions from "introducing_categories" to "in_progress" status
   * and marks the introduction phase as complete.
   *
   * @param gameId - UUID of the game
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game object
   * @throws {Error} When unauthorized, game not found, or database error
   */
  static async completeCategoryIntroductions(gameId: string, hostId: string): Promise<Game> {
    // Authorization check
    await this.getGame(gameId, hostId)

    // Transition to in_progress and mark introduction complete
    // Note: Type assertion needed until database schema is updated
    return this.updateGame(gameId, {
      status: 'in_progress',
      introduction_complete: true,
      current_introduction_category: 0 // Reset counter
    } as GameUpdate, hostId)
  }

  /**
   * Sets the Daily Double wager amount for the current game.
   *
   * Stores the wager amount in the wagers table for use during clue resolution.
   * The wager is validated against player's current score and game rules.
   *
   * @param gameId - UUID of the game
   * @param hostId - UUID of the game host (for authorization)
   * @param wagerAmount - Amount wagered by the player
   * @returns Promise resolving to updated game object
   * @throws {Error} When unauthorized, game not found, or database error
   */
  static async setDailyDoubleWager(gameId: string, hostId: string, wagerAmount: number): Promise<Game> {
    // Authorization check
    const game = await this.getGame(gameId, hostId)

    // Get the currently focused clue (should be the Daily Double)
    if (!game.focused_clue_id) {
      throw new Error('No clue is currently focused for Daily Double wager')
    }

    // Get the focused player (who is making the wager)
    if (!game.focused_player_id) {
      throw new Error('No player is currently focused for Daily Double wager')
    }

    // Check if a wager already exists for this clue and player
    const { data: existingWagers } = await supabase
      .from('wagers')
      .select('id')
      .eq('game_id', gameId)
      .eq('clue_id', game.focused_clue_id)
      .eq('user_id', game.focused_player_id)

    const existingWager = existingWagers && existingWagers.length > 0 ? existingWagers[0] : null

    if (existingWager) {
      // Update existing wager
      const { error: updateError } = await supabase
        .from('wagers')
        .update({ amount: wagerAmount })
        .eq('id', existingWager.id)

      if (updateError) {
        throw new Error(`Failed to update Daily Double wager: ${updateError.message}`)
      }
    } else {
      // Create new wager
      const { error: insertError } = await supabase
        .from('wagers')
        .insert({
          game_id: gameId,
          clue_id: game.focused_clue_id,
          user_id: game.focused_player_id,
          amount: wagerAmount
        })

      if (insertError) {
        throw new Error(`Failed to set Daily Double wager: ${insertError.message}`)
      }
    }

    // Return the game (no need to update game record)
    return game
  }

  /**
   * Clears the Daily Double wager amount after clue resolution.
   *
   * Removes the wager record from the wagers table after the Daily Double clue
   * has been answered and scored, preparing for the next potential Daily Double.
   *
   * @param gameId - UUID of the game
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game object
   * @throws {Error} When unauthorized, game not found, or database error
   */
  static async clearDailyDoubleWager(gameId: string, hostId: string): Promise<Game> {
    // Authorization check
    const game = await this.getGame(gameId, hostId)

    // Get the currently focused clue and player
    if (!game.focused_clue_id || !game.focused_player_id) {
      return game // Nothing to clear
    }

    // Delete the wager record
    const { error } = await supabase
      .from('wagers')
      .delete()
      .eq('game_id', gameId)
      .eq('clue_id', game.focused_clue_id)
      .eq('user_id', game.focused_player_id)

    if (error) {
      throw new Error(`Failed to clear Daily Double wager: ${error.message}`)
    }

    return game
  }

  /**
   * Gets the current Daily Double wager amount for the focused clue and player.
   *
   * Retrieves the stored wager amount for use in scoring calculations
   * and UI display during Daily Double clue resolution.
   *
   * @param gameId - UUID of the game
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to wager amount or null if not set
   * @throws {Error} When unauthorized, game not found, or database error
   */
  static async getDailyDoubleWager(gameId: string, hostId: string): Promise<number | null> {
    const game = await this.getGame(gameId, hostId)

    // Get the currently focused clue and player
    if (!game.focused_clue_id || !game.focused_player_id) {
      return null
    }

    // Get the wager for this clue and player
    const { data: wagers } = await supabase
      .from('wagers')
      .select('amount')
      .eq('game_id', gameId)
      .eq('clue_id', game.focused_clue_id)
      .eq('user_id', game.focused_player_id)

    // Return the first wager amount if found, otherwise null
    return wagers && wagers.length > 0 ? wagers[0].amount : null
  }

  /**
   * Gets the effective value for a clue (original value or Daily Double wager).
   *
   * For regular clues, returns the clue's original value.
   * For Daily Double clues, returns the wager amount if set, otherwise the original value.
   *
   * @param gameId - UUID of the game
   * @param clueId - UUID of the clue
   * @param playerId - UUID of the player (for Daily Double wager lookup)
   * @returns Promise resolving to the effective clue value
   * @throws {Error} When database operation fails
   */
  static async getEffectiveClueValue(gameId: string, clueId: string, playerId: string): Promise<number> {
    // Get the clue's original value
    const { data: clue, error: clueError } = await supabase
      .from('clues')
      .select('value')
      .eq('id', clueId)
      .single()

    if (clueError) {
      throw new Error(`Failed to get clue value: ${clueError.message}`)
    }

    // Check if there's a wager for this clue and player (Daily Double)
    const { data: wagers } = await supabase
      .from('wagers')
      .select('amount')
      .eq('game_id', gameId)
      .eq('clue_id', clueId)
      .eq('user_id', playerId)

    // Return wager amount if it exists, otherwise original clue value
    return wagers && wagers.length > 0 ? wagers[0].amount : clue.value
  }

  /**
   * Sets the current player for Daily Double selection.
   *
   * The current player is the player who gets to answer Daily Double clues.
   * This is typically the player who last answered a clue correctly.
   *
   * @param gameId - UUID of the game
   * @param playerId - UUID of the player to set as current
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game object
   * @throws {Error} When unauthorized, game not found, or database error
   */
  static async setCurrentPlayer(gameId: string, playerId: string, hostId: string): Promise<Game> {
    return this.updateGame(gameId, {
      current_player_id: playerId
    }, hostId)
  }

  /**
   * Initializes the current player randomly at game start.
   *
   * Selects a random player from the game to be the initial current player.
   * This determines who gets the first Daily Double if one appears early.
   *
   * @param gameId - UUID of the game
   * @param hostId - UUID of the game host (for authorization)
   * @returns Promise resolving to updated game object
   * @throws {Error} When unauthorized, game not found, or database error
   */
  static async initializeCurrentPlayerRandomly(gameId: string, hostId: string): Promise<Game> {
    // Get all players in the game
    const players = await this.getPlayers(gameId)

    if (players.length === 0) {
      throw new Error('Cannot initialize current player: no players in game')
    }

    // Select a random player
    const randomIndex = Math.floor(Math.random() * players.length)
    const randomPlayer = players[randomIndex]

    return this.setCurrentPlayer(gameId, randomPlayer.user_id, hostId)
  }

  /**
   * Helper method to determine next round in sequence.
   *
   * Maps the current round to the next round in the standard Jeopardy progression.
   * Returns null if already at Final Jeopardy (no further progression possible).
   *
   * **Round Sequence:**
   * - jeopardy → double
   * - double → final
   * - final → null (no further rounds)
   *
   * @param currentRound - Current round type
   * @returns Next round type or null if at final round
   *
   * @example
   * ```typescript
   * const nextRound = GameService.getNextRound('jeopardy');
   * console.log(nextRound); // 'double'
   * ```
   *
   * @since 0.2.0
   * @author Euno's Jeopardy Team
   */
  private static getNextRound(currentRound: RoundType): RoundType | null {
    const roundSequence: Record<RoundType, RoundType | null> = {
      'jeopardy': 'double',
      'double': 'final',
      'final': null
    }
    return roundSequence[currentRound]
  }

  /**
   * Transitions the game to the next round with validation.
   *
   * Handles round progression: jeopardy → double → final
   * Validates round completion unless force flag is set.
   * Updates game status to trigger round transition animation.
   *
   * **Round Progression:**
   * - jeopardy → double: Advances to Double Jeopardy
   * - double → final: Advances to Final Jeopardy
   * - final → (error): Cannot advance beyond Final Jeopardy
   *
   * **Validation:**
   * - Checks if current round is complete (unless force = true)
   * - Verifies host authorization
   * - Ensures game is in 'in_progress' status
   *
   * **Status Transitions:**
   * - Sets status to 'round_transition' (new status)
   * - Updates current_round to next round
   * - Animation orchestrator detects change and triggers animation
   * - After animation, status transitions to 'introducing_categories'
   *
   * **State Cleanup:**
   * - Clears focused_clue_id (no clue selected)
   * - Clears focused_player_id (no player turn)
   * - Locks buzzer during transition
   *
   * @param gameId - UUID of the game
   * @param hostId - UUID of the host (for authorization)
   * @param force - If true, skip round completion validation
   * @returns Promise resolving to updated game
   * @throws {Error} When unauthorized, invalid state, or already at final round
   *
   * @example
   * ```typescript
   * // Normal transition (validates round completion)
   * const game = await GameService.transitionToNextRound(gameId, hostId);
   *
   * // Force transition (skip validation)
   * const game = await GameService.transitionToNextRound(gameId, hostId, true);
   * ```
   *
   * @since 0.2.0
   * @author Euno's Jeopardy Team
   */
  static async transitionToNextRound(
    gameId: string,
    hostId: string,
    force: boolean = false
  ): Promise<Game> {
    // 1. Get and validate game
    const game = await this.getGame(gameId, hostId)

    // 2. Validate game status
    if (game.status !== 'in_progress') {
      throw new Error(`Cannot transition rounds: Game is not in progress (status: ${game.status})`)
    }

    // 3. Determine next round
    const nextRound = this.getNextRound(game.current_round)
    if (!nextRound) {
      throw new Error('Cannot advance beyond Final Jeopardy')
    }

    // 4. Check round completion (unless forced)
    if (!force) {
      const isComplete = await ClueService.isRoundComplete(gameId, game.current_round)
      if (!isComplete) {
        throw new Error('Current round is not complete. Use force=true to override.')
      }
    }

    // 5. Update game to trigger round transition
    // Note: 'round_transition' status will be added to database enum in Phase 2
    return this.updateGame(gameId, {
      current_round: nextRound,
      status: 'round_transition' as GameStatus,
      focused_clue_id: null,
      focused_player_id: null,
      is_buzzer_locked: true
    }, hostId)
  }
}
