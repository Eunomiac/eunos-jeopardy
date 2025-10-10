# Testing Mocks Reference

## 🔴 Critical Rules

### RULE #1: Always Check for Existing Mocks First
**BEFORE creating ANY mock, you MUST:**

1. **Check `src/test/__mocks__/@supabase/supabase-js.ts`** - Global Supabase mock with comprehensive database operations
2. **Check `src/test/__mocks__/commonTestData.ts`** - Shared mock data (mockUser, mockGame, mockPlayers, etc.)
3. **Check `src/services/<service>/__mocks__/`** - Manual service mocks for ES6 classes
4. **Search the codebase** - Use grep/search to find if a mock already exists elsewhere

**If an existing mock is insufficient:**
- ✅ **DO:** Extend the global mock by adding missing methods/fields
- ❌ **DON'T:** Create a duplicate mock in your test file

**Valid reasons to override a mock in a specific test:**
- Testing error states (e.g., mock a database error)
- Testing specific data scenarios (e.g., empty results, edge cases)
- Testing race conditions or timing-specific behavior

### Use Global Mocks Only
**Location:** `src/test/__mocks__/`

**❌ NEVER:**
- Create local `__mocks__` adjacent to source files (except manual service mocks)
- Use `jest.mock()` with inline implementations
- Create test-specific mock data duplicating shared fixtures
- Reinvent the wheel by creating custom mocks when global mocks exist

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
