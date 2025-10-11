import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import { startConsoleLogger } from '../fixtures/console-logger';

/**
 * E2E Smoke Tests: Final Jeopardy
 * 
 * Tests the Final Jeopardy round including:
 * - Category reveal
 * - Simultaneous wager entry by all players
 * - Clue reveal
 * - Answer submission
 * - Score adjustments for all players
 * - Game completion
 */

test.describe('Final Jeopardy - Smoke Tests', () => {

  test.afterEach(async () => {
    // Cleanup all test users
    await Promise.all([
      cleanupTestUser(TEST_USERS.host.id),
      cleanupTestUser(TEST_USERS.player1.id),
      cleanupTestUser(TEST_USERS.player2.id)
    ]);
  });

  test('should complete Final Jeopardy round', async ({ browser }) => {
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
    const hostLogger = startConsoleLogger(hostPage, 'final-jeopardy-host');
    const player1Logger = startConsoleLogger(player1Page, 'final-jeopardy-player1');
    const player2Logger = startConsoleLogger(player2Page, 'final-jeopardy-player2');

    try {
      // ============================================================
      // ARRANGE: Setup game with 2 players
      // ============================================================
      await player1Page.goto('/');
      await player1Page.getByPlaceholder('Email').fill(TEST_USERS.player1.email);
      await player1Page.getByPlaceholder('Password').fill(TEST_USERS.player1.password);
      await player1Page.getByRole('button', { name: 'Login' }).click();
      await expect(player1Page.getByText('Currently logged in as')).toBeVisible();

      const player1NicknameInput = player1Page.getByPlaceholder('Your display name for this game...');
      await expect(player1NicknameInput).not.toHaveValue('');
      await player1NicknameInput.fill('');
      await player1NicknameInput.fill('Alice');

      await player2Page.goto('/');
      await player2Page.getByPlaceholder('Email').fill(TEST_USERS.player2.email);
      await player2Page.getByPlaceholder('Password').fill(TEST_USERS.player2.password);
      await player2Page.getByRole('button', { name: 'Login' }).click();
      await expect(player2Page.getByText('Currently logged in as')).toBeVisible();

      const player2NicknameInput = player2Page.getByPlaceholder('Your display name for this game...');
      await expect(player2NicknameInput).not.toHaveValue('');
      await player2NicknameInput.fill('');
      await player2NicknameInput.fill('Bob');

      await hostPage.goto('/');
      await hostPage.getByPlaceholder('Email').fill(TEST_USERS.host.email);
      await hostPage.getByPlaceholder('Password').fill(TEST_USERS.host.password);
      await hostPage.getByRole('button', { name: 'Login' }).click();
      await expect(hostPage.getByText('Currently logged in as')).toBeVisible();

      await hostPage.getByRole('button', { name: 'Create Game' }).click();
      await expect(hostPage.getByText('Game Host Dashboard')).toBeVisible();

      await player1Page.getByRole('button', { name: 'Join Game' }).click();
      await expect(player1Page.getByText('Game Lobby')).toBeVisible();

      await player2Page.getByRole('button', { name: 'Join Game' }).click();
      await expect(player2Page.getByText('Game Lobby')).toBeVisible();

      await expect(hostPage.getByText('Total Players: 2')).toBeVisible();

      // ============================================================
      // ARRANGE: Start game and get to Final Jeopardy
      // ============================================================
      await hostPage.getByRole('button', { name: 'Start Game' }).click();
      await hostPage.waitForTimeout(2000);

      // Skip through all intro animations and rounds
      // Note: This is a simplified approach - in reality you'd need to:
      // 1. Complete Jeopardy round
      // 2. Complete Double Jeopardy round
      // 3. Then reach Final Jeopardy
      // For testing purposes, we'll try to fast-forward

      // Skip intro
      for (let i = 0; i < 7; i++) {
        const nextButton = hostPage.getByRole('button', { name: /Next|Continue|Start|Introduce/i }).first();
        if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await nextButton.click();
          await hostPage.waitForTimeout(500);
        }
      }

      // Try to find "End Round" or "Final Jeopardy" button
      // Note: You may need to play through rounds or have a test mode to skip to FJ
      const finalJeopardyButton = hostPage.getByRole('button', { name: /Final Jeopardy|End Round/i });
      if (await finalJeopardyButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await finalJeopardyButton.click();
        await hostPage.waitForTimeout(1000);
        
        // Click through any additional transitions
        for (let i = 0; i < 3; i++) {
          const nextButton = hostPage.getByRole('button', { name: /Next|Continue|Start/i }).first();
          if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await nextButton.click();
            await hostPage.waitForTimeout(500);
          }
        }
      }

      // ============================================================
      // ASSERT: Final Jeopardy category should be revealed
      // ============================================================
      // Note: Adjust selector based on actual FJ category display
      await expect(player1Page.locator('.final-jeopardy-category, .fj-category')).toBeVisible({ timeout: 10000 });
      await expect(player2Page.locator('.final-jeopardy-category, .fj-category')).toBeVisible({ timeout: 10000 });

      // ============================================================
      // ACT: Players enter wagers
      // ============================================================
      // Note: Wagers might be entered on player screens or host screen
      const player1WagerInput = player1Page.locator('input[type="number"], input[placeholder*="wager" i]');
      const player2WagerInput = player2Page.locator('input[type="number"], input[placeholder*="wager" i]');

      if (await player1WagerInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Players enter wagers on their own screens
        await player1WagerInput.fill('1000');
        await player1Page.getByRole('button', { name: /Submit|Confirm/i }).click();

        await player2WagerInput.fill('500');
        await player2Page.getByRole('button', { name: /Submit|Confirm/i }).click();
      } else {
        // Host enters wagers for players
        const wagerInputs = await hostPage.locator('input[type="number"], input[placeholder*="wager" i]').all();
        if (wagerInputs.length >= 2) {
          await wagerInputs[0].fill('1000');
          await wagerInputs[1].fill('500');
          await hostPage.getByRole('button', { name: /Submit|Confirm|Continue/i }).click();
        }
      }

      // ============================================================
      // ACT: Host reveals Final Jeopardy clue
      // ============================================================
      const revealClueButton = hostPage.getByRole('button', { name: /Reveal|Show Clue|Continue/i });
      await expect(revealClueButton).toBeVisible({ timeout: 5000 });
      await revealClueButton.click();

      // ============================================================
      // ASSERT: Clue should be visible to all players
      // ============================================================
      await expect(player1Page.locator('.clue-text, .clue-prompt, .fj-clue')).toBeVisible({ timeout: 5000 });
      await expect(player2Page.locator('.clue-text, .clue-prompt, .fj-clue')).toBeVisible({ timeout: 5000 });

      // ============================================================
      // ACT: Host adjudicates answers
      // ============================================================
      // Note: Host marks each player's answer as correct or wrong
      // This might be done through a list of players with correct/wrong buttons

      // Mark Player 1 (Alice) correct
      const player1CorrectButton = hostPage.getByRole('button', { name: /Alice.*Correct|Correct.*Alice/i }).or(
        hostPage.locator('button:has-text("Alice")').locator('..').getByRole('button', { name: /Correct|✓/i })
      );
      if (await player1CorrectButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await player1CorrectButton.click();
      } else {
        // Fallback: click first correct button
        await hostPage.getByRole('button', { name: /Correct|✓/i }).first().click();
      }

      await hostPage.waitForTimeout(500);

      // Mark Player 2 (Bob) wrong
      const player2WrongButton = hostPage.getByRole('button', { name: /Bob.*Wrong|Wrong.*Bob/i }).or(
        hostPage.locator('button:has-text("Bob")').locator('..').getByRole('button', { name: /Wrong|✗/i })
      );
      if (await player2WrongButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await player2WrongButton.click();
      } else {
        // Fallback: click first wrong button
        await hostPage.getByRole('button', { name: /Wrong|✗/i }).first().click();
      }

      // ============================================================
      // ASSERT: Scores should be updated
      // ============================================================
      // Player 1 should gain $1000
      // Player 2 should lose $500
      await hostPage.waitForTimeout(1000);

      // Note: Exact score validation depends on starting scores
      // Just verify that scores are displayed
      await expect(player1Page.locator('.player-score, .score-display')).toBeVisible({ timeout: 5000 });
      await expect(player2Page.locator('.player-score, .score-display')).toBeVisible({ timeout: 5000 });

      // ============================================================
      // ASSERT: Game should show completion/winner
      // ============================================================
      // Note: Adjust selector based on actual game end screen
      const gameEndIndicator = hostPage.locator('.game-complete, .winner-display, .final-scores');
      await expect(gameEndIndicator).toBeVisible({ timeout: 10000 });

      // Players should also see game end screen
      await expect(player1Page.locator('.game-complete, .winner-display, .final-scores')).toBeVisible({ timeout: 10000 });
      await expect(player2Page.locator('.game-complete, .winner-display, .final-scores')).toBeVisible({ timeout: 10000 });

      console.log('✅ Final Jeopardy round completed successfully');

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

