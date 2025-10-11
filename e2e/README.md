# End-to-End (E2E) Tests

This directory contains **integration tests** that validate complete user journeys through the application using Playwright.

## What Are E2E Tests?

**End-to-End tests** simulate real user interactions by:
- Opening an actual browser (Chrome, Firefox, Safari)
- Navigating to your application
- Clicking buttons, filling forms, and interacting with the UI
- Verifying that the application behaves correctly

**Example**: An E2E test might log in as a host, create a game, have a player join, select a clue, and verify the clue appears for both users.

## When to Use E2E Tests vs Unit Tests

### Use E2E Tests For:
- ✅ Complete user workflows (login → create game → play → score)
- ✅ Real-time synchronization (host actions → player sees updates)
- ✅ Multi-user interactions (host + multiple players)
- ✅ Animation and visual feedback
- ✅ Integration with external services (Supabase)

### Use Unit Tests For:
- ✅ Individual functions and utilities
- ✅ Component rendering and props
- ✅ Business logic and calculations
- ✅ Data transformations and validation

**Rule of Thumb**: If you can test it with a unit test, do that. E2E tests are slower and more complex, so save them for things that require a real browser and complete system integration.

## Directory Structure

```
e2e/
├── README.md                 # This file
├── smoke/                    # Quick tests for critical paths
│   ├── host-creates-game.e2e.ts
│   ├── player-joins-game.e2e.ts
│   └── basic-clue-interaction.e2e.ts
├── game-flow/                # Complete game scenarios (Phase 2)
│   ├── full-round-progression.e2e.ts
│   ├── buzzer-system.e2e.ts
│   └── daily-double.e2e.ts
├── fixtures/                 # Test data and utilities
│   ├── test-users.ts         # Test user credentials
│   ├── test-clue-sets.ts     # Sample clue sets for testing
│   └── auth-helpers.ts       # Authentication utilities
└── pages/                    # Page Object Model (Phase 2)
    ├── LoginPage.ts
    ├── GameHostDashboard.ts
    └── PlayerDashboard.ts
```

**Note**: Test files use `.e2e.ts` extension (not `.spec.ts`) to clearly distinguish them from unit tests and prevent Jest from trying to run them.

## Running Tests

### Prerequisites
**None!** Playwright automatically manages the dev server for you.

When you run tests, Playwright will:
1. Check if dev server is running on `http://localhost:5173`
2. If not running, automatically start `npm run dev`
3. Wait for server to be ready
4. Run tests
5. Keep server running (so you can reuse it for next test run)

**Note**: Tests use the real Supabase backend, so ensure your `.env` file has valid credentials.

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npx playwright test smoke/host-creates-game.e2e.ts
```

### Run Tests in Headed Mode (Watch the Browser)
```bash
npx playwright test --headed
```

### Run Tests in Debug Mode (Step Through)
```bash
npx playwright test --debug
```

### View Test Report
```bash
npx playwright show-report
```

### Running in CI/CD (GitHub Actions)

**CI = Continuous Integration** - automated testing that runs when you push code to GitHub.

Playwright tests automatically run in GitHub Actions via `.github/workflows/playwright.yml`. When tests run in CI:
- Server starts fresh (not reused)
- Tests run in headless mode (no visible browser)
- Screenshots/videos saved for failed tests
- Test results reported in GitHub UI

**To view CI test results:**
1. Go to your GitHub repository
2. Click "Actions" tab
3. Click on a workflow run
4. View test results and download artifacts (screenshots, videos, traces)

## Test Structure

Every Playwright test follows this pattern:

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something specific', async ({ page }) => {
    // ARRANGE: Set up the test
    await page.goto('/');

    // ACT: Perform actions
    await page.getByRole('button', { name: 'Login' }).click();

    // ASSERT: Verify results
    await expect(page).toHaveURL('/dashboard');
  });
});
```

**Key concepts:**
- `test.describe()`: Groups related tests together
- `test()`: Defines a single test case
- `async ({ page })`: Every test gets a fresh browser page
- `await`: Playwright actions are asynchronous (they take time)
- `expect()`: Assertions that verify behavior

## Learning Resources

### Official Playwright Documentation
- **Getting Started**: https://playwright.dev/docs/intro
- **Writing Tests**: https://playwright.dev/docs/writing-tests
- **Best Practices**: https://playwright.dev/docs/best-practices
- **API Reference**: https://playwright.dev/docs/api/class-playwright

### Key Concepts to Learn
1. **Selectors**: How to find elements on the page
2. **Actions**: Clicking, typing, navigating
3. **Assertions**: Verifying expected behavior
4. **Async/Await**: Handling asynchronous operations
5. **Test Isolation**: Each test runs independently
6. **Page Object Model**: Organizing test code (Phase 2)

## Current Status

**Phase**: Phase 1 - Foundation & Basics
**Progress**: Configuration complete, ready for first test

### Phase 1 Checklist
- [x] Playwright configuration created
- [x] Test directory structure set up
- [ ] First smoke test: Host creates game
- [ ] Second smoke test: Player joins game
- [ ] Third smoke test: Basic clue interaction
- [ ] Tests running in CI

## Tips for Writing Good E2E Tests

### ✅ DO:
- Use accessibility-first selectors (`getByRole`, `getByLabel`)
- Write independent tests (each test should work alone)
- Test user journeys, not implementation details
- Use meaningful test names that describe behavior
- Add comments explaining complex interactions

### ❌ DON'T:
- Rely on CSS classes or IDs (they change frequently)
- Make tests depend on each other (test order shouldn't matter)
- Test every possible scenario (focus on critical paths)
- Ignore flaky tests (fix them or remove them)
- Over-use `page.waitForTimeout()` (use proper waiting strategies)

## Debugging Failed Tests

When a test fails:

1. **Look at the error message**: What assertion failed?
2. **Check the screenshot**: What did the page look like?
3. **View the trace**: `npx playwright show-trace test-results/.../trace.zip`
4. **Run in debug mode**: `npx playwright test --debug`
5. **Add `await page.pause()`**: Stops execution so you can inspect

## Questions?

This is a learning exercise! If you're confused about:
- Why a test is structured a certain way
- What a Playwright API does
- How to test a specific scenario
- Debugging strategies

**Just ask!** The goal is understanding, not just passing tests.
