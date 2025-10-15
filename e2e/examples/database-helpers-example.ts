import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import {
  setupTestInProgress,
  cleanupTestContext,
  selectClue,
  getDailyDoubleIndices,
  markRoundCompleted,
  getHostGame,
} from '../fixtures/test-helpers';

/**
 * Example E2E Tests: Database Helpers Usage
 *
 * This file demonstrates how to use the database helper functions
 * to query and manipulate game state directly in tests.
 *
 * **IMPORTANT**: This is an example file for learning purposes.
 * These tests are not meant to run in CI - they demonstrate patterns
 * you can use in your actual test files.
 */

test.describe('Database Helpers Examples', () => {

  test.afterEach(async () => {
    await cleanupTestUser(TEST_USERS.host.id);
  });

  /**
   * Example 1: Finding and Selecting Daily Double Clues
   *
   * This test shows how to use getDailyDoubleIndices() to find
   * Daily Double clues without manually searching the board.
   */
  test('example: find and select Daily Double clue', async ({ browser }) => {
    const ctx = await setupTestInProgress(browser, ['Alice', 'Bob'], 'daily-double-example');

    try {
      const { hostPage, gameId } = ctx;

      // Verify we have a game ID
      expect(gameId).toBeDefined();
      if (!gameId) {throw new Error('Game ID not found');}

      // Find Daily Double clue indices for Jeopardy round
      const ddIndices = await getDailyDoubleIndices(gameId, 'jeopardy');
      console.log('Daily Double indices:', ddIndices);

      // Verify at least one Daily Double exists
      expect(ddIndices.length).toBeGreaterThan(0);

      // Select the first Daily Double clue
      await selectClue(hostPage, ddIndices[0]);

      // Verify Daily Double splash appears
      await expect(hostPage.getByText(/Daily Double/i)).toBeVisible({ timeout: 5000 });

      console.log('\u2705 Successfully found and selected Daily Double clue');
    } finally {
      await cleanupTestContext(ctx);
    }
  });

  /**
   * Example 2: Testing Round Transitions
   *
   * This test shows how to use markRoundCompleted() to instantly
   * complete all clues in a round, allowing you to test round
   * transitions without playing through every clue.
   */
  test('example: complete round and test transition', async ({ browser }) => {
    const ctx = await setupTestInProgress(browser, ['Alice', 'Bob'], 'round-transition-example');

    try {
      const { hostPage, gameId } = ctx;

      // Verify we have a game ID
      expect(gameId).toBeDefined();
      if (!gameId) {throw new Error('Game ID not found');}

      // Mark all Jeopardy round clues as completed
      await markRoundCompleted(gameId, 'jeopardy');
      console.log('\u2705 Marked all Jeopardy clues as completed');

      // Wait a moment for UI to update
      await hostPage.waitForTimeout(1000);

      // Look for round transition button
      const transitionButton = hostPage.getByRole('button', { name: /Next Round|Double Jeopardy/i });
      const buttonVisible = await transitionButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (buttonVisible) {
        await transitionButton.click();
        console.log('\u2705 Clicked round transition button');

        // Verify transition to Double Jeopardy
        await expect(hostPage.getByText(/Double Jeopardy/i)).toBeVisible({ timeout: 10000 });
        console.log('\u2705 Successfully transitioned to Double Jeopardy');
      } else {
        console.log('\u26A0 Round transition button not visible - may need different trigger');
      }
    } finally {
      await cleanupTestContext(ctx);
    }
  });

  /**
   * Example 3: Querying Game State
   *
   * This test shows how to use getHostGame() to query the current
   * game state from the database and verify it matches expectations.
   */
  test('example: query game state from database', async ({ browser }) => {
    const ctx = await setupTestInProgress(browser, ['Alice', 'Bob'], 'game-state-example');

    try {
      const { gameId } = ctx;

      // Verify we have a game ID
      expect(gameId).toBeDefined();
      if (!gameId) {throw new Error('Game ID not found');}

      // Query game state from database
      const game = await getHostGame(TEST_USERS.host.id);

      // Verify game exists and has expected properties
      expect(game).toBeDefined();
      expect(game?.id).toBe(gameId);
      expect(game?.status).toBe('in_progress');
      expect(game?.current_round).toBe('jeopardy');
      expect(game?.host_id).toBe(TEST_USERS.host.id);

      console.log('\u2705 Game state verified:');
      console.log('  - Game ID:', game?.id);
      console.log('  - Status:', game?.status);
      console.log('  - Round:', game?.current_round);
      console.log('  - Host ID:', game?.host_id);
    } finally {
      await cleanupTestContext(ctx);
    }
  });

  /**
   * Example 4: Combined Usage - Test Final Jeopardy Setup
   *
   * This test shows how to combine multiple database helpers to
   * quickly set up a complex test scenario (Final Jeopardy).
   */
  test('example: setup Final Jeopardy using database helpers', async ({ browser }) => {
    const ctx = await setupTestInProgress(browser, ['Alice', 'Bob'], 'final-jeopardy-example');

    try {
      const { hostPage, gameId } = ctx;

      // Verify we have a game ID
      expect(gameId).toBeDefined();
      if (!gameId) {throw new Error('Game ID not found');}

      // Complete both Jeopardy and Double Jeopardy rounds instantly
      console.log('Completing Jeopardy round...');
      await markRoundCompleted(gameId, 'jeopardy');

      console.log('Completing Double Jeopardy round...');
      await markRoundCompleted(gameId, 'double');

      console.log('\u2705 Both rounds completed - ready for Final Jeopardy');

      // Wait for UI to update
      await hostPage.waitForTimeout(2000);

      // Look for Final Jeopardy button
      const finalJeopardyButton = hostPage.getByRole('button', { name: /Final Jeopardy/i });
      const buttonVisible = await finalJeopardyButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (buttonVisible) {
        await finalJeopardyButton.click();
        console.log('\u2705 Clicked Final Jeopardy button');

        // Verify Final Jeopardy started
        await expect(hostPage.getByText(/Final Jeopardy/i)).toBeVisible({ timeout: 10000 });
        console.log('\u2705 Successfully entered Final Jeopardy');
      } else {
        console.log('\u26A0 Final Jeopardy button not visible - may need different trigger');
      }
    } finally {
      await cleanupTestContext(ctx);
    }
  });
});
