import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import {
  setupTestWithLobby,
  cleanupTestContext,
  selectClue
} from '../fixtures/test-helpers';

/**
 * E2E Smoke Tests: Game Introduction & Board Display
 *
 * Tests the game introduction flow including:
 * - Game intro animation
 * - Category introduction sequence
 * - Board display after animations
 * - Host controls during intro phases
 */

test.describe('Game Introduction & Board Display - Smoke Tests', () => {

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

  test('should complete game introduction and category reveal flow', async ({ browser }) => {
    // ============================================================
    // ARRANGE: Setup game with 2 players in lobby
    // ============================================================
    const ctx = await setupTestWithLobby(browser, ['Alice', 'Bob'], 'game-intro');

    try {
      const { hostPage, playerPages } = ctx;
      const [player1Page, player2Page] = playerPages;

      // ============================================================
      // ACT: Host starts the game
      // ============================================================
      await hostPage.getByRole('button', { name: 'Start Game' }).click();
      await hostPage.waitForTimeout(2000);

      // ============================================================
      // ASSERT: Game intro animation appears
      // ============================================================
      // Defensive checks for player pages
      if (!player1Page || !player2Page) {
        throw new Error('Failed to setup player pages');
      }

      await expect(hostPage.getByText(/Welcome to|Let's Play/i)).toBeVisible({ timeout: 10000 });
      await expect(player1Page.getByText(/Welcome to|Let's Play/i)).toBeVisible({ timeout: 10000 });
      await expect(player2Page.getByText(/Welcome to|Let's Play/i)).toBeVisible({ timeout: 10000 });

      console.log('✅ Game intro animation displayed');

      // ============================================================
      // ACT: Host advances through intro
      // ============================================================
      const nextButton = hostPage.getByRole('button', { name: /Next|Continue/i }).first();
      await expect(nextButton).toBeVisible({ timeout: 5000 });
      await nextButton.click();
      await hostPage.waitForTimeout(1000);

      // ============================================================
      // ASSERT: Category introduction begins
      // ============================================================
      // Look for category names or "Category" text
      const categoryIndicator = hostPage.locator('text=/Category|CATEGORY/i').first();
      await expect(categoryIndicator).toBeVisible({ timeout: 10000 });

      console.log('✅ Category introduction started');

      // ============================================================
      // ACT: Host advances through all categories
      // ============================================================
      // Skip through up to 6 categories (standard Jeopardy board)
      for (let i = 0; i < 6; i++) {
        const continueButton = hostPage.getByRole('button', { name: /Next|Continue/i }).first();
        if (await continueButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await continueButton.click();
          await hostPage.waitForTimeout(500);
        } else {
          break;
        }
      }

      // ============================================================
      // ASSERT: Game board is displayed
      // ============================================================
      // player1Page and player2Page already checked above, safe to use
      await expect(hostPage.locator('.game-board, [class*="board"]')).toBeVisible({ timeout: 15000 });
      await expect(player1Page.locator('.game-board, [class*="board"]')).toBeVisible({ timeout: 15000 });
      await expect(player2Page.locator('.game-board, [class*="board"]')).toBeVisible({ timeout: 15000 });

      console.log('✅ Game board displayed after intro');

      // ============================================================
      // ASSERT: Clue cells are visible
      // ============================================================
      const clueCells = hostPage.locator('.clue-cell, [class*="clue"]');
      await expect(clueCells.first()).toBeVisible({ timeout: 5000 });

      const clueCount = await clueCells.count();
      expect(clueCount).toBeGreaterThan(0);

      console.log(`✅ Found ${clueCount} clue cells on board`);

      // ============================================================
      // ASSERT: Host can select a clue
      // ============================================================
      await selectClue(hostPage, 0);

      // Verify clue prompt or controls appear
      const cluePrompt = hostPage.locator('text=/What is|Who is|Clue|Prompt/i').first();
      const unlockButton = hostPage.getByRole('button', { name: /Unlock|Buzzer/i });

      const clueVisible = await cluePrompt.isVisible({ timeout: 3000 }).catch(() => false);
      const buttonVisible = await unlockButton.isVisible({ timeout: 3000 }).catch(() => false);

      expect(clueVisible || buttonVisible).toBe(true);

      console.log('✅ Host can select and interact with clues');
      console.log('✅ Game introduction and board display flow completed successfully');

    } finally {
      await cleanupTestContext(ctx);
    }
  });
});
