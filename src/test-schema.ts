/**
 * Database schema testing utilities for Euno's Jeopardy development.
 *
 * This module provides utilities for testing and validating the Supabase database
 * schema during development. It helps ensure that database tables exist, have the
 * correct structure, and contain expected data formats.
 *
 * **Key Features:**
 * - Individual table existence and structure testing
 * - Column structure validation and legacy field detection
 * - Browser console integration for easy development testing
 * - Comprehensive schema validation reporting
 *
 * **Use Cases:**
 * - Development environment validation
 * - Database migration verification
 * - Schema debugging and troubleshooting
 * - Legacy field detection during updates
 *
 * **Browser Usage:**
 * After importing, the testSchema function is available globally:
 * ```javascript
 * // In browser console
 * window.testSchema();
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

import { supabase } from './services/supabase/client'
import type { Tables } from './services/supabase/types'

/**
 * Global type declaration for browser console access.
 *
 * Extends the Window interface to include the testSchema function,
 * enabling easy access from browser developer tools for debugging
 * and development purposes.
 */
declare global {
  interface Window {
    testSchema: typeof testCurrentSchema
  }
}

/**
 * Tests a single database table for existence and basic structure.
 *
 * Performs a lightweight query to verify that a table exists and is accessible
 * with the current authentication and RLS policies. Returns sample data for
 * structure analysis and column validation.
 *
 * **Test Process:**
 * 1. Executes a SELECT query with LIMIT 1 for efficiency
 * 2. Checks for database errors (table missing, permission issues)
 * 3. Reports success/failure with descriptive console output
 * 4. Returns sample data for further analysis
 *
 * **Error Handling:**
 * - Catches and reports Supabase query errors
 * - Provides descriptive error messages for debugging
 * - Returns null on error to allow continued testing
 *
 * @param tableName - Name of the table to test (restricted to known tables)
 * @param emoji - Emoji for visual console output formatting
 * @returns Promise resolving to sample table data or null on error
 *
 * @example
 * ```typescript
 * const clues = await testTable('clues', '🎯');
 * if (clues) {
 *   console.log('Clues table structure:', Object.keys(clues[0]));
 * }
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
async function testTable(tableName: 'clue_sets' | 'clues' | 'categories', emoji: string) {
  // Log test start with visual formatting
  console.log(`\n${emoji} Testing ${tableName} table...`)

  // Execute lightweight query to test table existence and access
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1)

  // Handle query errors (table missing, permission issues, etc.)
  if (error) {
    console.log(`❌ ${tableName} table error:`, error.message)
    return null
  }

  // Report successful table access
  console.log(`✅ ${tableName} table exists`)
  return data
}

/**
 * Analyzes clue table column structure for legacy field detection and validation.
 *
 * Examines the structure of clue records to detect legacy column names and
 * validate that the current schema is being used. This is particularly important
 * during database migrations and schema updates.
 *
 * **Column Analysis:**
 * - prompt/response: Current schema field names
 * - question/text/answer: Legacy field names from older schema versions
 * - Provides visual feedback for each field type
 *
 * **Legacy Detection:**
 * - Identifies outdated column names that need migration
 * - Warns about mixed schema usage
 * - Helps ensure consistent data structure
 *
 * **Use Cases:**
 * - Database migration validation
 * - Schema consistency checking
 * - Development environment verification
 * - Legacy data detection
 *
 * @param clues - Array of clue records to analyze
 *
 * @example
 * ```typescript
 * const clues = await supabase.from('clues').select('*').limit(5);
 * checkClueColumns(clues.data);
 * // Output:
 * // Columns: ['id', 'prompt', 'response', 'value', ...]
 * // Column check:
 * //   - prompt: ✅
 * //   - response: ✅
 * //   - legacy fields: ✅
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
function checkClueColumns(clues: Tables<'clues'>[]) {
  // Handle empty data gracefully
  if (clues.length === 0) {
    console.log('No clues data to check columns')
    return
  }

  // Display available columns for reference
  console.log('Columns:', Object.keys(clues[0]))

  // Check for current schema fields
  const hasPrompt = 'prompt' in clues[0]
  const hasResponse = 'response' in clues[0]

  // Check for legacy schema fields
  const hasLegacyFields = 'question' in clues[0] || 'text' in clues[0]
  const hasAnswer = 'answer' in clues[0]

  // Report column analysis with visual indicators
  console.log('Column check:')
  console.log(`  - prompt: ${hasPrompt ? '✅' : '❌'}`)
  console.log(`  - response: ${hasResponse ? '✅' : '❌'}`)
  console.log(`  - legacy fields (question/text): ${hasLegacyFields ? '⚠️' : '✅'}`)
  console.log(`  - answer: ${hasAnswer ? '✅' : '❌'}`)
}

/**
 * Comprehensive database schema testing function for development and debugging.
 *
 * Performs a complete validation of the Euno's Jeopardy database schema by
 * testing all core tables for existence, accessibility, and structure. This
 * function is the main entry point for schema validation during development.
 *
 * **Test Coverage:**
 * - clue_sets table: Validates clue set storage and structure
 * - clues table: Tests clue data with legacy field detection
 * - categories table: Verifies category organization structure
 *
 * **Validation Process:**
 * 1. Tests each table for existence and basic access
 * 2. Analyzes column structure and data format
 * 3. Detects legacy fields and schema inconsistencies
 * 4. Reports comprehensive results with visual feedback
 *
 * **Error Handling:**
 * - Catches and reports all database errors
 * - Continues testing even if individual tables fail
 * - Provides detailed error messages for debugging
 *
 * **Use Cases:**
 * - Development environment validation
 * - Database migration verification
 * - Schema debugging and troubleshooting
 * - New developer onboarding validation
 *
 * @returns Promise that resolves when all tests complete
 *
 * @example
 * ```typescript
 * // Programmatic usage
 * await testCurrentSchema();
 *
 * // Browser console usage
 * window.testSchema();
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export async function testCurrentSchema() {
  console.log('🔍 Testing current Supabase schema...')

  try {
    // Test clue_sets table for clue set storage
    const clueSets = await testTable('clue_sets', '📋')
    if (clueSets) {
      console.log('Columns:', Object.keys(clueSets[0] || {}))
    }

    // Test clues table with comprehensive column analysis
    const clues = await testTable('clues', '🎯')
    if (clues) {
      checkClueColumns(clues as Tables<'clues'>[])
    }

    // Test categories table for category organization
    const categories = await testTable('categories', '📂')
    if (categories && categories.length > 0) {
      console.log('Columns:', Object.keys(categories[0]))
    }

  } catch (error) {
    // Log comprehensive error information for debugging
    console.error('❌ Schema test failed:', error)
  }
}

/**
 * Browser integration for easy development testing.
 *
 * Makes the testCurrentSchema function available globally in browser
 * environments for easy access from developer tools. This enables
 * quick schema validation during development without needing to
 * import or call the function programmatically.
 *
 * **Browser Usage:**
 * ```javascript
 * // In browser developer console
 * window.testSchema();
 * ```
 *
 * **Environment Detection:**
 * - Only attaches to window object in browser environments
 * - Safe for server-side rendering and Node.js environments
 * - No-op in non-browser contexts
 */
if (typeof window !== 'undefined') {
  window.testSchema = testCurrentSchema
}
