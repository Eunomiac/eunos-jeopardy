# Testing Reference

> **Note**: For comprehensive testing strategy and best practices, see [strategy/TESTING_STRATEGY.md](./strategy/TESTING_STRATEGY.md). This document contains only configuration details and technical setup information.

> **Coverage Management**: Test coverage goals are handled by remote agents using the `REMOTE_AGENT_TEST_COVERAGE_PROMPT.md`. Main development documentation does not track coverage metrics.

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
