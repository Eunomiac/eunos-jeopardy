import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import { loginAs, createGame } from '../fixtures/test-helpers';

/**
 * Smoke Test: Host Creates Game
 *
 * This test validates the critical path for a host to create a new Jeopardy game.
 * It's called a "smoke test" because it checks if the core functionality works
 * without testing every detail.
 *
 * **What This Test Validates:**
 * - Host can log in with valid credentials
 * - Host can select a clue set from the dropdown
 * - Host can click "Create Game" button
 * - Game dashboard appears after game creation
 * - Game is created in the database (verified by dashboard presence)
 */
test.describe('Host Creates Game - Smoke Test', () => {

  test.afterEach(async () => {
    await cleanupTestUser(TEST_USERS.host.id);
  });

  test('should allow host to log in and create a game', async ({ page }) => {
    // ============================================================
    // ACT: Log in as host
    // ============================================================
    await loginAs(page, TEST_USERS.host.email);

    // ============================================================
    // ASSERT: Host should see game creation interface
    // ============================================================
    await expect(page.getByRole('heading', { name: /Create.*Game|Host.*Game/i })).toBeVisible();

    // ============================================================
    // ACT: Create game
    // ============================================================
    await createGame(page, 1);

    // ============================================================
    // ASSERT: Host should be redirected to Game Host Dashboard
    // ============================================================
    await expect(page.getByText('Game Host Dashboard')).toBeVisible({ timeout: 10000 });

    // ============================================================
    // ASSERT: Dashboard should show game is in lobby status
    // ============================================================
    await expect(page.getByText(/Status.*Lobby|Lobby.*Status/i)).toBeVisible();

    console.log('✅ Host successfully created game and reached dashboard');
  });
});

