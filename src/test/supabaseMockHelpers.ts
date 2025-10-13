/**
 * Type-safe Supabase mock helpers for tests
 *
 * These utilities create properly-typed mock query builders that match the Supabase API
 * without requiring `as any` type assertions.
 */

/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters */
// Type parameters are necessary for proper type inference in test mocks

import type { PostgrestError, PostgrestSingleResponse, PostgrestResponse } from '@supabase/supabase-js'

/**
 * Creates a type-safe mock for a Supabase query builder chain
 *
 * This allows tests to mock Supabase queries without using `as any`:
 *
 * @example
 * ```typescript
 * mockSupabase.from.mockReturnValue(
 *   createMockQueryBuilder()
 *     .select()
 *     .eq()
 *     .single({ data: { id: '123' }, error: null })
 * )
 * ```
 */
export function createMockQueryBuilder() {
  const builder = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    containedBy: jest.fn().mockReturnThis(),
    rangeGt: jest.fn().mockReturnThis(),
    rangeGte: jest.fn().mockReturnThis(),
    rangeLt: jest.fn().mockReturnThis(),
    rangeLte: jest.fn().mockReturnThis(),
    rangeAdjacent: jest.fn().mockReturnThis(),
    overlaps: jest.fn().mockReturnThis(),
    textSearch: jest.fn().mockReturnThis(),
    match: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    abortSignal: jest.fn().mockReturnThis(),
    single: jest.fn(),
    maybeSingle: jest.fn(),
    csv: jest.fn(),
    geojson: jest.fn(),
    explain: jest.fn(),
    rollback: jest.fn(),
    returns: jest.fn().mockReturnThis(),
  }

  // Helper methods to set final responses
  const helpers = {
    /**
     * Sets the response for .single() calls
     */
    withSingleResponse<T>(response: PostgrestSingleResponse<T>) {
      builder.single.mockResolvedValue(response)
      builder.maybeSingle.mockResolvedValue(response)
      return builder
    },

    /**
     * Sets the response for queries that return arrays
     */
    withResponse<T>(response: PostgrestResponse<T>) {
      // For queries without .single(), the promise resolves directly
      return Object.assign(Promise.resolve(response), builder)
    },

    /**
     * Convenience method for successful single responses
     */
    withSingleData<T>(data: T) {
      return helpers.withSingleResponse<T>({ data, error: null, count: null, status: 200, statusText: 'OK' })
    },

    /**
     * Convenience method for successful array responses
     */
    withData<T>(data: T[]) {
      return helpers.withResponse<T>({ data, error: null, count: data.length, status: 200, statusText: 'OK' })
    },

    /**
     * Convenience method for error responses
     */
    withError(error: PostgrestError) {
      builder.single.mockResolvedValue({ data: null, error, count: null, status: error.code ? Number.parseInt(error.code) : 500, statusText: error.message })
      builder.maybeSingle.mockResolvedValue({ data: null, error, count: null, status: error.code ? Number.parseInt(error.code) : 500, statusText: error.message })
      return builder
    },
  }

  return Object.assign(builder, helpers)
}

/**
 * Creates a mock for the Supabase channel API
 */
export function createMockChannel() {
  return {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn().mockResolvedValue({ status: 'ok', error: null }),
    send: jest.fn().mockResolvedValue('ok'),
  }
}

/**
 * Creates a mock for the Supabase realtime API
 */
export function createMockRealtime() {
  return {
    channel: jest.fn().mockImplementation(() => createMockChannel()),
    removeChannel: jest.fn().mockResolvedValue({ status: 'ok', error: null }),
    removeAllChannels: jest.fn().mockResolvedValue({ status: 'ok', error: null }),
    getChannels: jest.fn().mockReturnValue([]),
  }
}

/**
 * Type for a mocked Supabase from() call that returns a query builder
 */
export type MockQueryBuilder = ReturnType<typeof createMockQueryBuilder>
