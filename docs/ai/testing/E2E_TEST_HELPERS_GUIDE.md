# E2E Test Helpers Guide

## Overview

The `e2e/fixtures/test-helpers.ts` file contains reusable helper functions that make E2E tests more readable and maintainable. This follows the **Page Object Model (POM)** pattern, a Playwright best practice.

## Benefits

✅ **Readability** - Tests read like plain English  
✅ **Maintainability** - UI changes only require updating helpers  
✅ **Consistency** - Same behavior across all tests  
✅ **DRY** - Don't Repeat Yourself  
✅ **Faster** - Write new tests quickly

## Quick Reference

### Authentication & User Setup

```typescript
// Log in as any user
await loginAs(page, 'user@example.com', '1234');

// Set player nickname (waits for profile to load)
await setNickname(page, 'Alice');

// Log in AND set nickname in one call
await loginAsPlayer(page, 'player1@example.com', 'Alice');
```

### Game Creation & Lobby

```typescript
// Host creates game (logs in, selects clue set, creates game)
await createGameAsHost(hostPage);

// Player joins game (clicks Join Game button, waits for lobby)
await joinGame(playerPage);

// Complete workflow: login + nickname + join
await loginAndJoinAs(playerPage, 'player1@example.com', 'Alice');
```

### Game Flow & Navigation

```typescript
// Skip through intro animations (game intro, category reveals, etc.)
await skipIntroAnimations(hostPage);

// Start game and skip all intros
await startGameAndSkipIntro(hostPage);

// Wait for game board to appear
await waitForGameBoard(playerPage);
```

### Buzzer System

```typescript
// Host selects a clue (defaults to first clue)
await selectClue(hostPage, 0);

// Host unlocks buzzer
await unlockBuzzer(hostPage);

// Player buzzes in
await buzzIn(playerPage);

// Host marks answer
await markCorrect(hostPage);
await markWrong(hostPage);
```

### Complete Workflows

```typescript
// Setup game with host and players in lobby
await setupGameWithPlayers(
  hostPage,
  [player1Page, player2Page],
  ['Alice', 'Bob']
);

// Setup game and get to in_progress state with board visible
await setupGameInProgress(
  hostPage,
  [player1Page, player2Page],
  ['Alice', 'Bob']
);
```

## Before & After Examples

### Example 1: Player Login and Join

**Before (36 lines):**
```typescript
await player1Page.goto('/');
await player1Page.getByPlaceholder('Email').fill(TEST_USERS.player1.email);
await player1Page.getByPlaceholder('Password').fill(TEST_USERS.player1.password);
await player1Page.getByRole('button', { name: 'Login' }).click();
await expect(player1Page.getByText('Currently logged in as')).toBeVisible();

const nicknameInput = player1Page.getByPlaceholder('Your display name for this game...');
await expect(nicknameInput).not.toHaveValue('');
await nicknameInput.fill('');
await nicknameInput.fill('Alice');
await expect(nicknameInput).toHaveValue('Alice');

await player1Page.getByRole('button', { name: 'Join Game' }).click();
await expect(player1Page.getByText('Game Lobby')).toBeVisible();
```

**After (1 line):**
```typescript
await loginAndJoinAs(player1Page, TEST_USERS.player1.email, 'Alice');
```

### Example 2: Host Creates Game

**Before (14 lines):**
```typescript
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
```

**After (1 line):**
```typescript
await createGameAsHost(hostPage);
```

### Example 3: Complete Game Setup

**Before (80+ lines):**
```typescript
// Host logs in
await hostPage.goto('/');
await hostPage.getByPlaceholder('Email').fill(TEST_USERS.host.email);
// ... 10 more lines ...

// Player 1 logs in
await player1Page.goto('/');
await player1Page.getByPlaceholder('Email').fill(TEST_USERS.player1.email);
// ... 15 more lines ...

// Player 2 logs in
await player2Page.goto('/');
await player2Page.getByPlaceholder('Email').fill(TEST_USERS.player2.email);
// ... 15 more lines ...

// Host creates game
const clueSetDropdown = hostPage.getByRole('combobox');
// ... 5 more lines ...

// Players join
await player1Page.getByRole('button', { name: 'Join Game' }).click();
// ... 10 more lines ...
```

**After (5 lines):**
```typescript
await setupGameWithPlayers(
  hostPage,
  [player1Page, player2Page],
  ['Alice', 'Bob']
);
```

## Refactoring Checklist

When refactoring existing tests, look for these patterns:

### ✅ Login Sequences
```typescript
// Replace this:
await page.goto('/');
await page.getByPlaceholder('Email').fill(email);
await page.getByPlaceholder('Password').fill(password);
await page.getByRole('button', { name: 'Login' }).click();
await expect(page.getByText('Currently logged in as')).toBeVisible();

// With this:
await loginAs(page, email, password);
```

### ✅ Nickname Setting
```typescript
// Replace this:
const nicknameInput = page.getByPlaceholder('Your display name for this game...');
await expect(nicknameInput).not.toHaveValue('');
await nicknameInput.fill('');
await nicknameInput.fill('Alice');
await expect(nicknameInput).toHaveValue('Alice');

// With this:
await setNickname(page, 'Alice');
```

### ✅ Game Creation
```typescript
// Replace this:
await hostPage.goto('/');
// ... login code ...
const clueSetDropdown = hostPage.getByRole('combobox');
await expect(clueSetDropdown).toBeVisible();
await clueSetDropdown.selectOption({ index: 1 });
await hostPage.getByText('Host Game').click();
await expect(hostPage.getByText('Game Host Dashboard')).toBeVisible();

// With this:
await createGameAsHost(hostPage);
```

### ✅ Joining Game
```typescript
// Replace this:
const joinButton = page.getByRole('button', { name: 'Join Game' });
await expect(joinButton).toBeEnabled({ timeout: 5000 });
await joinButton.click();
await expect(page.getByText('Game Lobby')).toBeVisible();

// With this:
await joinGame(page);
```

## Adding New Helpers

When you find yourself repeating the same sequence of actions, consider adding a new helper:

1. **Identify the pattern** - What actions are repeated?
2. **Name it clearly** - Use descriptive names that read like English
3. **Add parameters** - Make it flexible with optional parameters
4. **Document it** - Add JSDoc comments explaining what it does
5. **Add to this guide** - Update the Quick Reference section

### Example: Adding a New Helper

```typescript
/**
 * Enter wager for Daily Double
 * 
 * @param playerPage - Player's Playwright page object
 * @param wagerAmount - Amount to wager
 */
export async function enterDailyDoubleWager(
  playerPage: Page,
  wagerAmount: number
): Promise<void> {
  const wagerInput = playerPage.getByPlaceholder('Enter wager amount');
  await expect(wagerInput).toBeVisible({ timeout: 5000 });
  await wagerInput.fill(wagerAmount.toString());
  await playerPage.getByRole('button', { name: 'Submit Wager' }).click();
}
```

## Next Steps

1. **Refactor remaining test files** using these helpers:
   - `buzzer-system.e2e.ts`
   - `game-intro-board.e2e.ts`
   - `daily-double.e2e.ts`
   - `round-transition.e2e.ts`
   - `final-jeopardy.e2e.ts`

2. **Add new helpers** as you find repeated patterns

3. **Update this guide** when adding new helpers

## Tips

- **Start small** - Refactor one test at a time
- **Test as you go** - Run tests after refactoring to ensure they still work
- **Look for patterns** - If you copy-paste code, it should probably be a helper
- **Keep helpers focused** - Each helper should do one thing well
- **Use descriptive names** - `loginAndJoinAs()` is better than `setup()`

## Impact

After refactoring `game-setup-lobby.e2e.ts`:
- **Lines of code**: 407 → 313 (23% reduction)
- **Readability**: Significantly improved
- **Maintainability**: Much easier to update
- **Test writing speed**: Much faster

Similar improvements expected for other test files! 🚀

