import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';

/**
 * Smoke Test: Host Creates Game
 *
 * This test validates the critical path for a host to create a new Jeopardy game.
 * It's called a "smoke test" because it checks if the core functionality works
 * without testing every detail - like checking if there's smoke coming from a machine
 * to see if it's running.
 *
 * **What This Test Validates:**
 * - Host can log in with valid credentials
 * - Host can select a clue set from the dropdown
 * - Host can click "Host Game" button
 * - Game dashboard appears after game creation
 * - Game is created in the database (verified by dashboard presence)
 *
 * **Why This Is Important:**
 * This is the most critical user journey in the application. If this doesn't work,
 * nothing else matters. This test should run fast and catch major breakages.
 *
 * **LEARNING NOTE: Test Structure**
 * Every test follows the AAA pattern:
 * - ARRANGE: Set up the test (navigate, prepare data)
 * - ACT: Perform the action being tested (click, type, etc.)
 * - ASSERT: Verify the expected outcome (check URL, text, etc.)
 *
 * @see https://playwright.dev/docs/best-practices
 */
test.describe('Host Creates Game - Smoke Test', () => {
  /**
   * Clean up after each test to ensure test isolation.
   *
   * LEARNING NOTE: Test Isolation
   * Each test should be independent and not affect other tests.
   * Without this cleanup, the second test would fail because:
   * 1. First test creates a game
   * 2. Game remains active in the database
   * 3. Second test logs in as host
   * 4. Host is redirected to the existing game (not the creation screen)
   * 5. Test fails because it expects to see the creation screen
   *
   * The afterEach hook runs after every test in this describe block,
   * cancelling any games created during the test.
   */
  test.afterEach(async () => {
    await cleanupTestUser(TEST_USERS.host.id);
  });

  /**
   * Test: Host can successfully create a game
   *
   * LEARNING NOTE: The `async ({ page })` syntax means:
   * - `async`: This test performs asynchronous operations (waiting for pages to load)
   * - `{ page }`: Playwright gives us a fresh browser page for this test
   * - Each test gets its own isolated page, so tests don't interfere with each other
   */
  test('should allow host to log in and create a game', async ({ page }) => {
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
    // ACT: Log in as the host user
    // ============================================================

    /**
     * Fill in the email field
     *
     * LEARNING NOTE: getByPlaceholder() finds input fields by their placeholder text.
     * This is good for forms where placeholders are used as labels.
     *
     * The fill() method types text into the input field.
     */
    await page.getByPlaceholder('Email').fill(TEST_USERS.host.email);

    /**
     * Fill in the password field
     *
     * LEARNING NOTE: We use the same pattern for the password field.
     * Playwright automatically handles password fields (type="password").
     */
    await page.getByPlaceholder('Password').fill(TEST_USERS.host.password);

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
    await expect(page.getByText(TEST_USERS.host.email)).toBeVisible();

    // ============================================================
    // ACT: Select a clue set and create a game
    // ============================================================

    /**
     * Wait for the clue set dropdown to appear
     *
     * LEARNING NOTE: getByRole('combobox') finds a <select> dropdown.
     * "combobox" is the ARIA role for dropdown menus.
     *
     * We wait for it to be visible because it might take a moment to load
     * the list of clue sets from the database.
     */
    const clueSetDropdown = page.getByRole('combobox');
    await expect(clueSetDropdown).toBeVisible();

    /**
     * Select the first available clue set
     *
     * LEARNING NOTE: selectOption({ index: 1 }) selects the second option
     * (index 0 is usually "Select a clue set..." placeholder).
     *
     * In a real test, you might want to select a specific clue set by value
     * or label, but for a smoke test, any clue set is fine.
     */
    await clueSetDropdown.selectOption({ index: 1 });

    /**
     * Click the "Host Game" button
     *
     * LEARNING NOTE: We use getByText() here because "Host Game" is the exact
     * text on the button. This is acceptable when the text is unique and unlikely
     * to change.
     *
     * Alternative: getByRole('button', { name: 'Host Game' })
     */
    await page.getByText('Host Game').click();

    // ============================================================
    // ASSERT: Verify game dashboard appears
    // ============================================================

    /**
     * Wait for the game dashboard to load
     *
     * LEARNING NOTE: After clicking "Host Game", the app should:
     * 1. Create a game in the database
     * 2. Navigate to the game dashboard
     * 3. Display "Game Host Dashboard" heading
     *
     * We verify this by checking for the dashboard heading.
     * This confirms the entire workflow succeeded.
     */
    await expect(page.getByText('Game Host Dashboard')).toBeVisible();

    /**
     * Verify key dashboard elements are present
     *
     * LEARNING NOTE: We check for multiple elements to ensure the dashboard
     * fully loaded, not just the heading. This catches issues where the page
     * partially loads but is broken.
     */
    await expect(page.getByText('BOARD CONTROL')).toBeVisible();
    await expect(page.getByText('PLAYER CONTROL')).toBeVisible();

    /**
     * Verify game ID is displayed
     *
     * LEARNING NOTE: The game ID should be visible in the dashboard header.
     * This confirms a game was actually created in the database.
     *
     * We use a regex pattern /Game ID:/ to match "Game ID: abc-123-def"
     * without needing to know the exact ID.
     */
    await expect(page.getByText(/Game ID:/)).toBeVisible();

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
   * Test: Host cannot create game without selecting a clue set
   *
   * LEARNING NOTE: This is a negative test - it verifies that invalid actions
   * are properly prevented. Good tests cover both happy paths and error cases.
   */
  test('should disable "Host Game" button when no clue set is selected', async ({ page }) => {
    // ARRANGE: Log in as host
    await page.goto('/');
    await page.getByPlaceholder('Email').fill(TEST_USERS.host.email);
    await page.getByPlaceholder('Password').fill(TEST_USERS.host.password);
    await page.getByRole('button', { name: 'Login' }).click();

    // Wait for login to complete
    await expect(page.getByText('Currently logged in as')).toBeVisible();

    // ASSERT: "Host Game" button should be disabled without a clue set selection
    const hostGameButton = page.getByText('Host Game');
    await expect(hostGameButton).toBeVisible();
    await expect(hostGameButton).toBeDisabled();

    /**
     * LEARNING NOTE: This test ensures the UI prevents invalid actions.
     * Users shouldn't be able to create a game without selecting a clue set.
     * This is called "defensive programming" - preventing errors before they happen.
     */
  });
});

/**
 * WHAT WE LEARNED:
 *
 * 1. **Test Structure**: ARRANGE → ACT → ASSERT pattern
 * 2. **Selectors**: Use getByRole() for accessibility-first testing
 * 3. **Async/Await**: All Playwright actions are asynchronous
 * 4. **Assertions**: Use expect() with toBeVisible(), toBeDisabled(), etc.
 * 5. **Smoke Tests**: Focus on critical paths, not every detail
 * 6. **Test Isolation**: Each test gets a fresh browser page
 *
 * NEXT STEPS:
 * - Run this test: `npm run test:e2e smoke/host-creates-game.e2e.ts`
 * - Watch it run in headed mode to see what's happening
 * - If it fails, check the screenshot in test-results/
 * - Try writing a similar test for player joining a game!
 */
