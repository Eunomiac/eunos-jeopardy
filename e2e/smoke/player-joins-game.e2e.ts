import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import { startConsoleLogger } from '../fixtures/console-logger';

/**
 * Smoke Test: Player Joins Game
 *
 * This test validates the critical path for a player to join an existing Jeopardy game.
 * It's called a "smoke test" because it checks if the core functionality works
 * without testing every detail - like checking if there's smoke coming from a machine
 * to see if it's running.
 *
 * **What This Test Validates:**
 * - Player can log in with valid credentials
 * - Player can see the "Waiting for Game" button
 * - Player cannot join a game until it's active
 *
 * **Why This Is Important:**
 */
test.describe('Player Joins Game - Smoke Test', () => {
  /**
   * Clean up after each test to ensure test isolation.
   *
   * LEARNING NOTE: Test Isolation
   * Each test should be independent and not affect other tests.
   *
   * The afterEach hook runs after every test in this describe block,
   * cancelling any games created during the test.
   */
  test.afterEach(async () => {
    await Promise.all([
      cleanupTestUser(TEST_USERS.host.id),
      cleanupTestUser(TEST_USERS.player1.id),
      cleanupTestUser(TEST_USERS.player2.id),
      cleanupTestUser(TEST_USERS.player3.id)
    ]);
  });

  /**
   * Test: Player logging in when game is not active is brought to Join Game lobby
   *
   * LEARNING NOTE: The `async ({ page })` syntax means:
   * - `async`: This test performs asynchronous operations (waiting for pages to load)
   * - `{ page }`: Playwright gives us a fresh browser page for this test
   * - Each test gets its own isolated page, so tests don't interfere with each other
   */
  test('should allow player to log in and wait in the join lobby if a game is not active', async ({ page }) => {
    // ============================================================
    // ARRANGE: Navigate to the application
    // ============================================================

    /**
     * Navigate to the home page
     *
     * LEARNING NOTE: page.goto() navigates to a URL. The '/' means "go to the base URL"
     * which is configured in playwright.config.ts as http://localhost:5173
     */
    await page.goto('/');

    /**
     * Verify we're on the login page
     *
     * LEARNING NOTE: We use getByRole() to find elements by their accessibility role.
     * This is the best practice because:
     * - It's how screen readers find elements (accessibility-first)
     * - It's resilient to CSS class changes
     * - It encourages writing accessible HTML
     *
     * The heading with text "Login" should be visible on the page.
     */
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();

    // ============================================================
    // ACT: Log in as player1
    // ============================================================

    /**
     * Fill in the email field
     *
     * LEARNING NOTE: getByPlaceholder() finds input fields by their placeholder text.
     * This is good for forms where placeholders are used as labels.
     *
     * The fill() method types text into the input field.
     */
    await page.getByPlaceholder('Email').fill(TEST_USERS.player1.email);

    /**
     * Fill in the password field
     *
     * LEARNING NOTE: We use the same pattern for the password field.
     * Playwright automatically handles password fields (type="password").
     */
    await page.getByPlaceholder('Password').fill(TEST_USERS.player1.password);

    /**
     * Click the login button
     *
     * LEARNING NOTE: getByRole('button', { name: 'Login' }) finds a button with
     * accessible name "Login". This could be:
     * - <button>Login</button>
     * - <button aria-label="Login">Sign In</button>
     *
     * The click() method simulates a user clicking the button.
     */
    await page.getByRole('button', { name: 'Login' }).click();

    // ============================================================
    // ASSERT: Verify successful login
    // ============================================================

    /**
     * Wait for authentication to complete and verify logged-in state
     *
     * LEARNING NOTE: After login, the page should show "Currently logged in as"
     * followed by the user's email. We check for both to ensure login succeeded.
     *
     * The toBeVisible() assertion waits up to 30 seconds (default timeout) for
     * the element to appear. This handles async operations like API calls.
     */
    await expect(page.getByText('Currently logged in as')).toBeVisible();
    await expect(page.getByText(TEST_USERS.player1.email)).toBeVisible();

    // ============================================================
    // ASSERT: Nickname field is active
    // ============================================================
    await expect(page.getByPlaceholder('Your display name for this game...')).toBeVisible();

    // ============================================================
    // ASSERT: Join button is inactive and displays "Waiting for Game"
    // ============================================================
    await expect(page.getByRole('button', { name: 'Waiting for Game' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Waiting for Game' })).toBeDisabled();

    // ============================================================
    // SUCCESS! 🎉
    // ============================================================

    /**
     * If we reach this point, the test passed!
     *
     * LEARNING NOTE: Playwright automatically takes a screenshot if this test fails,
     * so you can see exactly what went wrong. Check the test-results/ directory.
     */
  });

  /**
   * Test: Player can join an active game
   *
   * LEARNING NOTE: Multi-User Testing with Browser Contexts
   * This test demonstrates how to test interactions between multiple users
   * logged in simultaneously. We use separate browser contexts (like separate
   * incognito windows) for the host and player:
   *
   * 1. Host context: Creates and manages the game
   * 2. Player context: Joins the game
   *
   * Each context has its own cookies, localStorage, and session data,
   * allowing both users to be logged in at the same time. This is essential
   * for testing real-time multiplayer interactions.
   */
  test('should allow player to join an active game', async ({ browser }) => {
    // ============================================================
    // SETUP: Create host browser context
    // ============================================================

    /**
     * LEARNING NOTE: Browser Contexts
     * Each context is isolated - like opening two separate incognito windows.
     * This allows us to have the host and player logged in simultaneously.
     *
     * We create the player context later to avoid unnecessary overhead.
     */
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const hostLogger = startConsoleLogger(hostPage, 'player-joins-game-host');

    // Player context will be created later when needed
    let playerContext;
    let playerPage;
    let playerLogger;

    try {
      // ============================================================
      // ARRANGE: Host creates a game
      // ============================================================

    /**
     * First, we need a host to create a game for the player to join.
     * This is the same flow as the host-creates-game test.
     */

    // Navigate to the application
    await hostPage.goto('/');

    // Log in as host
    await hostPage.getByPlaceholder('Email').fill(TEST_USERS.host.email);
    await hostPage.getByPlaceholder('Password').fill(TEST_USERS.host.password);
    await hostPage.getByRole('button', { name: 'Login' }).click();

    // Wait for login to complete
    await expect(hostPage.getByText('Currently logged in as')).toBeVisible();

    // Select a clue set and create game
    const clueSetDropdown = hostPage.getByRole('combobox');
    await expect(clueSetDropdown).toBeVisible();
    await clueSetDropdown.selectOption({ index: 1 });
    await hostPage.getByText('Host Game').click();

    // Verify game dashboard appears (game is now active)
    await expect(hostPage.getByText('Game Host Dashboard')).toBeVisible();

    // ============================================================
    // ACT: Player logs in and joins the game
    // ============================================================

    /**
     * Now that there's an active game, the player should be able to join it.
     * Note: The player uses a separate browser context, so they can be
     * logged in at the same time as the host.
     *
     * We create the player context here (not at the start) to avoid
     * unnecessary overhead during test initialization.
     */

    // Create player context and page
    playerContext = await browser.newContext();
    playerPage = await playerContext.newPage();
    playerLogger = startConsoleLogger(playerPage, 'player-joins-game-player');

    // Navigate to the application in player context
    await playerPage.goto('/');

    // Log in as player1
    await playerPage.getByPlaceholder('Email').fill(TEST_USERS.player1.email);
    await playerPage.getByPlaceholder('Password').fill(TEST_USERS.player1.password);
    await playerPage.getByRole('button', { name: 'Login' }).click();

    // Wait for login to complete
    await expect(playerPage.getByText('Currently logged in as')).toBeVisible();

    // ============================================================
    // ASSERT: Player sees the join interface with active game
    // ============================================================

    /**
     * LEARNING NOTE: When a game is active, the "Waiting for Game" button
     * should change to "Join Game" and become enabled.
     */

    // Verify nickname field is visible
    await expect(playerPage.getByPlaceholder('Your display name for this game...')).toBeVisible();

    // Enter a nickname
    await playerPage.getByPlaceholder('Your display name for this game...').fill('Test Player');

    // Verify "Join Game" button is enabled (not "Waiting for Game")
    const joinButton = playerPage.getByRole('button', { name: 'Join Game' });
    await expect(joinButton).toBeVisible();
    await expect(joinButton).toBeEnabled();

    // Click to join the game
    await joinButton.click();

    // ============================================================
    // ASSERT: Player is in the game lobby
    // ============================================================

    /**
     * LEARNING NOTE: After joining, the player should see the lobby
     * with their nickname and the game code.
     *
     * We use .first() because "Test Player" appears twice:
     * 1. "Playing as: Test Player" (under game code)
     * 2. "Test Player (You)" (in players list)
     */

    await expect(playerPage.getByText('Game Lobby')).toBeVisible();
    await expect(playerPage.getByText('Test Player').first()).toBeVisible();
    await expect(playerPage.getByText(/Game Code:/)).toBeVisible();

    // ============================================================
    // SUCCESS! 🎉
    // ============================================================

      /**
       * This test validates the complete player journey:
       * 1. Host creates a game ✅
       * 2. Player logs in ✅
       * 3. Player sees active game ✅
       * 4. Player joins game ✅
       * 5. Player appears in lobby ✅
       */
    } finally {
      // Save console logs to file for debugging (even if test fails)
      hostLogger.save();
      if (playerLogger) {
        playerLogger.save();
      }

      // Clean up browser contexts to free resources
      await hostContext.close();
      if (playerContext) {
        await playerContext.close();
      }
    }
  });
});
