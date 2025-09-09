import '../types/game' // Load global types

export interface CSVRow {
  round: RoundType
  category: string
  value: number
  prompt: string
  response: string
}

/**
 * Parse CSV text into structured data
 * Handles quoted fields with commas and converts string values to numbers
 */
export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.trim().split('\n')

  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }

  // Skip header row
  const dataLines = lines.slice(1)
  const rows: CSVRow[] = []

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim()
    if (line) { // Process non-empty lines
      const fields = parseCSVLine(line)

    if (fields.length !== 5) {
      throw new Error(`Row ${i + 2} has ${fields.length} fields, expected 5`)
    }

    const [round, category, valueStr, prompt, response] = fields

    // Validate round type
    if (!isValidRoundType(round)) {
      throw new Error(`Invalid round type "${round}" in row ${i + 2}. Expected: jeopardy, double, or final`)
    }

    // Parse value as number
    const value = parseInt(valueStr, 10)
    if (isNaN(value)) {
      throw new Error(`Invalid value "${valueStr}" in row ${i + 2}. Expected a number`)
    }

    rows.push({
      round,
      category: category.trim(),
      value,
      prompt: prompt.trim(),
      response: response.trim()
    })
    }
  }

  return rows
}

/**
 * Parse a single CSV line, handling quoted fields with commas
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = ''
  let inQuotes = false
  let i = 0

  while (i < line.length) {
    const char = line[i]

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"'
        i += 2
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
        i++
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      fields.push(current)
      current = ''
      i++
    } else {
      current += char
      i++
    }
  }

  // Add the last field
  fields.push(current)

  return fields
}

/**
 * Validate round type
 */
function isValidRoundType(round: string): round is RoundType {
  return ['jeopardy', 'double', 'final'].includes(round)
}

/**
 * Validate basic CSV structure for Jeopardy game
 */
export function validateJeopardyStructure(rows: CSVRow[]): void {
  const jeopardyRows = rows.filter((row) => row.round === 'jeopardy')
  const doubleRows = rows.filter((row) => row.round === 'double')
  const finalRows = rows.filter((row) => row.round === 'final')

  // Check counts
  if (jeopardyRows.length !== 30) {
    throw new Error(`Jeopardy round should have 30 clues, found ${jeopardyRows.length}`)
  }

  if (doubleRows.length !== 30) {
    throw new Error(`Double Jeopardy round should have 30 clues, found ${doubleRows.length}`)
  }

  if (finalRows.length !== 1) {
    throw new Error(`Final Jeopardy should have 1 clue, found ${finalRows.length}`)
  }

  // Check categories (should have 6 categories with 5 clues each)
  validateRoundCategories(jeopardyRows, 'Jeopardy')
  validateRoundCategories(doubleRows, 'Double Jeopardy')
}

/**
 * Validate that a round has proper category structure
 */
function validateRoundCategories(rows: CSVRow[], roundName: string): void {
  const categoryGroups = new Map<string, CSVRow[]>()

  for (const row of rows) {
    if (!categoryGroups.has(row.category)) {
      categoryGroups.set(row.category, [])
    }
    categoryGroups.get(row.category)!.push(row)
  }

  if (categoryGroups.size !== 6) {
    throw new Error(`${roundName} should have 6 categories, found ${categoryGroups.size}`)
  }

  for (const [category, clues] of categoryGroups) {
    if (clues.length !== 5) {
      throw new Error(`Category "${category}" in ${roundName} should have 5 clues, found ${clues.length}`)
    }
  }
}
