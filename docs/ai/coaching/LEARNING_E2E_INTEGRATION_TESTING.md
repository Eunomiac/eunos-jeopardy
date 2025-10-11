# Learning E2E Integration Testing with Playwright

## Purpose of This Document

This document guides AI agents in teaching the user **end-to-end (E2E) integration testing** using Playwright. This is an **educational initiative** - the primary goal is **learning industry-standard testing practices**, not just achieving coverage metrics.

### Educational Context

**User's Learning Goals:**
- Develop industry-standard coding abilities
- Learn modern E2E testing frameworks (Playwright)
- Understand when and how to use integration tests vs unit tests
- Gain practical experience with real-time application testing
- Learn DevOps skills (coverage integration, CI/CD)

**Teaching Philosophy:**
- **Collaborative learning**: Agent implements features while explaining each step
- **Small incremental steps**: Complete one concept at a time
- **Understanding over speed**: Ensure comprehension before moving forward
- **Practical application**: Learn by solving real problems in this project
- **Progressive complexity**: Start simple, build to advanced topics

**Project Context:**
- This is a real-time multiplayer Jeopardy game with complex interactions
- Current coverage: 81.75% (excellent unit test coverage)
- Remaining 8.25% gap is in code better suited for E2E testing:
  - Real-time subscription handlers (Supabase Realtime, broadcast channels)
  - Animation coordination (GSAP, DOM manipulation)
  - Complex UI state management (multi-step game flows)

## Why This Project is Ideal for Learning E2E Testing

### Real-World Complexity
- **Multi-user real-time interactions**: Host and players synchronizing through Supabase
- **Complex user flows**: Game creation → joining → buzzer system → scoring
- **Multiple user roles**: Host vs player perspectives
- **External dependencies**: Real Supabase backend (not mocked)
- **Visual feedback**: Animations and UI state changes

### Industry-Relevant Skills
- Playwright (rapidly becoming industry standard)
- Multi-user scenario testing (specialized skill)
- Real-time application testing (valuable and rare)
- Test pyramid understanding (unit → integration → E2E)
- DevOps integration (coverage merging, CI/CD)

## Teaching Plan: Three-Phase Approach

### Phase 1: Foundation & Basics (4-8 hours)
**Status**: 🔵 Ready to Start
**Goal**: Get comfortable with Playwright fundamentals

#### Learning Objectives
- Understand what E2E tests are and when to use them
- Learn Playwright configuration and project structure
- Write basic selectors and assertions
- Understand async/await patterns in testing
- Run tests locally and see them pass

#### Implementation Steps

**Step 1.1: Playwright Configuration Setup**
- Create `playwright.config.ts` with sensible defaults
- Explain each configuration option and why it matters
- Set up test directory structure (`e2e/` folder)
- Configure for local development (headed mode for visibility)

**Concepts to teach:**
- What is a test configuration file?
- Browser contexts and isolation
- Base URL and test environment setup
- Headed vs headless mode (when to use each)

**Step 1.2: First Smoke Test - Host Creates Game**
- Write test: Host logs in → creates game → sees dashboard
- Explain test structure (describe, test, expect)
- Teach selector strategies (data-testid, role-based, text-based)
- Show how to wait for elements and async operations

**Concepts to teach:**
- Test anatomy (arrange, act, assert)
- Selector best practices (accessibility-first)
- Async handling and waiting strategies
- Why smoke tests are valuable

**Step 1.3: Second Smoke Test - Player Joins Game**
- Write test: Player joins with game code → sees lobby
- Introduce multi-context testing (host + player simultaneously)
- Explain test data management (creating test users, games)

**Concepts to teach:**
- Multi-user testing patterns
- Test isolation and cleanup
- Managing test data
- Parallel contexts in Playwright

**Step 1.4: Third Smoke Test - Basic Clue Interaction**
- Write test: Host selects clue → clue reveals → host adjudicates
- Test real-time synchronization (player sees clue reveal)
- Introduce assertions for complex state

**Concepts to teach:**
- Testing real-time updates
- Complex assertions (multiple conditions)
- Debugging failed tests
- Screenshot and trace collection

**Step 1.5: Running Tests in CI**
- Add Playwright to GitHub Actions workflow
- Explain CI/CD test execution (CI = Continuous Integration - automated testing on GitHub)
- Show how to view test results and artifacts in GitHub UI

**Concepts to teach:**
- **CI/CD basics**: Automated testing that runs when you push code to GitHub
- **GitHub Actions**: GitHub's built-in CI/CD system (free for public repos)
- **Headless execution**: Tests run without visible browser in CI (faster, no GUI needed)
- **Artifact collection**: Screenshots, videos, and traces saved for debugging failures
- **When tests should block deployment**: Failed tests prevent merging/deploying broken code

#### Phase 1 Completion Criteria
- [ ] 3 smoke tests written and passing
- [ ] User understands test structure and selectors
- [ ] Tests run locally and in CI
- [ ] User can debug a failing test
- [ ] User understands when to use E2E vs unit tests

---

### Phase 2: Advanced Scenarios (8-12 hours)
**Status**: 🟡 After Issue #5b (Final Jeopardy complete)
**Goal**: Test complex real-time interactions and complete game flows

#### Learning Objectives
- Test complete user journeys (full game rounds)
- Handle complex multi-user scenarios
- Validate real-time synchronization
- Manage test data and state effectively
- Write maintainable, resilient tests

#### Implementation Steps

**Step 2.1: Full Round Progression Test**
- Test: Complete Jeopardy round → Double Jeopardy → Final Jeopardy
- Teach test organization (page objects, helper functions)
- Explain how to handle long-running tests

**Concepts to teach:**
- Page Object Model pattern
- Test helper functions and utilities
- Managing long test execution
- When to split tests vs keep them integrated

**Step 2.2: Multi-Player Buzzer System Test**
- Test: 3+ players buzz in → queue management → adjudication
- Teach parallel context management
- Explain timing and race condition handling

**Concepts to teach:**
- Testing race conditions
- Parallel execution and synchronization
- Timing assertions (reaction times, delays)
- Flaky test prevention strategies

**Step 2.3: Daily Double Flow Test**
- Test: Daily Double reveal → wager entry → answer → scoring
- Teach form interaction and validation
- Explain animation testing strategies

**Concepts to teach:**
- Form testing patterns
- Animation and transition testing
- Visual validation techniques
- When to use visual regression testing

**Step 2.4: Real-Time Synchronization Test**
- Test: Host actions → verify all players see updates
- Teach comprehensive state validation
- Explain performance testing basics

**Concepts to teach:**
- Real-time validation patterns
- State synchronization testing
- Performance assertions (load times, update delays)
- Network condition simulation

**Step 2.5: Test Refactoring and Maintenance**
- Refactor tests using Page Object Model
- Create shared fixtures and utilities
- Explain test maintenance strategies

**Concepts to teach:**
- Test code quality and DRY principles
- Fixture management
- Test data builders
- Balancing test independence vs efficiency

#### Phase 2 Completion Criteria
- [ ] Complete game flow tests written
- [ ] Multi-user scenarios working reliably
- [ ] Tests use Page Object Model pattern
- [ ] User understands test maintenance strategies
- [ ] User can write new tests independently

---

### Phase 3: Production Readiness (8-16 hours)
**Status**: 🟢 Phase 4 Prep (before public release)
**Goal**: Professional-grade test infrastructure and DevOps integration

#### Learning Objectives
- Integrate E2E coverage with Jest/SonarQube
- Implement visual regression testing
- Optimize test execution and CI/CD pipeline
- Understand production testing strategies
- Learn monitoring and reporting

#### Implementation Steps

**Step 3.1: Coverage Integration**
- Configure Playwright to collect code coverage
- Set up coverage merging (Playwright + Jest)
- Integrate merged coverage with SonarQube

**Concepts to teach:**
- How coverage instrumentation works
- Coverage merging strategies and tools
- SonarQube integration
- Coverage metrics interpretation

**Step 3.2: Visual Regression Testing**
- Set up visual comparison testing
- Create baseline screenshots
- Explain when visual testing adds value

**Concepts to teach:**
- Visual regression testing concepts
- Baseline management
- Handling intentional visual changes
- Cross-browser visual differences

**Step 3.3: Test Optimization**
- Implement test parallelization
- Add test sharding for CI
- Optimize test execution time

**Concepts to teach:**
- Parallel execution strategies
- Test sharding and distribution
- Caching and optimization techniques
- Cost/benefit of test speed vs reliability

**Step 3.4: Advanced CI/CD Integration**
- Set up test result reporting
- Configure failure notifications
- Implement test retry strategies

**Concepts to teach:**
- CI/CD best practices
- Test result reporting and dashboards
- Flaky test handling
- When to retry vs fix tests

**Step 3.5: Production Monitoring Integration**
- Connect E2E tests to monitoring (Sentry)
- Set up synthetic monitoring
- Explain production testing strategies

**Concepts to teach:**
- Synthetic monitoring concepts
- Production testing vs staging testing
- Error tracking integration
- Alerting and incident response

#### Phase 3 Completion Criteria
- [ ] Coverage integrated with SonarQube
- [ ] Visual regression testing implemented
- [ ] Tests optimized for CI/CD
- [ ] User understands production testing strategies
- [ ] Complete E2E testing infrastructure in place

---

## Teaching Guidelines for AI Agents

### Communication Style

**Explain, Then Implement:**
1. Explain what you're about to do and why
2. Implement the code
3. Walk through what you did
4. Ask if the user has questions or wants clarification

**Example:**
> "I'm going to create our first Playwright test for the host creating a game. This test will:
> - Navigate to the login page
> - Log in as a host user
> - Create a new game with a test clue set
> - Verify the game dashboard appears
>
> This is called a 'smoke test' - it validates the critical path works without testing every detail. Let me implement this..."
>
> [implement code]
>
> "Here's what I did:
> - Line 5: Used `page.goto()` to navigate - this is Playwright's navigation method
> - Line 8: Used `getByRole('button', { name: 'Login' })` - this is an accessibility-first selector
> - Line 12: Used `expect(page).toHaveURL()` - this verifies navigation succeeded
>
> Does this make sense? Any questions about the selector strategy or test structure?"

### Pacing

- **One concept per step**: Don't overwhelm with multiple new concepts
- **Check understanding**: Ask questions to verify comprehension
- **Encourage questions**: Create space for user to ask for clarification
- **Repeat key concepts**: Reinforce important patterns across multiple tests

### Hands-On Learning

- **Agent implements first**: Show the pattern
- **Explain the implementation**: Walk through the code
- **User observes and asks questions**: Ensure understanding
- **User tries similar task**: Apply the learning (optional, user-driven)

**This is NOT a "figure it out yourself" approach** - the agent should do the work while teaching the concepts.

### Debugging as Teaching

When tests fail (they will):
1. **Celebrate the failure**: "Great! This is a learning opportunity"
2. **Explain the error message**: What does it mean?
3. **Show debugging techniques**: How to investigate
4. **Fix together**: Walk through the solution
5. **Explain prevention**: How to avoid this in the future

### Progress Tracking

After each step:
- [ ] Summarize what was learned
- [ ] Confirm user understanding
- [ ] Preview next step
- [ ] Ask if user wants to continue or take a break

## Current Status

**Phase**: Phase 1 - Foundation & Basics
**Current Step**: Step 1.1 Complete ✅
**Next Step**: Step 1.2 - First Smoke Test (Host Creates Game)
**Prerequisites**:
- ✅ Playwright installed (`@playwright/test: ^1.55.0`)
- ✅ Configuration complete (`playwright.config.ts`)
- ✅ Global setup implemented (database cleanup)
- ⏳ Test users need to be created in Supabase
- ✅ Project has stable core features (animation system complete)
- ✅ User ready to learn

## Resources for AI Agents

### Key Files to Reference
- `package.json` - Playwright already installed
- `docs/ai/CURRENT_STATUS.md` - Current project state
- `docs/ai/PROJECT_MANAGEMENT.md` - Project structure and features
- `COVERAGE_SUMMARY.md` - Coverage analysis and gaps

### Playwright Documentation
- Official docs: https://playwright.dev
- Best practices: https://playwright.dev/docs/best-practices
- API reference: https://playwright.dev/docs/api/class-playwright

### Testing Philosophy
- Test pyramid: Many unit tests, some integration tests, few E2E tests
- E2E tests should focus on critical user journeys
- Prefer resilient selectors (accessibility-first)
- Tests should be independent and isolated
- Flaky tests are worse than no tests

## Troubleshooting Guide: Lessons Learned

This section documents real issues encountered during E2E test development and their solutions. These are valuable learning experiences that help avoid common pitfalls.

### Issue 1: Race Condition - Profile Creation Not Awaited

**Problem**: Test failed with foreign key constraint violation when player tried to join game:
```
Failed to add player: insert or update on table 'players' violates foreign key constraint 'players_user_id_fkey'
```

**Root Cause**:
- `ensureProfileExists()` was called with `void` (fire-and-forget)
- Profile creation was asynchronous and non-blocking
- Players attempted to join games before their profiles existed in database

**Solution**:
```typescript
// BEFORE (WRONG):
void ensureProfileExists(thisSession.user)
setLoading(false)

// AFTER (CORRECT):
if (thisSession?.user) {
  await ensureProfileExists(thisSession.user)
}
setLoading(false) // Only after profile exists
```

**Lesson**: Always await async operations that create database records before allowing dependent operations. Fire-and-forget (`void`) is dangerous when order matters.

---

### Issue 2: Username Conflicts from Email Prefix

**Problem**: Multiple test users with similar emails created duplicate usernames:
- `player1@e2e.com` → username: `player1`
- `player1@test.com` → username: `player1` (conflict!)

**Root Cause**: Username generation used `email.split('@')[0]`, which only takes the part before `@`

**Solution**:
```typescript
// BEFORE (WRONG):
username: user.email.split('@')[0]

// AFTER (CORRECT):
username: user.email  // Use full email for guaranteed uniqueness
```

**Lesson**: When generating unique identifiers, use the full unique value (email) rather than a substring that might not be unique.

---

### Issue 3: Headless Mode Network Access Denied

**Problem**: Tests worked in headed mode (visible browser) but failed in headless mode with:
```
ERR_NETWORK_ACCESS_DENIED
Failed to fetch
```

**Root Cause**: Chromium has security restrictions in headless mode that block certain network requests

**Solution**: Add browser launch arguments to disable web security:
```typescript
launchOptions: {
  args: [
    '--disable-web-security',
    '--disable-features=IsolateOrigins,site-per-process',
  ],
}
```

**Lesson**: Headless mode has stricter security policies. For E2E tests against real backends, you may need to relax these restrictions. This is safe for testing but should NEVER be used in production.

---

### Issue 4: Nickname Not Saving - Timing Issue

**Problem**: Test filled in nickname "Alice" but player appeared as "Test Player" (default)

**Root Cause**:
- Test filled nickname immediately after page load
- Component loaded default nickname from profile asynchronously
- Default nickname overwrote the test's custom nickname

**Solution**: Wait for profile to load before setting custom nickname:
```typescript
// BEFORE (WRONG):
await nicknameInput.fill('Alice');

// AFTER (CORRECT):
const nicknameInput = page.getByPlaceholder('Your display name...');
await expect(nicknameInput).not.toHaveValue(''); // Wait for default to load
await nicknameInput.clear();
await nicknameInput.fill('Alice');
await expect(nicknameInput).toHaveValue('Alice'); // Verify it stuck
```

**Lesson**: When testing forms that load default values asynchronously, wait for the default to appear before modifying it. This ensures your changes don't get overwritten.

---

### Issue 5: Blank Browser Window During Multi-Context Tests

**Problem**: When opening 4 browser contexts quickly, the 4th window remained blank/white and never loaded the app

**Root Cause**: Creating too many browser contexts simultaneously can cause timing issues and resource contention

**Solution**:
- Create contexts sequentially (already done with `await`)
- Run in headless mode to reduce resource overhead
- Set `slowMo: 0` for headless mode (no need for delays)

**Lesson**: Multi-context tests are resource-intensive. Headless mode is more reliable for tests with many simultaneous users. Save headed mode for debugging specific issues.

---

### Issue 6: Test Assertions Using Wrong UI Text

**Problem**: Test looked for "Players in Game (1)" but UI actually showed "Total Players: 1"

**Root Cause**: Test was written based on assumption rather than actual UI implementation

**Solution**:
1. Run test in headed mode to see actual UI
2. Use browser DevTools to inspect exact text
3. Update assertions to match reality:
```typescript
// BEFORE (WRONG):
await expect(page.getByText('Players in Game (1)')).toBeVisible();

// AFTER (CORRECT):
await expect(page.getByText('Total Players: 1')).toBeVisible();
```

**Lesson**: Always verify the actual UI text before writing assertions. Use headed mode or screenshots to see what's really rendered. Don't assume text based on component names or logic.

---

### Issue 7: Start Button Not Disabled When No Players

**Problem**: Test expected "Start Game" button to be disabled with no players, but it was enabled

**Root Cause**: Button's `disabled` property was hardcoded to `false` instead of checking player count

**Solution**: Update button logic to check player count:
```typescript
// BEFORE (WRONG):
const getGameControlButton = (game: Game | null) => {
  if (game.status === "lobby") {
    return { text: "Start Game", handler: "start", disabled: false };
  }
}

// AFTER (CORRECT):
const getGameControlButton = (game: Game | null, playerCount: number) => {
  if (game.status === "lobby") {
    return {
      text: "Start Game",
      handler: "start",
      disabled: playerCount === 0  // Disable if no players
    };
  }
}
```

**Lesson**: E2E tests often reveal missing business logic validation. When a test fails because the app doesn't enforce a rule, fix the app, not the test. This is a valuable benefit of E2E testing!

---

### Issue 8: Playwright Startup Delay (~75 seconds)

**Problem**: Long delay between running `npm run test:e2e` and seeing any output

**Root Cause**: Playwright compiles all TypeScript test files before execution. This is normal overhead.

**Why Vite is Faster**:
- Vite uses esbuild (written in Go, extremely fast)
- Vite does on-demand compilation (only what you use)
- Playwright uses ts-node (slower, compiles everything upfront)

**Solution**: Accept it as normal. Subsequent runs without code changes are faster due to caching.

**Lesson**: First test run after changes will be slow (~75s). This is TypeScript compilation, not your tests. Plan accordingly - run tests in batches rather than individually. The lack of feedback during this time is frustrating but normal.

---

### Best Practices Summary

**✅ DO:**
- Always `await` async operations that create database records
- Use full unique values (like email) for identifiers, not substrings
- Wait for async-loaded defaults before modifying form values
- Verify actual UI text before writing assertions
- Run in headless mode for multi-context tests
- Use headed mode for debugging specific issues
- Let E2E tests drive business logic improvements

**❌ DON'T:**
- Use fire-and-forget (`void`) for critical async operations
- Assume UI text matches component names or logic
- Create many browser contexts in headed mode
- Expect instant Playwright startup (TypeScript compilation takes time)
- Write tests based on assumptions - verify the actual behavior first

---

## Notes

- **Coverage is not the goal**: Learning is the goal, coverage is a side effect
- **Quality over quantity**: Better to have 5 excellent tests than 50 flaky tests
- **Real-world skills**: Teach patterns used in production applications
- **Progressive learning**: Each phase builds on the previous
- **User-paced**: Don't rush, ensure understanding at each step
- **Troubleshooting is learning**: Every bug fixed teaches valuable lessons
