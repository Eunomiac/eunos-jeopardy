import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import {
  setupTestWithLobby,
  cleanupTestContext,
  selectClue,
  waitForGameBoard,
  pausePageAnimationsAndCheck,
  animationsSettled,
  getCategoryNames
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
      const { hostPage, playerPages, gameId } = ctx;
      const [player1Page, player2Page] = playerPages;

      if (!hostPage || !player1Page || !player2Page || !gameId) {
        throw new Error('Failed to setup pages or game');
      }

      // ============================================================
      // ACT: Host starts the game
      // ============================================================

      // We define this as a function, as it triggers an animation and must be run within the animation control helper.
      const startGameClick = async () => hostPage
        .getByRole('button', { name: 'Start Game' })
        .click(); // Sends Supabase update; RTS triggers `player1Page` and `player2Page` to load the game screen AND start the intro animation

      // ============================================================
      // ASSERT: Player Dashboards are loaded, initial animation state is correct
      // ============================================================
      test.info().annotations.push({ type: 'step', description: 'Initiating animation initial state check' });

      await pausePageAnimationsAndCheck(
        startGameClick,
        [
          player1Page,
          async () => {
            await expect(player1Page.locator("button", { hasText: /\$\d\d\d\d?/}).first()).toBeAttached();
            await expect(player1Page.locator("button", { hasText: /\$\d\d\d\d?/}).first()).toBeHidden();
          }
        ],
        [
          player2Page,
          async () => {
            await expect(player2Page.locator("button", { hasText: /\$\d\d\d\d?/}).first()).toBeAttached();
            await expect(player2Page.locator("button", { hasText: /\$\d\d\d\d?/}).first()).toBeHidden();
          }
        ]
      );

      test.info().annotations.push({ type: 'step', description: 'Initial state check passed, animations resumed' });

      // Wait for animations to complete before proceeding
      await Promise.all([
        animationsSettled(player1Page),
        animationsSettled(player2Page)
      ]);
      test.info().annotations.push({ type: 'step', description: 'Animations settled' });

      // ============================================================
      // ASSERT: Player Dashboards are loaded, final state is correct
      // ============================================================
      await Promise.all([
        expect(player1Page.locator("button[style*='opacity: 1']", { hasText: /\$\d\d\d\d?/})).toHaveCount(30),
        expect(player2Page.locator("button[style*='opacity: 1']", { hasText: /\$\d\d\d\d?/})).toHaveCount(30)
      ]);

      test.info().annotations.push({ type: 'step', description: 'Game intro animation displayed' });

      // ============================================================
      // ARRANGE: Get category names from database
      // ============================================================
      const categoryNames = await getCategoryNames(ctx.gameId!, 'jeopardy');
      expect(categoryNames.length).toBe(6); // Standard Jeopardy board has 6 categories
      test.info().annotations.push({
        type: 'step',
        description: `Retrieved categories: ${categoryNames.join(', ')}`
      });

      // ============================================================
      // ACT: Host initializes category introduction
      // ============================================================
      const startCategoryButton = hostPage.getByRole('button', { name: /Introduce Categories/i });
      await expect(startCategoryButton).toBeVisible({ timeout: 5000 });
      await startCategoryButton.click();
      await expect(startCategoryButton).not.toBeVisible({ timeout: 5000 });

      test.info().annotations.push({ type: 'step', description: 'Category introduction started' });

      // ============================================================
      // ACT & ASSERT: Host advances through all categories, verifying each
      // ============================================================
      for (let i = 0; i < categoryNames.length; i++) {
        const categoryName = categoryNames[i];
        if (!categoryName) {
          throw new Error(`Category name at index ${i} is undefined`);
        }
        const categoryNumber = i + 1;

        // Verify category is displayed on host page
        await expect(hostPage.getByText(categoryName)).toBeVisible({ timeout: 5000 });

        // Verify category is visible on player page
        // The category strip shows all categories, but only one is visible through the viewport
        // We check that the category exists in the strip (it's in the DOM)
        const player1CategoryStrip = player1Page.locator('.jeopardy-category-display-strip');
        await expect(player1CategoryStrip.getByText(categoryName)).toBeVisible({ timeout: 5000 });

        test.info().annotations.push({
          type: 'step',
          description: `✅ Category ${categoryNumber}: "${categoryName}" displayed correctly`
        });

        // Advance to next category (if not the last one)
        if (i < categoryNames.length - 1) {
          const continueButton = hostPage.getByRole('button', { name: /Next Category/i }).first();
          await expect(continueButton).toBeVisible({ timeout: 2000 });
          await continueButton.click();
          await expect(hostPage.getByText(`Category ${categoryNumber + 1} of 6`)).toBeVisible({ timeout: 5000 });
        }
      }

      // ============================================================
      // ACT: After final category, hosts clicks "Start Game"
      // ============================================================
      test.info().annotations.push({ type: 'step', description: 'Advancing to game start' });
      const startGameButton = hostPage.getByRole('button', { name: /Start Game/i }).first();
      await expect(startGameButton).toBeVisible({ timeout: 5000 });
      await startGameButton.click();
      await expect(startGameButton).not.toBeVisible({ timeout: 5000 });

      // ============================================================
      // ASSERT: Game board is displayed
      // ============================================================
      // player1Page and player2Page already checked above, safe to use
      await waitForGameBoard(hostPage);
      await waitForGameBoard(player1Page);
      await waitForGameBoard(player2Page);

      test.info().annotations.push({ type: 'step', description: 'Game board displayed after intro' });

      // ============================================================
      // ASSERT: Clue cells are visible
      // ============================================================
      const clueCells = hostPage.locator('.clue-cell, [class*="clue"]');
      await expect(clueCells.first()).toBeVisible({ timeout: 5000 });

      const clueCount = await clueCells.count();
      expect(clueCount).toBeGreaterThan(0);

      test.info().annotations.push({ type: 'step', description: `Found ${clueCount} clue cells on board` });

      // ============================================================
      // ASSERT: Host can select a clue
      // ============================================================
      await selectClue(hostPage, gameId);

      // Verify clue prompt or controls appear
      const cluePrompt = hostPage.locator('text=/What is|Who is|Clue|Prompt/i').first();
      const unlockButton = hostPage.getByRole('button', { name: /Unlock|Buzzer/i });

      const clueVisible = await cluePrompt.isVisible({ timeout: 3000 }).catch(() => false);
      const buttonVisible = await unlockButton.isVisible({ timeout: 3000 }).catch(() => false);

      expect(clueVisible || buttonVisible).toBe(true);

      test.info().annotations.push({ type: 'step', description: 'Host can select and interact with clues' });
      test.info().annotations.push({ type: 'step', description: 'Game introduction and board display flow completed successfully' });

    } finally {
      await cleanupTestContext(ctx);
    }
  });
});
