import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import {
  createTestContext,
  cleanupTestContext,
  loginAsPlayer,
  createGameAsHost,
  joinGame
} from '../fixtures/test-helpers';

/**
 * Smoke Test: Player Joins Game
 *
 * This test validates the critical path for a player to join an existing Jeopardy game.
 *
 * **What This Test Validates:**
 * - Player can log in and set nickname
 * - Player sees "Waiting for Game" when no game exists
 * - Player can join game when host creates one
 * - Player appears in host's lobby
 */
test.describe('Player Joins Game - Smoke Test', () => {

  test.beforeEach(async () => {
    await Promise.all([
      cleanupTestUser(TEST_USERS.host.id),
      cleanupTestUser(TEST_USERS.player1.id)
    ]);
  });

  test.afterEach(async () => {
    await Promise.all([
      cleanupTestUser(TEST_USERS.host.id),
      cleanupTestUser(TEST_USERS.player1.id)
    ]);
  });

  test('should allow player to log in and wait in the join lobby if a game is not active', async ({ page }) => {
    // ============================================================
    // ACT: Player logs in and sets nickname
    // ============================================================
    await loginAsPlayer(page, TEST_USERS.player1.email, 'Alice');

    // ============================================================
    // ASSERT: Player should see "Waiting for Game" or "No Active Game"
    // ============================================================
    const waitingMessage = page.getByText(/Waiting for Game/i);
    await expect(waitingMessage).toBeVisible({ timeout: 5000 });

    test.info().annotations.push({ type: 'step', description: '✅ Player successfully logged in and is waiting for game' });
  });

  test('should allow player to join an active game', async ({ browser }) => {
    // ============================================================
    // ARRANGE: Create contexts for host and player
    // ============================================================
    const ctx = await createTestContext(browser, 1, 'player-joins');

    try {
      const { hostPage, playerPages } = ctx;
      const [playerPage] = playerPages;

      // ============================================================
      // ARRANGE: Player logs in and sets nickname
      // ============================================================
      // Defensive check for playerPage
      if (!playerPage) {
        throw new Error('Failed to setup player page');
      }

      await loginAsPlayer(playerPage, TEST_USERS.player1.email, 'Alice');

      // ============================================================
      // ASSERT: Player should see "Waiting for Game"
      // ============================================================
      await expect(playerPage.getByText(/Waiting for Game/i)).toBeVisible({ timeout: 5000 });

      // ============================================================
      // ACT: Host creates game
      // ============================================================
      await createGameAsHost(hostPage);

      // ============================================================
      // ASSERT: Player should see "Join Game" button appear
      // ============================================================
      const joinButton = playerPage.getByRole('button', { name: /Join.*Game/i });
      await expect(joinButton).toBeVisible({ timeout: 5000 });

      // ============================================================
      // ACT: Player joins game
      // ============================================================
      await joinGame(playerPage);

      // ============================================================
      // ASSERT: Player should be in game lobby
      // ============================================================
      await expect(playerPage.getByText(/Game.*Lobby|Lobby/i)).toBeVisible({ timeout: 5000 });

      // ============================================================
      // ASSERT: Host should see player in lobby
      // ============================================================
      await expect(hostPage.getByText('Alice')).toBeVisible({ timeout: 5000 });
      await expect(hostPage.getByText(/Total.*Players.*1|1.*Player/i)).toBeVisible({ timeout: 5000 });

      test.info().annotations.push({ type: 'step', description: '✅ Player successfully joined active game' });

    } finally {
      await cleanupTestContext(ctx);
    }
  });
});
