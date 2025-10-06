/**
 * Common test data and mock objects used across multiple test files
 *
 * This file contains standardized mock data that is reused across different test suites
 * to ensure consistency and reduce duplication. All mocks are properly typed using
 * the actual interfaces from the application.
 */

import type { User, Session } from '@supabase/supabase-js'
import type { Database } from '../../services/supabase/types'
import { parseCSV } from '../../utils/csvParser'

// Type aliases for cleaner code
export type GameRow = Database['public']['Tables']['games']['Row']
type PlayerRow = Database['public']['Tables']['players']['Row']
type ClueSetRow = Database['public']['Tables']['clue_sets']['Row']

/**
 * Standard mock user for testing authentication flows
 * Used across: App.test.tsx, AuthContext.test.tsx, ClueSetSelector.test.tsx, SimpleLogin.test.tsx
 */
export const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
  email_confirmed_at: '2023-01-01T00:00:00Z',
  phone: '',
  confirmed_at: '2023-01-01T00:00:00Z',
  last_sign_in_at: '2023-01-01T00:00:00Z',
  app_metadata: {},
  user_metadata: {},
  identities: [],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z'
}

/**
 * Standard mock session for testing authentication flows
 * Used across: App.test.tsx, AuthContext.test.tsx, ClueSetSelector.test.tsx, SimpleLogin.test.tsx
 */
export const mockSession: Session = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: mockUser
}

/**
 * Standard mock game object for testing game flows
 * Used across: App.test.tsx, GameService.test.ts, GameHostDashboard.test.tsx
 */
export const mockGame: GameRow = {
  id: 'game-123',
  host_id: 'user-123',
  clue_set_id: 'clue-set-123',
  status: 'lobby',
  current_round: 'jeopardy',
  current_player_id: null,
  current_introduction_category: 0,
  is_buzzer_locked: true,
  focused_clue_id: null,
  focused_player_id: null,
  created_at: '2023-01-01T00:00:00Z'
}

/**
 * Standard mock players array for testing multiplayer functionality
 * Used across: GameService.test.ts, GameHostDashboard.test.tsx
 */
export const mockPlayers: PlayerRow[] = [
  {
    game_id: 'game-123',
    user_id: 'user-456',
    nickname: 'Player One',
    score: 1000,
    joined_at: '2023-01-01T00:00:00Z'
  },
  {
    game_id: 'game-123',
    user_id: 'user-789',
    nickname: 'Player Two',
    score: 500,
    joined_at: '2023-01-01T00:01:00Z'
  }
]

/**
 * Standard mock clue sets for testing clue set selection
 * Used across: App.test.tsx, ClueSetSelector.test.tsx
 */
export const mockClueSets: ClueSetRow[] = [
  {
    id: 'clue-set-1',
    name: 'Test Game 1',
    owner_id: 'user-123',
    created_at: '2023-01-01T00:00:00Z'
  },
  {
    id: 'clue-set-2',
    name: 'Test Game 2',
    owner_id: 'user-123',
    created_at: '2023-01-01T00:00:00Z'
  }
]

/**
 * Test CSV file paths for comprehensive testing scenarios
 * These files provide realistic test data and validation scenarios
 */
export const testCSVFiles = {
  validBasic: 'src/test/fixtures/test-valid-basic.csv',
  invalidMissingJeopardy: 'src/test/fixtures/test-invalid-missing-jeopardy.csv',
  invalidNoFinal: 'src/test/fixtures/test-invalid-no-final.csv',
  invalidMalformed: 'src/test/fixtures/test-invalid-malformed.csv'
} as const

/**
 * Simple CSV test data for basic testing (kept for backward compatibility)
 * For comprehensive testing, use the CSV files above
 */
export const testCSVText = `round,category,value,prompt,response
jeopardy,Science,200,What is H2O?,Water
jeopardy,Science,400,What is CO2?,Carbon Dioxide
double,History,400,Who was first president?,Washington
final,Geography,0,Largest country?,Russia`

/**
 * Expected parsed CSV rows derived from testCSVText using actual parseCSV function
 * This ensures consistency between CSV content and expected parsed results
 * Used across: loader.test.ts, csvParser.test.ts
 */
export const expectedParsedRows = parseCSV(testCSVText)

/**
 * Factory functions for creating variations of common mock objects
 */
export const createMockGame = (overrides: Partial<GameRow> = {}): GameRow => ({
  ...mockGame,
  ...overrides
})

export const createMockUser = (overrides: Partial<User> = {}): User => ({
  ...mockUser,
  ...overrides
})

export const createMockPlayer = (overrides: Partial<PlayerRow> = {}): PlayerRow => ({
  ...mockPlayers[0],
  ...overrides
})
