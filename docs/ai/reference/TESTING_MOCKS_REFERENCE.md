# Testing Mocks Reference

## 🔴 Critical Rules

### Use Global Mocks Only
**Location:** `src/test/__mocks__/`

**❌ NEVER:**
- Create local `__mocks__` adjacent to source files (except manual service mocks)
- Use `jest.mock()` with inline implementations
- Create test-specific mock data duplicating shared fixtures

**✅ ALWAYS:**
- Use `src/test/__mocks__/@supabase/supabase-js.ts` for database
- Import from `src/test/__mocks__/commonTestData.ts` for test data
- Use factory functions for variations: `createMockGame({ status: 'in_progress' })`
- Override in `beforeEach`: `mockGameService.getGame.mockResolvedValue(mockGame)`

### Mocks Must Match Real Behavior
- Return full database rows from `commonTestData.ts`, not partial data
- Support method chaining: `.from().select().eq().single()`
- Include all real-time subscription methods

### Manual Service Mocks for ES6 Classes
Jest auto-mock fails on ES6 class static methods. Create manual mocks:
- **Location:** `src/services/<service>/__mocks__/<ServiceName>.ts`
- **Structure:** Object with all static methods as `jest.fn()`
- **Example:** `src/services/games/__mocks__/GameService.ts`

## When to Mock
- **✔️ Mock**: External dependencies (APIs, databases, file system), side effects
- **❌ Use Real**: Pure functions, utilities, deterministic functions

## Mock Registry

### Global Mocks (`src/test/__mocks__/`)
- **@supabase/supabase-js.ts** - Database client with method chaining, returns mockGame/mockPlayers. Add `jest.mock('@supabase/supabase-js')` to tests for proper hoisting.

### Manual Service Mocks (`src/services/<service>/__mocks__/`)
- **GameService.ts** - 33 static methods as `jest.fn()`. Use `jest.mock('../../services/games/GameService')`.

### Shared Test Data (`src/test/__mocks__/commonTestData.ts`)
**Core Data:**
- mockUser, mockSession, mockGame (id: 'game-123'), mockPlayers (2 players), mockClueSets

**Factories:**
- createMockGame, createMockUser, createMockPlayer - Use these for variations

**CSV Test Data:**
- testCSVText, expectedParsedRows, testCSVFiles

### Test Fixtures (`src/test/fixtures/`)
- test-valid-basic.csv, test-invalid-*.csv - For CSV parsing tests

## Troubleshooting

### Categories Show "Loading..." Instead of Real Data
**Cause:** Global Supabase mock returning partial data instead of full rows from `commonTestData.ts`
**Fix:** Update mock to return `mockGame`, `mockPlayers`, etc. from shared test data

### "from() is not a function" or Mock Not Called
**Cause:** Mock not hoisted before client.ts loads
**Fix:** Add `jest.mock('@supabase/supabase-js')` at top of test file

### ES6 Class Static Methods Not Mocked
**Cause:** Jest auto-mock doesn't handle ES6 class static methods
**Fix:** Create manual mock in `src/services/<service>/__mocks__/<ServiceName>.ts`
