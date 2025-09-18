/**
 * Typed mock implementation of Supabase connection utilities for testing
 * 
 * This mock provides connection testing functionality with proper TypeScript
 * typing to ensure test reliability and catch interface changes.
 */

// Define the connection test result interface
interface ConnectionTestResult {
  connected: boolean
  error?: string
  latency?: number
}

// Define the mock SupabaseConnection interface
interface MockSupabaseConnection {
  testConnection: jest.MockedFunction<() => Promise<ConnectionTestResult>>
}

/**
 * Mock SupabaseConnection object with typed methods
 * Provides connection testing functionality for integration tests
 */
const mockSupabaseConnection: MockSupabaseConnection = {
  testConnection: jest.fn().mockResolvedValue({ 
    connected: true,
    latency: 50 // Mock 50ms latency
  }),
}

export const SupabaseConnection = mockSupabaseConnection
