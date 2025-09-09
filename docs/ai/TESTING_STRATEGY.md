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

## Coverage Exclusions

### Supabase Infrastructure Code

**Files Excluded:**
- `src/services/supabase/types.ts` - Auto-generated TypeScript types (417 lines)
- `src/services/supabase/client.ts` - Simple configuration with environment variables
- `src/services/supabase/index.ts` - Barrel export file
- `src/services/supabase/connection.ts` - Environment-dependent connection utilities
- `src/services/supabase/database-test.ts` - Database testing utilities
- `src/shared/components/SupabaseStatus.tsx` - React component with complex dependencies

**Rationale:**
Supabase infrastructure code involves:
1. Auto-generated types that don't require validation
2. Environment variable dependencies that require integration testing
3. External API dependencies that need real database connections
4. Configuration code that's better validated through integration tests

**Alternative Testing Approach:**
- Integration tests with real Supabase connections
- Manual verification of database connectivity
- End-to-end tests for database operations
- Environment-specific testing for configuration validation

### Animation Integration Code

**Files Excluded:**
- `src/shared/hooks/useGSAP.ts` (current location)
- `src/shared/contexts/GSAPContext.tsx` (current location)
- `src/shared/utils/animations.ts` (GSAP animation utilities)
- `src/shared/components/animations/*` (GSAP-dependent components)

**Rationale:**
These modules contain complex third-party library integrations (GSAP) that require:
1. Real DOM manipulation and browser APIs
2. Animation timing and performance testing
3. Visual validation of animation effects
4. Cross-browser compatibility verification

**Alternative Testing Approach:**
- Integration tests with real DOM elements
- Visual regression tests for animation correctness
- Performance benchmarks for animation smoothness
- Manual testing for user experience validation



### Search Integration Code

**Files Excluded:**
- `src/shared/services/search/CardSearchService.ts` - Database service with complex Supabase queries
- `src/features/search/components/CardSearch.tsx` - React component with complex async state management

**Rationale:**
Search integration code involves:
1. Complex database queries with Supabase client
2. Async state management with React hooks
3. Real-time search functionality requiring database connections
4. Error handling for network and database failures

**Alternative Testing Approach:**
- Integration tests with real database connections
- End-to-end tests for search workflows
- Manual testing for search performance and accuracy
- User acceptance testing for search user experience

### Clue Set Loading Integration Code

**Files Excluded:**
- `src/services/clueSets/loader.ts` - Complex async service with CSV parsing, validation, and database operations

**Rationale:**
Clue set loading code involves:
1. Complex async workflows with multiple error handling branches
2. File fetching and CSV parsing operations
3. Database transactions with Supabase client
4. Data validation and transformation logic

**Alternative Testing Approach:**
- Integration tests with real CSV files and database connections
- End-to-end tests for complete CSV-to-database workflows
- Manual testing for various CSV formats and edge cases
- Error scenario testing with real network and database failures

### SonarQube Configuration
(May be out-of-date: Always check the `sonar-project.properties` file for the most up-to-date exclusions)
```properties
# Coverage exclusions for complex integration code requiring integration testing
sonar.coverage.exclusions=**/shared/utils/animations.ts,**/shared/hooks/useGSAP.ts,**/shared/contexts/GSAPContext.tsx,**/shared/components/animations/**,**/services/supabase/**,**/shared/services/external-api/**,**/features/**/components/*ImportButton.tsx,**/shared/hooks/useDataImport.ts,**/shared/services/search/**,**/features/search/components/**,**/shared/types/domain.ts,**/app/App.tsx,**/main.tsx

# Test file exclusions (standard)
sonar.test.exclusions=**/*.test.ts,**/*.test.tsx,**/*.spec.ts,**/*.spec.tsx
```


## Future Improvements

### Short Term (Next Sprint)
- [ ] Add integration tests for drag-and-drop workflows
- [ ] Implement visual regression testing setup
- [ ] Create performance benchmarks for animations

### Medium Term (Next Quarter)
- [ ] End-to-end test suite with Playwright
- [ ] Automated accessibility testing
- [ ] Cross-browser compatibility testing

### Long Term (Future Releases)
- [ ] Property-based testing for complex algorithms
- [ ] Mutation testing for test quality validation
- [ ] Performance regression testing

## Conclusion

This testing strategy achieves high code coverage while maintaining practical testing approaches. By excluding complex integration code (animations, database operations, external API calls, and async state management) from unit test coverage requirements and focusing on integration testing for these components, we ensure both high code quality and meaningful test coverage that validates functionality rather than just achieving percentage targets.

The test suite includes:
- **Comprehensive unit tests** for utilities, components, and business logic
- **Proper exclusions** for integration-dependent code
- **Maintainable test structure** with co-located test files
- **SonarQube integration** for continuous quality monitoring
- **Professional testing practices** following industry standards
