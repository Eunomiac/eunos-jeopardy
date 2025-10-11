import '../types/game' // Load global types

/**
 * Represents a single row from a Jeopardy CSV file with all required fields.
 *
 * This interface defines the structure for parsed CSV data that will be used
 * to create clue sets in the database. Each row represents one clue with its
 * associated metadata and game round information.
 *
 * **CSV Format Requirements:**
 * - round: Must be 'jeopardy', 'double', or 'final'
 * - category: Category name for the clue (6 categories per round)
 * - value: Point value for the clue (typically 200-1000 for Jeopardy, 400-2000 for Double)
 * - prompt: The clue text that players will see
 * - response: The correct answer/response to the clue
 *
 * @interface
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export interface CSVRow {
  /** Game round type - determines which board the clue appears on */
  round: RoundType

  /** Category name for grouping related clues */
  category: string

  /** Point value awarded for correct answers */
  value: number

  /** The clue text presented to players */
  prompt: string

  /** The correct answer/response to the clue */
  response: string
}

/**
 * Parses CSV text into structured Jeopardy clue data with comprehensive validation.
 *
 * This is the core parsing function that converts raw CSV text into structured
 * data suitable for database storage. It handles complex CSV formatting including
 * quoted fields with embedded commas, validates data types, and ensures proper
 * Jeopardy game structure.
 *
 * **CSV Format Support:**
 * - Standard comma-separated values
 * - Quoted fields with embedded commas and quotes
 * - Escaped quotes within quoted fields ("" becomes ")
 * - Automatic whitespace trimming
 * - Empty line skipping
 *
 * **Validation Features:**
 * - Ensures exactly 5 fields per row (round, category, value, prompt, response)
 * - Validates round types against allowed values
 * - Converts and validates numeric values
 * - Provides detailed error messages with row numbers
 *
 * **Performance Considerations:**
 * - Single-pass parsing for efficiency
 * - Minimal memory allocation during parsing
 * - Early validation to fail fast on malformed data
 *
 * @param csvText - Raw CSV text content to parse
 * @returns Array of parsed and validated CSV rows
 * @throws {Error} When CSV format is invalid, missing fields, or data validation fails
 *
 * @example
 * ```typescript
 * const csvContent = `round,category,value,prompt,response
 * jeopardy,SCIENCE,200,"This element has the symbol 'H'",What is hydrogen?
 * jeopardy,SCIENCE,400,"This gas makes up about 78% of Earth's atmosphere",What is nitrogen?`;
 *
 * try {
 *   const rows = parseCSV(csvContent);
 *   console.log(`Parsed ${rows.length} clues successfully`);
 *   rows.forEach(row => {
 *     console.log(`${row.category} $${row.value}: ${row.prompt}`);
 *   });
 * } catch (error) {
 *   console.error("CSV parsing failed:", error.message);
 * }
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function parseCSV(csvText: string): CSVRow[] {
  // Split into lines and remove any trailing whitespace
  const lines = csvText.trim().split('\n')

  // Validate that CSV has content
  if (lines.length === 0) {
    throw new Error('CSV file is empty')
  }

  // Skip header row (assumes first line contains column headers)
  // Expected header: round,category,value,prompt,response
  const dataLines = lines.slice(1)
  const rows: CSVRow[] = []

  // Process each data line with detailed validation
  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim()

    // Skip empty lines (allows for formatting flexibility)
    if (line) {
      // Parse the line handling quoted fields and embedded commas
      const fields = parseCSVLine(line)

      // Validate field count - Jeopardy CSV must have exactly 5 fields
      if (fields.length !== 5) {
        throw new Error(`Row ${i + 2} has ${fields.length} fields, expected 5`)
      }

      // Destructure fields for clarity and type safety
      const [round, category, valueStr, prompt, response] = fields

      // Validate round type against allowed Jeopardy rounds
      if (!isValidRoundType(round)) {
        throw new Error(`Invalid round type "${round}" in row ${i + 2}. Expected: jeopardy, double, or final`)
      }

      // Parse and validate numeric value field
      const value = parseInt(valueStr, 10)
      if (isNaN(value)) {
        throw new Error(`Invalid value "${valueStr}" in row ${i + 2}. Expected a number`)
      }

      // Create validated row object with trimmed text fields
      rows.push({
        round,
        category: category.trim(), // Remove extra whitespace
        value,
        prompt: prompt.trim(), // Clean clue text
        response: response.trim() // Clean answer text
      })
    }
  }

  return rows
}

/**
 * Parses a single CSV line with support for quoted fields and embedded commas.
 *
 * This function handles the complexity of CSV parsing including quoted fields
 * that may contain commas, quotes, and other special characters. It implements
 * proper CSV escaping rules for maximum compatibility with standard CSV files.
 *
 * **CSV Parsing Rules:**
 * - Fields separated by commas
 * - Fields may be enclosed in double quotes
 * - Quoted fields can contain commas without being split
 * - Double quotes within quoted fields are escaped as ""
 * - Unquoted fields are trimmed of whitespace
 *
 * **Performance Optimizations:**
 * - Single-pass character-by-character parsing
 * - Minimal string concatenation
 * - Early termination on malformed input
 *
 * @param line - Single CSV line to parse
 * @returns Array of field values extracted from the line
 *
 * @example
 * ```typescript
 * // Simple fields
 * parseCSVLine('jeopardy,SCIENCE,200,Simple clue,What is answer?')
 * // Returns: ['jeopardy', 'SCIENCE', '200', 'Simple clue', 'What is answer?']
 *
 * // Quoted field with comma
 * parseCSVLine('jeopardy,SCIENCE,200,"Clue with, comma",What is answer?')
 * // Returns: ['jeopardy', 'SCIENCE', '200', 'Clue with, comma', 'What is answer?']
 *
 * // Escaped quotes
 * parseCSVLine('jeopardy,QUOTES,400,"He said ""Hello""",What is greeting?')
 * // Returns: ['jeopardy', 'QUOTES', '400', 'He said "Hello"', 'What is greeting?']
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
function parseCSVLine(line: string): string[] {
  const fields: string[] = []
  let current = '' // Current field being built
  let inQuotes = false // Track whether we're inside quoted field
  let i = 0 // Character position index

  // Parse character by character for precise control
  while (i < line.length) {
    const char = line[i]

    if (char === '"') {
      // Handle quote characters and escaping
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote: "" becomes " in the output
        current += '"'
        i += 2 // Skip both quote characters
      } else {
        // Toggle quote state: entering or leaving quoted field
        inQuotes = !inQuotes
        i++
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator found outside of quotes
      fields.push(current)
      current = '' // Reset for next field
      i++
    } else {
      // Regular character: add to current field
      current += char
      i++
    }
  }

  // Add the final field (no trailing comma)
  fields.push(current)

  return fields
}

/**
 * Type guard function to validate round type values.
 *
 * Ensures that string values match the expected Jeopardy round types.
 * This provides both runtime validation and TypeScript type narrowing
 * for safer code execution.
 *
 * **Allowed Round Types:**
 * - 'jeopardy': Standard Jeopardy round (6 categories × 5 clues)
 * - 'double': Double Jeopardy round (6 categories × 5 clues, higher values)
 * - 'final': Final Jeopardy round (1 category × 1 clue)
 *
 * @param round - String value to validate as round type
 * @returns True if valid round type, false otherwise
 *
 * @example
 * ```typescript
 * if (isValidRoundType(userInput)) {
 *   // TypeScript now knows userInput is RoundType
 *   console.log(`Valid round: ${userInput}`);
 * } else {
 *   throw new Error(`Invalid round type: ${userInput}`);
 * }
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
function isValidRoundType(round: string): round is RoundType {
  // Check against allowed Jeopardy round types
  return ['jeopardy', 'double', 'final'].includes(round)
}

/**
 * Validates that parsed CSV data conforms to authentic Jeopardy game structure.
 *
 * Ensures that the CSV contains the correct number of clues for each round
 * and that categories are properly structured. This validation is critical
 * for maintaining game integrity and preventing runtime errors during gameplay.
 *
 * **Jeopardy Structure Requirements:**
 * - Jeopardy Round: 30 clues (6 categories × 5 clues each)
 * - Double Jeopardy Round: 30 clues (6 categories × 5 clues each)
 * - Final Jeopardy Round: 1 clue (1 category × 1 clue)
 *
 * **Validation Checks:**
 * - Correct total clue counts per round
 * - Proper category distribution (6 categories per main round)
 * - Equal clues per category (5 clues per category in main rounds)
 * - No missing or extra clues that would break game flow
 *
 * **Error Handling:**
 * - Provides specific error messages indicating what's wrong
 * - Includes actual vs expected counts for debugging
 * - Fails fast to prevent invalid data from reaching database
 *
 * @param rows - Array of parsed CSV rows to validate
 * @throws {Error} When structure doesn't match Jeopardy requirements
 *
 * @example
 * ```typescript
 * try {
 *   const rows = parseCSV(csvContent);
 *   validateJeopardyStructure(rows);
 *   console.log("CSV structure is valid for Jeopardy game");
 * } catch (error) {
 *   console.error("Invalid game structure:", error.message);
 *   // Example: "Jeopardy round should have 30 clues, found 25"
 * }
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function validateJeopardyStructure(rows: CSVRow[]): void {
  // Separate rows by round type for individual validation
  const jeopardyRows = rows.filter((row) => row.round === 'jeopardy')
  const doubleRows = rows.filter((row) => row.round === 'double')
  const finalRows = rows.filter((row) => row.round === 'final')

  // Validate clue counts for each round
  // Standard Jeopardy: 6 categories × 5 clues = 30 total
  if (jeopardyRows.length !== 30) {
    throw new Error(`Jeopardy round should have 30 clues, found ${jeopardyRows.length}`)
  }

  // Double Jeopardy: 6 categories × 5 clues = 30 total
  if (doubleRows.length !== 30) {
    throw new Error(`Double Jeopardy round should have 30 clues, found ${doubleRows.length}`)
  }

  // Final Jeopardy: 1 category × 1 clue = 1 total
  if (finalRows.length !== 1) {
    throw new Error(`Final Jeopardy should have 1 clue, found ${finalRows.length}`)
  }

  // Validate category structure for main rounds
  // Final Jeopardy doesn't need category validation (only 1 clue)
  validateRoundCategories(jeopardyRows, 'Jeopardy')
  validateRoundCategories(doubleRows, 'Double Jeopardy')
}

/**
 * Validates that a round has the correct category structure for Jeopardy gameplay.
 *
 * Ensures that each main round (Jeopardy/Double Jeopardy) has exactly 6 categories
 * with exactly 5 clues each. This structure is essential for proper game board
 * display and Daily Double placement algorithm.
 *
 * **Category Requirements:**
 * - Exactly 6 categories per round
 * - Exactly 5 clues per category
 * - Categories can have any names (no naming restrictions)
 * - Clues within categories can have any values
 *
 * **Algorithm Efficiency:**
 * - Uses Map for O(1) category lookup and grouping
 * - Single pass through rows for optimal performance
 * - Detailed error reporting for debugging
 *
 * @param rows - Array of CSV rows for a specific round
 * @param roundName - Human-readable round name for error messages
 * @throws {Error} When category structure is invalid
 *
 * @example
 * ```typescript
 * // This would pass validation
 * const validRows = [
 *   { round: 'jeopardy', category: 'SCIENCE', value: 200, ... },
 *   { round: 'jeopardy', category: 'SCIENCE', value: 400, ... },
 *   // ... 3 more SCIENCE clues
 *   { round: 'jeopardy', category: 'HISTORY', value: 200, ... },
 *   // ... 4 more HISTORY clues
 *   // ... 4 more categories with 5 clues each
 * ];
 * validateRoundCategories(validRows, 'Jeopardy'); // No error
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
function validateRoundCategories(rows: CSVRow[], roundName: string): void {
  // Group clues by category for structure validation
  const categoryGroups = new Map<string, CSVRow[]>()

  // Build category groups with efficient Map-based grouping
  for (const row of rows) {
    if (!categoryGroups.has(row.category)) {
      categoryGroups.set(row.category, [])
    }
    categoryGroups.get(row.category)?.push(row)
  }

  // Validate total category count (must be exactly 6 for Jeopardy)
  if (categoryGroups.size !== 6) {
    throw new Error(`${roundName} should have 6 categories, found ${categoryGroups.size}`)
  }

  // Validate clue count per category (must be exactly 5 for each category)
  for (const [category, clues] of categoryGroups) {
    if (clues.length !== 5) {
      throw new Error(`Category "${category}" in ${roundName} should have 5 clues, found ${clues.length}`)
    }
  }
}
