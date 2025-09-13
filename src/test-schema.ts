import { supabase } from './services/supabase/client'

// Global type declaration
declare global {
  interface Window {
    testSchema: typeof testCurrentSchema
  }
}

/**
 * Test a single table for existence and structure
 */
async function testTable(tableName: 'clue_sets' | 'clues' | 'categories', emoji: string) {
  console.log(`\n${emoji} Testing ${tableName} table...`)
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1)

  if (error) {
    console.log(`❌ ${tableName} table error:`, error.message)
    return null
  }

  console.log(`✅ ${tableName} table exists`)
  return data
}

/**
 * Check clue column structure for legacy field detection
 */
function checkClueColumns(clues: any[]) {
  if (!clues || clues.length === 0) {
    console.log('No clues data to check columns')
    return
  }

  console.log('Columns:', Object.keys(clues[0]))

  const hasPrompt = 'prompt' in clues[0]
  const hasResponse = 'response' in clues[0]
  const hasLegacyFields = 'question' in clues[0] || 'text' in clues[0]
  const hasAnswer = 'answer' in clues[0]

  console.log('Column check:')
  console.log(`  - prompt: ${hasPrompt ? '✅' : '❌'}`)
  console.log(`  - response: ${hasResponse ? '✅' : '❌'}`)
  console.log(`  - legacy fields (question/text): ${hasLegacyFields ? '⚠️' : '✅'}`)
  console.log(`  - answer: ${hasAnswer ? '✅' : '❌'}`)
}

/**
 * Test script to check current Supabase schema
 */
export async function testCurrentSchema() {
  console.log('🔍 Testing current Supabase schema...')

  try {
    // Test clue_sets table
    const clueSets = await testTable('clue_sets', '📋')
    if (clueSets) {
      console.log('Columns:', Object.keys(clueSets[0] || {}))
    }

    // Test clues table with column analysis
    const clues = await testTable('clues', '🎯')
    if (clues) {
      checkClueColumns(clues)
    }

    // Test categories table
    const categories = await testTable('categories', '📂')
    if (categories && categories.length > 0) {
      console.log('Columns:', Object.keys(categories[0]))
    }

  } catch (error) {
    console.error('❌ Schema test failed:', error)
  }
}

// Export for easy testing
if (typeof window !== 'undefined') {
  window.testSchema = testCurrentSchema
}
