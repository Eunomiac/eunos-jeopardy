import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';
import { cleanupTestUser } from '../fixtures/database-helpers';
import { startConsoleLogger } from '../fixtures/console-logger';

/**
 * Smoke Test: Game Setup & Lobby
 *
 * This test suite validates the critical paths for game setup and lobby functionality:
 * - Multiple players joining a game
 * - Players attempting to join after game starts
 * - Host attempting to start game without players
 *
 * These tests ensure the basic multiplayer lobby functionality works correctly.
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
test.describe('Game Setup & Lobby - Smoke Tests', () => {
  /**
   * Clean up after each test to ensure test isolation.
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
   * Test 1.1: Multiple Players Join Game
   *
   * This test validates the complete flow of multiple players joining a game:
   * - Players see correct button states before/after game creation
   * - Players can join and see each other in the lobby
   * - Host sees all players in the Player Control panel
   */
  test('should allow multiple players to join game sequentially', async ({ browser }) => {
    // ============================================================
    // SETUP: Create browser contexts for host and 3 players
    // Note: Create contexts sequentially to avoid timing issues
    // ============================================================
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const hostLogger = startConsoleLogger(hostPage, 'game-setup-host');

    const player1Context = await browser.newContext();
    const player1Page = await player1Context.newPage();
    const player1Logger = startConsoleLogger(player1Page, 'game-setup-player1');

    const player2Context = await browser.newContext();
    const player2Page = await player2Context.newPage();
    const player2Logger = startConsoleLogger(player2Page, 'game-setup-player2');

    const player3Context = await browser.newContext();
    const player3Page = await player3Context.newPage();
    const player3Logger = startConsoleLogger(player3Page, 'game-setup-player3');

    try {
      // ============================================================
      // ARRANGE: Player 1 logs in before game exists
      // ============================================================
      await player1Page.goto('/');
      await player1Page.getByPlaceholder('Email').fill(TEST_USERS.player1.email);
      await player1Page.getByPlaceholder('Password').fill(TEST_USERS.player1.password);
      await player1Page.getByRole('button', { name: 'Login' }).click();
      await expect(player1Page.getByText('Currently logged in as')).toBeVisible();

      // Set nickname - wait for default to load, then replace it
      const nicknameInput = player1Page.getByPlaceholder('Your display name for this game...');
      // Wait for the input to have any value (profile loaded)
      await expect(nicknameInput).not.toHaveValue('');
      await nicknameInput.clear();
      await nicknameInput.fill('Alice');
      // Verify the nickname was set
      await expect(nicknameInput).toHaveValue('Alice');

      // Confirm "Waiting for Game" button is disabled
      await expect(player1Page.getByRole('button', { name: 'Waiting for Game' })).toBeVisible();
      await expect(player1Page.getByRole('button', { name: 'Waiting for Game' })).toBeDisabled();

      // ============================================================
      // ACT: Host creates game
      // ============================================================
      await hostPage.goto('/');
      await hostPage.getByPlaceholder('Email').fill(TEST_USERS.host.email);
      await hostPage.getByPlaceholder('Password').fill(TEST_USERS.host.password);
      await hostPage.getByRole('button', { name: 'Login' }).click();
      await expect(hostPage.getByText('Currently logged in as')).toBeVisible();

      // Select clue set and create game
      const clueSetDropdown = hostPage.getByRole('combobox');
      await expect(clueSetDropdown).toBeVisible();
      await clueSetDropdown.selectOption({ index: 1 });
      await hostPage.getByText('Host Game').click();
      await expect(hostPage.getByText('Game Host Dashboard')).toBeVisible();

      // ============================================================
      // ASSERT: Player 1's button changes to "Join Game"
      // ============================================================
      await expect(player1Page.getByRole('button', { name: 'Join Game' })).toBeVisible();
      await expect(player1Page.getByRole('button', { name: 'Join Game' })).toBeEnabled();

      // ============================================================
      // ARRANGE: Player 2 logs in (game exists but no one joined yet)
      // ============================================================
      await player2Page.goto('/');
      await player2Page.getByPlaceholder('Email').fill(TEST_USERS.player2.email);
      await player2Page.getByPlaceholder('Password').fill(TEST_USERS.player2.password);
      await player2Page.getByRole('button', { name: 'Login' }).click();
      await expect(player2Page.getByText('Currently logged in as')).toBeVisible();

      // Set nickname - wait for default to load, then replace it
      const player2NicknameInput = player2Page.getByPlaceholder('Your display name for this game...');
      // Wait for the input to have any value (profile loaded)
      await expect(player2NicknameInput).not.toHaveValue('');
      await player2NicknameInput.clear();
      await player2NicknameInput.fill('Bob');
      // Verify the nickname was set
      await expect(player2NicknameInput).toHaveValue('Bob');

      // Confirm "Join Game" button is enabled and NO players listed
      await expect(player2Page.getByRole('button', { name: 'Join Game' })).toBeVisible();
      await expect(player2Page.getByRole('button', { name: 'Join Game' })).toBeEnabled();
      // Join screen should not show any players yet
      await expect(player2Page.getByText('Alice')).not.toBeVisible();

      // ============================================================
      // ACT: Player 1 joins game
      // ============================================================
      await player1Page.getByRole('button', { name: 'Join Game' }).click();

      // ============================================================
      // ASSERT: Player 1 sees game lobby with only themselves
      // ============================================================
      await expect(player1Page.getByText('Game Lobby')).toBeVisible();
      await expect(player1Page.getByText('Alice').first()).toBeVisible();

      // ============================================================
      // ASSERT: Host sees Player 1 in Player Control panel
      // ============================================================
      await expect(hostPage.getByText('Total Players: 1')).toBeVisible();
      await expect(hostPage.getByText('Alice')).toBeVisible();

      // ============================================================
      // ACT: Player 2 joins game
      // ============================================================
      await player2Page.getByRole('button', { name: 'Join Game' }).click();

      // ============================================================
      // ASSERT: Player 2 sees game lobby with Alice and Bob
      // ============================================================
      await expect(player2Page.getByText('Game Lobby')).toBeVisible();
      await expect(player2Page.getByText('Alice')).toBeVisible();
      await expect(player2Page.getByText('Bob').first()).toBeVisible();

      // ============================================================
      // ASSERT: Player 1 sees Bob join (real-time update)
      // ============================================================
      await expect(player1Page.getByText('Bob')).toBeVisible();

      // ============================================================
      // ASSERT: Host sees both players in Player Control panel
      // ============================================================
      await expect(hostPage.getByText('Total Players: 2')).toBeVisible();
      await expect(hostPage.getByText('Bob')).toBeVisible();

      // ============================================================
      // ARRANGE: Player 3 logs in (2 players already in game)
      // ============================================================
      await player3Page.goto('/');
      await player3Page.getByPlaceholder('Email').fill(TEST_USERS.player3.email);
      await player3Page.getByPlaceholder('Password').fill(TEST_USERS.player3.password);
      await player3Page.getByRole('button', { name: 'Login' }).click();
      await expect(player3Page.getByText('Currently logged in as')).toBeVisible();

      // Set nickname - wait for default to load, then replace it
      const player3NicknameInput = player3Page.getByPlaceholder('Your display name for this game...');
      // Wait for the input to have any value (profile loaded)
      await expect(player3NicknameInput).not.toHaveValue('');
      await player3NicknameInput.clear();
      await player3NicknameInput.fill('Charlie');
      // Verify the nickname was set
      await expect(player3NicknameInput).toHaveValue('Charlie');

      // Confirm "Join Game" button is enabled and NO players listed
      await expect(player3Page.getByRole('button', { name: 'Join Game' })).toBeVisible();
      await expect(player3Page.getByRole('button', { name: 'Join Game' })).toBeEnabled();
      // Join screen should not show any players
      await expect(player3Page.getByText('Alice')).not.toBeVisible();
      await expect(player3Page.getByText('Bob')).not.toBeVisible();

      // ============================================================
      // ACT: Player 3 joins game
      // ============================================================
      await player3Page.getByRole('button', { name: 'Join Game' }).click();

      // ============================================================
      // ASSERT: Player 3 sees game lobby with all 3 players
      // ============================================================
      await expect(player3Page.getByText('Game Lobby')).toBeVisible();
      await expect(player3Page.getByText('Alice')).toBeVisible();
      await expect(player3Page.getByText('Bob')).toBeVisible();
      await expect(player3Page.getByText('Charlie').first()).toBeVisible();

      // ============================================================
      // ASSERT: Other players see Charlie join (real-time update)
      // ============================================================
      await expect(player1Page.getByText('Charlie')).toBeVisible();
      await expect(player2Page.getByText('Charlie')).toBeVisible();

      // ============================================================
      // ASSERT: Host sees all 3 players in Player Control panel
      // ============================================================
      await expect(hostPage.getByText('Total Players: 3')).toBeVisible();
      await expect(hostPage.getByText('Charlie')).toBeVisible();

      // ============================================================
      // SUCCESS! 🎉
      // ============================================================
    } finally {
      // Save console logs and clean up
      hostLogger.save();
      player1Logger.save();
      player2Logger.save();
      player3Logger.save();

      await hostContext.close();
      await player1Context.close();
      await player2Context.close();
      await player3Context.close();
    }
  });

  /**
   * Test 1.2: Player Joins After Game Starts
   *
   * This test validates that players cannot join a game that has already started:
   * - Player 2 sees "Waiting for Game" button disabled
   * - Host does not see Player 2 in player list
   */
  test('should prevent player from joining after game starts', async ({ browser }) => {
    // ============================================================
    // SETUP: Create browser contexts for host and 2 players
    // ============================================================
    const hostContext = await browser.newContext();
    const hostPage = await hostContext.newPage();
    const hostLogger = startConsoleLogger(hostPage, 'join-after-start-host');

    const player1Context = await browser.newContext();
    const player1Page = await player1Context.newPage();
    const player1Logger = startConsoleLogger(player1Page, 'join-after-start-player1');

    const player2Context = await browser.newContext();
    const player2Page = await player2Context.newPage();
    const player2Logger = startConsoleLogger(player2Page, 'join-after-start-player2');

    try {
      // ============================================================
      // ARRANGE: Host creates game
      // ============================================================
      await hostPage.goto('/');
      await hostPage.getByPlaceholder('Email').fill(TEST_USERS.host.email);
      await hostPage.getByPlaceholder('Password').fill(TEST_USERS.host.password);
      await hostPage.getByRole('button', { name: 'Login' }).click();
      await expect(hostPage.getByText('Currently logged in as')).toBeVisible();

      const clueSetDropdown = hostPage.getByRole('combobox');
      await expect(clueSetDropdown).toBeVisible();
      await clueSetDropdown.selectOption({ index: 1 });
      await hostPage.getByText('Host Game').click();
      await expect(hostPage.getByText('Game Host Dashboard')).toBeVisible();

      // ============================================================
      // ARRANGE: Player 1 logs in and joins game
      // ============================================================
      await player1Page.goto('/');
      await player1Page.getByPlaceholder('Email').fill(TEST_USERS.player1.email);
      await player1Page.getByPlaceholder('Password').fill(TEST_USERS.player1.password);
      await player1Page.getByRole('button', { name: 'Login' }).click();
      await expect(player1Page.getByText('Currently logged in as')).toBeVisible();

      // Set nickname - wait for default to load, then replace it
      const player1NicknameInput = player1Page.getByPlaceholder('Your display name for this game...');
      // Wait for the input to have any value (profile loaded)
      await expect(player1NicknameInput).not.toHaveValue('');
      await player1NicknameInput.clear();
      await player1NicknameInput.fill('Alice');
      await expect(player1NicknameInput).toHaveValue('Alice');

      await player1Page.getByRole('button', { name: 'Join Game' }).click();
      await expect(player1Page.getByText('Game Lobby')).toBeVisible();

      // ============================================================
      // ACT: Host starts game
      // ============================================================
      await hostPage.getByRole('button', { name: 'Start Game' }).click();

      // Wait for game to start (status changes from 'lobby')
      await expect(hostPage.getByText('Game Host Dashboard')).toBeVisible();
      // Game should no longer be in lobby status

      // ============================================================
      // ARRANGE: Player 2 logs in after game has started
      // ============================================================
      await player2Page.goto('/');
      await player2Page.getByPlaceholder('Email').fill(TEST_USERS.player2.email);
      await player2Page.getByPlaceholder('Password').fill(TEST_USERS.player2.password);
      await player2Page.getByRole('button', { name: 'Login' }).click();
      await expect(player2Page.getByText('Currently logged in as')).toBeVisible();

      // ============================================================
      // ASSERT: Player 2 sees "Waiting for Game" button disabled
      // ============================================================
      await expect(player2Page.getByRole('button', { name: 'Waiting for Game' })).toBeVisible();
      await expect(player2Page.getByRole('button', { name: 'Waiting for Game' })).toBeDisabled();

      // ============================================================
      // ASSERT: Host does not see Player 2 in player list
      // ============================================================
      await expect(hostPage.getByText('Total Players: 1')).toBeVisible();
      await expect(hostPage.getByText('Alice')).toBeVisible();
      // Player 2 should not appear (they haven't set a nickname, so no text to check)

      // ============================================================
      // SUCCESS! 🎉
      // ============================================================
    } finally {
      hostLogger.save();
      player1Logger.save();
      player2Logger.save();

      await hostContext.close();
      await player1Context.close();
      await player2Context.close();
    }
  });

  /**
   * Test 1.3: Host Starts Game with No Players
   *
   * This test validates that the host cannot start a game without any players:
   * - "Start Game" button is disabled
   * - Game status remains "lobby"
   */
  test('should prevent host from starting game without players', async ({ page }) => {
    const logger = startConsoleLogger(page, 'start-without-players');

    try {
      // ============================================================
      // ARRANGE: Host creates game
      // ============================================================
      await page.goto('/');
      await page.getByPlaceholder('Email').fill(TEST_USERS.host.email);
      await page.getByPlaceholder('Password').fill(TEST_USERS.host.password);
      await page.getByRole('button', { name: 'Login' }).click();
      await expect(page.getByText('Currently logged in as')).toBeVisible();

      const clueSetDropdown = page.getByRole('combobox');
      await expect(clueSetDropdown).toBeVisible();
      await clueSetDropdown.selectOption({ index: 1 });
      await page.getByText('Host Game').click();
      await expect(page.getByText('Game Host Dashboard')).toBeVisible();

      // ============================================================
      // ASSERT: "Start Game" button is disabled
      // ============================================================
      const startButton = page.getByRole('button', { name: 'Start Game' });
      await expect(startButton).toBeVisible();
      await expect(startButton).toBeDisabled();

      // ============================================================
      // ASSERT: Message indicates minimum player requirement
      // ============================================================
      // Look for text that indicates no players have joined
      await expect(page.getByText('No players joined yet')).toBeVisible();
      await expect(page.getByText('Total Players: 0')).toBeVisible();

      // ============================================================
      // SUCCESS! 🎉
      // ============================================================
    } finally {
      logger.save();
    }
  });
});
