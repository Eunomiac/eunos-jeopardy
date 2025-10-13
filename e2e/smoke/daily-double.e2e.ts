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
 * E2E Smoke Tests: Daily Double Flow
 *
 * Tests the Daily Double functionality including:
 * - Daily Double reveal animation
 * - Wager entry and validation
 * - Answer submission
 * - Score adjustment (correct/wrong)
 * - Return to normal gameplay
 */

test.describe('Daily Double - Smoke Tests', () => {

  test.beforeEach(async () => {
    // Cleanup before each test to ensure clean starting state
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

  test('should complete Daily Double flow with correct answer', async ({ browser }) => {
    // ============================================================
    // ARRANGE: Setup game with 2 players at board
    // ============================================================
    const ctx = await setupTestInProgress(browser, ['Alice', 'Bob'], 'daily-double-correct');

    try {
      const { hostPage, playerPages } = ctx;
      const [player1Page] = playerPages;

      // ============================================================
      // ACT: Host selects a Daily Double clue (clue index 5 is often DD)
      // ============================================================
      await selectClue(hostPage, 5);

      // ============================================================
      // ASSERT: Daily Double splash screen appears
      // ============================================================
      await expect(hostPage.getByText(/Daily Double/i)).toBeVisible({ timeout: 5000 });
      await expect(player1Page.getByText(/Daily Double/i)).toBeVisible({ timeout: 5000 });

      console.log('✅ Daily Double splash screen displayed');

      // ============================================================
      // ACT: Host reveals the Daily Double prompt
      // ============================================================
      const revealButton = hostPage.getByRole('button', { name: /Reveal|Daily Double/i });
      await expect(revealButton).toBeVisible({ timeout: 5000 });
      await revealButton.click();
      await hostPage.waitForTimeout(1000);

      // ============================================================
      // ASSERT: Wager entry appears for player
      // ============================================================
      const wagerInput = player1Page.locator('input[type="number"], input[placeholder*="wager" i]');
      await expect(wagerInput).toBeVisible({ timeout: 5000 });

      console.log('✅ Wager entry displayed');

      // ============================================================
      // ACT: Player enters wager
      // ============================================================
      await wagerInput.fill('500');
      const submitWagerButton = player1Page.getByRole('button', { name: /Submit|Wager/i });
      await expect(submitWagerButton).toBeVisible({ timeout: 3000 });
      await submitWagerButton.click();
      await hostPage.waitForTimeout(1000);

      // ============================================================
      // ASSERT: Clue prompt appears after wager
      // ============================================================
      const cluePrompt = hostPage.locator('text=/What is|Who is|Clue/i').first();
      await expect(cluePrompt).toBeVisible({ timeout: 5000 });

      console.log('✅ Clue prompt displayed after wager');

      // ============================================================
      // ACT: Host unlocks buzzer for answer
      // ============================================================
      await unlockBuzzer(hostPage);

      // ============================================================
      // ACT: Player buzzes in
      // ============================================================
      await buzzIn(player1Page);

      // ============================================================
      // ASSERT: Player is buzzed in
      // ============================================================
      await expect(player1Page.getByText(/buzzed in|your turn/i)).toBeVisible({ timeout: 3000 });

      console.log('✅ Player buzzed in for Daily Double');

      // ============================================================
      // ACT: Host marks answer as correct
      // ============================================================
      await markCorrect(hostPage);

      // ============================================================
      // ASSERT: Score updated with wager amount
      // ============================================================
      // Player should have gained $500
      await expect(hostPage.getByText(/Alice.*\$[5-9]/)).toBeVisible({ timeout: 3000 });

      console.log('✅ Score updated correctly for Daily Double');

      // ============================================================
      // ASSERT: Game returns to normal board state
      // ============================================================
      await expect(hostPage.locator('.game-board, [class*="board"]')).toBeVisible({ timeout: 5000 });

      console.log('✅ Daily Double correct answer flow completed successfully');

    } finally {
      await cleanupTestContext(ctx);
    }
  });

  test('should handle Daily Double with wrong answer', async ({ browser }) => {
    // ============================================================
    // ARRANGE: Setup game with 1 player at board
    // ============================================================
    const ctx = await setupTestInProgress(browser, ['Alice'], 'daily-double-wrong');

    try {
      const { hostPage, playerPages } = ctx;
      const [player1Page] = playerPages;

      // ============================================================
      // ACT: Select Daily Double, reveal, enter wager
      // ============================================================
      await selectClue(hostPage, 5);
      await expect(hostPage.getByText(/Daily Double/i)).toBeVisible({ timeout: 5000 });

      const revealButton = hostPage.getByRole('button', { name: /Reveal|Daily Double/i });
      await revealButton.click();
      await hostPage.waitForTimeout(1000);

      const wagerInput = player1Page.locator('input[type="number"], input[placeholder*="wager" i]');
      await wagerInput.fill('300');
      const submitWagerButton = player1Page.getByRole('button', { name: /Submit|Wager/i });
      await submitWagerButton.click();
      await hostPage.waitForTimeout(1000);

      // ============================================================
      // ACT: Player buzzes in and host marks wrong
      // ============================================================
      await unlockBuzzer(hostPage);
      await buzzIn(player1Page);
      await markWrong(hostPage);

      // ============================================================
      // ASSERT: Score decreased by wager amount
      // ============================================================
      // Player should have lost $300 (negative score)
      await expect(hostPage.getByText(/Alice.*-\$[2-9]/)).toBeVisible({ timeout: 3000 });

      console.log('✅ Score decreased correctly for wrong Daily Double answer');
      console.log('✅ Daily Double wrong answer flow completed successfully');

    } finally {
      await cleanupTestContext(ctx);
    }
  });
});

