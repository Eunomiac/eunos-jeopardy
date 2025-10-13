# E2E Test Helper Audit Patterns

This document lists "red flag" patterns that indicate a helper function should be used instead of manual code.

## Authentication & User Setup

### `loginAs(page, email, password)`
**Red Flag Pattern:** `getByPlaceholder('Email')`
**What it does:** Logs in a user with email/password
**Lines:** 49-59

### `setNickname(page, nickname)`
**Red Flag Pattern:** `getByPlaceholder('Your display name for this game...')`
**What it does:** Sets player nickname after login
**Lines:** 70-79

### `loginAsPlayer(page, email, nickname, password)`
**Red Flag Pattern:** Manual sequence of `loginAs()` + `setNickname()`
**What it does:** Logs in and sets nickname in one call
**Lines:** 90-98
**Note:** This is composed from loginAs + setNickname, so if we see both called sequentially, we should use this instead

## Browser Context Setup

### `createTestContext(browser, numPlayers, testName)`
**Red Flag Pattern:** `browser.newContext()` followed by `newPage()` and `startConsoleLogger()`
**What it does:** Creates host + player contexts with logging
**Lines:** 113-146

### `cleanupTestContext(ctx)`
**Red Flag Pattern:** Manual `logger.save()` + `context.close()` in finally blocks
**What it does:** Saves logs, coverage, and closes all contexts
**Lines:** 154-168

## Game Creation & Lobby

### `createGame(page, clueSetIndex)`
**Red Flag Pattern:** `getByRole('combobox')` followed by `selectOption()` and `getByText('Host Game')`
**What it does:** Creates game (assumes already logged in)
**Lines:** 181-190

### `createGameAsHost(page, clueSetIndex)`
**Red Flag Pattern:** Manual sequence of `loginAs()` + `createGame()`
**What it does:** Logs in as host and creates game
**Lines:** 199-205

### `joinGame(page)`
**Red Flag Pattern:** `getByRole('button', { name: 'Join Game' })` followed by click and lobby assertion
**What it does:** Joins game as player
**Lines:** 213-218

### `loginAndJoinAs(page, email, nickname)`
**Red Flag Pattern:** Manual sequence of `loginAsPlayer()` + `joinGame()`
**What it does:** Complete player flow from login to lobby
**Lines:** 228-235

## Game Flow & Navigation

### `skipIntroAnimations(page, maxClicks)`
**Red Flag Pattern:** Loop clicking buttons with names like `/Next|Continue|Start|Introduce/i`
**What it does:** Skips through intro screens
**Lines:** 250-263

### `startGameAndSkipIntro(hostPage)`
**Red Flag Pattern:** `getByRole('button', { name: 'Start Game' })` followed by `skipIntroAnimations()`
**What it does:** Starts game and skips to board
**Lines:** 272-276

### `waitForGameBoard(page, timeout)`
**Red Flag Pattern:** `expect(page.locator('.game-board')).toBeVisible()`
**What it does:** Waits for board to appear
**Lines:** 284-289

## Buzzer System

### `selectClue(hostPage, clueIndex)`
**Red Flag Pattern:** `locator('.clue-cell, .board-cell').nth()` followed by click
**What it does:** Selects a clue on the board
**Lines:** 301-309

### `unlockBuzzer(hostPage)`
**Red Flag Pattern:** `getByRole('button', { name: /Unlock Buzzer|Enable Buzzer/i })`
**What it does:** Unlocks buzzer for players
**Lines:** 316-320

### `buzzIn(playerPage)`
**Red Flag Pattern:** `locator('.buzzer-button, button[class*="buzzer"]')` followed by click
**What it does:** Player buzzes in
**Lines:** 327-331

### `markCorrect(hostPage)`
**Red Flag Pattern:** `getByRole('button', { name: /Correct|✓|Award/i })`
**What it does:** Host marks answer correct
**Lines:** 338-342

### `markWrong(hostPage)`
**Red Flag Pattern:** `getByRole('button', { name: /Wrong|✗|Incorrect/i })`
**What it does:** Host marks answer wrong
**Lines:** 349-353

## Complete Workflows

### `setupGameWithPlayers(hostPage, playerPages, playerNicknames)`
**Red Flag Pattern:** Manual sequence of player logins + host creates game + players join
**What it does:** Complete setup to lobby state
**Lines:** 370-395

### `setupGameInProgress(hostPage, playerPages, playerNicknames)`
**Red Flag Pattern:** `setupGameWithPlayers()` + `startGameAndSkipIntro()` + `waitForGameBoard()`
**What it does:** Complete setup to in-progress state with board visible
**Lines:** 405-413

### `setupTestWithLobby(browser, playerNicknames, testName)`
**Red Flag Pattern:** `createTestContext()` + `setupGameWithPlayers()`
**What it does:** Complete workflow from browser to lobby
**Lines:** 424-432

### `setupTestInProgress(browser, playerNicknames, testName)`
**Red Flag Pattern:** `createTestContext()` + `setupGameInProgress()`
**What it does:** Complete workflow from browser to in-progress game
**Lines:** 443-451

---

## Search Strategy

For each pattern above, search the `e2e/smoke/` directory for occurrences.
If found outside of `test-helpers.ts`, investigate whether the helper should be used instead.

**Priority Order:**
1. High-level workflows (setupTestInProgress, setupTestWithLobby) - biggest impact
2. Context management (createTestContext, cleanupTestContext) - critical for coverage
3. Authentication flows (loginAsPlayer, createGameAsHost) - common patterns
4. Atomic helpers (selectClue, unlockBuzzer, etc.) - smaller but still valuable

If it is determined that a helper is not needed, add it to the "Justified Exception" section below.

---

## Justified Exceptions

### **Race Condition Test (buzzer-system.e2e.ts:120-124)**
- Uses manual `.buzzer-button` locators instead of `buzzIn()` helper
- **Reason:** Test validates race condition handling by using `Promise.all()` to trigger truly simultaneous buzzer clicks. Using the helper would add abstraction that might mask timing issues.
- **Documentation:** Explanatory comment in code