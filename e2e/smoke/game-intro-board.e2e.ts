import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import {
  setupTestWithLobby,
  cleanupTestContext,
  selectClue,
  waitForGameBoard,
  pausePageAnimationsAndCheck,
  animationsSettled
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

      if (!hostPage || !player1Page || !player2Page) {
        throw new Error('Failed to setup pages');
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
        animationsSettled(player1Page, 3000),
        animationsSettled(player2Page, 3000)
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
      // ACT: Host initializes category introduction
      // ============================================================
      const startCategoryButton = hostPage.getByRole('button', { name: /Introduce Categories/i });
      await expect(startCategoryButton).toBeVisible({ timeout: 5000 });
      await startCategoryButton.click();
      await expect(startCategoryButton).not.toBeVisible({ timeout: 5000 });

      // Host pauses briefly to allow animation to complete
      await hostPage.waitForTimeout(5000);

      test.info().annotations.push({ type: 'step', description: 'Category introduction started' });

      // ============================================================
      // ACT: Host advances through all categories
      // ============================================================
      // Skip through up to 6 categories (standard Jeopardy board)
      for (let i = 0; i < 6; i++) {
        const continueButton = hostPage.getByRole('button', { name: /Next Category/i }).first();
        if (await continueButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          test.info().annotations.push({ type: 'step', description: `Advancing to category ${i + 1}` });
          await continueButton.click();
          await expect(hostPage.getByText(`Category ${i + 1} of 6`)).toBeVisible({ timeout: 5000 });
          test.info().annotations.push({ type: 'step', description: `Advanced to category ${i + 1}` });
        } else {
          test.info().annotations.push({ type: 'step', description: `No more categories to advance` });
          break;
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
      await selectClue(hostPage, 0);

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
