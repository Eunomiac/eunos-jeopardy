import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Euno's Jeopardy E2E Tests
 *
 * This file configures how Playwright runs end-to-end tests for the application.
 * E2E tests validate complete user journeys by controlling real browsers and
 * interacting with the application as a user would.
 *
 * LEARNING NOTE: This configuration is optimized for learning and local development.
 * As you progress, we'll add more advanced features like visual regression testing,
 * coverage collection, and CI/CD optimization.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  /**
   * Global Setup
   *
   * Runs ONCE before all tests start. This is where we:
   * - Clean up test data from previous runs
   * - Verify test users are configured
   * - Check environment variables
   *
   * LEARNING NOTE: Global setup is better than beforeEach() because it runs once
   * instead of before every test. This is faster and follows the DRY principle
   * (Don't Repeat Yourself) - single place to manage setup.
   */
  globalSetup: './e2e/global-setup.ts',
  /**
   * Test Directory
   *
   * Where Playwright looks for test files. We use 'e2e/' to separate integration
   * tests from unit tests (which live in 'src/test/').
   *
   * LEARNING NOTE: Separating test types by directory makes it easy to run them
   * independently. Unit tests run fast (milliseconds), E2E tests run slower (seconds).
   */
  testDir: './e2e',

  /**
   * Test File Pattern
   *
   * Playwright will run any file matching this pattern. The '**' means "any subdirectory".
   *
   * Examples that will run:
   * - e2e/smoke/host-creates-game.e2e.ts
   * - e2e/game-flow/full-round.e2e.ts
   *
   * LEARNING NOTE: The '.e2e.ts' suffix makes it immediately clear these are
   * end-to-end tests (not unit tests). This prevents confusion and ensures
   * Jest doesn't try to run these files.
   */
  testMatch: '**/*.e2e.ts',

  /**
   * Fully Parallel Execution
   *
   * Each test file runs in parallel (at the same time) for speed. Tests within
   * a file run sequentially (one after another).
   *
   * LEARNING NOTE: Parallel execution is safe because each test gets its own
   * isolated browser context. Tests can't interfere with each other.
   */
  fullyParallel: true,

  /**
   * Fail Fast
   *
   * Stop running tests after the first failure. Useful during development to
   * get quick feedback.
   *
   * LEARNING NOTE: Set to 'false' in CI to see all failures at once. For learning,
   * 'true' helps you focus on one problem at a time.
   */
  forbidOnly: Boolean(process.env['CI']), // Prevent 'test.only' in CI

  /**
   * Retry Strategy
   *
   * How many times to retry a failed test. Retries help handle flaky tests
   * (tests that sometimes fail due to timing issues).
   *
   * LEARNING NOTE:
   * - Local: 0 retries (you want to see failures immediately to learn from them)
   * - CI: 2 retries (network/timing issues are more common in CI)
   */
  retries: process.env['CI'] ? 2 : 0,

  /**
   * Parallel Workers
   *
   * How many tests to run simultaneously. More workers = faster execution,
   * but uses more CPU/memory.
   *
   * LEARNING NOTE:
   * - Local: 1 worker (easier to watch and debug)
   * - CI: All CPU cores (speed matters more than observability)
   */
  workers: process.env['CI'] ? 10 : 1,

  /**
   * Test Reporter
   *
   * How test results are displayed. Multiple reporters can run simultaneously.
   *
   * LEARNING NOTE:
   * - 'html': Creates a beautiful interactive report (open on failure)
   * - 'list': Shows test progress in the terminal as they run
   * - 'json': Machine-readable format for CI/CD integration (added later)
   */
  reporter: [
    ['html', { open: 'on-failure' }], // Generate HTML report, open on failure
    ['list'], // Show progress in terminal
  ],

  /**
   * Global Test Settings
   *
   * These settings apply to all tests unless overridden in individual test files.
   */
  use: {
    /**
     * Base URL
     *
     * The URL where your application runs. Playwright will navigate here by default.
     * Using 'page.goto('/')' will go to 'http://localhost:5173/'.
     *
     * LEARNING NOTE: Make sure your dev server is running before running tests!
     * Run 'npm run dev' in a separate terminal.
     */
    baseURL: 'http://localhost:5173',

    /**
     * Trace Collection
     *
     * Playwright can record everything that happens during a test (screenshots,
     * network requests, console logs, etc.). This is invaluable for debugging.
     *
     * LEARNING NOTE:
     * - 'on-first-retry': Only record traces when a test fails and retries
     * - View traces with: npx playwright show-trace trace.zip (or open in browser)
     * - Traces show you EXACTLY what happened, step by step
     */
    trace: 'on-first-retry',

    /**
     * Screenshot on Failure
     *
     * Automatically take a screenshot when a test fails. Helps you see what
     * went wrong without re-running the test.
     *
     * LEARNING NOTE: Screenshots are saved in 'test-results/' directory.
     */
    screenshot: 'only-on-failure',

    /**
     * Video Recording
     *
     * Record video of test execution. Useful for debugging, but creates large files.
     *
     * LEARNING NOTE:
     * - 'retain-on-failure': Only keep videos for failed tests
     * - 'on': Record everything (useful for learning, but slow)
     * - 'off': No videos (fastest)
     */
    video: 'retain-on-failure',

    /**
     * Action Timeout
     *
     * How long to wait for a single action (click, fill, etc.) before failing.
     * Real-time apps need longer timeouts than static sites.
     *
     * LEARNING NOTE: 10 seconds is generous. If actions take longer, there's
     * probably a real problem (slow network, infinite loading, etc.).
     */
    actionTimeout: 20000, // 10 seconds

    /**
     * Navigation Timeout
     *
     * How long to wait for page navigation (goto, reload, etc.) before failing.
     *
     * LEARNING NOTE: 30 seconds accounts for:
     * - Initial page load
     * - Supabase authentication checks
     * - Real-time subscription setup
     */
    navigationTimeout: 60000, // 30 seconds
  },

  /**
   * Browser Projects
   *
   * Each project runs tests in a specific browser configuration. You can run
   * tests in multiple browsers to ensure cross-browser compatibility.
   *
   * LEARNING NOTE: We start with just Chromium (Chrome). Later, you can add
   * Firefox and WebKit (Safari) by uncommenting the other projects.
   */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],

        /**
         * Headed Mode (Visible Browser)
         *
         * Shows the browser window during test execution. Essential for learning
         * because you can see exactly what Playwright is doing.
         *
         * LEARNING NOTE:
         * - headless: false = visible browser (for learning/debugging)
         * - headless: true = invisible browser (default, faster)
         * - In CI, we automatically use headless mode (no display available)
         * - Use npm run test:e2e:headed to see browser windows when debugging
         */
        headless: true,

        /**
         * Launch Options
         *
         * Options passed to the browser when it launches.
         */
        launchOptions: {
          /**
           * Slow Motion
           *
           * Adds a delay between actions so you can follow along. Measured in milliseconds.
           *
           * LEARNING NOTE:
           * - 500ms = half-second delay (good for learning with headed mode)
           * - 0ms = full speed (for headless mode and CI)
           * - Use test:e2e:headed to see slow motion in action
           */
          slowMo: 0,

          /**
           * Browser Arguments
           *
           * Additional command-line arguments passed to the browser.
           * These fix network access issues in headless mode.
           */
          args: [
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
          ],
        },
      },
    },

    // Uncomment these as you progress to test in multiple browsers:

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /**
   * Web Server Configuration
   *
   * Playwright automatically manages your dev server:
   * - Checks if server is already running on the specified port
   * - If not running, starts the server with the given command
   * - Waits for server to be ready before running tests
   * - Keeps server running after tests (locally) or shuts it down (CI)
   *
   * LEARNING NOTE: This is why you don't need to manually start `npm run dev`!
   * Playwright handles it for you. If the server is already running, it will
   * reuse it (locally) to save time.
   *
   * CI = Continuous Integration (GitHub Actions, automated testing)
   */
  webServer: {
    /**
     * Command to start the dev server
     * When VITE_COVERAGE=true, the istanbul plugin will instrument the code
     */
    command: 'npm run dev',

    /**
     * URL to check if server is ready
     * Playwright will wait for this URL to respond before running tests
     */
    url: 'http://localhost:5173',

    /**
     * Reuse Existing Server
     *
     * LEARNING NOTE:
     * - Local (reuseExistingServer: true): If you have `npm run dev` running,
     *   Playwright will use it instead of starting a new one. Faster!
     * - CI (reuseExistingServer: false): Always start fresh server to ensure
     *   clean state for testing.
     */
    reuseExistingServer: !process.env['CI'],

    /**
     * Timeout for server to start
     *
     * LEARNING NOTE: 2 minutes is generous. Vite usually starts in 5-10 seconds,
     * but CI environments can be slower.
     */
    timeout: 120000, // 2 minutes

    /**
     * Pass environment variables to the dev server process.
     * Using env avoids relying on the cross-env binary so the VS Code extension
     * and CI both work consistently.
     */
    env: {
      ...Object.fromEntries(
        Object.entries(process.env).filter(([, value]) => value !== undefined)
      ),
      VITE_COVERAGE: process.env['VITE_COVERAGE'] ?? 'false',
    }
  },
});
