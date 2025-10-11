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
import { mockGame, mockPlayers } from '../../testUtils'

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
          return { role: 'player', handwritten_font: 'handwritten-2', temp_handwritten_font: null } as Database['public']['Tables']['profiles']['Row']
        case 'games':
          return mockGame // Return full game object from shared mocks
        case 'players':
          return mockPlayers // Return players from shared mocks
        case 'clue_sets':
          return [] as Database['public']['Tables']['clue_sets']['Row'][]
        case 'clues':
          return [] as Database['public']['Tables']['clues']['Row'][]
        case 'buzzes':
          return [] as Database['public']['Tables']['buzzes']['Row'][]
        case 'clue_states':
          return [] as Database['public']['Tables']['clue_states']['Row'][]
        case 'boards':
          // Return mock board data with nested categories and clues for PlayerDashboard tests
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
        default:
          return null
      }
    }

    return {
      select: jest.fn().mockImplementation((_columns: string, options?: { head?: boolean }) => {
        if (options?.head) {
          return Promise.resolve({ data: null, error: null, count: 0 })
        }

        // Refactored: Move chainable query creation to top-level for reduced nesting
        function createChainableQuery(data: unknown): any {
          const query: any = {};

          query.eq = jest.fn().mockImplementation(() => query);
          query.in = jest.fn().mockReturnValue(query);
          query.order = jest.fn().mockReturnValue(query);
          query.limit = jest.fn().mockReturnValue(query);
          query.single = jest.fn().mockReturnValue(query);

          query.then = jest.fn().mockImplementation((resolve) => {
            const wasSingleCalled = query.single.mock.calls.length > 0;
            const resultData = wasSingleCalled && Array.isArray(data) && data.length > 0 ? data[0] : data;

            return Promise.resolve({
              data: resultData,
              error: null
            }).then(resolve);
          });

          return query;
        }

        const createChainableMethods = (): ChainableMethods & Promise<{ data: unknown; error: null }> => {
          const data = getDefaultData();
          return createChainableQuery(data);
        }

        return createChainableMethods();
      }),
      insert: jest.fn().mockResolvedValue({ data: getDefaultData(), error: null }),
      update: jest.fn().mockResolvedValue({ data: getDefaultData(), error: null }),
      delete: jest.fn().mockResolvedValue({ data: null, error: null }),
    }
  }),

  channel: jest.fn().mockReturnValue({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnValue({ unsubscribe: jest.fn() }),
    unsubscribe: jest.fn(),
    send: jest.fn().mockResolvedValue(undefined),
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
