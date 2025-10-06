import { supabase } from '../supabase/client'
import type { Tables, TablesInsert, TablesUpdate } from '../supabase/types'

/** Clue entity type from database schema */
export type Clue = Tables<'clues'>

/** Clue state entity type from database schema */
export type ClueState = Tables<'clue_states'>

/** Insert type for creating new clue states */
export type ClueStateInsert = TablesInsert<'clue_states'>

/**
 * Enhanced clue data with state information for gameplay
 */
export interface ClueWithState extends Clue {
  /** Current state of the clue in the game */
  state?: ClueState
  /** Whether this clue is a Daily Double */
  isDailyDouble?: boolean
}

/**
 * Daily Double position data structure
 */
export interface DailyDoublePosition {
  /** Category number (1-based) */
  category: number
  /** Row number (1-based) */
  row: number
}

/**
 * Service class for managing clue-related operations during gameplay.
 *
 * This service handles clue state management, selection, revelation, and completion
 * tracking for active Jeopardy games. It works in conjunction with GameService to
 * provide complete clue lifecycle management.
 *
 * **Key Responsibilities:**
 * - Clue state initialization and tracking
 * - Clue selection and focus management
 * - Clue revelation and content display
 * - Completion tracking and progress monitoring
 * - Daily Double detection and handling
 *
 * **Security Features:**
 * - All operations require proper game authorization
 * - Host-only operations are protected
 * - RLS policies enforce data isolation
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export class ClueService {
  /**
   * Initializes clue states for all clues in a game's clue set.
   *
   * Creates clue_states entries for every clue in the game's clue set,
   * setting initial state (not revealed, not completed). This should be
   * called when a game is created or started.
   *
   * @param gameId - UUID of the game to initialize clue states for
   * @returns Promise resolving to array of created clue states
   * @throws {Error} When database operation fails
   */
  static async initializeClueStates(gameId: string): Promise<ClueState[]> {
    // First, get all clues for the game's clue set
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('clue_set_id')
      .eq('id', gameId)
      .single()

    if (gameError) {
      throw new Error(`Failed to fetch game: ${gameError.message}`)
    }

    if (!game?.clue_set_id) {
      throw new Error('Game does not have a clue set assigned')
    }

    // Get all clues for this clue set using separate queries
    // First, get all boards for this clue set
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select('id')
      .eq('clue_set_id', game.clue_set_id)

    if (boardsError) {
      throw new Error(`Failed to fetch boards: ${boardsError.message}`)
    }

    if (!boards || boards.length === 0) {
      throw new Error('No boards found for this clue set')
    }

    const boardIds = boards.map((board) => board.id)

    // Then, get all categories for these boards
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id')
      .in('board_id', boardIds)

    if (categoriesError) {
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`)
    }

    if (!categories || categories.length === 0) {
      throw new Error('No categories found for this clue set')
    }

    const categoryIds = categories.map((category) => category.id)

    // Finally, get all clues for these categories
    const { data: clues, error: cluesError } = await supabase
      .from('clues')
      .select('id')
      .in('category_id', categoryIds)

    if (cluesError) {
      throw new Error(`Failed to fetch clues: ${cluesError.message}`)
    }

    if (!clues || clues.length === 0) {
      throw new Error('No clues found for this clue set')
    }

    // Create clue state entries for all clues
    const clueStateInserts: ClueStateInsert[] = clues.map((clue) => ({
      game_id: gameId,
      clue_id: clue.id,
      revealed: false,
      completed: false
    }))

    const { data, error } = await supabase
      .from('clue_states')
      .insert(clueStateInserts)
      .select()

    if (error) {
      throw new Error(`Failed to initialize clue states: ${error.message}`)
    }

    return data || []
  }

  /**
   * Checks if a clue is a Daily Double based on its position and board data.
   *
   * @param clueId - UUID of the clue to check
   * @returns Promise resolving to true if the clue is a Daily Double
   * @throws {Error} When database operation fails
   */
  static async isDailyDouble(clueId: string): Promise<boolean> {
    // Get clue with its category and board information
    const { data: clue, error: clueError } = await supabase
      .from('clues')
      .select(`
        position,
        category:categories!inner(
          position,
          board:boards!inner(
            daily_double_cells
          )
        )
      `)
      .eq('id', clueId)
      .single()

    if (clueError) {
      throw new Error(`Failed to check Daily Double status: ${clueError.message}`)
    }

    if (!clue?.category) {
      return false
    }

    // Parse Daily Double positions from JSONB
    const dailyDoublePositions = clue.category.board?.daily_double_cells as unknown as DailyDoublePosition[] | null

    if (!dailyDoublePositions || !Array.isArray(dailyDoublePositions)) {
      return false
    }

    // Check if this clue's position matches any Daily Double position
    return dailyDoublePositions.some((position) =>
      position.category === clue.category.position &&
      position.row === clue.position
    )
  }

  /**
   * Gets Daily Double positions for a specific board/round.
   *
   * @param clueSetId - UUID of the clue set
   * @param round - Round type to get Daily Double positions for
   * @returns Promise resolving to array of Daily Double positions
   * @throws {Error} When database operation fails
   */
  static async getDailyDoublePositions(clueSetId: string, round: 'jeopardy' | 'double' | 'final'): Promise<DailyDoublePosition[]> {
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('daily_double_cells')
      .eq('clue_set_id', clueSetId)
      .eq('round', round)
      .single()

    if (boardError) {
      throw new Error(`Failed to get Daily Double positions: ${boardError.message}`)
    }

    if (!board?.daily_double_cells) {
      return []
    }

    // Parse and validate Daily Double positions
    const positions = board.daily_double_cells as unknown as DailyDoublePosition[]
    return Array.isArray(positions) ? positions : []
  }

  /**
   * Retrieves a clue by its ID with full details.
   *
   * @param clueId - UUID of the clue to retrieve
   * @returns Promise resolving to the clue data
   * @throws {Error} When clue not found or database error
   */
  static async getClueById(clueId: string): Promise<Clue> {
    const { data, error } = await supabase
      .from('clues')
      .select('*')
      .eq('id', clueId)
      .single()

    if (error) {
      throw new Error(`Failed to fetch clue: ${error.message}`)
    }

    if (!data) {
      throw new Error('Clue not found')
    }

    return data
  }

  /**
   * Gets the current state of a specific clue in a game.
   *
   * @param gameId - UUID of the game
   * @param clueId - UUID of the clue
   * @returns Promise resolving to the clue state, or null if not found
   * @throws {Error} When database operation fails
   */
  static async getClueState(gameId: string, clueId: string): Promise<ClueState | null> {
    const { data, error } = await supabase
      .from('clue_states')
      .select('*')
      .eq('game_id', gameId)
      .eq('clue_id', clueId)
      .single()

    if (error) {
      // Return null if not found, throw for other errors
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Failed to fetch clue state: ${error.message}`)
    }

    return data
  }

  /**
   * Gets all clue states for a game.
   *
   * @param gameId - UUID of the game
   * @returns Promise resolving to array of clue states
   * @throws {Error} When database operation fails
   */
  static async getGameClueStates(gameId: string): Promise<ClueState[]> {
    const { data, error } = await supabase
      .from('clue_states')
      .select('*')
      .eq('game_id', gameId)

    if (error) {
      throw new Error(`Failed to fetch clue states: ${error.message}`)
    }

    return data || []
  }

  /**
   * Marks a clue as revealed in the game.
   *
   * This locks the clue selection and makes the clue content visible
   * to all players. Should be called when host clicks "Reveal Prompt".
   *
   * @param gameId - UUID of the game
   * @param clueId - UUID of the clue to reveal
   * @returns Promise resolving to updated clue state
   * @throws {Error} When database operation fails
   */
  static async revealClue(gameId: string, clueId: string): Promise<ClueState> {
    const { data, error } = await supabase
      .from('clue_states')
      .update({ revealed: true })
      .eq('game_id', gameId)
      .eq('clue_id', clueId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to reveal clue: ${error.message}`)
    }

    if (!data) {
      throw new Error('No clue state found to update')
    }

    return data
  }

  /**
   * Marks a clue as completed in the game.
   *
   * This should be called after final adjudication of the clue,
   * indicating that no more attempts are allowed.
   *
   * @param gameId - UUID of the game
   * @param clueId - UUID of the clue to complete
   * @returns Promise resolving to updated clue state
   * @throws {Error} When database operation fails
   */
  static async markClueCompleted(gameId: string, clueId: string): Promise<ClueState> {
    const { data, error } = await supabase
      .from('clue_states')
      .update({ completed: true })
      .eq('game_id', gameId)
      .eq('clue_id', clueId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to complete clue: ${error.message}`)
    }

    if (!data) {
      throw new Error('No clue state found to update')
    }

    return data
  }

  /**
   * Gets count of completed clues in current round.
   *
   * @param gameId - UUID of the game
   * @param round - Current round type
   * @returns Promise resolving to count of completed clues
   * @throws {Error} When database operation fails
   */
  static async getCompletedCluesCount(gameId: string): Promise<number> {
    // This is a complex query that needs to join multiple tables
    // For now, return a simple count - will implement round-specific logic later
    const { data, error } = await supabase
      .from('clue_states')
      .select('*', { count: 'exact' })
      .eq('game_id', gameId)
      .eq('completed', true)

    if (error) {
      throw new Error(`Failed to count completed clues: ${error.message}`)
    }

    return data?.length || 0
  }

  /**
   * Gets count of completed clues for a specific round.
   *
   * Filters clue states by round to accurately track progress within
   * the current round, ignoring completed clues from previous rounds.
   * This is essential for round transition logic to determine when
   * a round is complete.
   *
   * **Query Strategy:**
   * 1. Get game's clue_set_id
   * 2. Get board_id for the specified round
   * 3. Get all category_ids for that board
   * 4. Get all clue_ids for those categories
   * 5. Count clue_states where clue_id IN (board clues) AND completed = true
   *
   * @param gameId - UUID of the game
   * @param round - Round type to check ("jeopardy" | "double" | "final")
   * @returns Promise resolving to count of completed clues in the round
   * @throws {Error} When database operation fails
   *
   * @example
   * ```typescript
   * const completedCount = await ClueService.getCompletedCluesCountByRound(gameId, 'jeopardy');
   * console.log(`Completed ${completedCount} of 30 clues in Jeopardy round`);
   * ```
   *
   * @since 0.2.0
   * @author Euno's Jeopardy Team
   */
  static async getCompletedCluesCountByRound(
    gameId: string,
    round: RoundType
  ): Promise<number> {
    // Step 1: Get game's clue_set_id
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('clue_set_id')
      .eq('id', gameId)
      .single()

    if (gameError) {
      throw new Error(`Failed to fetch game: ${gameError.message}`)
    }

    if (!game?.clue_set_id) {
      throw new Error('Game does not have a clue set assigned')
    }

    // Step 2: Get board_id for the specified round
    const { data: board, error: boardError } = await supabase
      .from('boards')
      .select('id')
      .eq('clue_set_id', game.clue_set_id)
      .eq('round', round)
      .single()

    if (boardError) {
      throw new Error(`Failed to fetch board for ${round} round: ${boardError.message}`)
    }

    if (!board) {
      throw new Error(`No board found for ${round} round`)
    }

    // Step 3: Get all category_ids for that board
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('id')
      .eq('board_id', board.id)

    if (categoriesError) {
      throw new Error(`Failed to fetch categories: ${categoriesError.message}`)
    }

    if (!categories || categories.length === 0) {
      throw new Error('No categories found for this board')
    }

    const categoryIds = categories.map((category) => category.id)

    // Step 4: Get all clue_ids for those categories
    const { data: clues, error: cluesError } = await supabase
      .from('clues')
      .select('id')
      .in('category_id', categoryIds)

    if (cluesError) {
      throw new Error(`Failed to fetch clues: ${cluesError.message}`)
    }

    if (!clues || clues.length === 0) {
      return 0 // No clues in this round
    }

    const clueIds = clues.map((clue) => clue.id)

    // Step 5: Count completed clue_states for this round's clues
    const { data: clueStates, error: statesError } = await supabase
      .from('clue_states')
      .select('*')
      .eq('game_id', gameId)
      .in('clue_id', clueIds)
      .eq('completed', true)

    if (statesError) {
      throw new Error(`Failed to count completed clues: ${statesError.message}`)
    }

    return clueStates?.length || 0
  }

  /**
   * Checks if all clues in a round have been completed.
   *
   * Determines round completion by comparing the count of completed clues
   * against the expected total for the round (30 for jeopardy/double, 1 for final).
   * Used by round transition logic to enable/disable the "Next Round" button.
   *
   * @param gameId - UUID of the game
   * @param round - Round type to check
   * @returns Promise resolving to true if all clues completed
   * @throws {Error} When database operation fails
   *
   * @example
   * ```typescript
   * const isComplete = await ClueService.isRoundComplete(gameId, 'jeopardy');
   * if (isComplete) {
   *   console.log('Jeopardy round is complete!');
   *   // Enable "Next Round" button
   * }
   * ```
   *
   * @since 0.2.0
   * @author Euno's Jeopardy Team
   */
  static async isRoundComplete(gameId: string, round: RoundType): Promise<boolean> {
    const totalClues = round === 'final' ? 1 : 30
    const completedCount = await this.getCompletedCluesCountByRound(gameId, round)
    return completedCount >= totalClues
  }
}
