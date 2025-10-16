import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import {
  setupTestInProgress,
  cleanupTestContext,
  selectClue,
  revealPrompt,
  unlockBuzzer,
  buzzIn,
  clickWhenEnabled,
  markWrong,
  getPlayerScore,
  getPlayerScoreFromUI
} from '../fixtures/test-helpers';

/**
 * E2E Smoke Tests: Buzzer System
 *
 * Tests the core buzzer functionality including:
 * - Buzzer unlock/lock states
 * - Player buzzing in
 * - Host adjudication (correct/wrong)
 * - Score updates
 * - Buzzer reset after clue completion
 */

test.describe('Buzzer System - Smoke Tests', () => {

  test.beforeEach(async () => {
    // Cleanup before test to ensure clean state
    await Promise.all([
      cleanupTestUser(TEST_USERS.host.id),
      cleanupTestUser(TEST_USERS.player1.id),
      cleanupTestUser(TEST_USERS.player2.id)
    ]);
  });

  test.afterEach(async () => {
    // Cleanup all test users
    await Promise.all([
      cleanupTestUser(TEST_USERS.host.id),
      cleanupTestUser(TEST_USERS.player1.id),
      cleanupTestUser(TEST_USERS.player2.id)
    ]);
  });

  test('should complete basic buzzer flow with correct answer', async ({ browser }) => {
    // ============================================================
    // ARRANGE: Setup game with 2 players at board
    // ============================================================
    const ctx = await setupTestInProgress(browser, ['Alice', 'Bob'], 'buzzer-basic');

    try {
      const { hostPage, playerPages, gameId } = ctx;
      const [player1Page, player2Page] = playerPages;

      // Defensive check for player pages
      if (!player1Page || !player2Page) {
        throw new Error('Failed to setup player pages');
      }

      if (!gameId) {
        throw new Error('Failed to setup game');
      }

      const player1Podiums = {
        main: player1Page.locator('.player-podium.main'),
        competitor: player1Page.locator('.player-podium.competitor')
      };
      const player2Podiums = {
        main: player2Page.locator('.player-podium.main'),
        competitor: player2Page.locator('.player-podium.competitor')
      }

      const player1Buzzer = player1Page.locator('.integrated-buzzer');
      const player2Buzzer = player2Page.locator('.integrated-buzzer');

      const player1Score = await getPlayerScore(gameId, TEST_USERS.player1.id);

      // ============================================================
      // ASSERT: Player buzzers should begin in the INACTIVE state
      // ============================================================
      await expect(player1Buzzer).toHaveClass(/buzzer-inactive/);
      await expect(player2Buzzer).toHaveClass(/buzzer-inactive/);

      // ============================================================
      // ACT: Host selects a clue and reveals the prompt
      // ============================================================
      const {value: clueValue} = await selectClue(hostPage, gameId);
      await revealPrompt(hostPage);

      // ============================================================
      // ASSERT: Player buzzers should now have the LOCKED state
      // ============================================================
      await expect(player1Buzzer).toHaveClass(/buzzer-locked/);
      await expect(player2Buzzer).toHaveClass(/buzzer-locked/);

      // ============================================================
      // ASSERT: Despite name, locked buzzers should be clickable.
      // ============================================================
      await expect(player1Buzzer).toBeEnabled();
      await expect(player2Buzzer).toBeEnabled();

      // ============================================================
      // ACT: Player 2 buzzes in before host unlocks buzzer
      // ============================================================
      await buzzIn(player2Page);

      // ============================================================
      // ASSERT: Player 2's buzzer should be frozen and rendered inactive
      //         and podium should get frozen styles.
      // ============================================================
      await expect(player2Buzzer).toHaveClass(/buzzer-frozen/);
      await expect(player1Podiums.competitor).toHaveClass(/podium-frozen/);
      await expect(player2Podiums.main).toHaveClass(/podium-frozen/);

      // ============================================================
      // ASSERT: Player 2's invalid buzz-in should not be recorded in queue.
      // ============================================================
      const player2QueueItem = hostPage.locator('.queue-item').filter({ hasText: 'Bob' });
      await expect(player2QueueItem).not.toBeVisible();

      // ============================================================
      // ACT: Host unlocks buzzer
      // ============================================================
      await unlockBuzzer(hostPage);

      // ============================================================
      // ASSERT: Player 1's buzzer should now have the UNLOCKED state
      //           and Player 2's buzzer should still be frozen
      // ============================================================
      await expect(player1Buzzer).toHaveClass(/buzzer-unlocked/);
      await expect(player1Buzzer).toBeEnabled();
      await expect(player2Buzzer).toHaveClass(/buzzer-frozen/);
      await expect(player2Buzzer).toBeDisabled();

      // ============================================================
      // ACT: Player 1 buzzes in
      // ============================================================
      await buzzIn(player1Page);

      // ============================================================
      // ASSERT: Player 1 is shown as buzzed in, their buzzer is hidden and other buzzers are frozen
      // ============================================================
      // Verify Player 1 buzzed in successfully on all pages
      await expect(player1Podiums.main).toHaveClass(/buzzed-in/);
      await expect(player2Podiums.competitor).toHaveClass(/buzzed-in/);
      await expect(player1Buzzer).not.toBeVisible();
      await expect(player2Buzzer).toHaveClass(/buzzer-frozen/);
      await expect(player2Buzzer).toBeDisabled();

      // Verify Player 1 is the first queue item
      const firstQueueItem = hostPage.locator('.queue-item').first();
      await expect(firstQueueItem).toHaveText(/Alice/i);

      // ============================================================
      // ACT: Host marks answer as correct
      // ============================================================
      await clickWhenEnabled(hostPage.getByRole("button", { name: /Correct/i }));
      // Allow a brief wait for database update to occur
      await hostPage.waitForTimeout(2000);

      // ============================================================
      // ASSERT: Score updated for Player 1
      // ============================================================
      const expectedScore = player1Score + clueValue;

      // Get new scores from database and all player UIs
      const newScoreData = {
        db: await getPlayerScore(gameId, TEST_USERS.player1.id),
        hostUI: await getPlayerScoreFromUI(hostPage, 'Alice'),
        player1UI: await getPlayerScoreFromUI(player1Page, 'Alice'),
        player2UI: await getPlayerScoreFromUI(player2Page, 'Alice')
      }

      expect(newScoreData.db).toBe(expectedScore);
      expect(newScoreData.hostUI).toBe(expectedScore);
      expect(newScoreData.player1UI).toBe(expectedScore);
      expect(newScoreData.player2UI).toBe(expectedScore);

      // ============================================================
      // ASSERT: Player 1 Remains the Current Player
      // ============================================================

      expect(hostPage.locator('.player-score-item').filter({ hasText: 'Alice' }))
        .toHaveClass(/current-player/);

      test.info().annotations.push({ type: 'step', description: 'Basic buzzer flow completed successfully' });

    } finally {
      await cleanupTestContext(ctx);
    }
  });

  test('should handle buzzer race condition with network delay', async ({ browser }) => {
    // ============================================================
    // ARRANGE: Setup game with 2 players at board
    // ============================================================
    const ctx = await setupTestInProgress(browser, ['Alice', 'Bob'], 'buzzer-race');

    try {
      const { hostPage, playerPages, playerContexts, gameId } = ctx;
      const [player1Page, player2Page] = playerPages;
      const [, player2Context] = playerContexts;

      // Defensive checks for player pages and context
      if (!player1Page || !player2Page || !player2Context || !gameId) {
        throw new Error('Failed to setup player pages, context or game');
      }

      // ============================================================
      // ARRANGE: Add network delay to Player 2 to create race condition
      // ============================================================
      const player2CDPSession = await player2Context.newCDPSession(player2Page);
      await player2CDPSession.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 50 * 1024,
        uploadThroughput: 20 * 1024,
        latency: 5000, // 5 second delay - creates deterministic race condition
      });

      // ============================================================
      // ACT: Host selects clue and unlocks buzzer
      // ============================================================
      await selectClue(hostPage, gameId);
      await revealPrompt(hostPage);
      await unlockBuzzer(hostPage);

      // ============================================================
      // ACT: Both players attempt to buzz in simultaneously
      // ============================================================
      // Note: Using manual locators instead of buzzIn() helper to ensure
      // truly simultaneous clicks via Promise.all() for race condition test
      await Promise.all([
        player1Page.locator('.buzzer-button, button[class*="buzzer"]').click(),
        player2Page.locator('.buzzer-button, button[class*="buzzer"]').click()
      ]);

      // ============================================================
      // ASSERT: Only Player 1 (faster connection) should be buzzed in
      // ============================================================
      await expect(player1Page.getByText(/buzzed in|your turn/i)).toBeVisible({ timeout: 3000 });
      await expect(player2Page.getByText(/buzzed in|your turn/i)).not.toBeVisible();

      // ============================================================
      // ACT: Host marks answer as wrong
      // ============================================================
      await markWrong(hostPage);

      // ============================================================
      // ASSERT: Score updated (negative) for Player 1
      // ============================================================
      await expect(hostPage.getByText(/Alice.*-\$[1-9]/)).toBeVisible({ timeout: 3000 });

      test.info().annotations.push({ type: 'step', description: 'Race condition test completed successfully' });

    } finally {
      await cleanupTestContext(ctx);
    }
  });
});
