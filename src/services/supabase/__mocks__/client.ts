/**
 * Mock for Supabase client module
 * Provides a direct mock client for testing with table-aware defaults
 */

// Create a chainable query builder mock with table-aware data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createChainableQuery = (table: string): any => {
  // Store the table name for data resolution
  const currentTable = table

  // Get table-specific mock data
  const getTableData = () => {
    switch (currentTable) {
      case 'boards':
        return [
          {
            id: 'board-1',
            round: 'jeopardy',
            categories: [
              {
                id: 'cat-1',
                name: 'Category 1',
                position: 0,
                clues: [
                  { id: 'clue-1', prompt: 'Test prompt 1', response: 'Test response 1', value: 200, position: 0 },
                  { id: 'clue-2', prompt: 'Test prompt 2', response: 'Test response 2', value: 400, position: 1 },
                  { id: 'clue-3', prompt: 'Test prompt 3', response: 'Test response 3', value: 600, position: 2 },
                  { id: 'clue-4', prompt: 'Test prompt 4', response: 'Test response 4', value: 800, position: 3 },
                  { id: 'clue-5', prompt: 'Test prompt 5', response: 'Test response 5', value: 1000, position: 4 }
                ]
              },
              {
                id: 'cat-2',
                name: 'Category 2',
                position: 1,
                clues: [
                  { id: 'clue-6', prompt: 'Test prompt 6', response: 'Test response 6', value: 200, position: 0 },
                  { id: 'clue-7', prompt: 'Test prompt 7', response: 'Test response 7', value: 400, position: 1 },
                  { id: 'clue-8', prompt: 'Test prompt 8', response: 'Test response 8', value: 600, position: 2 },
                  { id: 'clue-9', prompt: 'Test prompt 9', response: 'Test response 9', value: 800, position: 3 },
                  { id: 'clue-10', prompt: 'Test prompt 10', response: 'Test response 10', value: 1000, position: 4 }
                ]
              },
              {
                id: 'cat-3',
                name: 'Category 3',
                position: 2,
                clues: [
                  { id: 'clue-11', prompt: 'Test prompt 11', response: 'Test response 11', value: 200, position: 0 },
                  { id: 'clue-12', prompt: 'Test prompt 12', response: 'Test response 12', value: 400, position: 1 },
                  { id: 'clue-13', prompt: 'Test prompt 13', response: 'Test response 13', value: 600, position: 2 },
                  { id: 'clue-14', prompt: 'Test prompt 14', response: 'Test response 14', value: 800, position: 3 },
                  { id: 'clue-15', prompt: 'Test prompt 15', response: 'Test response 15', value: 1000, position: 4 }
                ]
              },
              {
                id: 'cat-4',
                name: 'Category 4',
                position: 3,
                clues: [
                  { id: 'clue-16', prompt: 'Test prompt 16', response: 'Test response 16', value: 200, position: 0 },
                  { id: 'clue-17', prompt: 'Test prompt 17', response: 'Test response 17', value: 400, position: 1 },
                  { id: 'clue-18', prompt: 'Test prompt 18', response: 'Test response 18', value: 600, position: 2 },
                  { id: 'clue-19', prompt: 'Test prompt 19', response: 'Test response 19', value: 800, position: 3 },
                  { id: 'clue-20', prompt: 'Test prompt 20', response: 'Test response 20', value: 1000, position: 4 }
                ]
              },
              {
                id: 'cat-5',
                name: 'Category 5',
                position: 4,
                clues: [
                  { id: 'clue-21', prompt: 'Test prompt 21', response: 'Test response 21', value: 200, position: 0 },
                  { id: 'clue-22', prompt: 'Test prompt 22', response: 'Test response 22', value: 400, position: 1 },
                  { id: 'clue-23', prompt: 'Test prompt 23', response: 'Test response 23', value: 600, position: 2 },
                  { id: 'clue-24', prompt: 'Test prompt 24', response: 'Test response 24', value: 800, position: 3 },
                  { id: 'clue-25', prompt: 'Test prompt 25', response: 'Test response 25', value: 1000, position: 4 }
                ]
              },
              {
                id: 'cat-6',
                name: 'Category 6',
                position: 5,
                clues: [
                  { id: 'clue-26', prompt: 'Test prompt 26', response: 'Test response 26', value: 200, position: 0 },
                  { id: 'clue-27', prompt: 'Test prompt 27', response: 'Test response 27', value: 400, position: 1 },
                  { id: 'clue-28', prompt: 'Test prompt 28', response: 'Test response 28', value: 600, position: 2 },
                  { id: 'clue-29', prompt: 'Test prompt 29', response: 'Test response 29', value: 800, position: 3 },
                  { id: 'clue-30', prompt: 'Test prompt 30', response: 'Test response 30', value: 1000, position: 4 }
                ]
              }
            ]
          }
        ]
      case 'games':
        return { clue_set_id: 'clue-set-123' }
      case 'clue_states':
        return []
      case 'profiles':
        return { handwritten_font: 'handwritten-2', temp_handwritten_font: null }
      default:
        return []
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {}

  // Add all the chainable methods
  query.select = jest.fn().mockReturnValue(query)
  query.insert = jest.fn().mockReturnValue(query)
  query.update = jest.fn().mockReturnValue(query)
  query.delete = jest.fn().mockReturnValue(query)
  query.eq = jest.fn().mockReturnValue(query)
  query['in'] = jest.fn().mockReturnValue(query)
  query.order = jest.fn().mockReturnValue(query)
  query.limit = jest.fn().mockReturnValue(query)
  query.single = jest.fn().mockReturnValue(query)

  // Make it thenable so it can be awaited
  query.then = jest.fn().mockImplementation((resolve) => {
    const data = getTableData()
    return resolve({
      data,
      error: null
    })
  })

  return query
}

// Simple mock client that supports method chaining
export const supabase = {
  from: jest.fn().mockImplementation((table: string) => createChainableQuery(table)),
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  },
  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn().mockReturnThis(),
  }),
}

export default supabase
