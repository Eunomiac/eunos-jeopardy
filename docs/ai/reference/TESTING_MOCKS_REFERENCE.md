# Testing Mocks Reference

## Purpose
Registry of all mocks to prevent over-mocking. **All new mocks must be registered here** after confirming they are valid mocks.

## Guidelines
**When to Mock vs. Use Directly:**
- **✔️ Mock**: External dependencies (APIs, databases, file system), side effects, callback props
- **❌ Use Directly**: Pure functions, simple utilities, deterministic functions

**Registration Process:**
1. Check if a real function exists that could be used directly
2. Verify the function requires mocking (external dependency, side effect, etc.)
3. Add proper TypeScript typing to the mock
4. Register the mock below with justification

## Current Mocks

### Test Data & Factories (commonTestData.ts)
- mockUser ✅ `User` ✔️ Standard user object for authentication tests
- mockSession ✅ `Session` ✔️ Standard session object for authentication tests
- mockGame ✅ `GameRow` ✔️ Standard game object for game-related tests
- mockPlayers ✅ `PlayerRow[]` ✔️ Standard player array for game tests
- mockClueSets ✅ `ClueSetRow[]` ✔️ Standard clue set array for selection tests
- testCSVText ✅ `string` ✔️ Simple CSV content for basic tests
- expectedParsedRows ✅ `readonly CSVRow[]` ✔️ Derived from testCSVText using real parseCSV function
- testCSVFiles ✅ `object` ✔️ Paths to test fixture files
- createMockGame ✅ `(overrides?: Partial<GameRow>) => GameRow` ✔️ Factory for game variations
- createMockUser ✅ `(overrides?: Partial<User>) => User` ✔️ Factory for user variations
- createMockPlayer ✅ `(overrides?: Partial<PlayerRow>) => PlayerRow` ✔️ Factory for player variations

### Service & External Dependencies
- mockGameService ✅ `jest.Mocked<typeof GameService>` ✔️ External service dependency
- mockLoadClueSetFromCSV ✅ `jest.MockedFunction<typeof loadClueSetFromCSV>` ✔️ File I/O operation
- mockSaveClueSetToDatabase ✅ `jest.MockedFunction<typeof saveClueSetToDatabase>` ✔️ Database operation
- mockClueSetService ✅ `jest.Mocked<typeof ClueSetService>` ✔️ External service dependency
- mockClueService ✅ `jest.Mocked<typeof ClueService>` ✔️ External service dependency
- mockGetAvailableClueSets ✅ `jest.Mock` ✔️ File system operation
- mockGetUserClueSets ✅ `jest.Mock` ✔️ Database query operation

### Authentication & Context
- mockLogin ✅ `jest.MockedFunction<() => Promise<void>>` ✔️ Authentication side effect
- mockLogout ✅ `jest.MockedFunction<() => void>` ✔️ Authentication side effect
- mockUseAuth ✅ `jest.MockedFunction<typeof useAuth>` ✔️ React context hook

### Callbacks & Browser APIs
- mockOnClueSetSelected ✅ `jest.MockedFunction<(clueSetId: string) => void>` ✔️ Callback prop
- mockConfirm ✅ `jest.MockedFunction<typeof window.confirm>` ✔️ Browser API

### Database & Infrastructure
- mockSupabase ✅ `jest.Mocked<typeof supabase>` ✔️ Database client
- mockSupabaseConnection ✅ `MockSupabaseConnection` ✔️ Database connection
- mockSupabaseClient ✅ Comprehensive typed mock with Database schema ✔️ Database client

### Complex Test Data
- mockUserClueSets ✅ `ClueSetRow[]` ✔️ Database query result data
- mockClueSetData ✅ `ClueSetData` ✔️ Complex structured test data
- mockGameInProgress ✅ `GameRow` ✔️ Specific game state test data
- mockProps ✅ `GameHostDashboardProps` ✔️ Component props test data
- mockInsert/mockSelect/mockUpdate ✅ `jest.Mock` ✔️ Database operation mocks
- mockClueSets/mockPlayers/mockBuzzes ✅ Various arrays ✔️ Database result arrays

## Test Fixtures
- `src/test/fixtures/test-valid-basic.csv` - Complete valid Jeopardy structure
- `src/test/fixtures/test-invalid-missing-jeopardy.csv` - Missing clues for validation testing
- `src/test/fixtures/test-invalid-no-final.csv` - Missing Final Jeopardy
- `src/test/fixtures/test-invalid-malformed.csv` - Malformed CSV structure
