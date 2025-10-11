import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import { startConsoleLogger } from '../fixtures/console-logger';

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
    // ARRANGE: Create browser contexts for host and 2 players
    // ============================================================
    const hostContext = await browser.newContext();
    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    // Start console logging for debugging
    const hostLogger = startConsoleLogger(hostPage, 'game-intro-host');
    const player1Logger = startConsoleLogger(player1Page, 'game-intro-player1');
    const player2Logger = startConsoleLogger(player2Page, 'game-intro-player2');

    try {
      // ============================================================
      // ARRANGE: Player 1 logs in and waits
      // ============================================================
      await player1Page.goto('/');
      await player1Page.getByPlaceholder('Email').fill(TEST_USERS.player1.email);
      await player1Page.getByPlaceholder('Password').fill(TEST_USERS.player1.password);
      await player1Page.getByRole('button', { name: 'Login' }).click();
      await expect(player1Page.getByText('Currently logged in as')).toBeVisible();

      // Set nickname
      const player1NicknameInput = player1Page.getByPlaceholder('Your display name for this game...');
      await expect(player1NicknameInput).not.toHaveValue('');
      await player1NicknameInput.fill('');
      await player1NicknameInput.fill('Alice');
      await expect(player1NicknameInput).toHaveValue('Alice');

      // ============================================================
      // ARRANGE: Player 2 logs in and waits
      // ============================================================
      await player2Page.goto('/');
      await player2Page.getByPlaceholder('Email').fill(TEST_USERS.player2.email);
      await player2Page.getByPlaceholder('Password').fill(TEST_USERS.player2.password);
      await player2Page.getByRole('button', { name: 'Login' }).click();
      await expect(player2Page.getByText('Currently logged in as')).toBeVisible();

      // Set nickname
      const player2NicknameInput = player2Page.getByPlaceholder('Your display name for this game...');
      await expect(player2NicknameInput).not.toHaveValue('');
      await player2NicknameInput.fill('');
      await player2NicknameInput.fill('Bob');
      await expect(player2NicknameInput).toHaveValue('Bob');

      // ============================================================
      // ARRANGE: Host logs in and creates game
      // ============================================================
      await hostPage.goto('/');
      await hostPage.getByPlaceholder('Email').fill(TEST_USERS.host.email);
      await hostPage.getByPlaceholder('Password').fill(TEST_USERS.host.password);
      await hostPage.getByRole('button', { name: 'Login' }).click();
      await expect(hostPage.getByText('Currently logged in as')).toBeVisible();

      // Create game
      await hostPage.getByRole('button', { name: 'Create Game' }).click();
      await expect(hostPage.getByText('Game Host Dashboard')).toBeVisible();

      // ============================================================
      // ARRANGE: Players join game
      // ============================================================
      await player1Page.getByRole('button', { name: 'Join Game' }).click();
      await expect(player1Page.getByText('Game Lobby')).toBeVisible();

      await player2Page.getByRole('button', { name: 'Join Game' }).click();
      await expect(player2Page.getByText('Game Lobby')).toBeVisible();

      // Verify host sees both players
      await expect(hostPage.getByText('Total Players: 2')).toBeVisible();

      // ============================================================
      // ACT: Host starts game (triggers game_intro status)
      // ============================================================
      await hostPage.getByRole('button', { name: 'Start Game' }).click();

      // ============================================================
      // ASSERT: Game status should be game_intro
      // ============================================================
      // Wait for game intro to start (players should see intro animation or board)
      // Note: Exact UI elements will need to be adjusted based on actual implementation
      await expect(player1Page.locator('.game-board, .animation-container')).toBeVisible({ timeout: 10000 });
      await expect(player2Page.locator('.game-board, .animation-container')).toBeVisible({ timeout: 10000 });

      // ============================================================
      // ACT: Host clicks "Introduce Categories"
      // ============================================================
      // Note: Button text may vary - adjust as needed
      const introduceCategoriesButton = hostPage.getByRole('button', { name: /Introduce Categories|Next/i });
      await expect(introduceCategoriesButton).toBeVisible({ timeout: 10000 });
      await introduceCategoriesButton.click();

      // ============================================================
      // ASSERT: Category introduction should start
      // ============================================================
      // Wait for first category to be displayed
      // Note: Selector will need adjustment based on actual category display
      await expect(player1Page.locator('.category-name, .category-display')).toBeVisible({ timeout: 10000 });
      await expect(player2Page.locator('.category-name, .category-display')).toBeVisible({ timeout: 10000 });

      // ============================================================
      // ACT: Host advances through all 6 categories
      // ============================================================
      for (let i = 0; i < 5; i++) {
        // Click next category button
        const nextButton = hostPage.getByRole('button', { name: /Next Category|Next/i });
        await expect(nextButton).toBeVisible({ timeout: 5000 });
        await nextButton.click();
        
        // Wait a moment for animation/transition
        await hostPage.waitForTimeout(1000);
      }

      // ============================================================
      // ASSERT: After all categories, button should say "Start Game"
      // ============================================================
      const startGameButton = hostPage.getByRole('button', { name: /Start Game|Begin/i });
      await expect(startGameButton).toBeVisible({ timeout: 5000 });

      // ============================================================
      // ACT: Host clicks final "Start Game" to begin gameplay
      // ============================================================
      await startGameButton.click();

      // ============================================================
      // ASSERT: Game should transition to in_progress status
      // ============================================================
      // Players should see the full game board with clues
      await expect(player1Page.locator('.game-board')).toBeVisible({ timeout: 10000 });
      await expect(player2Page.locator('.game-board')).toBeVisible({ timeout: 10000 });

      // Host should see game controls (not intro controls)
      // Note: Adjust selector based on actual host controls
      await expect(hostPage.locator('.host-controls, .clue-controls')).toBeVisible({ timeout: 10000 });

      console.log('✅ Game introduction and category reveal flow completed successfully');

    } finally {
      // Save console logs
      await hostLogger.save();
      await player1Logger.save();
      await player2Logger.save();

      // Close contexts
      await hostContext.close();
      await player1Context.close();
      await player2Context.close();
    }
  });

});

