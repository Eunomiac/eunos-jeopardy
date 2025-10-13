# E2E Test Architecture Guide

## Overview
All E2E tests use composed helper functions to maximize DRY principles and maintainability. Coverage is automatically collected from all tests.

## Coverage Collection

Coverage is automatically saved by the `cleanupTestContext()` helper:
- Saves coverage from all pages (host + players)
- Works even if tests fail (as long as `finally` block runs)
- No manual coverage saving needed in individual tests
- Coverage is merged with Jest coverage by `scripts/merge-coverage.js`

---

---

## Helper Architecture

### Three-Level Hierarchy

#### Level 1: Atomic Helpers
Single-purpose functions that do ONE thing:
- `loginAs()`, `setNickname()`, `createGame()`, `joinGame()`
- `selectClue()`, `unlockBuzzer()`, `buzzIn()`, `markCorrect()`, `markWrong()`

#### Level 2: Composed Helpers
Built from atomic helpers:
- `loginAsPlayer()` = `loginAs()` + `setNickname()`
- `createGameAsHost()` = `loginAs()` + `createGame()`
- `loginAndJoinAs()` = `loginAsPlayer()` + `joinGame()`

#### Level 3: Complete Workflows
Full test setup from browser to game state:
- `setupTestWithLobby()` = context + players + host + lobby
- `setupTestInProgress()` = context + players + host + lobby + start + board

### Benefits
- **Readability**: Tests read like plain English
- **Maintainability**: UI changes only require updating helpers
- **Consistency**: Same behavior across all tests
- **DRY**: Zero code duplication

---

## Writing Tests: Pattern Examples

**Most tests should use `setupTestInProgress()` or `setupTestWithLobby()`:**

```typescript
test('should complete buzzer flow', async ({ browser }) => {
  // Setup: Creates contexts, logs in players, creates game, starts game, reaches board
  const ctx = await setupTestInProgress(browser, ['Alice', 'Bob'], 'buzzer-test');

  try {
    const { hostPage, playerPages } = ctx;
    const [player1Page, player2Page] = playerPages;

    // Test-specific logic using atomic helpers
    await selectClue(hostPage, 0);
    await unlockBuzzer(hostPage);
    await buzzIn(player1Page);
    await markCorrect(hostPage);

  } finally {
    // Cleanup: Saves logs, saves coverage, closes contexts
    await cleanupTestContext(ctx);
  }
});
```

### Using Atomic Helpers for Custom Flows

**For tests that need custom setup:**

```typescript
test('should handle custom flow', async ({ browser }) => {
  const ctx = await createTestContext(browser, 2, 'custom-test');

  try {
    const { hostPage, playerPages } = ctx;
    const [player1Page, player2Page] = playerPages;

    // Custom setup using atomic helpers
    await loginAsPlayer(player1Page, TEST_USERS.player1.email, 'Alice');
    await loginAsPlayer(player2Page, TEST_USERS.player2.email, 'Bob');
    await createGameAsHost(hostPage);
    await joinGame(player1Page);
    await joinGame(player2Page);

    // Custom test logic
    // ...

  } finally {
    await cleanupTestContext(ctx);
  }
});
```

### Single-Page Tests

**For tests that don't need multiple contexts:**

```typescript
test('should allow host to create game', async ({ page }) => {
  await loginAs(page, TEST_USERS.host.email);
  await createGame(page, 1);

  await expect(page.getByText('Game Host Dashboard')).toBeVisible();
});
```

---

## Best Practices

### Always Use Helpers
- **Don't** write manual login/setup code
- **Do** use `setupTestInProgress()` or `setupTestWithLobby()` for most tests
- **Do** use atomic helpers (`selectClue()`, `unlockBuzzer()`, etc.) for test logic

### Always Use cleanupTestContext()
- **Don't** manually save logs or close contexts
- **Do** use `cleanupTestContext(ctx)` in `finally` blocks
- This ensures coverage is saved even if tests fail

### Document Exceptions
- If you need to use manual code instead of a helper, add a comment explaining why
- Add the exception to `e2e/HELPER_AUDIT_PATTERNS.md`

### Audit New Code
- When adding new helpers, add their "red flag" pattern to `HELPER_AUDIT_PATTERNS.md`
- Periodically search for these patterns to ensure consistency

---

## Reference Documentation

- **`e2e/fixtures/test-helpers.ts`** - All available helpers with JSDoc comments
- **`e2e/HELPER_AUDIT_PATTERNS.md`** - Patterns to search for when auditing tests
