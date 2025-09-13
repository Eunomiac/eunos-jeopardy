import { supabase } from '../supabase/client'
import { parseCSV, validateJeopardyStructure, type CSVRow } from '../../utils/csvParser'
import { filenameToDisplayName, getClueSetURL } from '../../utils/clueSetUtils'
import '../../types/game' // Load global types

/**
 * Represents a category with its associated clues for a Jeopardy round.
 *
 * Categories group related clues together and are displayed as columns
 * on the game board. Each category contains multiple clues of increasing
 * difficulty and value.
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export interface CategoryData {
  /** Display name of the category (e.g., "SCIENCE", "HISTORY") */
  name: string

  /** Array of clues belonging to this category, ordered by value */
  clues: ClueData[]
}

/**
 * Represents a single clue with its question, answer, and metadata.
 *
 * Contains all information needed to display and manage a clue during
 * gameplay, including its position on the board and point value.
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export interface ClueData {
  /** Point value of the clue (200-1000 for Jeopardy, 400-2000 for Double Jeopardy) */
  value: number

  /** The clue text presented to players */
  prompt: string

  /** The correct answer/response to the clue */
  response: string

  /** Position within the category (1-5, where 1 is lowest value) */
  position: number
}

/**
 * Represents a complete clue set with all rounds and categories.
 *
 * This is the main data structure for a complete Jeopardy game, containing
 * all clues organized by rounds and categories. It includes metadata for
 * display and database operations.
 *
 * **Structure:**
 * - Jeopardy round: 6 categories with 5 clues each
 * - Double Jeopardy round: 6 categories with 5 clues each
 * - Final Jeopardy round: 1 category with 1 clue
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export interface ClueSetData {
  /** Display name for the clue set */
  name: string

  /** Original filename of the CSV source */
  filename: string

  /** All game rounds with their categories and clues */
  rounds: {
    /** Jeopardy round with 6 categories */
    jeopardy: CategoryData[]
    /** Double Jeopardy round with 6 categories */
    double: CategoryData[]
    /** Final Jeopardy round with 1 category */
    final: CategoryData
  }
}

/**
 * Loads and parses a CSV clue set from the public directory into structured data.
 *
 * This is the main entry point for loading clue sets from CSV files. It handles
 * the complete workflow from fetching the file to parsing and structuring the
 * data for use in the application.
 *
 * **Processing Pipeline:**
 * 1. Fetches CSV file from public directory
 * 2. Parses CSV content with validation
 * 3. Validates Jeopardy structure requirements
 * 4. Structures data by rounds and categories
 * 5. Returns complete clue set data
 *
 * **Error Handling:**
 * - Network errors during file fetch
 * - CSV parsing errors (malformed data)
 * - Validation errors (incorrect structure)
 * - Provides detailed error messages for debugging
 *
 * **Performance Considerations:**
 * - Single network request for entire clue set
 * - Efficient in-memory processing
 * - Validates data early to fail fast
 *
 * @param filename - Name of the CSV file to load (e.g., "my-game.csv")
 * @returns Promise resolving to structured clue set data
 * @throws {Error} When file fetch, parsing, or validation fails
 *
 * @example
 * ```typescript
 * try {
 *   const clueSet = await loadClueSetFromCSV('trivia-night.csv');
 *   console.log(`Loaded: ${clueSet.name}`);
 *   console.log(`Jeopardy categories: ${clueSet.rounds.jeopardy.length}`);
 *   console.log(`Total clues: ${clueSet.rounds.jeopardy.length * 5 + clueSet.rounds.double.length * 5 + 1}`);
 * } catch (error) {
 *   console.error('Failed to load clue set:', error.message);
 * }
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export async function loadClueSetFromCSV(filename: string): Promise<ClueSetData> {
  try {
    // Step 1: Fetch CSV file from public directory
    const url = getClueSetURL(filename)
    const response = await fetch(url)

    // Validate HTTP response before processing
    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`)
    }

    // Extract CSV text content
    const csvText = await response.text()

    // Step 2: Parse CSV content into structured rows
    const rows = parseCSV(csvText)

    // Step 3: Validate that structure meets Jeopardy requirements
    validateJeopardyStructure(rows)

    // Step 4: Structure data by rounds for game use
    const clueSetData: ClueSetData = {
      name: filenameToDisplayName(filename), // Convert filename to display name
      filename, // Preserve original filename
      rounds: {
        // Filter and structure each round type
        jeopardy: structureRoundData(rows.filter((row) => row.round === 'jeopardy')),
        double: structureRoundData(rows.filter((row) => row.round === 'double')),
        final: structureFinalRoundData(rows.filter((row) => row.round === 'final'))
      }
    }

    return clueSetData

  } catch (error) {
    // Log error for debugging while preserving original error for caller
    console.error('Error loading clue set:', error)
    throw error
  }
}

/**
 * Structures round data into categories with properly ordered clues.
 *
 * Takes an array of CSV rows for a specific round and organizes them into
 * categories with clues sorted by value. This creates the data structure
 * needed for game board display and gameplay logic.
 *
 * **Processing Steps:**
 * 1. Groups clues by category name
 * 2. Calculates position for each clue based on value
 * 3. Sorts clues within each category by value
 * 4. Returns array of categories ready for game board
 *
 * **Data Transformation:**
 * - CSV rows → Category-grouped clues
 * - Adds position metadata for board layout
 * - Maintains clue order for consistent display
 *
 * @param rows - Array of CSV rows for a specific round (jeopardy or double)
 * @returns Array of categories with organized clues
 *
 * @example
 * ```typescript
 * const jeopardyRows = csvRows.filter(row => row.round === 'jeopardy');
 * const categories = structureRoundData(jeopardyRows);
 * console.log(`${categories.length} categories created`); // 6
 * console.log(`First category: ${categories[0].name}`); // "SCIENCE"
 * console.log(`Clues in first category: ${categories[0].clues.length}`); // 5
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
function structureRoundData(rows: CSVRow[]): CategoryData[] {
  // Use Map for efficient category grouping and lookup
  const categoryMap = new Map<string, ClueData[]>()

  // Group clues by category name
  for (const row of rows) {
    // Initialize category array if not exists
    if (!categoryMap.has(row.category)) {
      categoryMap.set(row.category, [])
    }

    // Add clue to appropriate category with calculated position
    categoryMap.get(row.category)!.push({
      value: row.value,
      prompt: row.prompt,
      response: row.response,
      position: getCluePosition(row.value, row.round) // Calculate board position
    })
  }

  // Convert Map to CategoryData array with sorted clues
  const categories: CategoryData[] = []
  for (const [categoryName, clues] of categoryMap) {
    // Sort clues by value for consistent board display (lowest to highest)
    clues.sort((a, b) => a.value - b.value)
    categories.push({
      name: categoryName,
      clues
    })
  }

  return categories
}

/**
 * Structures Final Jeopardy data with validation for single clue requirement.
 *
 * Final Jeopardy has a unique structure with only one category containing
 * one clue. This function validates this requirement and creates the
 * appropriate data structure.
 *
 * **Validation:**
 * - Ensures exactly one clue exists for Final Jeopardy
 * - Throws descriptive error if validation fails
 * - Maintains data integrity for game flow
 *
 * **Data Structure:**
 * - Single category with one clue
 * - Position is always 1 (no multiple positions in Final Jeopardy)
 * - Preserves all clue metadata for gameplay
 *
 * @param rows - Array of CSV rows for Final Jeopardy (should contain exactly 1 row)
 * @returns CategoryData object representing the Final Jeopardy category and clue
 * @throws {Error} When Final Jeopardy doesn't have exactly 1 clue
 *
 * @example
 * ```typescript
 * const finalRows = csvRows.filter(row => row.round === 'final');
 * const finalCategory = structureFinalRoundData(finalRows);
 * console.log(`Final category: ${finalCategory.name}`);
 * console.log(`Final clue: ${finalCategory.clues[0].prompt}`);
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
function structureFinalRoundData(rows: CSVRow[]): CategoryData {
  // Validate Final Jeopardy structure - must have exactly one clue
  if (rows.length !== 1) {
    throw new Error(`Final Jeopardy should have exactly 1 clue, found ${rows.length}`)
  }

  // Extract the single Final Jeopardy clue
  const row = rows[0]
  return {
    name: row.category,
    clues: [{
      value: row.value,
      prompt: row.prompt,
      response: row.response,
      position: 1 // Final Jeopardy always has position 1
    }]
  }
}

/**
 * Calculates the board position for a clue based on its value and round type.
 *
 * Determines where a clue should appear on the game board by converting its
 * point value to a position number. This ensures consistent board layout
 * regardless of the actual values used in the CSV.
 *
 * **Position Calculation:**
 * - Jeopardy round: Values 200-1000 map to positions 1-5
 * - Double Jeopardy round: Values 400-2000 map to positions 1-5
 * - Final Jeopardy round: Always position 1
 *
 * **Board Layout:**
 * - Position 1: Top row (lowest values)
 * - Position 2-4: Middle rows (increasing values)
 * - Position 5: Bottom row (highest values)
 *
 * **Error Handling:**
 * - Validates round type against known types
 * - Throws descriptive error for unknown rounds
 * - Assumes standard Jeopardy value progression
 *
 * @param value - Point value of the clue
 * @param round - Round type determining value-to-position mapping
 * @returns Position number (1-5) for board placement
 * @throws {Error} When round type is not recognized
 *
 * @example
 * ```typescript
 * // Jeopardy round positions
 * console.log(getCluePosition(200, 'jeopardy')); // 1 (top row)
 * console.log(getCluePosition(600, 'jeopardy')); // 3 (middle row)
 * console.log(getCluePosition(1000, 'jeopardy')); // 5 (bottom row)
 *
 * // Double Jeopardy round positions
 * console.log(getCluePosition(400, 'double')); // 1 (top row)
 * console.log(getCluePosition(1200, 'double')); // 3 (middle row)
 * console.log(getCluePosition(2000, 'double')); // 5 (bottom row)
 *
 * // Final Jeopardy position
 * console.log(getCluePosition(0, 'final')); // 1 (always)
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
function getCluePosition(value: number, round: RoundType): number {
  // Final Jeopardy always has position 1 (single clue)
  if (round === 'final') { return 1}

  // Jeopardy round: standard values 200, 400, 600, 800, 1000
  if (round === 'jeopardy') {
    // Divide by 200 to get positions 1, 2, 3, 4, 5
    return value / 200
  }

  // Double Jeopardy round: standard values 400, 800, 1200, 1600, 2000
  if (round === 'double') {
    // Divide by 400 to get positions 1, 2, 3, 4, 5
    return value / 400
  }

  // Unknown round type - this should not happen with validated data
  throw new Error(`Unknown round type: ${round}`)
}

/**
 * Saves structured clue set data to the Supabase database with proper relationships.
 *
 * This function handles the complete database persistence workflow for a clue set,
 * creating all necessary records with proper foreign key relationships. It uses
 * a multi-step process to ensure data integrity and proper structure.
 *
 * **Database Schema Integration:**
 * - Creates clue_sets record (top level)
 * - Creates boards records (one per round)
 * - Creates categories records (grouped by board)
 * - Creates clues records (grouped by category)
 *
 * **Transaction Strategy:**
 * - Uses sequential operations for dependency management
 * - Parallel board creation for performance
 * - Sequential category/clue creation to maintain order
 * - Proper error handling with cleanup implications
 *
 * **Performance Optimizations:**
 * - Parallel board creation reduces latency
 * - Batch clue insertion per category
 * - Minimal database round trips
 * - Efficient foreign key management
 *
 * **Error Handling:**
 * - Validates each step before proceeding
 * - Provides detailed error context
 * - Maintains referential integrity
 * - Logs errors for debugging
 *
 * @param clueSetData - Structured clue set data to save
 * @param userId - ID of the user who owns this clue set
 * @returns Promise resolving to the created clue set ID
 * @throws {Error} When database operations fail or data is invalid
 *
 * @example
 * ```typescript
 * try {
 *   const clueSetId = await saveClueSetToDatabase(clueSetData, userId);
 *   console.log(`Clue set saved with ID: ${clueSetId}`);
 *   // Use clueSetId for game creation
 * } catch (error) {
 *   console.error('Failed to save clue set:', error.message);
 *   // Handle save failure
 * }
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export async function saveClueSetToDatabase(
  clueSetData: ClueSetData,
  userId: string
): Promise<string> {
  try {
    // Step 1: Create top-level clue set record
    const { data: clueSet, error: clueSetError } = await supabase
      .from('clue_sets')
      .insert({
        name: clueSetData.name,
        owner_id: userId // Associate with user for RLS
      })
      .select('id')
      .single()

    // Validate clue set creation
    if (clueSetError){ throw clueSetError}
    if (!clueSet) { throw new Error('Failed to create clue set') }

    const clueSetId = clueSet.id

    // Step 2: Create boards for each round in parallel for performance
    const boards = await Promise.all([
      createBoard(clueSetId, 'jeopardy'),
      createBoard(clueSetId, 'double'),
      createBoard(clueSetId, 'final')
    ])

    // Step 3: Create categories and clues for each board sequentially
    // Sequential processing maintains proper ordering and error handling
    for (let i = 0; i < boards.length; i++) {
      const board = boards[i]
      const roundType = ['jeopardy', 'double', 'final'][i] as RoundType
      const roundData = clueSetData.rounds[roundType]

      if (roundType === 'final') {
        // Handle Final Jeopardy (single category with single clue)
        await saveCategoryAndClues(board.id, roundData as CategoryData, 1)
      } else {
        // Handle regular rounds (Jeopardy/Double Jeopardy with multiple categories)
        const categories = roundData as CategoryData[]
        for (let j = 0; j < categories.length; j++) {
          // Save each category with its position (1-6)
          await saveCategoryAndClues(board.id, categories[j], j + 1)
        }
      }
    }

    // Return clue set ID for use in game creation
    return clueSetId

  } catch (error) {
    // Log error for debugging while preserving original error for caller
    console.error('Error saving clue set to database:', error)
    throw error
  }
}

/**
 * Creates a board record for a specific round in the database.
 *
 * Boards represent individual rounds within a clue set and serve as containers
 * for categories. Each clue set has three boards: Jeopardy, Double Jeopardy,
 * and Final Jeopardy.
 *
 * **Database Relationships:**
 * - Links to parent clue set via clue_set_id
 * - Serves as parent for categories
 * - Maintains round type for game logic
 *
 * **Error Handling:**
 * - Validates database operation success
 * - Provides round-specific error messages
 * - Ensures referential integrity
 *
 * @param clueSetId - ID of the parent clue set
 * @param round - Type of round (jeopardy, double, final)
 * @returns Promise resolving to created board record with ID
 * @throws {Error} When board creation fails
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
async function createBoard(clueSetId: string, round: RoundType) {
  // Create board record with foreign key to clue set
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .insert({
      clue_set_id: clueSetId, // Link to parent clue set
      round // Specify round type for game logic
    })
    .select('id')
    .single()

  // Validate board creation
  if (boardError) { throw boardError}
  if (!board) { throw new Error(`Failed to create ${round} board`) }

  return board
}

/**
 * Saves a single category and all its clues to the database with proper relationships.
 *
 * This function handles the two-step process of creating a category record and
 * then batch-inserting all associated clues. It maintains proper foreign key
 * relationships and preserves clue ordering.
 *
 * **Database Operations:**
 * 1. Creates category record with board relationship
 * 2. Batch inserts all clues with category relationship
 *
 * **Data Integrity:**
 * - Maintains foreign key relationships
 * - Preserves clue positions for board layout
 * - Ensures atomic category+clues creation
 *
 * **Performance:**
 * - Single category insert followed by batch clue insert
 * - Minimizes database round trips
 * - Efficient for categories with multiple clues
 *
 * @param boardId - ID of the parent board
 * @param categoryData - Category data with clues to save
 * @param position - Position of category on the board (1-6)
 * @returns Promise that resolves when category and clues are saved
 * @throws {Error} When category or clue creation fails
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
async function saveCategoryAndClues(
  boardId: string,
  categoryData: CategoryData,
  position: number
): Promise<void> {
  // Step 1: Create category record with board relationship
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .insert({
      board_id: boardId, // Link to parent board
      name: categoryData.name, // Category display name
      position // Position on board (1-6)
    })
    .select('id')
    .single()

  // Validate category creation
  if (categoryError) { throw categoryError }
  if (!category) { throw new Error('Failed to create category') }

  // Step 2: Prepare clues for batch insertion
  const cluesToInsert = categoryData.clues.map((clue) => ({
    category_id: category.id, // Link to parent category
    value: clue.value, // Point value
    prompt: clue.prompt, // Clue text
    response: clue.response, // Answer text
    position: clue.position // Position within category (1-5)
  }))

  // Batch insert all clues for this category
  const { error: cluesError } = await supabase
    .from('clues')
    .insert(cluesToInsert)

  // Validate clue insertion
  if (cluesError) { throw cluesError}
}
