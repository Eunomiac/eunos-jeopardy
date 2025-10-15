import gsap from "gsap";
import {
  Page,
  expect,
  Browser,
  BrowserContext,
  ConsoleMessage,
} from "@playwright/test";
import { TEST_USERS } from "./test-users";
import { startConsoleLogger } from "./console-logger";
import { saveCoverage } from "./coverage-helpers";
import { getHostGame } from "./database-helpers";

// Re-export database helpers for convenience
export {
  getHostGame,
  getGameClues,
  getDailyDoubleIndices,
  markClueCompleted,
  markRoundCompleted,
  getGamePlayers,
  updateGameStatus,
  updateGameRound,
} from "./database-helpers";

/**
 * Test Helper Functions for E2E Tests
 *
 * These functions encapsulate common test workflows to make tests more readable
 * and maintainable. They follow the "Page Object Model" pattern where complex
 * interactions are abstracted into reusable functions.
 *
 * Design Principle: Maximum DRY
 * - Atomic helpers are composed into higher-level helpers
 * - No code duplication between helpers
 * - Each helper does ONE thing well
 *
 * Benefits:
 * - Tests read like plain English
 * - Changes to UI only require updating helpers, not all tests
 * - Consistent behavior across tests
 * - Reduced code duplication
 */

// ============================================================
// Console Suppression for Production Code
// ============================================================

/**
 * Suppress all console output from production code during tests
 * This prevents production console.log/warn/error from cluttering test output
 *
 * @param page - Playwright page object
 * @example
 * await suppressProductionConsole(hostPage);
 * await suppressProductionConsole(player1Page);
 */
export async function suppressProductionConsole(page: Page): Promise<void> {
  await page.addInitScript(() => {
    // Override with no-ops to suppress production console output
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
    console.info = () => {};
    console.debug = () => {};
  });
}

// ============================================================
// Types
// ============================================================

export interface TestContext {
  hostPage: Page;
  hostContext: BrowserContext;
  hostLogger: { save: () => void };
  playerPages: Page[];
  playerContexts: BrowserContext[];
  playerLoggers: { save: () => void }[];
  gameId?: string; // Game ID for database operations
}

const SUPPRESSIBLE_CONSOLE_METHODS = [
  "log",
  "error",
  "warn",
  "info",
  "debug",
] as const;
type SuppressableConsoleMethod = (typeof SUPPRESSIBLE_CONSOLE_METHODS)[number];

// Map Playwright console types to Node console methods we care about
const CONSOLE_TYPE_MAP: Partial<
  Record<ReturnType<ConsoleMessage["type"]>, SuppressableConsoleMethod>
> = {
  log: "log",
  error: "error",
  info: "info",
  debug: "debug",
  warning: "warn",
};

// ============================================================
// Authentication & User Setup (Atomic Helpers)
// ============================================================

/**
 * Log in as a specific user
 *
 * @param page - Playwright page object
 * @param email - User email
 * @param password - User password (defaults to test password)
 */
export async function loginAs(
  page: Page,
  email: string,
  password = "1234"
): Promise<void> {
  await page.goto("/");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(password);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page.getByText("Currently logged in as")).toBeVisible();
}

/**
 * Set player nickname
 *
 * Waits for default nickname to load, then replaces it with custom nickname.
 * Uses fill('') to clear instead of clear() to avoid timing issues.
 *
 * @param page - Playwright page object
 * @param nickname - Desired nickname
 */
export async function setNickname(page: Page, nickname: string): Promise<void> {
  const nicknameInput = page.getByPlaceholder(
    "Your display name for this game..."
  );
  // Clear and set custom nickname
  await nicknameInput.fill("");
  await nicknameInput.fill(nickname);
  // Verify it stuck
  await expect(nicknameInput).toHaveValue(nickname);
}

/**
 * Log in as a player and set their nickname
 * Composed from: loginAs() + setNickname()
 *
 * @param page - Playwright page object
 * @param email - User email
 * @param nickname - Desired nickname
 * @param password - User password (defaults to test password)
 */
export async function loginAsPlayer(
  page: Page,
  email: string,
  nickname: string,
  password = "1234"
): Promise<void> {
  await loginAs(page, email, password);
  await setNickname(page, nickname);
}

// ============================================================
// Browser Context Setup (Atomic Helpers)
// ============================================================

/**
 * Create a test context with host and players
 * Sets up browser contexts, pages, and console loggers
 *
 * @param browser - Playwright browser instance
 * @param numPlayers - Number of player contexts to create
 * @param testName - Name for console log files
 * @returns TestContext with all pages, contexts, and loggers
 */
export async function createTestContext(
  browser: Browser,
  numPlayers: number,
  testName: string
): Promise<TestContext> {
  // Create host context
  const hostContext = await browser.newContext();
  const hostPage = await hostContext.newPage();
  const hostLogger = startConsoleLogger(hostPage, `${testName}-host`);

  // Create player contexts
  const playerContexts: BrowserContext[] = [];
  const playerPages: Page[] = [];
  const playerLoggers: { save: () => void }[] = [];

  for (let i = 0; i < numPlayers; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const logger = startConsoleLogger(page, `${testName}-player${i + 1}`);

    playerContexts.push(context);
    playerPages.push(page);
    playerLoggers.push(logger);
  }

  return {
    hostPage,
    hostContext,
    hostLogger,
    playerPages,
    playerContexts,
    playerLoggers,
  };
}

export function suppressConsoleLogs(
  pages: Page[] = [],
  methods: ReadonlyArray<SuppressableConsoleMethod> = SUPPRESSIBLE_CONSOLE_METHODS
) {
  for (const page of pages) {
    const handler = (msg: ConsoleMessage) => {
      const mapped = CONSOLE_TYPE_MAP[msg.type()];
      if (!mapped) {
        return;
      }
      if (!methods.includes(mapped)) {
        (console[mapped] as (...args: unknown[]) => void)(msg.text());
      }
    };
    page.on("console", handler);
  }
}

/**
 * Cleanup test context
 * Saves logs, coverage, and closes all contexts
 *
 * @param ctx - TestContext to cleanup
 */
export async function cleanupTestContext(ctx: TestContext): Promise<void> {
  // Save all logs
  ctx.hostLogger.save();
  ctx.playerLoggers.forEach((logger) => {
    logger.save();
  });

  // Save coverage from all pages
  await saveCoverage(ctx.hostPage, "host");
  await Promise.all(
    ctx.playerPages.map((page, i) => saveCoverage(page, `player${i + 1}`))
  );

  // Close all contexts
  await ctx.hostContext.close();
  await Promise.all(ctx.playerContexts.map((c) => c.close()));
}

// ============================================================
// Game Creation & Lobby (Atomic Helpers)
// ============================================================

/**
 * Create a game as host (without logging in)
 * Assumes host is already logged in
 *
 * @param page - Playwright page object
 * @param clueSetIndex - Index of clue set to select (defaults to 1)
 */
export async function createGame(page: Page, clueSetIndex = 1): Promise<void> {
  const clueSetDropdown = page.getByRole("combobox");
  await expect(clueSetDropdown).toBeVisible();
  await clueSetDropdown.selectOption({ index: clueSetIndex });
  await page.getByText("Host Game").click();
  const dashboardHeader = page.getByText("Game Host Dashboard");
  await expect(dashboardHeader).toBeVisible();
}

/**
 * Create a game as host (with login)
 * Composed from: loginAs() + createGame()
 *
 * @param page - Playwright page object
 * @param clueSetIndex - Index of clue set to select (defaults to 1)
 */
export async function createGameAsHost(
  page: Page,
  clueSetIndex = 1
): Promise<void> {
  await loginAs(page, TEST_USERS.host.email);
  await createGame(page, clueSetIndex);
}

/**
 * Join game as player
 * Waits for "Join Game" button to become enabled, then clicks it.
 *
 * @param page - Playwright page object
 */
export async function joinGame(page: Page): Promise<void> {
  const joinButton = page.getByRole("button", {
    name: /Waiting for Game|Join Game/i,
  });
  // Wait for the joinButton to change text from "Waiting for Game" to "Join Game"
  await expect(joinButton).toHaveText(/Join Game/i, { timeout: 10000 });
  await expect(joinButton).toBeEnabled();
  await joinButton.click();
  await expect(page.getByText("Game Lobby")).toBeVisible();
}

/**
 * Log in as player, set nickname, and join game
 * Composed from: loginAsPlayer() + joinGame()
 *
 * @param page - Playwright page object
 * @param email - User email
 * @param nickname - Desired nickname
 */
export async function loginAndJoinAs(
  page: Page,
  email: string,
  nickname: string
): Promise<void> {
  await loginAsPlayer(page, email, nickname);
  await joinGame(page);
}

// ============================================================
// Animation Helpers
// ============================================================
/**
 * Pause GSAP animations BEFORE they would be triggered, then resume them after provided expectations are met.
 *
 * @param trigger - The promise that, when resolved, triggers the animation.
 * @param expectations - An array of tuples, each containing a page and a promise that can check the state of the page before the animation begins.
 *
 * @example
 * ```ts
 * await pausePageAnimationsBefore(
 *   async () => hostPage.getByRole('button', { name: 'Start Game' }).click(),
 *   [
 *     playerPage1, async () => {
 *       await expect(player1Page.getByRole('img', { name: 'Jeopardy Board Background' }).first()).toBeAttached();
 *       await expect(player1Page.getByRole('img', { name: 'Jeopardy Board Background' }).first()).toBeHidden();
 *     }
 *   ],
 *   [
 *     playerPage2, async () => {
 *       await expect(player2Page.getByRole('img', { name: 'Jeopardy Board Background' }).first()).toBeAttached();
 *       await expect(player2Page.getByRole('img', { name: 'Jeopardy Board Background' }).first()).toBeHidden();
 *     }
 *   ]
 * );
 * ```
 */
export async function pausePageAnimationsAndCheck(
  trigger: () => Promise<unknown>,
  ...expectations: Array<[Page, () => Promise<unknown>]>
) {
  // Pause the GSAP global timeline on all pages with expectations to check.
  await Promise.all(
    expectations.map(([page]) =>
      page.evaluate(() => gsap.globalTimeline.pause())
    )
  );

  // Wait for the trigger expectation to resolve.
  await trigger();

  // Wait for all expectations to resolve.
  await Promise.all(expectations.map(([, expectation]) => expectation()));

  // Resume the GSAP global timeline on all pages.
  await Promise.allSettled(
    expectations.map(([page]) =>
      page.evaluate(() => {
        // Standard promise won't resolve because event loop never idles after global timeline is resumed.
        // setTimeout resolves the promise after a tick in the event loop.
        gsap.globalTimeline.resume();
        setTimeout(() => Promise.resolve(), 0);
      })
    )
  );
}

/**
 * Pause the GSAP global timeline after an expectation is resolved
 * @param page - Playwright page object
 * @param promise - Promise to await before resuming
 */
export async function pausePageAnimationsAfter(
  page: Page,
  promise: Promise<unknown>
) {
  await promise;
  await page.evaluate(() => gsap.globalTimeline.pause());
}

/**
 * Resume the GSAP global timeline after an expectation is resolved
 * @param page - Playwright page object
 * @param promise - Promise to await before resuming
 */
export async function resumePageAnimationsAfter(
  page: Page,
  promise: Promise<unknown>
) {
  await promise;
  await page.evaluate(() => gsap.globalTimeline.resume());
}

/**
 * Wait for all non-repeating GSAP animations to complete
 * @param page The Playwright Page object.
 * @param timeout The timeout for the poll in milliseconds. Defaults to max animation duration + 100ms.
 */
export async function animationsSettled(page: Page, bufferTime = 100) {
  const maxDuration = await page.evaluate(() => {
    return gsap.globalTimeline
      .getChildren()
      .filter((anim) => anim.repeat() !== -1)
      .reduce((max, anim) => Math.max(max, anim.totalDuration()), 0);
  });
  // If no finite animations are found, return immediately.
  if (maxDuration === 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    setTimeout(resolve, maxDuration * 1000 + bufferTime);
  });
}

/**
 * Skip through game intro animations
 *
 * Clicks through intro screens until reaching the game board.
 * Handles variable number of screens (game intro, category intros, etc.)
 *
 * @param page - Playwright page object (usually host page)
 * @param maxClicks - Maximum number of clicks to attempt (defaults to 10)
 */
export async function skipIntroAnimations(
  page: Page,
  maxClicks = 10
): Promise<void> {
  for (let i = 0; i < maxClicks; i++) {
    const nextButton = page
      .getByRole("button", { name: /Next|Continue|Start|Introduce/i })
      .first();
    if (await nextButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await nextButton.click();
      await page.waitForTimeout(500);
    } else {
      break; // No more buttons to click
    }
  }
}

/**
 * Start game and skip to board
 *
 * Host clicks "Start Game" and skips through all intro animations.
 *
 * @param hostPage - Host's Playwright page object
 */
export async function startGameAndSkipIntro(hostPage: Page): Promise<void> {
  await hostPage.getByRole("button", { name: "Start Game" }).click();
  await hostPage.waitForTimeout(2000);
  await skipIntroAnimations(hostPage);
}

/**
 * Wait for game board to be visible
 *
 * @param page - Playwright page object
 * @param timeout - Maximum time to wait in milliseconds (defaults to 15000)
 */
export async function waitForGameBoard(
  page: Page,
  timeout = 15000
): Promise<void> {
  await expect(
    page.getByRole("button", { name: "Clue for $400" }).first()
  ).toBeVisible({ timeout });
}

// ============================================================
// Buzzer System
// ============================================================

/**
 * Select a clue on the game board
 *
 * @param hostPage - Host's Playwright page object
 * @param clueIndex - Index of clue to select (defaults to 0 for first clue)
 */
export async function selectClue(hostPage: Page, clueIndex = 0): Promise<void> {
  const clueCell = hostPage.locator(".clue-cell, .board-cell").nth(clueIndex);
  await expect(clueCell).toBeVisible({ timeout: 5000 });
  await clueCell.click();
  await hostPage.waitForTimeout(1000);
}

/**
 * Unlock buzzer for players
 *
 * @param hostPage - Host's Playwright page object
 */
export async function unlockBuzzer(hostPage: Page): Promise<void> {
  const unlockButton = hostPage.getByRole("button", {
    name: /Unlock Buzzer|Enable Buzzer/i,
  });
  await expect(unlockButton).toBeVisible({ timeout: 5000 });
  await unlockButton.click();
}

/**
 * Player buzzes in
 *
 * @param playerPage - Player's Playwright page object
 */
export async function buzzIn(playerPage: Page): Promise<void> {
  const buzzer = playerPage.locator('.buzzer-button, button[class*="buzzer"]');
  await expect(buzzer).toBeEnabled({ timeout: 2000 });
  await buzzer.click();
}

/**
 * Host marks answer as correct
 *
 * @param hostPage - Host's Playwright page object
 */
export async function markCorrect(hostPage: Page): Promise<void> {
  const correctButton = hostPage.getByRole("button", {
    name: /Correct|✓|Award/i,
  });
  await expect(correctButton).toBeVisible({ timeout: 5000 });
  await correctButton.click();
}

/**
 * Host marks answer as wrong
 *
 * @param hostPage - Host's Playwright page object
 */
export async function markWrong(hostPage: Page): Promise<void> {
  const wrongButton = hostPage.getByRole("button", {
    name: /Wrong|✗|Incorrect/i,
  });
  await expect(wrongButton).toBeVisible({ timeout: 5000 });
  await wrongButton.click();
}

// ============================================================
// Complete Workflows (Composed from Atomic Helpers)
// ============================================================

/**
 * Setup a complete game with host and players in lobby
 * Composed from: loginAsPlayer() + createGameAsHost() + joinGame()
 *
 * This is a common starting point for many tests.
 *
 * @param hostPage - Host's page
 * @param playerPages - Array of player pages
 * @param playerNicknames - Array of nicknames for players
 * @returns Promise that resolves when setup is complete
 */
export async function setupGameWithPlayers(
  hostPage: Page,
  playerPages: Page[],
  playerNicknames: string[]
): Promise<void> {
  if (playerPages.length !== playerNicknames.length) {
    throw new Error("Number of player pages must match number of nicknames");
  }

  // Players log in and set nicknames first
  const playerEmails = [
    TEST_USERS.player1.email,
    TEST_USERS.player2.email,
    TEST_USERS.player3.email,
  ];
  for (let i = 0; i < playerPages.length; i++) {
    const playerPage = playerPages[i];
    const playerEmail = playerEmails[i];
    const playerNickname = playerNicknames[i];

    // Defensive check for array access - protects against undefined even in bounded iteration
    if (!playerPage || !playerEmail || !playerNickname) {
      throw new Error(`Missing player data at index ${i}`);
    }

    await loginAsPlayer(playerPage, playerEmail, playerNickname);
  }

  // Host creates game
  await createGameAsHost(hostPage);

  // Players join game
  for (const playerPage of playerPages) {
    // Defensive check - protects against undefined elements in array
    if (!playerPage) {
      throw new Error("Player page is undefined in join loop");
    }
    await joinGame(playerPage);
  }

  // Verify all players are in lobby
  await expect(
    hostPage.getByText(`Total Players: ${playerPages.length}`)
  ).toBeVisible();
}

/**
 * Setup game and get to in_progress state with board visible
 * Composed from: setupGameWithPlayers() + startGameAndSkipIntro() + waitForGameBoard()
 *
 * @param hostPage - Host's page
 * @param playerPages - Array of player pages
 * @param playerNicknames - Array of nicknames for players
 */
export async function setupGameInProgress(
  hostPage: Page,
  playerPages: Page[],
  playerNicknames: string[]
): Promise<void> {
  await setupGameWithPlayers(hostPage, playerPages, playerNicknames);
  await startGameAndSkipIntro(hostPage);

  const firstPlayerPage = playerPages[0];
  // Defensive check for array access - protects against empty array
  if (!firstPlayerPage) {
    throw new Error("No player pages provided to setupGameInProgress");
  }

  await waitForGameBoard(firstPlayerPage);
}

/**
 * Complete workflow: Create context, setup game to lobby
 * Composed from: createTestContext() + setupGameWithPlayers()
 *
 * @param browser - Playwright browser instance
 * @param playerNicknames - Array of nicknames for players
 * @param testName - Name for console log files
 * @returns TestContext with game in lobby state
 */
export async function setupTestWithLobby(
  browser: Browser,
  playerNicknames: string[],
  testName: string
): Promise<TestContext> {
  const ctx = await createTestContext(
    browser,
    playerNicknames.length,
    testName
  );
  await setupGameWithPlayers(ctx.hostPage, ctx.playerPages, playerNicknames);

  // Get the game ID from the database
  const game = await getHostGame(TEST_USERS.host.id);
  if (game) {
    ctx.gameId = game.id;
  }

  return ctx;
}

/**
 * Complete workflow: Create context, setup game to in_progress
 * Composed from: createTestContext() + setupGameInProgress()
 *
 * @param browser - Playwright browser instance
 * @param playerNicknames - Array of nicknames for players
 * @param testName - Name for console log files
 * @returns TestContext with game in progress
 */
export async function setupTestInProgress(
  browser: Browser,
  playerNicknames: string[],
  testName: string
): Promise<TestContext> {
  const ctx = await createTestContext(
    browser,
    playerNicknames.length,
    testName
  );
  await setupGameInProgress(ctx.hostPage, ctx.playerPages, playerNicknames);

  // Get the game ID from the database
  const game = await getHostGame(TEST_USERS.host.id);
  if (game) {
    ctx.gameId = game.id;
  }

  return ctx;
}
