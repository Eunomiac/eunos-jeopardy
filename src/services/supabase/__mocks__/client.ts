/**
 * Mock for Supabase client module
 * Provides a direct mock client for testing
 */

// Create a chainable query builder mock
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createChainableQuery = (): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const query: any = {}

  // Add all the chainable methods
  query.select = jest.fn().mockReturnValue(query)
  query.insert = jest.fn().mockReturnValue(query)
  query.update = jest.fn().mockReturnValue(query)
  query.delete = jest.fn().mockReturnValue(query)
  query.eq = jest.fn().mockReturnValue(query)
  query.in = jest.fn().mockReturnValue(query)
  query.order = jest.fn().mockReturnValue(query)
  query.limit = jest.fn().mockReturnValue(query)
  query.limit = jest.fn().mockReturnValue(query)
  query.single = jest.fn().mockReturnValue(query)

  // Make it thenable so it can be awaited
  query.then = jest.fn().mockImplementation((resolve) => {
    return resolve({
      data: [],
      error: null
    })
  })

  return query
}

// Simple mock client that supports method chaining
export const supabase = {
  from: jest.fn().mockImplementation(() => createChainableQuery()),
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
    subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
  }),
}

export default supabase
