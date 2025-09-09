import { supabase } from './services/supabase/client'

// Global type declaration
declare global {
  interface Window {
    testSchema: typeof testCurrentSchema
  }
}

/**
 * Test script to check current Supabase schema
 */
export async function testCurrentSchema() {
  console.log('🔍 Testing current Supabase schema...')

  try {
    // Test if clue_sets table exists
    console.log('\n📋 Testing clue_sets table...')
    const { data: clueSets, error: clueSetsError } = await supabase
      .from('clue_sets')
      .select('*')
      .limit(1)

    if (clueSetsError) {
      console.log('❌ clue_sets table error:', clueSetsError.message)
    } else {
      console.log('✅ clue_sets table exists')
      console.log('Columns:', Object.keys(clueSets?.[0] || {}))
    }

    // Test clues table columns
    console.log('\n🎯 Testing clues table...')
    const { data: clues, error: cluesError } = await supabase
      .from('clues')
      .select('*')
      .limit(1)

    if (cluesError) {
      console.log('❌ clues table error:', cluesError.message)
    } else {
      console.log('✅ clues table exists')
      if (clues && clues.length > 0) {
        console.log('Columns:', Object.keys(clues[0]))

        // Check for new column names
        const hasPrompt = 'prompt' in clues[0]
        const hasResponse = 'response' in clues[0]
        const hasQuestion = 'question' in clues[0] || 'text' in clues[0]
        const hasAnswer = 'answer' in clues[0]

        console.log('Column check:')
        console.log(`  - prompt: ${hasPrompt ? '✅' : '❌'}`)
        console.log(`  - response: ${hasResponse ? '✅' : '❌'}`)
        console.log(`  - question/text: ${hasQuestion ? '✅' : '❌'}`)
        console.log(`  - answer: ${hasAnswer ? '✅' : '❌'}`)
      } else {
        console.log('No clues data to check columns')
      }
    }

    // Test categories table
    console.log('\n📂 Testing categories table...')
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .limit(1)

    if (categoriesError) {
      console.log('❌ categories table error:', categoriesError.message)
    } else {
      console.log('✅ categories table exists')
      if (categories && categories.length > 0) {
        console.log('Columns:', Object.keys(categories[0]))
      }
    }

  } catch (error) {
    console.error('❌ Schema test failed:', error)
  }
}

// Export for easy testing
if (typeof window !== 'undefined') {
  window.testSchema = testCurrentSchema
}
