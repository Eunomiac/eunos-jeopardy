import gsap from "gsap";
import {
  Page,
  expect,
  Browser,
  BrowserContext,
  ConsoleMessage,
  type Locator
} from "@playwright/test";
import { TEST_USERS } from "./test-users";
import { startConsoleLogger } from "./console-logger";
import { saveCoverage } from "./coverage-helpers";
import { getHostGame, getAvailableClues, type ClueInfo } from "./database-helpers";
import { BuzzerState } from "../../src/types/BuzzerState";

// Re-export database helpers for convenience
export {
  getHostGame,
  getGameClues,
  getDailyDoubleIndices,
  getDailyDoublePositions,
  getAvailableClues,
  markClueCompleted,
  markRoundCompleted,
  getGamePlayers,
  getPlayerScore,
  updateGameStatus,
  updateGameRound,
  getCategoryNames,
  type ClueInfo,
  type DailyDoublePosition,
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
 * Log in as a specific user, and wait for login to complete by watching for the nickname input (if player) or clue set dropdown (if host)
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
  await clearAndFill(page.getByPlaceholder("Email"), email);
  await clearAndFill(page.getByPlaceholder("Password"), password);
  await clickWhenEnabled(page.getByRole("button", { name: "Login" }));
  await expect(page.getByText("Currently logged in as")).toBeVisible({timeout: 45000});
  const loadingLocator = page.getByText("Determining your interface...");
  if (await loadingLocator.isVisible({ timeout: 1000 }).catch(() => false)) {
    await expect(loadingLocator).not.toBeVisible({ timeout: 90000 });
  }
  // Wait for either player interface (nickname input) or host interface (clue set dropdown)
  // Use Promise.race to wait for whichever appears first
  const playerInterface = page.getByRole('textbox', { name: "Nickname"}).waitFor({ state: 'visible', timeout: 30000 });
  const hostInterface = page.getByRole("combobox").waitFor({ state: 'visible', timeout: 30000 });

  await Promise.race([playerInterface, hostInterface]);
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
  const nicknameInput = page.getByRole('textbox', { name: "Nickname"});
  await nicknameInput.waitFor({ state: 'visible', timeout: 30000 });
  // Clear and set custom nickname
  await clearAndFill(nicknameInput, nickname);
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
export async function loginUser(
  page: Page | undefined,
  email: string | undefined,
  nickname?: string,
  password = "1234"
): Promise<void> {
  if (!page || !email) {
    throw new Error("Missing player data!");
  }
  await loginAs(page, email, password);
  if (nickname) {
    await setNickname(page, nickname);
  }
}

export function loginPlayers(
  pages: Page[],
  emails: string[],
  nicknames: string[]
) {
  return Promise.all(
    pages.map((page, i) => loginUser(page, emails[i], nicknames[i]))
  );
}

export function joinPlayers(pages: Page[]) {
    return Promise.all(pages.map((page) => joinGame(page)));
  }

// ============================================================
// Browser Context Setup (Atomic Helpers)
// ============================================================

/**
 * Click a button when it becomes enabled
 *
 * @param button - Playwright locator for button
 * @param timeout - Timeout in ms (default 10000)
 */
export async function clickWhenEnabled(button: Locator, timeout = 10000) {
  await expect(button).toBeVisible({ timeout });
  await expect(button).toBeEnabled({ timeout });
  await button.click();
}


/**
 * Clear and fill an input field
 *
 * @param inputLocator - Playwright locator for input field
 * @param value - Value to fill
 *
 * @returns Promise from expect assertion
 */
export async function clearAndFill(inputLocator: Locator, value: string) {
  await inputLocator.fill("");
  await expect(inputLocator).toHaveValue("");
  await inputLocator.fill(value);
  return expect(inputLocator).toHaveValue(value);
}

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

  // Create player contexts in parallel
  const playerSetups = await Promise.all(
    Array.from({ length: numPlayers }, async (_, i) => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const logger = startConsoleLogger(page, `${testName}-player${i + 1}`);
      return { context, page, logger };
    })
  );

  const playerContexts = playerSetups.map((setup) => setup.context);
  const playerPages = playerSetups.map((setup) => setup.page);
  const playerLoggers = playerSetups.map((setup) => setup.logger);

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

  await expect(page.getByRole('heading', { name: 'Jeopardy Round', exact: true })).toBeVisible();

  const hostGameButton = page.getByRole('button', { name: 'Host Game' });
  await clickWhenEnabled(hostGameButton, 10000);

  await expect(page.getByText("Game Host Dashboard")).toBeVisible({timeout: 20000});
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
  await expect(joinButton).toHaveText(/Join Game/i, { timeout: 20000 });
  await clickWhenEnabled(joinButton);
  await expect(page.getByText("Game Lobby")).toBeVisible({ timeout: 20000 });
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
  await loginUser(page, email, nickname);
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
 * Start game and skip to board
 *
 * Host clicks "Start Game" and skips through all intro animations.
 *
 * @param hostPage - Host's Playwright page object
 */
export async function startGameAndSkipIntro(hostPage: Page, playerPages: Page[]): Promise<void> {
  const startGameClick = async () => hostPage
    .getByRole('button', { name: 'Start Game' })
    .click();

  await pausePageAnimationsAndCheck(
    startGameClick,
    ...playerPages.map((page): [Page, () => Promise<unknown>] => {
      return [
        page,
        async () => {
          await expect(page.locator("button", { hasText: /\$\d\d\d\d?/}).first()).toBeAttached();
          await expect(page.locator("button", { hasText: /\$\d\d\d\d?/}).first()).toBeHidden();
        }
      ];
    })
  );
  await Promise.all(playerPages.map(animationsSettled));

  await clickWhenEnabled(hostPage.getByRole("button", { name: "Introduce Categories" }));
  await clickWhenEnabled(hostPage.getByRole("button", { name: "Skip Introductions" }));
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

export async function waitForBuzzerStates(
  page: Page,
  states: BuzzerState[],
  timeout = 5000
): Promise<{ locator: Locator; state: BuzzerState }> {
  const buzzerLocator = page.locator(".integrated-buzzer");

  // Build a regex pattern that matches any of the provided states
  const stateClassPatterns = states.map((state) => `buzzer-${state.toLowerCase()}`).join('|');
  const stateRegex = new RegExp(stateClassPatterns);

  // Wait for the buzzer to have one of the expected state classes
  await expect(buzzerLocator).toHaveClass(stateRegex, { timeout });

  // Get the actual class to determine which state we're in
  const buzzerClasses = await buzzerLocator.getAttribute('class');

  // Determine which state we found
  let foundState: BuzzerState | null = null;
  for (const state of states) {
    const stateClass = `buzzer-${state.toLowerCase()}`;
    if (buzzerClasses?.includes(stateClass)) {
      foundState = state;
      break;
    }
  }

  if (!foundState) {
    throw new Error(`Buzzer has unexpected classes: ${buzzerClasses}`);
  }

  // Verify visibility and enabled status based on the found state
  switch (foundState) {
    case BuzzerState.HIDDEN:
      await expect(buzzerLocator).toBeHidden();
      break;

    case BuzzerState.LOCKED:
    case BuzzerState.UNLOCKED:
      await expect(buzzerLocator).toBeVisible();
      await expect(buzzerLocator).toBeEnabled();
      break;

    case BuzzerState.INACTIVE:
    case BuzzerState.BUZZED:
    case BuzzerState.FROZEN:
      await expect(buzzerLocator).toBeVisible();
      await expect(buzzerLocator).toBeDisabled();
      break;

    default:
      throw new Error(`Unsupported buzzer state: ${foundState}`);
  }

  return { locator: buzzerLocator, state: foundState };
}

/**
 * Get a player's score from the UI
 *
 * Works on both host and player pages:
 * - Host page: Looks in `.player-scores-list .player-score-item`
 * - Player page: Looks in `.player-podium` with matching player name
 *
 * @param page - Playwright page object (host or player page)
 * @param playerName - Name of the player to get score for
 * @returns The player's score as an integer
 * @throws Error if player not found or score cannot be parsed
 */
export async function getPlayerScoreFromUI(page: Page, playerName: string): Promise<number> {
  let scoreElement: Locator;

  // Try host page structure first (.player-scores-list)
  const hostScoreItem = page
    .locator('.player-scores-list .player-score-item')
    .filter({ hasText: playerName });

  if (await hostScoreItem.count() > 0) {
    // Host page: score is in .player-score within the player-score-item
    scoreElement = hostScoreItem.locator('.player-score').first();
  } else {
    // Player page: score is in .player-score within .player-podium
    const playerPodium = page
      .locator('.player-podium')
      .filter({ hasText: playerName });

    if (await playerPodium.count() === 0) {
      throw new Error(`Could not find player podium or score item for: ${playerName}`);
    }

    scoreElement = playerPodium.locator('.player-score').first();
  }

  // Get the text content
  const scoreText = await scoreElement.textContent();

  if (scoreText === null) {
    throw new Error(`Could not find score text for player: ${playerName}`);
  }

  // Parse the score: remove $, commas, and parse as integer
  // Handles: "$200", "$1,000", "-$500", "$0"
  const cleanedScore = scoreText.replace(/[$,]/g, '').trim();
  const score = parseInt(cleanedScore, 10);

  if (isNaN(score)) {
    throw new Error(`Could not parse score for player ${playerName}: "${scoreText}"`);
  }

  return score;
}

/**
 * Select a clue on the game board randomly from available clues
 *
 * @param hostPage - Host's Playwright page object
 * @param gameId - The UUID of the game
 * @param selectDailyDouble - Optional flag to select a daily double clue (default: false)
 * @returns The selected clue information
 * @throws Error if no clues of the requested type are available
 */
export async function selectClue(
  hostPage: Page,
  gameId: string,
  selectDailyDouble = false
): Promise<ClueInfo> {
  // Get all available clues for the current round
  const allClues = await getAvailableClues(gameId);

  // Filter based on selectDailyDouble flag and completion status
  const availableClues = allClues.filter((clue) => {
    if (clue.isCompleted) {
      return false; // Exclude completed clues
    }
    if (selectDailyDouble) {
      return clue.isDailyDouble; // Only Daily Doubles
    }
    return !clue.isDailyDouble; // Exclude Daily Doubles
  });

  // Throw error if no clues available
  if (availableClues.length === 0) {
    const clueType = selectDailyDouble ? "Daily Double" : "non-Daily Double";
    throw new Error(
      `No available ${clueType} clues found. Total clues: ${allClues.length}, ` +
        `Completed: ${allClues.filter((c) => c.isCompleted).length}, ` +
        `Daily Doubles: ${allClues.filter((c) => c.isDailyDouble).length}`
    );
  }

  // Select a random clue from available clues
  const randomIndex = Math.floor(Math.random() * availableClues.length);
  const selectedClue = availableClues[randomIndex];

  if (!selectedClue) {
    throw new Error("Failed to select a random clue");
  }

  // Click the clue on the board using its board index
  const clueCell = hostPage
    .locator(".clue-cell, .board-cell")
    .nth(selectedClue.boardIndex);
  await expect(clueCell).toBeVisible({ timeout: 5000 });
  await clueCell.click();
  await hostPage.waitForTimeout(1000);

  return selectedClue;
}

/**
 * Reveal clue prompt to players
 *
 * @param hostPage - Host's Playwright page object
 */
export async function revealPrompt(hostPage: Page): Promise<void> {
  const revealButton = hostPage.getByRole("button", {
    name: /Reveal Prompt/i,
  });
  await expect(revealButton).toBeVisible({ timeout: 5000 });
  await revealButton.click();
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
 * @param delay - Optional delay before clicking (for race condition tests)
 */
export async function buzzIn(playerPage: Page, delay = 0): Promise<void> {
  const { locator: buzzer } = await waitForBuzzerStates(playerPage, [BuzzerState.LOCKED, BuzzerState.UNLOCKED]);
  await playerPage.waitForTimeout(delay);
  // Force click to bypass stability checks - buzzer state can change rapidly during animations
  await buzzer.click({ force: true });
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
  const playerEmails: string[] = [
    TEST_USERS.player1.email,
    TEST_USERS.player2.email,
    TEST_USERS.player3.email
  ].slice(0, playerPages.length);
  playerEmails.push(TEST_USERS.host.email);

  // Login all players in parallel
  await loginPlayers([...playerPages, hostPage], playerEmails, playerNicknames);

  // Host creates game
  await createGame(hostPage, 1);

  // Players join game
  await joinPlayers(playerPages);

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
  await startGameAndSkipIntro(hostPage, playerPages);

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
