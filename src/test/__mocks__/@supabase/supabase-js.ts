/**
 * Typed mock implementation of @supabase/supabase-js for testing
 *
 * This global mock provides comprehensive TypeScript typing for all Supabase operations
 * used throughout the test suite. It includes smart defaults and proper error handling
 * to match the real Supabase client behavior.
 *
 * @see src/services/supabase/types.ts for Database schema types
 */

import type { Database } from '../../../services/supabase/types'

interface ChainableMethods {
  eq: jest.MockedFunction<(column: string, value: unknown) => ChainableMethods>
  in: jest.MockedFunction<(column: string, values: unknown[]) => ChainableMethods>
  single: jest.MockedFunction<() => Promise<{ data: unknown; error: unknown }>>
  limit: jest.MockedFunction<(count: number) => ChainableMethods>
}

/**
 * Comprehensive mock of the Supabase client with proper TypeScript typing.
 * Provides smart defaults for common operations while maintaining type safety.
 *
 * Note: We use a flexible typing approach since mocking the full Supabase client
 * interface would require implementing hundreds of methods we don't use.
 */
const mockSupabaseClient = {
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signUp: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ data: { user: null, session: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
  },

  /**
   * Database query builder mock with table-aware defaults
   * Uses actual Database schema types for type safety
   */
  from: jest.fn().mockImplementation((table: keyof Database['public']['Tables']) => {
    // Table-specific smart defaults based on actual schema
    const getDefaultData = (): unknown => {
      switch (table) {
        case 'profiles':
          return { role: 'player' } as Database['public']['Tables']['profiles']['Row']
        case 'games':
          return null // No active game by default
        case 'players':
          return [] as Database['public']['Tables']['players']['Row'][]
        case 'clue_sets':
          return [] as Database['public']['Tables']['clue_sets']['Row'][]
        case 'clues':
          return [] as Database['public']['Tables']['clues']['Row'][]
        case 'buzzes':
          return [] as Database['public']['Tables']['buzzes']['Row'][]
        default:
          return null
      }
    }

    return {
      select: jest.fn().mockImplementation((_columns: string, options?: { head?: boolean }) => {
        if (options?.head) {
          return Promise.resolve({ data: null, error: null, count: 0 })
        }

        const createChainableMethods = (): ChainableMethods & Promise<{ data: unknown; error: null }> => {
          const methods: ChainableMethods = {} as ChainableMethods

          // Create a promise-like object that can be chained or awaited
          const promiseResult = Promise.resolve({
            data: getDefaultData(),
            error: null
          })

          // Add chainable methods that return the same structure
          methods.eq = jest.fn().mockReturnValue(promiseResult)
          methods.in = jest.fn().mockReturnValue(promiseResult)
          methods.single = jest.fn().mockResolvedValue({
            data: getDefaultData(),
            error: null
          })
          methods.limit = jest.fn().mockResolvedValue({
            data: Array.isArray(getDefaultData()) ? getDefaultData() : [],
            error: null
          })

          // Merge the promise with the methods so it can be both chained and awaited
          return Object.assign(promiseResult, methods)
        }

        return createChainableMethods()
      }),
      insert: jest.fn().mockResolvedValue({ data: getDefaultData(), error: null }),
      update: jest.fn().mockResolvedValue({ data: getDefaultData(), error: null }),
      delete: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
  }),

  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
  }),
}

/**
 * Mock factory function that creates a typed Supabase client
 * @param url - Supabase URL (ignored in mock)
 * @param key - Supabase key (ignored in mock)
 * @returns Mocked client instance with proper typing
 */
const createClient = jest.fn().mockReturnValue(mockSupabaseClient)

// Export with proper typing
export { createClient }
export type { Database }
