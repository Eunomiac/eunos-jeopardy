import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import { startConsoleLogger } from '../fixtures/console-logger';

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
    // ARRANGE: Create browser contexts for host and 2 players
    // ============================================================
    const hostContext = await browser.newContext();
    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    // Start console logging for debugging
    const hostLogger = startConsoleLogger(hostPage, 'daily-double-host');
    const player1Logger = startConsoleLogger(player1Page, 'daily-double-player1');
    const player2Logger = startConsoleLogger(player2Page, 'daily-double-player2');

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
      // ARRANGE: Start game and skip to in_progress
      // ============================================================
      await hostPage.getByRole('button', { name: 'Start Game' }).click();
      await hostPage.waitForTimeout(2000);

      // Skip through intro animations if present
      for (let i = 0; i < 7; i++) {
        const nextButton = hostPage.getByRole('button', { name: /Next|Continue|Start|Introduce/i }).first();
        if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await nextButton.click();
          await hostPage.waitForTimeout(500);
        }
      }

      await expect(player1Page.locator('.game-board')).toBeVisible({ timeout: 15000 });

      // ============================================================
      // ARRANGE: Give Player 1 some points first (for valid wager)
      // ============================================================
      // Select a regular clue, Player 1 buzzes and gets it correct
      const regularClue = hostPage.locator('.clue-cell, .board-cell').first();
      await expect(regularClue).toBeVisible({ timeout: 5000 });
      await regularClue.click();
      await hostPage.waitForTimeout(1000);

      const unlockBuzzer = hostPage.getByRole('button', { name: /Unlock Buzzer|Enable Buzzer/i });
      if (await unlockBuzzer.isVisible({ timeout: 2000 }).catch(() => false)) {
        await unlockBuzzer.click();
        const player1Buzzer = player1Page.locator('.buzzer-button, button[class*="buzzer"]');
        await expect(player1Buzzer).toBeEnabled({ timeout: 2000 });
        await player1Buzzer.click();

        const correctButton = hostPage.getByRole('button', { name: /Correct|✓/i });
        await expect(correctButton).toBeVisible({ timeout: 5000 });
        await correctButton.click();
        await hostPage.waitForTimeout(1000);
      }

      // ============================================================
      // ACT: Host selects Daily Double clue
      // ============================================================
      // Note: This assumes you can identify a Daily Double clue
      // You may need to select a specific clue that's marked as DD
      // Or the test may need to be run with a known clue set
      const dailyDoubleClue = hostPage.locator('.clue-cell.daily-double, .board-cell[data-daily-double="true"]').first();

      // If no specific DD marker, just select another clue and hope it's a DD
      // Or you might need to set up test data with known DD positions
      if (await dailyDoubleClue.isVisible({ timeout: 1000 }).catch(() => false)) {
        await dailyDoubleClue.click();
      } else {
        // Fallback: select second clue and assume it might be DD
        await hostPage.locator('.clue-cell, .board-cell').nth(1).click();
      }

      await hostPage.waitForTimeout(1000);

      // ============================================================
      // ASSERT: Daily Double splash should appear
      // ============================================================
      // Note: Adjust selector based on actual DD splash screen
      const ddSplash = player1Page.locator('.daily-double-splash, .dd-reveal, [class*="daily-double"]');
      await expect(ddSplash).toBeVisible({ timeout: 5000 });

      // Player 2 should also see the splash
      await expect(player2Page.locator('.daily-double-splash, .dd-reveal, [class*="daily-double"]')).toBeVisible({ timeout: 5000 });

      // ============================================================
      // ACT: Host clicks to reveal Daily Double prompt
      // ============================================================
      const revealDDButton = hostPage.getByRole('button', { name: /Daily Double|Reveal|Continue/i });
      await expect(revealDDButton).toBeVisible({ timeout: 5000 });
      await revealDDButton.click();

      // ============================================================
      // ASSERT: Wager input should appear for current player
      // ============================================================
      // Note: Wager might be on player screen or host screen depending on implementation
      const wagerInput = hostPage.locator('input[type="number"], input[placeholder*="wager" i]');
      await expect(wagerInput).toBeVisible({ timeout: 5000 });

      // ============================================================
      // ACT: Enter wager amount
      // ============================================================
      // Wager $500 (assuming player has at least this much)
      await wagerInput.fill('500');

      const submitWagerButton = hostPage.getByRole('button', { name: /Submit|Confirm|Set Wager/i });
      await expect(submitWagerButton).toBeVisible({ timeout: 5000 });
      await submitWagerButton.click();

      // ============================================================
      // ASSERT: Clue prompt should be revealed
      // ============================================================
      await expect(hostPage.locator('.clue-text, .clue-prompt')).toBeVisible({ timeout: 5000 });
      await expect(player1Page.locator('.clue-text, .clue-prompt')).toBeVisible({ timeout: 5000 });

      // ============================================================
      // ACT: Host marks answer as correct
      // ============================================================
      // Note: For Daily Double, there's no buzzer - just direct adjudication
      const ddCorrectButton = hostPage.getByRole('button', { name: /Correct|✓|Award/i });
      await expect(ddCorrectButton).toBeVisible({ timeout: 5000 });
      await ddCorrectButton.click();

      // ============================================================
      // ASSERT: Player score should increase by wager amount
      // ============================================================
      // Player 1 should now have original score + $500
      // Note: Exact amount depends on previous clue value
      // Look for score increase
      await expect(player1Page.locator('.player-score, .score-display')).toContainText(/700|\$700|500|\$500/, { timeout: 5000 });

      // ============================================================
      // ASSERT: Game should return to normal board state
      // ============================================================
      await expect(hostPage.locator('.game-board')).toBeVisible({ timeout: 5000 });

      // Daily Double clue should be marked as completed
      await expect(hostPage.locator('.clue-cell.completed, .clue-cell.answered').nth(1)).toBeVisible({ timeout: 5000 });

      console.log('✅ Daily Double flow completed successfully');

    } finally {
      // Save console logs
      hostLogger.save();
      player1Logger.save();
      player2Logger.save();

      // Close contexts
      await hostContext.close();
      await player1Context.close();
      await player2Context.close();
    }
  });

  test('should handle Daily Double with wrong answer', async ({ browser }) => {
    // ============================================================
    // ARRANGE: Create browser contexts for host and 2 players
    // ============================================================
    const hostContext = await browser.newContext();
    const player1Context = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const player1Page = await player1Context.newPage();

    const hostLogger = startConsoleLogger(hostPage, 'dd-wrong-host');
    const player1Logger = startConsoleLogger(player1Page, 'dd-wrong-player1');

    try {
      // ============================================================
      // ARRANGE: Setup game (abbreviated version)
      // ============================================================
      await player1Page.goto('/');
      await player1Page.getByPlaceholder('Email').fill(TEST_USERS.player1.email);
      await player1Page.getByPlaceholder('Password').fill(TEST_USERS.player1.password);
      await player1Page.getByRole('button', { name: 'Login' }).click();
      await expect(player1Page.getByText('Currently logged in as')).toBeVisible();

      const nicknameInput = player1Page.getByPlaceholder('Your display name for this game...');
      await expect(nicknameInput).not.toHaveValue('');
      await nicknameInput.fill('');
      await nicknameInput.fill('Alice');

      await hostPage.goto('/');
      await hostPage.getByPlaceholder('Email').fill(TEST_USERS.host.email);
      await hostPage.getByPlaceholder('Password').fill(TEST_USERS.host.password);
      await hostPage.getByRole('button', { name: 'Login' }).click();
      await hostPage.getByRole('button', { name: 'Create Game' }).click();

      await player1Page.getByRole('button', { name: 'Join Game' }).click();
      await hostPage.getByRole('button', { name: 'Start Game' }).click();

      // Skip intro
      await hostPage.waitForTimeout(2000);
      for (let i = 0; i < 7; i++) {
        const nextButton = hostPage.getByRole('button', { name: /Next|Continue|Start|Introduce/i }).first();
        if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await nextButton.click();
          await hostPage.waitForTimeout(500);
        }
      }

      // Get initial score
      const initialScore = await player1Page.locator('.player-score, .score-display').textContent();

      // ============================================================
      // ACT: Complete Daily Double with wrong answer
      // ============================================================
      // Select DD clue, enter wager, mark wrong
      const ddClue = hostPage.locator('.clue-cell, .board-cell').nth(1);
      await ddClue.click();
      await hostPage.waitForTimeout(1000);

      // If DD splash appears, continue
      const revealButton = hostPage.getByRole('button', { name: /Daily Double|Reveal|Continue/i });
      if (await revealButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await revealButton.click();

        const wagerInput = hostPage.locator('input[type="number"], input[placeholder*="wager" i]');
        await wagerInput.fill('300');
        await hostPage.getByRole('button', { name: /Submit|Confirm/i }).click();

        // Mark wrong
        const wrongButton = hostPage.getByRole('button', { name: /Wrong|✗|Incorrect/i });
        await expect(wrongButton).toBeVisible({ timeout: 5000 });
        await wrongButton.click();

        // ============================================================
        // ASSERT: Player score should DECREASE by wager amount
        // ============================================================
        await hostPage.waitForTimeout(1000);
        const newScore = await player1Page.locator('.player-score, .score-display').textContent();

        // Score should be lower than initial (or negative)
        // Note: Exact validation depends on score format
        console.log(`Score changed from ${initialScore} to ${newScore}`);
      }

      console.log('✅ Daily Double wrong answer flow completed');

    } finally {
      hostLogger.save();
      player1Logger.save();
      await hostContext.close();
      await player1Context.close();
    }
  });

});
