# Mission
Your task is to achieve 90% test coverage for the Euno's Jeopardy React/TypeScript application while maintaining code quality and following established patterns.

# Project Context
- **Repository**: Euno's Jeopardy - Online Jeopardy game platform
- **Tech Stack**: React + TypeScript + Vite + Jest + Supabase
- **Current Status**: Issues #1 (Authentication) and #2 (CSV Loader) are complete
- **Test Framework**: Jest with React Testing Library
- **Coverage Tool**: Built into Jest, reported via SonarQube integration

## Current State
- **Authentication system**: Working with Supabase Auth + profile creation
- **CSV loader**: Complete with parsing, validation, and database saving
- **Database**: Supabase with RLS policies, proper schema relationships
- **Code quality**: SonarQube integration active, most critical issues resolved

# Your Objectives

## Primary Goal
Achieve **90% test coverage** across the codebase while maintaining quality.

## Secondary Goals
1. **Write meaningful tests** - Focus on behavior, not implementation details
2. **Follow established patterns** - Use existing test structure as examples
3. **Document exclusions** - Justify any coverage exclusions with clear comments
4. **Maintain code quality** - Don't sacrifice readability for coverage

# Coverage Strategy

## 1. Priority Order (Test These First)
1. **Core business logic** - CSV parsing, validation, data transformation
2. **Authentication flows** - Login, logout, profile creation, error handling
3. **React components** - User interactions, state changes, error boundaries
4. **Utility functions** - Pure functions, helpers, type guards
5. **Database operations** - Supabase client interactions (with mocks)

## 2. What to Test Thoroughly
- **Happy path scenarios** - Normal user workflows
- **Error conditions** - Network failures, validation errors, edge cases
- **User interactions** - Button clicks, form submissions, file selections
- **State management** - Context providers, hooks, state transitions
- **Data transformations** - CSV parsing, type conversions, validation
- **Pure functions** - Logic without side effects
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
- `src/contexts/AuthContext.tsx` - Authentication state management
- `src/components/clueSets/ClueSetSelector.tsx` - File selection UI

### Medium Priority
- `src/utils/questionSetUtils.ts` - Utility functions
- `src/types/game.ts` - Type guards and validation functions

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
