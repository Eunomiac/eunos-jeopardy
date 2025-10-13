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

---

## Audit Results

### ✅ PASS: All Tests Use Helpers Consistently
- `getByPlaceholder('Email')` - All logins use `loginAs()` helper
- `getByPlaceholder('Your display name')` - All nickname setting uses `setNickname()` helper
- `browser.newContext()` - All context creation uses `createTestContext()` helper
- `getByRole('combobox')` - All game creation uses `createGame()` helper
- `.clue-cell` locator - All clue selection uses `selectClue()` helper
- `Unlock Buzzer` button - All uses `unlockBuzzer()` helper
- `Correct|✓` button - All uses `markCorrect()` helper
- `Wrong|✗` button - All uses `markWrong()` helper

### ✅ RESOLVED: Issues Fixed During Audit

#### Manual Clue Selection → Now Uses `selectClue()`
- ✅ **game-intro-board.e2e.ts:107-119** - Replaced manual `.clue-cell` locator with `selectClue(hostPage, 0)`
- ✅ **round-transition.e2e.ts:67-70** - Replaced manual `.clue-cell` locator in loop with `selectClue(hostPage, i)`
- ✅ **round-transition.e2e.ts:132-133** - Replaced manual `.clue-cell` locator with `selectClue(hostPage, 0)`

### ✅ JUSTIFIED EXCEPTION: Intentional Manual Code

#### Race Condition Test - Manual Buzzer Clicks
- **buzzer-system.e2e.ts:120-124** - Manual `.buzzer-button` locators for simultaneous clicks
- **Justification:** Test specifically validates race condition handling by using `Promise.all()` to trigger truly simultaneous buzzer clicks from two players. Using the `buzzIn()` helper would add unnecessary abstraction that might mask timing issues.
- **Documentation:** Added explanatory comment in code explaining why helper isn't used
- **Status:** This is the ONLY place in all 8 test files where manual locators are intentionally used instead of helpers
