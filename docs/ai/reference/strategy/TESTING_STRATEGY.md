# Testing Strategy

## Overview

This document outlines our comprehensive testing strategy for this project, including coverage requirements, exclusions, and rationale for different testing approaches.

## Coverage Requirements

- **Target Coverage**: 90% overall, 80% for new code
- **Coverage Tool**: Jest with Istanbul
- **Quality Gate**: SonarQube integration

## Testing Pyramid

### Unit Tests (Primary Focus)
- **Scope**: Pure functions, utilities, isolated components
- **Tools**: Jest, React Testing Library
- **Coverage**: Business logic, data transformations, component behavior

** IMPORTANT: Coverage currently applies ONLY to unit tests. Code requiring more complex testing should be isolated in its own file, and then explicitly added to the coverage exclusions in both `jest.config.js` and `sonar-project.properties`. **

### Integration Tests (Secondary)
- **Scope**: Component interactions, API integrations, animation workflows
- **Tools**: Jest with DOM testing, Cypress (future)
- **Coverage**: User workflows, cross-component communication

### End-to-End Tests (Future)
- **Scope**: Complete user journeys, visual regression
- **Tools**: Playwright/Cypress (planned)
- **Coverage**: Critical user paths, browser compatibility

## Quality Assurance Process

### Code Review Checklist
- [ ] New code includes appropriate unit tests
- [ ] Code requiring more complex testing is isolated in its own file, which is then explicitly added to coverage exclusions
- [ ] Coverage exclusions are documented and justified
- [ ] Test quality is validated (not just coverage percentage)

### Continuous Integration
- [ ] All unit tests pass
- [ ] Coverage meets minimum threshold (90% target)
- [ ] SonarQube quality gate passes
- [ ] No critical code smells or security issues

## Common Pitfalls to Be Aware Of

### The Global `assert` Function
`globalThis.assert` has been added to `globalThis` in `src/test/setup.ts`. This is a convenience function for making throwing assertions in the codebase for type narrowing. It is NOT a testing utility and should NOT be used in tests.

**Problem**: Jest testing environments don't recognize the `globalThis.assert` declaration, even though it's available globally in the main codebase.

**Solutions**:
1. **For non-test files**: Use `assert()` directly without import - it's available globally
2. **For test files**: If you encounter "assert is not defined" errors, you have two options:
   - Mock it in your test file: `global.assert = jest.fn()`
   - Import Node's built-in assert: `import assert from 'node:assert'` (though, unlike the `globalThis.assert`, it will not throw errors if it fails)

### VITE Environment Variables (`import.meta.env`)
Jest doesn't natively support Vite's `import.meta.env` syntax, which has caused recurring issues throughout development.

**Problem**: `import.meta.env.VITE_*` variables cause "Cannot read properties of undefined" errors in Jest tests.

**Solutions**:
1. **Hardcoded constants** in `src/config/env.ts` for stable values (Supabase URLs/keys)
2. **Jest globals** in `jest.config.js` for test environment mocking
3. **Supabase client mocking** in individual test files when needed

**Implementation**:
```typescript
// ✅ GOOD: Use hardcoded config (src/config/env.ts)
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config/env';

// ❌ AVOID: Direct import.meta.env usage in testable code
const url = import.meta.env.VITE_SUPABASE_URL; // Jest will fail
```

## Testing Best Practices

### Unit Test Guidelines
1. **Test Behavior, Not Implementation** - Focus on what the code does, not how
2. **Arrange-Act-Assert Pattern** - Clear test structure
3. **Descriptive Test Names** - Tests serve as documentation
4. **Mock External Dependencies** - Isolate units under test
5. **Test Edge Cases** - Error conditions, boundary values

### Integration Test Guidelines
1. **Test Real User Scenarios** - Actual workflows users will follow
2. **Minimize Mocking** - Use real implementations where possible
3. **Test Cross-Component Communication** - Data flow between components
4. **Validate Side Effects** - DOM changes, API calls, state updates

## Metrics and Monitoring

### Quality Metrics
- **Test Execution Time**: < 15 seconds
- **Test Reliability**: 100% pass rate
- **Code Duplication**: < 3%
- **Cyclomatic Complexity**: < 15 per function

### Coverage Exclusions

#### Justified Exclusions
Files excluded from coverage requirements with documented rationale:

1. **Configuration Files** (`src/config/`)
   - Simple constant exports, no business logic
   - Tested implicitly through integration tests

2. **Type Definitions** (`src/types/`)
   - TypeScript interfaces and types
   - Compile-time validation, no runtime behavior

3. **Test Utilities** (`src/test/`)
   - Testing infrastructure code
   - Self-validating through usage in tests

#### Coverage Exclusion Process
1. Isolate complex-to-test code in dedicated files
2. Add explicit exclusions to `jest.config.js` and `sonar-project.properties`
3. Document rationale in this strategy document
4. Review exclusions during code review process

## Test Environment Configuration

### Jest Configuration
- **Test Environment**: jsdom for React component testing
- **Setup Files**: Global test utilities and mocks
- **Transform**: TypeScript and JSX compilation
- **Coverage**: Istanbul with detailed reporting

### Mock Strategy
- **External APIs**: Mock at service layer boundary
- **Supabase Client**: Comprehensive mocking for database operations
- **Environment Variables**: Jest globals for consistent test environment
- **Third-party Libraries**: Mock only when necessary for isolation

## Continuous Improvement

### Regular Reviews
- Monthly test strategy review
- Coverage trend analysis
- Test execution time monitoring
- Quality metrics assessment

### Adaptation Guidelines
- Update strategy based on project evolution
- Incorporate new testing tools and practices
- Maintain balance between coverage and maintainability
- Focus on value-driven testing over metric achievement
