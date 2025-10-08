# Testing Reference

> **Note**: For comprehensive testing strategy and best practices, see [strategy/TESTING_STRATEGY.md](./strategy/TESTING_STRATEGY.md). This document contains only configuration details and technical setup information.

> **Coverage Management**: Test coverage goals are handled by remote agents using the `REMOTE_AGENT_TEST_COVERAGE_PROMPT.md`. Main development documentation does not track coverage metrics.

## Key Testing Documentation
- **[Testing Mocks Reference](./TESTING_MOCKS_REFERENCE.md)** - Complete mock registry and anti-over-mocking guidelines
- **[Testing Strategy](./strategy/TESTING_STRATEGY.md)** - High-level testing approach and architecture
- **Test Fixtures**: `src/test/fixtures/` - Comprehensive CSV test files for validation testing

## Mock Management
**⚠️ IMPORTANT**: Before creating any new mock, consult the [Testing Mocks Reference](./TESTING_MOCKS_REFERENCE.md) to:
1. Check if a real function exists that should be used directly instead
2. Verify the function requires mocking (external dependency, side effect, etc.)
3. Add proper TypeScript typing to the mock
4. Register the new mock in the reference file with justification

## Jest Configuration

### Test Commands
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

### Environment Setup
- **Test Framework**: Jest with React Testing Library
- **Coverage Tool**: Built into Jest, reported via SonarQube integration
- **Global Setup**: `src/test/setup.ts` configures global test environment

### Console Output in Tests
**Console methods (log, warn, error) are NOT globally suppressed.**

This means you will see console output during test runs, which aids debugging. If a specific test needs to suppress or verify console output:

```typescript
it('should handle error gracefully', () => {
  // Suppress console.error for this test only
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

  // Test code that triggers expected error
  someFunction();

  // Optionally verify the error was logged
  expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error message'));

  // Clean up
  consoleSpy.mockRestore();
});
```

**IMPORTANT**: Local console mocking is NOT the same as mocking service dependencies:
- **Console mocking**: Local, per-test, for suppressing noise or verifying logging
- **Service mocking**: Global, centralized in `src/test/__mocks__/`, see [TESTING_MOCKS_REFERENCE.md](./TESTING_MOCKS_REFERENCE.md)

## Coverage Exclusions Configuration

### Jest Configuration (`jest.config.js`)
```javascript
// File-level exclusions for generated code, config files, and test files
coveragePathIgnorePatterns: [
  '/node_modules/',
  '/src/services/supabase/types.ts',
  '/src/test/',
  '/src/main.tsx',
  // Add other exclusions as needed
]
```

### SonarQube Configuration (`sonar-project.properties`)
```properties
# Coverage exclusions for complex integration code requiring integration testing
sonar.coverage.exclusions=**/services/supabase/**,**/app/App.tsx,**/main.tsx

# Test file exclusions (standard)
sonar.test.exclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx
```

> **Note**: Always check the actual `sonar-project.properties` file for the most up-to-date exclusions.

## Integration with Remote Agents

Test coverage goals and detailed testing strategy are managed by remote agents using the `REMOTE_AGENT_TEST_COVERAGE_PROMPT.md`. This configuration file provides the technical setup details needed for those agents to work effectively.
