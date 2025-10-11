import { supabase } from '../supabase/client'
import type { ClueSetData, CategoryData } from './loader'

/**
 * Represents a user's clue set for dropdown selection and management.
 *
 * Contains the essential information needed to display and select
 * clue sets in the user interface.
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export interface UserClueSet {
  /** Unique identifier for the clue set */
  id: string

  /** Display name of the clue set */
  name: string

  /** When the clue set was created */
  created_at: string

  /** ID of the user who created this clue set */
  created_by: string
}

/**
 * Represents a summary of a clue set showing categories for all rounds.
 *
 * Used to help users identify and recall the content of a selected
 * clue set before starting a game.
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export interface ClueSetSummary {
  /** Unique identifier for the clue set */
  id: string

  /** Display name of the clue set */
  name: string

  /** Categories organized by round */
  rounds: {
    /** 6 category names for Jeopardy round */
    jeopardy: string[]

    /** 6 category names for Double Jeopardy round */
    doubleJeopardy: string[]

    /** 1 category name for Final Jeopardy */
    finalJeopardy: string
  }

  /** When the clue set was created */
  createdAt: string

  /** Total number of clues in the set (should be 61: 30+30+1) */
  totalClues: number
}

/**
 * Result of a delete operation.
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export interface DeleteResult {
  /** Whether the deletion was successful */
  success: boolean

  /** Error message if deletion failed */
  error?: string
}

/**
 * Service class for managing clue set database operations.
 *
 * Provides functions for retrieving, deleting, and summarizing user clue sets.
 * All operations include proper authentication checks and Row Level Security
 * (RLS) policy enforcement.
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export class ClueSetService { // eslint-disable-line @typescript-eslint/no-extraneous-class
  /**
   * Retrieves all clue sets owned by a specific user.
   *
   * Returns a list of clue sets that can be used to populate dropdown
   * selections and management interfaces. Results are ordered by creation
   * date (newest first).
   *
   * @param userId - ID of the user whose clue sets to retrieve
   * @returns Promise resolving to array of user clue sets
   * @throws {Error} When database query fails
   *
   * @example
   * ```typescript
   * const clueSets = await ClueSetService.getUserClueSets(user.id);
   * console.log(`User has ${clueSets.length} clue sets`);
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async getUserClueSets(userId: string): Promise<UserClueSet[]> {
    const { data, error } = await supabase
      .from('clue_sets')
      .select('id, name, created_at, owner_id')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to retrieve clue sets: ${error.message}`)
    }

    return data.map((row) => ({
      id: row.id,
      name: row.name,
      created_at: row.created_at,
      created_by: row.owner_id
    }))
  }

  /**
   * Deletes a clue set and all its related data.
   *
   * Performs a cascading delete that removes the clue set and all
   * associated boards, categories, and clues. Includes proper
   * authorization checks to ensure only the owner can delete.
   *
   * @param clueSetId - ID of the clue set to delete
   * @param userId - ID of the user requesting deletion (for authorization)
   * @returns Promise resolving to delete result
   *
   * @example
   * ```typescript
   * const result = await ClueSetService.deleteClueSet(clueSetId, user.id);
   * if (result.success) {
   *   console.log('Clue set deleted successfully');
   * } else {
   *   console.error('Delete failed:', result.error);
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async deleteClueSet(clueSetId: string, userId: string): Promise<DeleteResult> {
    try {
      // First verify the user owns this clue set
      const { data: clueSet, error: fetchError } = await supabase
        .from('clue_sets')
        .select('owner_id')
        .eq('id', clueSetId)
        .single()

      if (fetchError) {
        return { success: false, error: `Failed to verify clue set ownership: ${fetchError.message}` }
      }

      if (clueSet.owner_id !== userId) {
        return { success: false, error: 'Unauthorized: You can only delete your own clue sets' }
      }

      // Delete the clue set (cascade will handle related records)
      const { error: deleteError } = await supabase
        .from('clue_sets')
        .delete()
        .eq('id', clueSetId)

      if (deleteError) {
        return { success: false, error: `Failed to delete clue set: ${deleteError.message}` }
      }

      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Retrieves a summary of a clue set showing all categories.
   *
   * Fetches category information for all rounds to help users
   * identify and recall the content of a selected clue set.
   *
   * @param clueSetId - ID of the clue set to summarize
   * @returns Promise resolving to clue set summary
   * @throws {Error} When database query fails or clue set not found
   *
   * @example
   * ```typescript
   * const summary = await ClueSetService.getClueSetSummary(clueSetId);
   * console.log('Jeopardy categories:', summary.rounds.jeopardy);
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async getClueSetSummary(clueSetId: string): Promise<ClueSetSummary> {
    // Get clue set basic info
    const { data: clueSet, error: clueSetError } = await supabase
      .from('clue_sets')
      .select('id, name, created_at')
      .eq('id', clueSetId)
      .single()

    if (clueSetError) {
      throw new Error(`Failed to retrieve clue set: ${clueSetError.message || 'Not found'}`)
    }

    // Get boards and their categories
    const { data: boardsWithCategories, error: boardsError } = await supabase
      .from('boards')
      .select(`
        round,
        categories (
          id,
          name,
          position
        )
      `)
      .eq('clue_set_id', clueSetId)
      .order('round')

    if (boardsError) {
      throw new Error(`Failed to retrieve board categories: ${boardsError.message}`)
    }

    // Organize categories by round
    const jeopardyBoard = boardsWithCategories.find((b) => b.round === 'jeopardy')
    const doubleJeopardyBoard = boardsWithCategories.find((b) => b.round === 'double')
    const finalBoard = boardsWithCategories.find((b) => b.round === 'final')

    const jeopardyCategories = jeopardyBoard?.categories
      .sort((a, b) => a.position - b.position)
      .map((c) => c.name) ?? []

    const doubleJeopardyCategories = doubleJeopardyBoard?.categories
      .sort((a, b) => a.position - b.position)
      .map((c) => c.name) ?? []

    const finalJeopardyCategory = finalBoard?.categories[0]?.name ?? 'Final Jeopardy'

    // Get total clue count
    const { count: totalClues } = await supabase
      .from('clues')
      .select('*', { count: 'exact', head: true })
      .in('category_id', [
        ...(jeopardyBoard?.categories.map((c) => c.id) ?? []),
        ...(doubleJeopardyBoard?.categories.map((c) => c.id) ?? []),
        ...(finalBoard?.categories.map((c) => c.id) ?? [])
      ])

    return {
      id: clueSet.id,
      name: clueSet.name,
      rounds: {
        jeopardy: jeopardyCategories,
        doubleJeopardy: doubleJeopardyCategories,
        finalJeopardy: finalJeopardyCategory
      },
      createdAt: clueSet.created_at,
      totalClues: totalClues ?? 0
    }
  }

  /**
   * Loads complete clue set data from the database for game hosting.
   *
   * Retrieves all clue set data including categories and clues for all rounds,
   * structured for use in the Game Host Dashboard. This provides the complete
   * data needed to display the game board and manage clue selection.
   *
   * **Data Structure:**
   * - Jeopardy round: 6 categories with 5 clues each (200-1000 values)
   * - Double Jeopardy round: 6 categories with 5 clues each (400-2000 values)
   * - Final Jeopardy round: 1 category with 1 clue
   *
   * **Database Query:**
   * Uses nested Supabase query to efficiently load all related data in a single
   * request, including clue sets, boards, categories, and individual clues.
   *
   * @param clueSetId - Unique identifier of the clue set to load
   * @returns Promise resolving to complete clue set data structure
   * @throws {Error} When clue set is not found or database query fails
   *
   * @example
   * ```typescript
   * try {
   *   const clueSetData = await ClueSetService.loadClueSetFromDatabase(clueSetId);
   *   console.log(`Loaded clue set: ${clueSetData.name}`);
   *   console.log(`Jeopardy categories: ${clueSetData.rounds.jeopardy.length}`);
   * } catch (error) {
   *   console.error('Failed to load clue set:', error.message);
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async loadClueSetFromDatabase(clueSetId: string): Promise<ClueSetData> {
    // Define types for database response structure
    interface DatabaseClue {
      id: string
      value: number
      prompt: string
      response: string
      position: number
    }

    interface DatabaseCategory {
      name: string
      position: number
      clues: DatabaseClue[]
    }

    interface DatabaseBoard {
      round: string
      categories: DatabaseCategory[]
    }
    // First, get the clue set basic info
    const { data: clueSet, error: clueSetError } = await supabase
      .from('clue_sets')
      .select('id, name')
      .eq('id', clueSetId)
      .single()

    if (clueSetError) {
      throw new Error(`Failed to load clue set: ${clueSetError.message}`)
    }

    // Load boards with their categories and clues
    const { data: boards, error: boardsError } = await supabase
      .from('boards')
      .select(`
        round,
        categories (
          name,
          position,
          clues (
            id,
            value,
            prompt,
            response,
            position
          )
        )
      `)
      .eq('clue_set_id', clueSetId)

    if (boardsError) {
      throw new Error(`Failed to load board data: ${boardsError.message}`)
    }

    // Extract boards by round type
    const typedBoards = boards as DatabaseBoard[]
    const jeopardyBoard = typedBoards.find((b) => b.round === 'jeopardy')
    const doubleBoard = typedBoards.find((b) => b.round === 'double')
    const finalBoard = typedBoards.find((b) => b.round === 'final')

    // Transform categories and clues for regular rounds (jeopardy/double)
    const transformRegularRound = (board: DatabaseBoard | undefined): CategoryData[] => {
      if (!board?.categories) {
        return []
      }

      const sortedCategories = [...board.categories].sort((a, b) => a.position - b.position)
      return sortedCategories.map((category) => ({
        name: category.name,
        clues: [...category.clues]
          .sort((a, b) => a.position - b.position)
          .map((clue) => ({
            id: clue.id,
            value: clue.value,
            prompt: clue.prompt,
            response: clue.response,
            position: clue.position
          }))
      }))
    }

    // Transform final jeopardy (single category)
    const transformFinalRound = (board: DatabaseBoard | undefined): CategoryData => {
      if (!board?.categories[0]) {
        return {
          name: 'Final Jeopardy',
          clues: []
        }
      }

      const category = board.categories[0]
      return {
        name: category.name,
        clues: [...category.clues]
          .sort((a, b) => a.position - b.position)
          .map((clue) => ({
            id: clue.id,
            value: clue.value,
            prompt: clue.prompt,
            response: clue.response,
            position: clue.position
          }))
      }
    }

    // Structure data according to ClueSetData interface
    return {
      name: clueSet.name,
      filename: `${clueSet.name}.csv`, // Reconstruct filename for compatibility
      rounds: {
        jeopardy: transformRegularRound(jeopardyBoard),
        double: transformRegularRound(doubleBoard),
        final: transformFinalRound(finalBoard)
      }
    }
  }

  /**
   * Checks if a clue set name already exists for a user.
   *
   * Used to prevent duplicate clue set names and provide
   * appropriate user feedback during upload process.
   *
   * @param name - Name to check for duplicates
   * @param userId - ID of the user to check within
   * @returns Promise resolving to true if name exists, false otherwise
   * @throws {Error} When database query fails
   *
   * @example
   * ```typescript
   * const exists = await ClueSetService.checkDuplicateName('My Game', user.id);
   * if (exists) {
   *   // Prompt user for different name or overwrite option
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  static async checkDuplicateName(name: string, userId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('clue_sets')
      .select('id')
      .eq('owner_id', userId)
      .eq('name', name)
      .limit(1)

    if (error) {
      throw new Error(`Failed to check duplicate name: ${error.message}`)
    }

    return data.length > 0
  }
}
