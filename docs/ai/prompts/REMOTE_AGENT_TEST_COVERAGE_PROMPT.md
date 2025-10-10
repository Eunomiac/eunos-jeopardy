Note: These instructions are intended for remote agents tasked specifically with increasing testing coverage.

# Mission
Your task is to achieve 90% test coverage for the Euno's Jeopardy React/TypeScript application while maintaining code quality and following established patterns.

# 🔴 CRITICAL: Mock Usage Rules

## ALWAYS Check for Existing Mocks First
**Before creating ANY mock in your tests, you MUST:**

1. **Check `src/test/__mocks__/@supabase/supabase-js.ts`** - Comprehensive global Supabase mock
2. **Check `src/test/__mocks__/commonTestData.ts`** - Shared mock data (mockUser, mockGame, mockPlayers, etc.)
3. **Check `src/services/<service>/__mocks__/`** - Manual service mocks for ES6 classes
4. **Search the codebase** - Verify no duplicate mocks exist

### If an Existing Mock is Insufficient:
- ✅ **DO:** Extend the global mock by adding the missing method/field to the global mock file
- ❌ **DON'T:** Create a custom mock or override in your test file

### Valid Reasons to Override a Mock in a Test:
- Testing error states (e.g., database errors, network failures)
- Testing specific data scenarios (e.g., empty results, edge cases)
- Testing timing-specific behavior (e.g., race conditions)

**This is non-negotiable.** Duplicate mocks cause maintenance nightmares and test inconsistencies.

# Project Context
- **Repository**: Euno's Jeopardy - Online Jeopardy game platform
- **Tech Stack**: React + TypeScript + Vite + Jest + Supabase
- **Test Framework**: Jest with React Testing Library
- **Coverage Tool**: Built into Jest, reported via SonarQube integration

# Key References

## Testing References
- **[Testing Mocks Reference](../reference/TESTING_MOCKS_REFERENCE.md)** - Mock registry and anti-over-mocking guidelines (READ THIS FIRST!)
- **[Testing Strategy](../reference/strategy/TESTING_STRATEGY.md)** - Testing approach and architecture
- **[Testing Reference](../reference/TESTING_REFERENCE.md)** - Technical setup and configuration

## General References
- **[INDEX.md](../INDEX.md)** - Navigation hub for all AI documentation]
- **[CURRENT_STATUS.md](../CURRENT_STATUS.md)** - Real-time status and active work
- **[PROJECT_MANAGEMENT.md](../PROJECT_MANAGEMENT.md)** - Project structure and issue definitions

# Your Objectives

## Primary Goal
Achieve **90% test coverage** and **100% passing tests** across the codebase while maintaining quality.

### Prime Coverage Opportunities:
Three files represent the lion's share of our coverage gaps:

1. **GameHostDashboard.tsx** -- 1021 uncovered lines
2. **PlayerDashboard.tsx** -- 516 uncovered lines
3. **GameService.ts** -- 433 uncovered lines

All other files have fewer than 100 uncovered lines, and provide minimal opportunities to improve coverage.  **You are advised to choose _one_ of these files to focus on at a time.**

## Secondary Goals
1. **Write meaningful tests** - Focus on behavior, not implementation details
2. **Follow established patterns** - Use existing test structure as examples
3. **Document exclusions** - Justify any coverage exclusions with clear comments
4. **Maintain code quality** - Don't sacrifice readability for coverage

# Failed Tests: Resolution Strategy
Before implementing any new tests, resolve any existing failing tests. Your first task is to understand the codebase and fix any broken tests.

1. **Fix broken tests** - Resolve any existing failing tests before adding new ones
2. **Verify fixes** - Ensure all tests pass before proceeding
3. **Document fixes** - Create and maintain a single `TESTING_ISSUES.md` file in the root of the repository to track and document any changes to tests or to the codebase that affect tests. This file should be updated with each new test or fix.

# New Tests: Coverage Strategy
- As you implement new tests, continue to ensure all tests pass. If you encounter failing tests, resolve them before proceeding
- **Always** check to see whether you are duplicating code when adding new tests. Whenever you add new code, ask yourself whether it's likely a test has used this code before, and check to see if you can use that code.  Refactoring a file to use existing code (e.g. extracting functions or mocks into shared files) is a good thing!
- Make frequent commits to your branch as you complete each stage of work.

## 1. Priority Order (Test These First)
1. **Core business logic** - CSV parsing, validation, data transformation
2. **Authentication flows** - Login, logout, profile creation, error handling
3. **React components** - User interactions, state changes, error boundaries
4. **Utility functions** - Pure functions, helpers, type guards
5. **Database operations** - Supabase client interactions (with mocks)

## 2. What to Test Thoroughly
- **Happy path scenarios** - Normal user workflows (login → select clue set → create game → host dashboard)
- **Error conditions** - Network failures, validation errors, edge cases
- **User interactions** - Button clicks, form submissions, file selections
- **State management** - Context providers, hooks, state transitions (especially AuthContext)
- **Data transformations** - CSV parsing, type conversions, validation
- **Pure functions** - Logic without side effects
- **Authentication flows** - Login, logout, session management, profile creation
- **Game management** - Game creation, buzzer controls, game ending
- **Mockable integrations** - External services with dependency injection

## 3. What to Exclude (With Justification)

### File-Level Exclusions (Already Configured)
The project already has comprehensive exclusions in `jest.config.js` and `sonar-project.properties`:
- ✅ **Generated code** - Supabase types, build artifacts
- ✅ **Configuration files** - Vite config, main.tsx, index files
- ✅ **Test files** - All test patterns
- ✅ **Type definitions** - .d.ts files
- ✅ **Development utilities** - test-schema.ts

### Line-Level Exclusions (Use Istanbul Comments)
For parts of files that require integration testing:

```typescript
export class ClueSetService {
  // ✅ Unit testable - pure logic
  validateData(data: ClueSetData): ValidationResult {
    // Pure validation - test this thoroughly
  }

  transformCSV(csvData: CSVRow[]): ClueSetData {
    // Pure transformation - test this thoroughly
  }

  /* istanbul ignore next - Requires Supabase integration testing */
  async saveToDatabase(data: ClueSetData, userId: string): Promise<string> {
    // Complex database operations with RLS, transactions
    // Better tested with integration tests
    const validated = this.validateData(data); // Calls unit-tested method
    // ... database operations
  }

  /* istanbul ignore next - Requires file system integration testing */
  async loadFromFile(filename: string): Promise<ClueSetData> {
    // File system + network operations
    // Better tested with integration tests
    const content = await fs.readFile(filename);
    return this.transformCSV(parseCSV(content)); // Calls unit-tested methods
  }
}
```

### When to Use Istanbul Comments
1. **Complex integrations** - Database transactions, file I/O, network calls
2. **Real-time operations** - WebSocket handling, race conditions
3. **Browser-specific code** - Compatibility fallbacks
4. **Development utilities** - Debug helpers, logging
5. **Defensive programming** - "Should never happen" error cases

**Note**: SonarQube may not respect Istanbul comments, but Jest will. Focus on achieving 90% in Jest - slight SonarQube differences are acceptable.

## Testing Guidelines

### 1. Organize by Domain, Not Testability
**✅ DO**: Keep related functionality together
```typescript
// ✅ GOOD: Organized by feature/domain
export class ClueSetLoader {
  validateData() { /* unit testable */ }
  transformCSV() { /* unit testable */ }

  /* istanbul ignore next - Integration testing required */
  async saveToDatabase() { /* integration testing */ }
}
```

**❌ DON'T**: Split files just for testing
```typescript
// ❌ BAD: Split purely for testing convenience
// pureLogic.ts - artificial boundary
// integrationLogic.ts - confusing organization
```

### 2. Component Testing Pattern
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider } from '../contexts/AuthContext';

describe('ComponentName', () => {
  const renderWithAuth = (ui: React.ReactElement) => {
    return render(
      <AuthProvider>{ui}</AuthProvider>
    );
  };

  it('should handle user interaction correctly', async () => {
    renderWithAuth(<ComponentName />);

    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText(/success/i)).toBeInTheDocument();
    });
  });
});
```

### 3. Async Operations Testing
```typescript
// Mock Supabase operations
jest.mock('../services/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({ data: mockData, error: null })),
      insert: jest.fn(() => ({ data: mockData, error: null }))
    }))
  }
}));

it('should handle database operations', async () => {
  const result = await saveClueSetToDatabase(mockData, 'user-id');
  expect(result).toBe('clue-set-id');
});
```

### 4. Error Handling Testing
```typescript
it('should handle network errors gracefully', async () => {
  // Mock network failure
  (supabase.from as jest.Mock).mockReturnValue({
    select: jest.fn(() => ({ data: null, error: { message: 'Network error' } }))
  });

  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

  await expect(loadData()).rejects.toThrow('Network error');

  consoleSpy.mockRestore();
});
```

### 5. Design for Testability (Without Reorganizing)
```typescript
// ✅ GOOD: Dependency injection makes integration code testable
export class ClueSetService {
  constructor(
    private db: DatabaseClient,
    private fileSystem: FileSystemClient
  ) {}

  // Now this CAN be unit tested with mocks!
  async saveToDatabase(data: ClueSetData): Promise<string> {
    return this.db.save('clue_sets', data);
  }

  // Pure function - always unit testable
  private parseContent(content: string): ClueSetData {
    // ... pure transformation logic
  }
}
```

## Files to Focus On

### High Priority (Must Test)
- `src/services/clueSets/loader.ts` - Core CSV processing logic
- `src/utils/csvParser.ts` - CSV parsing and validation
- `src/contexts/AuthContext.tsx` - Authentication state management (recently fixed)
- `src/components/clueSets/ClueSetSelector.tsx` - File selection UI
- `src/services/games/GameService.ts` - Game creation and management (recently working)
- `src/app/App.tsx` - Main application flow and game hosting workflow

### Medium Priority
- `src/utils/clueSetUtils.ts` - Utility functions
- `src/types/game.ts` - Type guards and validation functions
- `src/components/games/GameHostDashboard.tsx` - Host dashboard UI (recently working)
- `src/components/auth/SimpleLogin.tsx` - Login component

### Low Priority (Already Excluded)
- `src/services/supabase/types.ts` - Generated types (excluded in config)
- `src/services/supabase/client.ts` - Simple client setup (excluded in config)
- `src/test-schema.ts` - Development utility (excluded in config)
- Configuration files in root directory (excluded in config)

## File Splitting Guidelines

### When to Split Files (Good Reasons)
1. **Single Responsibility** - File doing too many unrelated things
2. **Size Management** - File getting too large (>300-500 lines)
3. **Domain Boundaries** - Clear functional separation
4. **Reusability** - Shared utilities used across features
5. **Team Ownership** - Different teams own different concerns

### When NOT to Split Files
❌ **Don't split files just for testing convenience**
- Keep related functionality together
- Use Istanbul comments for integration-heavy code
- Maintain logical domain organization

### How to Document Exclusions

**For Line-Level Exclusions (Use Istanbul Comments):**
```typescript
/* istanbul ignore next - [CLEAR REASON] */
async function complexIntegrationFunction() {
  // Integration testing required because:
  // - Complex database transactions
  // - File system operations
  // - Real-time WebSocket coordination
}
```

**Example Exclusion Reasons:**
- "Requires Supabase integration testing"
- "Requires file system integration testing"
- "Real-time WebSocket coordination - integration testing required"
- "Browser compatibility fallback"
- "Defensive programming - should never execute"
- "Development environment only"

### Coverage Philosophy
- **90% coverage** doesn't mean 90% of every file
- **It means 90% of testable code is tested appropriately**
- **Integration code excluded with good reason still contributes to quality**
- **Focus on Jest achieving 90%** - SonarQube differences are acceptable

## Success Criteria

### Must Achieve
- [ ] **90% overall coverage** across the codebase
- [ ] **All core business logic covered** (CSV parsing, auth flows)
- [ ] **All user-facing components tested** (interactions, error states)
- [ ] **Meaningful test descriptions** that explain behavior
- [ ] **Proper mocking** of external dependencies (Supabase, file system)

### Quality Standards
- [ ] **Tests pass consistently** - No flaky tests
- [ ] **Fast execution** - Test suite runs in under 30 seconds
- [ ] **Clear assertions** - Tests verify specific behaviors
- [ ] **Good error messages** - Failed tests provide helpful output
- [ ] **Documented exclusions** - All coverage exclusions justified

## Commands to Use

```bash
# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- ClueSetSelector.test.tsx

# Check coverage report
npm test -- --coverage --watchAll=false
```

## Git Workflow Requirements

### Consistent Progress Commits
**CRITICAL**: You must commit your progress regularly to avoid losing work and enable monitoring:

1. **Commit after each major milestone**:
   - After adding tests for each component/service
   - After reaching coverage milestones (70%, 80%, 85%, 90%)
   - After fixing any failing tests
   - After adding meaningful test suites

2. **Use descriptive commit messages**:
   ```bash
   git add .
   git commit -m "test: Add comprehensive tests for ClueSetSelector component

   - Cover user interactions, error states, and edge cases
   - Achieve 95% coverage for component
   - Add proper mocking for file selection
   - Progress: 72% overall coverage"

   git push origin [your-branch-name]
   ```

3. **Push commits immediately**:
   - Always push after each commit
   - This ensures work is backed up and visible
   - Enables monitoring of progress from VS Code/Augment

### Automatic PR Submission
**CRITICAL**: When you have completed the 90% test coverage goal:

1. **Final commit and push**:
   ```bash
   git add .
   git commit -m "feat: Achieve 90% test coverage across codebase

   - Complete test suites for all core components and services
   - Add comprehensive error handling tests
   - Document coverage exclusions with Istanbul comments
   - Final coverage: [X]% statements, [Y]% branches, [Z]% functions"

   git push origin [your-branch-name]
   ```

2. **Create Pull Request automatically**:
   Use the GitHub CLI or API to create a PR:
   ```bash
   # If GitHub CLI is available
   gh pr create --title "feat: Achieve 90% test coverage" --body "
   ## Summary
   This PR achieves the 90% test coverage goal across the Euno's Jeopardy codebase.

   ## Changes Made
   - Added comprehensive test suites for core components
   - Implemented proper mocking strategies for Supabase integration
   - Added error handling and edge case tests
   - Documented coverage exclusions with clear justifications

   ## Coverage Results
   - Statements: [X]%
   - Branches: [Y]%
   - Functions: [Z]%
   - Lines: [W]%

   ## Test Quality
   - All tests pass consistently
   - Fast execution (under 30 seconds)
   - Meaningful test descriptions
   - Proper mocking of external dependencies

   Ready for review and merge.
   " --head [your-branch-name] --base master
   ```

### Branch Naming Convention
Use descriptive branch names like:
- `test-coverage-90-percent`
- `comprehensive-test-suite`
- `testing-coverage-improvement`

### Why This Matters
The last remote agent session experienced crashes when trying to access the conversation from VS Code/Augment. By consistently pushing commits:
1. **Work is preserved** even if the session crashes
2. **Progress is visible** from the main development environment
3. **Collaboration is enabled** - the main developer can see progress
4. **Recovery is possible** - work can be continued from any commit point

## Final Notes

### Remember
- **Quality over quantity** - 90% meaningful coverage is better than 100% meaningless coverage
- **Test behavior, not implementation** - Focus on what the code does, not how
- **Mock external dependencies** - Supabase, file system, network calls
- **Keep files organized by domain** - Don't split files just for testing
- **Use Istanbul comments liberally** - For integration-heavy code with clear reasoning
- **Follow existing patterns** - Use the established testing structure

### When in Doubt
- **Err on the side of testing** - It's better to have a test than not
- **Use Istanbul comments** - When integration testing is more appropriate
- **Check existing tests** - Use them as examples for patterns
- **Focus on user value** - Test the things users actually interact with
- **Maintain domain organization** - File structure should make functional sense

### Integration vs Unit Testing
- **Unit test**: Pure functions, mockable dependencies, isolated logic
- **Integration test**: Database operations, file I/O, real-time coordination
- **Use Istanbul comments** for integration-heavy code - that's perfectly fine!

Good luck! The codebase is well-structured and the core functionality is solid. Focus on testing the user-facing behaviors and business logic, use Istanbul comments for integration-heavy code, and you'll achieve the coverage goal while maintaining quality.
