import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import {
  setupTestWithLobby,
  cleanupTestContext,
  createTestContext,
  loginAsPlayer,
  createGameAsHost,
  joinGame
} from '../fixtures/test-helpers';

/**
 * Smoke Test: Game Setup & Lobby
 *
 * This test suite validates the critical paths for game setup and lobby functionality:
 * - Multiple players joining a game
 * - Players attempting to join after game starts
 * - Host attempting to start game without players
 */
test.describe('Game Setup & Lobby - Smoke Tests', () => {

  test.beforeEach(async () => {
    await Promise.all([
      cleanupTestUser(TEST_USERS.host.id),
      cleanupTestUser(TEST_USERS.player1.id),
      cleanupTestUser(TEST_USERS.player2.id),
      cleanupTestUser(TEST_USERS.player3.id)
    ]);
  });

  test.afterEach(async () => {
    await Promise.all([
      cleanupTestUser(TEST_USERS.host.id),
      cleanupTestUser(TEST_USERS.player1.id),
      cleanupTestUser(TEST_USERS.player2.id),
      cleanupTestUser(TEST_USERS.player3.id)
    ]);
  });

  test('should allow multiple players to join game sequentially', async ({ browser }) => {
    // ============================================================
    // ARRANGE: Setup game with 3 players in lobby
    // ============================================================
    const ctx = await setupTestWithLobby(browser, ['Alice', 'Bob', 'Charlie'], 'multi-player-join');

    try {
      const { hostPage, playerPages } = ctx;
      const [player1Page, player2Page, player3Page] = playerPages;

      // Defensive checks for array destructuring
      if (!player1Page || !player2Page || !player3Page) {
        throw new Error('Failed to setup all player pages');
      }

      // ============================================================
      // ASSERT: All players should see lobby
      // ============================================================
      await expect(player1Page.getByText(/Game.*Lobby|Lobby/i)).toBeVisible();
      await expect(player2Page.getByText(/Game.*Lobby|Lobby/i)).toBeVisible();
      await expect(player3Page.getByText(/Game.*Lobby|Lobby/i)).toBeVisible();

      // ============================================================
      // ASSERT: Host should see all 3 players
      // ============================================================
      await expect(hostPage.getByText('Alice')).toBeVisible();
      await expect(hostPage.getByText('Bob')).toBeVisible();
      await expect(hostPage.getByText('Charlie')).toBeVisible();
      await expect(hostPage.getByText(/Total.*Players.*3|3.*Players/i)).toBeVisible();

      // ============================================================
      // ASSERT: Host should see "Start Game" button
      // ============================================================
      await expect(hostPage.getByRole('button', { name: /Start.*Game/i })).toBeVisible();

      test.info().annotations.push({ type: 'step', description: '✅ Multiple players successfully joined game' });

    } finally {
      await cleanupTestContext(ctx);
    }
  });

  test('should prevent players from joining after game starts', async ({ browser }) => {
    // ============================================================
    // ARRANGE: Setup game with 2 players in lobby
    // ============================================================
    const ctx = await createTestContext(browser, 3, 'late-join-prevention');

    try {
      const { hostPage, playerPages } = ctx;
      const [player1Page, player2Page, player3Page] = playerPages;

      // ============================================================
      // ARRANGE: First 2 players join
      // ============================================================
      // Defensive checks for player pages
      if (!player1Page || !player2Page) {
        throw new Error('Failed to setup player pages');
      }

      await loginAsPlayer(player1Page, TEST_USERS.player1.email, 'Alice');
      await loginAsPlayer(player2Page, TEST_USERS.player2.email, 'Bob');

      await createGameAsHost(hostPage);

      await joinGame(player1Page);
      await joinGame(player2Page);

      // ============================================================
      // ASSERT: Host sees 2 players
      // ============================================================
      await expect(hostPage.getByText(/Total.*Players.*2|2.*Players/i)).toBeVisible();

      // ============================================================
      // ACT: Host starts game
      // ============================================================
      await hostPage.getByRole('button', { name: /Start.*Game/i }).click();
      await hostPage.waitForTimeout(2000);

      // ============================================================
      // ARRANGE: Third player tries to join after game started
      // ============================================================
      // Defensive check for player3Page
      if (!player3Page) {
        throw new Error('Failed to setup player3 page');
      }

      await loginAsPlayer(player3Page, TEST_USERS.player3.email, 'Charlie');

      // ============================================================
      // ASSERT: Third player should NOT see "Join Game" button
      // ============================================================
      const joinButton = player3Page.getByRole('button', { name: /Join.*Game/i });
      const isJoinButtonVisible = await joinButton.isVisible({ timeout: 3000 }).catch(() => false);
      expect(isJoinButtonVisible).toBe(false);

      // ============================================================
      // ASSERT: Third player should see "Game in Progress" or similar message
      // ============================================================
      const inProgressMessage = player3Page.getByText(/Waiting For Game/i);
      await expect(inProgressMessage).toBeVisible({ timeout: 5000 });

      test.info().annotations.push({ type: 'step', description: '✅ Late player correctly prevented from joining' });

    } finally {
      await cleanupTestContext(ctx);
    }
  });

  test('should prevent host from starting game without players', async ({ page }) => {
    // ============================================================
    // ACT: Host logs in and creates game
    // ============================================================
    await createGameAsHost(page);

    // ============================================================
    // ASSERT: Host should see dashboard
    // ============================================================
    await expect(page.getByText('Game Host Dashboard')).toBeVisible();

    // ============================================================
    // ASSERT: "Start Game" button should be disabled or not visible
    // ============================================================
    const startButton = page.getByRole('button', { name: /Start.*Game/i });

    // Check if button is disabled
    const isDisabled = await startButton.isDisabled().catch(() => false);

    // Or check if button is not visible
    const isVisible = await startButton.isVisible({ timeout: 2000 }).catch(() => false);

    // Button should either be disabled or not visible
    expect(isDisabled || !isVisible).toBe(true);

    test.info().annotations.push({ type: 'step', description: '✅ Host correctly prevented from starting game without players' });
  });
});
