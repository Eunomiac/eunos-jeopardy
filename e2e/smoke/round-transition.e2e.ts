import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import { startConsoleLogger } from '../fixtures/console-logger';

/**
 * E2E Smoke Tests: Round Transitions
 * 
 * Tests transitions between game rounds:
 * - Jeopardy → Double Jeopardy
 * - Double Jeopardy → Final Jeopardy
 * - Board refresh and state management
 * - Score persistence across rounds
 */

test.describe('Round Transitions - Smoke Tests', () => {

  test.afterEach(async () => {
    // Cleanup all test users
    await Promise.all([
      cleanupTestUser(TEST_USERS.host.id),
      cleanupTestUser(TEST_USERS.player1.id),
      cleanupTestUser(TEST_USERS.player2.id)
    ]);
  });

  test('should transition from Jeopardy to Double Jeopardy round', async ({ browser }) => {
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
    const hostLogger = startConsoleLogger(hostPage, 'round-transition-host');
    const player1Logger = startConsoleLogger(player1Page, 'round-transition-player1');
    const player2Logger = startConsoleLogger(player2Page, 'round-transition-player2');

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
      // ARRANGE: Start game and complete Jeopardy round
      // ============================================================
      await hostPage.getByRole('button', { name: 'Start Game' }).click();
      await hostPage.waitForTimeout(2000);

      // Skip through intro animations
      for (let i = 0; i < 7; i++) {
        const nextButton = hostPage.getByRole('button', { name: /Next|Continue|Start|Introduce/i }).first();
        if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await nextButton.click();
          await hostPage.waitForTimeout(500);
        }
      }

      await expect(player1Page.locator('.game-board')).toBeVisible({ timeout: 15000 });

      // ============================================================
      // ARRANGE: Play a few clues to establish scores
      // ============================================================
      // Play 2-3 clues so players have scores to verify persistence
      for (let i = 0; i < 2; i++) {
        const clue = hostPage.locator('.clue-cell:not(.completed):not(.answered), .board-cell:not(.completed):not(.answered)').first();
        if (await clue.isVisible({ timeout: 2000 }).catch(() => false)) {
          await clue.click();
          await hostPage.waitForTimeout(1000);

          const unlockButton = hostPage.getByRole('button', { name: /Unlock|Enable Buzzer/i });
          if (await unlockButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await unlockButton.click();
            
            // Alternate between players
            const buzzer = i === 0 
              ? player1Page.locator('.buzzer-button, button[class*="buzzer"]')
              : player2Page.locator('.buzzer-button, button[class*="buzzer"]');
            
            await expect(buzzer).toBeEnabled({ timeout: 2000 });
            await buzzer.click();
            
            const correctButton = hostPage.getByRole('button', { name: /Correct|✓/i });
            await expect(correctButton).toBeVisible({ timeout: 5000 });
            await correctButton.click();
            await hostPage.waitForTimeout(1000);
          }
        }
      }

      // ============================================================
      // ARRANGE: Record scores before transition
      // ============================================================
      const player1ScoreBefore = await player1Page.locator('.player-score, .score-display').textContent();
      const player2ScoreBefore = await player2Page.locator('.player-score, .score-display').textContent();
      
      console.log(`Scores before transition - Alice: ${player1ScoreBefore}, Bob: ${player2ScoreBefore}`);

      // ============================================================
      // ACT: Host ends Jeopardy round
      // ============================================================
      // Note: Button text may vary - could be "End Round", "Next Round", "Double Jeopardy"
      const endRoundButton = hostPage.getByRole('button', { name: /End Round|Next Round|Double Jeopardy|Transition/i });
      await expect(endRoundButton).toBeVisible({ timeout: 5000 });
      await endRoundButton.click();

      // ============================================================
      // ASSERT: Round transition animation should play
      // ============================================================
      // Note: Adjust selector based on actual transition animation
      await hostPage.waitForTimeout(2000);
      
      // Players should see transition animation or new board
      await expect(player1Page.locator('.round-transition, .animation-container, .game-board')).toBeVisible({ timeout: 10000 });
      await expect(player2Page.locator('.round-transition, .animation-container, .game-board')).toBeVisible({ timeout: 10000 });

      // ============================================================
      // ACT: Host advances through Double Jeopardy intro
      // ============================================================
      // Similar to game start, may need to introduce categories again
      for (let i = 0; i < 7; i++) {
        const nextButton = hostPage.getByRole('button', { name: /Next|Continue|Start|Introduce/i }).first();
        if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await nextButton.click();
          await hostPage.waitForTimeout(500);
        }
      }

      // ============================================================
      // ASSERT: Double Jeopardy board should be displayed
      // ============================================================
      await expect(hostPage.locator('.game-board')).toBeVisible({ timeout: 10000 });
      await expect(player1Page.locator('.game-board')).toBeVisible({ timeout: 10000 });
      await expect(player2Page.locator('.game-board')).toBeVisible({ timeout: 10000 });

      // ============================================================
      // ASSERT: Round indicator should show "Double Jeopardy"
      // ============================================================
      // Note: Adjust selector based on actual round display
      await expect(hostPage.locator('.round-indicator, .current-round')).toContainText(/Double Jeopardy|Round 2/i, { timeout: 5000 });
      await expect(player1Page.locator('.round-indicator, .current-round')).toContainText(/Double Jeopardy|Round 2/i, { timeout: 5000 });

      // ============================================================
      // ASSERT: Scores should persist from Jeopardy round
      // ============================================================
      const player1ScoreAfter = await player1Page.locator('.player-score, .score-display').textContent();
      const player2ScoreAfter = await player2Page.locator('.player-score, .score-display').textContent();
      
      console.log(`Scores after transition - Alice: ${player1ScoreAfter}, Bob: ${player2ScoreAfter}`);
      
      // Scores should be the same (or at least not reset to 0)
      expect(player1ScoreAfter).toBe(player1ScoreBefore);
      expect(player2ScoreAfter).toBe(player2ScoreBefore);

      // ============================================================
      // ASSERT: New clues should be available
      // ============================================================
      // All clues should be unplayed (not marked as completed)
      const completedClues = await hostPage.locator('.clue-cell.completed, .clue-cell.answered').count();
      expect(completedClues).toBe(0);

      // ============================================================
      // ASSERT: Clue values should be doubled
      // ============================================================
      // Note: First row should show $400, $800, $1200, $1600, $2000
      // instead of $200, $400, $600, $800, $1000
      await expect(hostPage.locator('.clue-value, .clue-cell').first()).toContainText(/400|\$400/, { timeout: 5000 });

      console.log('✅ Jeopardy to Double Jeopardy transition completed successfully');

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

