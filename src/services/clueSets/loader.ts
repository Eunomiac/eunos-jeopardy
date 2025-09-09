import { supabase } from '../supabase/client'
import { parseCSV, validateJeopardyStructure, type CSVRow } from '../../utils/csvParser'
import { filenameToDisplayName, getQuestionSetURL } from '../../utils/questionSetUtils'
import '../../types/game' // Load global types

export interface CategoryData {
  name: string
  clues: ClueData[]
}

export interface ClueData {
  value: number
  prompt: string
  response: string
  position: number
}

export interface ClueSetData {
  name: string
  filename: string
  rounds: {
    jeopardy: CategoryData[]
    double: CategoryData[]
    final: CategoryData
  }
}

/**
 * Load and parse a CSV clue set from the public directory
 */
export async function loadClueSetFromCSV(filename: string): Promise<ClueSetData> {
  try {
    // Fetch CSV file
    const url = getQuestionSetURL(filename)
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`Failed to fetch ${filename}: ${response.status} ${response.statusText}`)
    }

    const csvText = await response.text()

    // Parse CSV
    const rows = parseCSV(csvText)

    // Validate structure
    validateJeopardyStructure(rows)

    // Structure data by rounds
    const clueSetData: ClueSetData = {
      name: filenameToDisplayName(filename),
      filename,
      rounds: {
        jeopardy: structureRoundData(rows.filter((row) => row.round === 'jeopardy')),
        double: structureRoundData(rows.filter((row) => row.round === 'double')),
        final: structureFinalRoundData(rows.filter((row) => row.round === 'final'))
      }
    }

    return clueSetData

  } catch (error) {
    console.error('Error loading clue set:', error)
    throw error
  }
}

/**
 * Structure round data into categories with clues
 */
function structureRoundData(rows: CSVRow[]): CategoryData[] {
  const categoryMap = new Map<string, ClueData[]>()

  // Group clues by category
  for (const row of rows) {
    if (!categoryMap.has(row.category)) {
      categoryMap.set(row.category, [])
    }

    categoryMap.get(row.category)!.push({
      value: row.value,
      prompt: row.prompt,
      response: row.response,
      position: getCluePosition(row.value, row.round)
    })
  }

  // Convert to CategoryData array and sort clues by value
  const categories: CategoryData[] = []
  for (const [categoryName, clues] of categoryMap) {
    clues.sort((a, b) => a.value - b.value)
    categories.push({
      name: categoryName,
      clues
    })
  }

  return categories
}

/**
 * Structure final round data (single category, single clue)
 */
function structureFinalRoundData(rows: CSVRow[]): CategoryData {
  if (rows.length !== 1) {
    throw new Error(`Final Jeopardy should have exactly 1 clue, found ${rows.length}`)
  }

  const row = rows[0]
  return {
    name: row.category,
    clues: [{
      value: row.value,
      prompt: row.prompt,
      response: row.response,
      position: 1
    }]
  }
}

/**
 * Get clue position based on value and round
 */
function getCluePosition(value: number, round: RoundType): number {
  if (round === 'final') { return 1}

  if (round === 'jeopardy') {
    // 200, 400, 600, 800, 1000 → positions 1, 2, 3, 4, 5
    return value / 200
  }

  if (round === 'double') {
    // 400, 800, 1200, 1600, 2000 → positions 1, 2, 3, 4, 5
    return value / 400
  }

  throw new Error(`Unknown round type: ${round}`)
}

/**
 * Save clue set data to Supabase database
 */
export async function saveClueSetToDatabase(
  clueSetData: ClueSetData,
  userId: string
): Promise<string> {
  try {
    // 1. Create clue set record (simple!)
    const { data: clueSet, error: clueSetError } = await supabase
      .from('clue_sets')
      .insert({
        name: clueSetData.name,
        owner_id: userId
      })
      .select('id')
      .single()

    if (clueSetError){ throw clueSetError}
    if (!clueSet) { throw new Error('Failed to create clue set') }

    const clueSetId = clueSet.id

    // 2. Create boards for each round
    const boards = await Promise.all([
      createBoard(clueSetId, 'jeopardy'),
      createBoard(clueSetId, 'double'),
      createBoard(clueSetId, 'final')
    ])

    // 3. Create categories and clues for each board
    for (let i = 0; i < boards.length; i++) {
      const board = boards[i]
      const roundType = ['jeopardy', 'double', 'final'][i] as RoundType
      const roundData = clueSetData.rounds[roundType]

      if (roundType === 'final') {
        // Handle final jeopardy (single category)
        await saveCategoryAndClues(board.id, roundData as CategoryData, 1)
      } else {
        // Handle regular rounds (multiple categories)
        const categories = roundData as CategoryData[]
        for (let j = 0; j < categories.length; j++) {
          await saveCategoryAndClues(board.id, categories[j], j + 1)
        }
      }
    }

    return clueSetId

  } catch (error) {
    console.error('Error saving clue set to database:', error)
    throw error
  }
}

/**
 * Create a board for a specific round
 */
async function createBoard(clueSetId: string, round: RoundType) {
  const { data: board, error: boardError } = await supabase
    .from('boards')
    .insert({
      clue_set_id: clueSetId,
      round
    })
    .select('id')
    .single()

  if (boardError) { throw boardError}
  if (!board) { throw new Error(`Failed to create ${round} board`) }

  return board
}

/**
 * Save a single category and its clues to the database
 */
async function saveCategoryAndClues(
  boardId: string,
  categoryData: CategoryData,
  position: number
): Promise<void> {
  // Create category
  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .insert({
      board_id: boardId,
      name: categoryData.name,
      position
    })
    .select('id')
    .single()

  if (categoryError) { throw categoryError }
  if (!category) { throw new Error('Failed to create category') }

  // Create clues
  const cluesToInsert = categoryData.clues.map((clue) => ({
    category_id: category.id,
    value: clue.value,
    prompt: clue.prompt,
    response: clue.response,
    position: clue.position
  }))

  const { error: cluesError } = await supabase
    .from('clues')
    .insert(cluesToInsert)

  if (cluesError) { throw cluesError}
}
