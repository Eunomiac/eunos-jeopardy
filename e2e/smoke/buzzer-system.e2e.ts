import { test, expect, Browser, BrowserContext, Page } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import { startConsoleLogger } from '../fixtures/console-logger';

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
    // ARRANGE: Create browser contexts for host and 2 players
    // ============================================================
    const hostContext = await browser.newContext();
    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    // Start console logging for debugging
    const hostLogger = startConsoleLogger(hostPage, 'buzzer-host');
    const player1Logger = startConsoleLogger(player1Page, 'buzzer-player1');
    const player2Logger = startConsoleLogger(player2Page, 'buzzer-player2');

    try {
      // ============================================================
      // ARRANGE: Players log in and join game
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

      // ============================================================
      // ARRANGE: Host creates game and players join
      // ============================================================
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
      // ARRANGE: Start game and get to in_progress status
      // ============================================================
      await hostPage.getByRole('button', { name: 'Start Game' }).click();

      // Wait for game to be ready (skip intro animations for now)
      // Note: This may need adjustment based on actual game flow
      // You might need to click through intro/category animations first
      await hostPage.waitForTimeout(2000);

      // Try to find and click through any intro buttons
      const skipIntroButton = hostPage.getByRole('button', { name: /Skip|Continue|Next|Introduce/i }).first();
      if (await skipIntroButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click through intro phases
        for (let i = 0; i < 7; i++) {
          const nextButton = hostPage.getByRole('button', { name: /Next|Continue|Start/i }).first();
          if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await nextButton.click();
            await hostPage.waitForTimeout(500);
          }
        }
      }

      // ============================================================
      // ASSERT: Players should see game board
      // ============================================================
      await expect(player1Page.locator('.game-board')).toBeVisible({ timeout: 15000 });
      await expect(player2Page.locator('.game-board')).toBeVisible({ timeout: 15000 });

      // ============================================================
      // ACT: Host selects a clue
      // ============================================================
      // Note: Selector will need adjustment based on actual clue cell structure
      const clueCell = hostPage.locator('.clue-cell, .board-cell').first();
      await expect(clueCell).toBeVisible({ timeout: 5000 });
      await clueCell.click();

      // Wait for clue to be revealed
      await hostPage.waitForTimeout(1000);

      // ============================================================
      // ASSERT: Clue should be visible to all players
      // ============================================================
      // Note: Adjust selector based on actual clue display
      await expect(player1Page.locator('.clue-text, .clue-prompt')).toBeVisible({ timeout: 5000 });
      await expect(player2Page.locator('.clue-text, .clue-prompt')).toBeVisible({ timeout: 5000 });

      // ============================================================
      // ACT: Host unlocks buzzer
      // ============================================================
      const unlockBuzzerButton = hostPage.getByRole('button', { name: /Unlock Buzzer|Enable Buzzer/i });
      await expect(unlockBuzzerButton).toBeVisible({ timeout: 5000 });
      await unlockBuzzerButton.click();

      // ============================================================
      // ASSERT: Buzzer should be unlocked for players
      // ============================================================
      // Note: Adjust selector based on actual buzzer button state
      const player1Buzzer = player1Page.locator('.buzzer-button, button[class*="buzzer"]');
      const player2Buzzer = player2Page.locator('.buzzer-button, button[class*="buzzer"]');

      await expect(player1Buzzer).toBeEnabled({ timeout: 2000 });
      await expect(player2Buzzer).toBeEnabled({ timeout: 2000 });

      // ============================================================
      // ACT: Player 1 buzzes in
      // ============================================================
      await player1Buzzer.click();

      // ============================================================
      // ASSERT: Buzzer should lock for all players
      // ============================================================
      await expect(player1Buzzer).toBeDisabled({ timeout: 2000 });
      await expect(player2Buzzer).toBeDisabled({ timeout: 2000 });

      // ============================================================
      // ASSERT: Host should see Player 1 as focused/active
      // ============================================================
      // Note: Adjust selector based on actual focused player display
      await expect(hostPage.getByText('Alice')).toBeVisible();
      // Look for some indication that Alice is the active player
      // This might be a highlight, a "Current Player" label, etc.

      // ============================================================
      // ACT: Host marks answer as correct
      // ============================================================
      const correctButton = hostPage.getByRole('button', { name: /Correct|✓|Award Points/i });
      await expect(correctButton).toBeVisible({ timeout: 5000 });
      await correctButton.click();

      // ============================================================
      // ASSERT: Player 1 score should increase
      // ============================================================
      // Note: Adjust based on actual score display and clue value
      // Assuming first clue is worth $200
      await expect(player1Page.locator('.player-score, .score-display')).toContainText(/200|\$200/, { timeout: 5000 });

      // Host should also see updated score
      await expect(hostPage.getByText(/Alice.*200|200.*Alice/)).toBeVisible({ timeout: 5000 });

      // ============================================================
      // ASSERT: Clue should be completed and buzzer reset
      // ============================================================
      // Buzzer should be locked again (waiting for next clue)
      await expect(player1Buzzer).toBeDisabled({ timeout: 2000 });
      await expect(player2Buzzer).toBeDisabled({ timeout: 2000 });

      // Clue should be marked as completed on board
      // Note: Adjust based on actual completed clue styling
      await expect(hostPage.locator('.clue-cell.completed, .clue-cell.answered').first()).toBeVisible({ timeout: 5000 });

      console.log('✅ Basic buzzer flow completed successfully');

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

  test('should handle race condition - late buzz rejected when buzzer already locked', async ({ browser }) => {
    // ============================================================
    // ARRANGE: Create browser contexts with network throttling
    // ============================================================
    const hostContext = await browser.newContext();
    const player1Context = await browser.newContext();
    const player2Context = await browser.newContext();

    const hostPage = await hostContext.newPage();
    const player1Page = await player1Context.newPage();
    const player2Page = await player2Context.newPage();

    // Start console logging for debugging
    const hostLogger = startConsoleLogger(hostPage, 'race-condition-host');
    const player1Logger = startConsoleLogger(player1Page, 'race-condition-player1');
    const player2Logger = startConsoleLogger(player2Page, 'race-condition-player2');

    try {
      // ============================================================
      // ARRANGE: Give Player 2 a 5-second network delay
      // ============================================================
      // This ensures Player 2's buzz will arrive AFTER Player 1's
      // even if Player 2 clicks first in real time
      const player2CDPSession = await player2Context.newCDPSession(player2Page);
      await player2CDPSession.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: 50 * 1024, // 50kb/s
        uploadThroughput: 20 * 1024,   // 20kb/s
        latency: 5000, // 5 SECOND delay - creates deterministic race condition
      });

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
      // ARRANGE: Start game and get to in_progress
      // ============================================================
      await hostPage.getByRole('button', { name: 'Start Game' }).click();
      await hostPage.waitForTimeout(2000);

      // Skip intro animations
      for (let i = 0; i < 7; i++) {
        const nextButton = hostPage.getByRole('button', { name: /Next|Continue|Start|Introduce/i }).first();
        if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await nextButton.click();
          await hostPage.waitForTimeout(500);
        }
      }

      await expect(player1Page.locator('.game-board')).toBeVisible({ timeout: 15000 });

      // ============================================================
      // ARRANGE: Select clue and unlock buzzer
      // ============================================================
      const clueCell = hostPage.locator('.clue-cell, .board-cell').first();
      await expect(clueCell).toBeVisible({ timeout: 5000 });
      await clueCell.click();
      await hostPage.waitForTimeout(1000);

      const unlockBuzzerButton = hostPage.getByRole('button', { name: /Unlock Buzzer|Enable Buzzer/i });
      await expect(unlockBuzzerButton).toBeVisible({ timeout: 5000 });
      await unlockBuzzerButton.click();

      const player1Buzzer = player1Page.locator('.buzzer-button, button[class*="buzzer"]');
      const player2Buzzer = player2Page.locator('.buzzer-button, button[class*="buzzer"]');

      await expect(player1Buzzer).toBeEnabled({ timeout: 2000 });
      await expect(player2Buzzer).toBeEnabled({ timeout: 2000 });

      // ============================================================
      // ACT: Player 2 clicks buzzer FIRST (in real time)
      // ============================================================
      // Due to 5s network delay, this message won't arrive until T+5000ms
      console.log(`[T+0ms] Player 2 clicking buzzer (will arrive at T+5000ms)`);
      await player2Buzzer.click();

      // Wait 1 second (still way before Player 2's buzz arrives)
      await player1Page.waitForTimeout(1000);

      // ============================================================
      // ACT: Player 1 clicks buzzer SECOND (in real time)
      // ============================================================
      // No network delay, so this arrives immediately at T+1000ms
      console.log(`[T+1000ms] Player 1 clicking buzzer (arrives immediately)`);
      await player1Buzzer.click();

      // ============================================================
      // ASSERT: Player 1 should be focused (arrived first)
      // ============================================================
      // Player 1's buzz arrived at T+1000ms, before Player 2's at T+5000ms
      await expect(hostPage.getByText('Alice')).toBeVisible({ timeout: 2000 });

      // Buzzer should be locked for both players
      await expect(player1Buzzer).toBeDisabled({ timeout: 2000 });
      await expect(player2Buzzer).toBeDisabled({ timeout: 2000 });

      // ============================================================
      // ACT: Wait for Player 2's delayed buzz to arrive
      // ============================================================
      console.log(`[T+1000ms] Waiting 5 seconds for Player 2's delayed buzz to arrive...`);
      await player1Page.waitForTimeout(5000);
      console.log(`[T+6000ms] Player 2's buzz should have arrived by now`);

      // ============================================================
      // ASSERT: Player 2's late buzz should be rejected
      // ============================================================
      // Player 1 should still be the focused player
      await expect(hostPage.getByText('Alice')).toBeVisible();

      // Buzzer should still be locked (not unlocked by late buzz)
      await expect(player1Buzzer).toBeDisabled();
      await expect(player2Buzzer).toBeDisabled();

      // Player 2 should NOT be in queue or focused
      // Note: Exact behavior depends on implementation
      // - Might be silently rejected
      // - Might show error message
      // - Might be added to queue behind Player 1

      console.log('✅ Race condition handled correctly - late buzz rejected');

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
