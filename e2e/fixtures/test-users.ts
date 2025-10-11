/**
 * Test User Credentials
 *
 * These are dedicated test accounts in Supabase used exclusively for E2E testing.
 * They should NOT be used for manual testing or development.
 *
 * SETUP INSTRUCTIONS:
 * 1. Create these users in Supabase Auth (manually or via script)
 * 2. Update the `id` fields with the actual UUIDs from Supabase
 * 3. Ensure these users have the correct roles in the `user_roles` table
 *
 * SECURITY NOTE:
 * These credentials are for testing only. They use simple passwords because:
 * - They're in a test database (or isolated test users)
 * - They contain no real data
 * - They're reset before each test run
 */

export const TEST_USERS = {
  /**
   * Test Host User
   *
   * Used for testing host workflows:
   * - Creating games
   * - Managing clue sets
   * - Controlling game flow
   * - Adjudicating answers
   */
  host: {
    email: 'host@e2e.com',
    password: '1234',
    id: 'e5194515-79bd-49f2-9356-0b954af0058b',
    role: 'host' as const,
  },

  /**
   * Test Player 1
   *
   * Used for testing player workflows:
   * - Joining games
   * - Buzzing in
   * - Answering questions
   */
  player1: {
    email: 'player1@e2e.com',
    password: '1234',
    id: 'fab88c6a-621f-4a83-87c3-442ba7a05d9b',
    role: 'player' as const,
  },

  /**
   * Test Player 2
   *
   * Used for multi-player scenarios:
   * - Testing buzzer queue
   * - Testing player order
   * - Testing score management
   */
  player2: {
    email: 'player2@e2e.com',
    password: '1234',
    id: '8a3fc952-8666-44bd-ad94-02ab7ffd44c0',
    role: 'player' as const,
  },

  /**
   * Test Player 3
   *
   * Used for larger multi-player scenarios:
   * - Testing with 3+ players
   * - Testing player list display
   * - Testing complex buzzer scenarios
   */
  player3: {
    email: 'player3@e2e.com',
    password: '1234',
    id: 'dfe0b4d8-4663-4eb3-98ee-095bcceea878',
    role: 'player' as const,
  },
} as const;

/**
 * Type for test user objects
 */
export type TestUser = typeof TEST_USERS[keyof typeof TEST_USERS];

/**
 * Helper to get a test user by role
 */
export function getTestUser(role: 'host' | 'player', index = 1): TestUser {
  if (role === 'host') {
    return TEST_USERS.host;
  }

  const playerKey = `player${index}` as keyof typeof TEST_USERS;
  return TEST_USERS[playerKey];
}
