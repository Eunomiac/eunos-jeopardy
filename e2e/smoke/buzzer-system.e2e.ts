import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import {
  setupTestInProgress,
  cleanupTestContext,
  selectClue,
  unlockBuzzer,
  buzzIn,
  markCorrect,
  markWrong
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
      const { hostPage, playerPages } = ctx;
      const [player1Page] = playerPages;

      // ============================================================
      // ACT: Host selects a clue and unlocks buzzer
      // ============================================================
      await selectClue(hostPage, 0);
      await unlockBuzzer(hostPage);

      // ============================================================
      // ACT: Player 1 buzzes in
      // ============================================================
      // Defensive check for player1Page
      if (!player1Page) {
        throw new Error('Failed to setup player1 page');
      }

      await buzzIn(player1Page);

      // ============================================================
      // ASSERT: Player 1 is shown as buzzed in
      // ============================================================
      await expect(player1Page.getByText(/buzzed in|your turn/i)).toBeVisible({ timeout: 3000 });

      // ============================================================
      // ACT: Host marks answer as correct
      // ============================================================
      await markCorrect(hostPage);

      // ============================================================
      // ASSERT: Score updated for Player 1
      // ============================================================
      await expect(hostPage.getByText(/Alice.*\$[1-9]/)).toBeVisible({ timeout: 3000 });

      console.log('✅ Basic buzzer flow completed successfully');

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
      const { hostPage, playerPages, playerContexts } = ctx;
      const [player1Page, player2Page] = playerPages;
      const [, player2Context] = playerContexts;

      // Defensive checks for player pages and context
      if (!player1Page || !player2Page || !player2Context) {
        throw new Error('Failed to setup player pages or context');
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
      await selectClue(hostPage, 0);
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

      console.log('✅ Race condition test completed successfully');

    } finally {
      await cleanupTestContext(ctx);
    }
  });
});
