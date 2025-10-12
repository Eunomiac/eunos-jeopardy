import { Page, expect, Browser, BrowserContext } from '@playwright/test';
import { TEST_USERS } from './test-users';
import { startConsoleLogger } from './console-logger';

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
// Types
// ============================================================

export interface TestContext {
  hostPage: Page;
  hostContext: BrowserContext;
  hostLogger: { save: () => void };
  playerPages: Page[];
  playerContexts: BrowserContext[];
  playerLoggers: Array<{ save: () => void }>;
}

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
  password: string = '1234'
): Promise<void> {
  await page.goto('/');
  await page.getByPlaceholder('Email').fill(email);
  await page.getByPlaceholder('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByText('Currently logged in as')).toBeVisible();
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
  const nicknameInput = page.getByPlaceholder('Your display name for this game...');
  // Wait for profile to load (input has default value)
  await expect(nicknameInput).not.toHaveValue('');
  // Clear and set custom nickname
  await nicknameInput.fill('');
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
  password: string = '1234'
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
  const playerLoggers: Array<{ save: () => void }> = [];

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
    playerLoggers
  };
}

/**
 * Cleanup test context
 * Saves logs and closes all contexts
 *
 * @param ctx - TestContext to cleanup
 */
export async function cleanupTestContext(ctx: TestContext): Promise<void> {
  // Save all logs
  ctx.hostLogger.save();
  ctx.playerLoggers.forEach(logger => logger.save());

  // Close all contexts
  await ctx.hostContext.close();
  await Promise.all(ctx.playerContexts.map(c => c.close()));
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
export async function createGame(
  page: Page,
  clueSetIndex: number = 1
): Promise<void> {
  const clueSetDropdown = page.getByRole('combobox');
  await expect(clueSetDropdown).toBeVisible();
  await clueSetDropdown.selectOption({ index: clueSetIndex });
  await page.getByText('Host Game').click();
  await expect(page.getByText('Game Host Dashboard')).toBeVisible();
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
  clueSetIndex: number = 1
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
  const joinButton = page.getByRole('button', { name: 'Join Game' });
  await expect(joinButton).toBeEnabled({ timeout: 5000 });
  await joinButton.click();
  await expect(page.getByText('Game Lobby')).toBeVisible();
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
// Game Flow & Navigation
// ============================================================

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
  maxClicks: number = 10
): Promise<void> {
  for (let i = 0; i < maxClicks; i++) {
    const nextButton = page.getByRole('button', { name: /Next|Continue|Start|Introduce/i }).first();
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
  await hostPage.getByRole('button', { name: 'Start Game' }).click();
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
  timeout: number = 15000
): Promise<void> {
  await expect(page.locator('.game-board')).toBeVisible({ timeout });
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
export async function selectClue(
  hostPage: Page,
  clueIndex: number = 0
): Promise<void> {
  const clueCell = hostPage.locator('.clue-cell, .board-cell').nth(clueIndex);
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
  const unlockButton = hostPage.getByRole('button', { name: /Unlock Buzzer|Enable Buzzer/i });
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
  const correctButton = hostPage.getByRole('button', { name: /Correct|✓|Award/i });
  await expect(correctButton).toBeVisible({ timeout: 5000 });
  await correctButton.click();
}

/**
 * Host marks answer as wrong
 *
 * @param hostPage - Host's Playwright page object
 */
export async function markWrong(hostPage: Page): Promise<void> {
  const wrongButton = hostPage.getByRole('button', { name: /Wrong|✗|Incorrect/i });
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
    throw new Error('Number of player pages must match number of nicknames');
  }

  // Players log in and set nicknames first
  const playerEmails = [TEST_USERS.player1.email, TEST_USERS.player2.email, TEST_USERS.player3.email];
  for (let i = 0; i < playerPages.length; i++) {
    await loginAsPlayer(playerPages[i], playerEmails[i], playerNicknames[i]);
  }

  // Host creates game
  await createGameAsHost(hostPage);

  // Players join game
  for (const playerPage of playerPages) {
    await joinGame(playerPage);
  }

  // Verify all players are in lobby
  await expect(hostPage.getByText(`Total Players: ${playerPages.length}`)).toBeVisible();
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
  await waitForGameBoard(playerPages[0]);
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
  const ctx = await createTestContext(browser, playerNicknames.length, testName);
  await setupGameWithPlayers(ctx.hostPage, ctx.playerPages, playerNicknames);
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
  const ctx = await createTestContext(browser, playerNicknames.length, testName);
  await setupGameInProgress(ctx.hostPage, ctx.playerPages, playerNicknames);
  return ctx;
}
