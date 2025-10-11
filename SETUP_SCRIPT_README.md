# Remote Agent Setup Script

## Overview

The `setup.sh` script is designed for remote agents working on the Euno's Jeopardy project. It provides comprehensive environment validation and setup to ensure tests can run successfully.

## Key Improvements from Original

### 1. **Comprehensive Validation**
- Verifies project identity (checks for "eunos-jeopardy" in package.json)
- Validates all critical configuration files exist
- Checks essential mock files and test infrastructure
- Verifies TypeScript compilation works

### 2. **Robust Error Handling**
- Exits early if critical components are missing
- Provides clear error messages for debugging
- Distinguishes between errors (exit) and warnings (continue)

### 3. **Complete Test Infrastructure Check**
- Validates Jest configuration can find tests
- Checks TypeScript test configuration
- Verifies all essential mock files exist:
  - `@supabase/supabase-js.ts` (global Supabase mock)
  - `supabase-connection.ts` (connection testing mock)
  - `testUtils.ts` (shared test data)
  - `GameService.ts` (manual service mock)

### 4. **Test Fixture Validation**
- Checks for CSV test files used in parsing tests
- Warns if fixtures are missing (non-critical)

### 5. **Pre-flight Checks**
- TypeScript compilation verification
- ESLint validation (warning only)
- Jest configuration validation
- Dry-run test execution

## Usage

```bash
# Make executable (if needed)
chmod +x setup.sh

# Run setup
./setup.sh
```

## What It Validates

### Critical Files (will exit if missing):
- `package.json` with "eunos-jeopardy" identifier
- `tsconfig.app.json`, `tsconfig.test.json`, `jest.config.js`
- `src/test/setup.ts` (Jest setup file)
- `src/test/__mocks__/` directory and essential mocks
- `src/test/fixtures/` directory

### Dependencies:
- All npm packages from package.json
- Critical testing packages: jest, @testing-library/react, typescript, ts-jest

### Configuration:
- TypeScript compilation (both app and test configs)
- Jest can find and list tests
- ESLint configuration (warning only)

## Expected Behavior

1. **Success**: All checks pass, tests can run
2. **Setup Issues**: Script exits with clear error message
3. **Test Failures**: Setup completes but warns about failing tests (expected)

## For Remote Agents

This script ensures you have everything needed to:
- Run individual tests: `npm test -- ComponentName.test.tsx`
- Run full test suite: `npm run test:ci`
- Debug test failures with proper mock infrastructure
- Validate fixes with TypeScript compilation

The script is designed to catch environment issues early so you can focus on solving actual test failures rather than configuration problems.
