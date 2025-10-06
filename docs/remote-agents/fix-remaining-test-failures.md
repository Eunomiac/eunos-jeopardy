# Fix Remaining Test Failures

## Overview

There are 5 remaining test failures in the test suite. All failures are related to **mock setup issues**, not actual code problems. The application code works correctly in production - these are purely test infrastructure challenges.

**Current Status:**
- ✅ **431 tests passing**
- ❌ **5 tests failing**
- All failures are in: `GameHostDashboard.test.tsx` (2) and `PlayerDashboard.test.tsx` (3)

## Core Principle: Use Global Mocks

**🔴 CRITICAL RULE:** Tests should use the globally-defined mocks in `src/test/__mocks__/@supabase/supabase-js.ts` rather than defining their own local mocks.

**Why?**
- Consistency across all tests
- Easier maintenance (one place to update)
- Prevents mock conflicts and overrides
- Reduces test code duplication

**If a test needs specific behavior:**
1. ✅ **DO:** Add the behavior to the global mock with table-specific logic
2. ❌ **DON'T:** Create a local `mockSupabase.from.mockImplementation()` in the test file

## Failing Tests

### 1. GameHostDashboard: "should start game successfully from lobby state"

**Location:** `src/components/games/GameHostDashboard.test.tsx:288`

**Symptom:** Component shows "Game Not Found" instead of loading the lobby game and displaying "Start Game" button.

**Root Cause:** The test sets up mocks for a lobby game, but when the component renders and calls `GameService.getGame()`, the mock isn't returning the expected data. This could be due to:
- Mock timing issues (component renders before mocks are fully set up)
- The global mock being overridden somewhere
- `ClueSetService.loadClueSetFromDatabase` not returning proper data

**Current Test Code:**
```typescript
it('should start game successfully from lobby state', async () => {
  const lobbyGame = { ...mockGame, status: 'lobby' as const, clue_set_id: 'clue-set-123' }
  const startedGame = { ...lobbyGame, status: 'in_progress' as const }
  
  // Clear and reset all mocks for this test
  jest.clearAllMocks()
  mockGameService.getGame.mockResolvedValue(lobbyGame)
  mockGameService.getPlayers.mockResolvedValue(mockPlayers)
  mockGameService.startGame.mockResolvedValue(startedGame)
  mockClueSetService.loadClueSetFromDatabase.mockResolvedValue({
    name: 'Test Clue Set',
    filename: 'test-clue-set.csv',
    rounds: {
      jeopardy: [],
      double: [],
      final: { name: 'FINAL', clues: [] }
    }
  })
  // ... more mock setup ...

  renderWithAuth(<GameHostDashboard {...mockProps} />)

  await waitFor(() => {
    expect(screen.getByText('Start Game')).toBeInTheDocument()
  })
  // ... rest of test ...
})
```

**Investigation Steps:**
1. Check if `GameService.getGame` is actually being called with the right parameters
2. Verify that `mockGameService.getGame.mockResolvedValue(lobbyGame)` is being applied before the component renders
3. Check if there's a race condition between mock setup and component rendering
4. Verify that `ClueSetService.loadClueSetFromDatabase` mock is returning valid data structure
5. Check if the component's useEffect is running and completing successfully

**Potential Solutions:**
- Ensure all service mocks are set up in the global `beforeEach` with proper defaults
- Remove the `jest.clearAllMocks()` call from individual tests (let `beforeEach` handle it)
- Verify that the mock data structure matches what the component expects
- Add console.log statements to track when mocks are called vs when component renders

---

### 2. GameHostDashboard: "should handle start game error"

**Location:** `src/components/games/GameHostDashboard.test.tsx:331`

**Symptom:** Same as test #1 - component shows "Game Not Found" instead of loading and showing "Start Game" button.

**Root Cause:** Same underlying issue as test #1.

**Current Test Code:**
```typescript
it('should handle start game error', async () => {
  const lobbyGame = { ...mockGame, status: 'lobby' as const, clue_set_id: 'clue-set-123' }
  const error = new Error('Failed to start')
  
  // Clear and reset all mocks for this test
  jest.clearAllMocks()
  mockGameService.getGame.mockResolvedValue(lobbyGame)
  mockGameService.getPlayers.mockResolvedValue(mockPlayers)
  mockGameService.startGame.mockRejectedValue(error)
  // ... more mock setup ...

  renderWithAuth(<GameHostDashboard {...mockProps} />)

  await waitFor(() => {
    expect(screen.getByText('Start Game')).toBeInTheDocument()
  })
  // ... rest of test ...
})
```

**Solution:** Same approach as test #1.

---

### 3-5. PlayerDashboard: Board Display Tests (3 failures)

**Locations:**
- `src/components/players/PlayerDashboard.test.tsx:398` - "should handle gracefully when current user is not in players list"
- `src/components/players/PlayerDashboard.test.tsx:415` - "should render game board structure correctly even with minimal player data"
- `src/components/players/PlayerDashboard.test.tsx:434` - "should display game board when player has joined"

**Symptom:** All three tests show categories as "Loading..." instead of displaying actual category names ("Category 1", "Category 2").

**Root Cause:** The component queries the `boards` table with nested `categories` and `clues` data:

```typescript
const { data: boards, error: boardsError } = await supabase
  .from("boards")
  .select(`
    id,
    round,
    categories (
      id,
      name,
      position,
      clues (
        id,
        prompt,
        response,
        value,
        position
      )
    )
  `)
  .eq("clue_set_id", gameData.clue_set_id)
  .order("round");
```

The tests use `setupMockGameWithPlayers()` which creates a local `mockSupabase.from.mockImplementation()` that **overrides the global mock**. This local mock should return board data, but it's not working correctly.

**Current Test Setup:**
The tests call `setupMockGameWithPlayers()` which is defined in the test file:

```typescript
function setupMockGameWithPlayers() {
  const { players, playerInfos } = createMockGameWithPlayers()

  mockGameService.getPlayers.mockResolvedValue(players)
  mockFontAssignmentService.getPlayerFont.mockResolvedValue('handwritten-1')

  // Mock Supabase queries - use the same comprehensive mock as the global one
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'boards') {
      return {
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({
              data: [
                {
                  id: 'board-1',
                  round: 'jeopardy',
                  categories: [
                    {
                      id: 'cat-1',
                      name: 'Category 1',
                      position: 0,
                      clues: [/* ... */]
                    },
                    {
                      id: 'cat-2',
                      name: 'Category 2',
                      position: 1,
                      clues: [/* ... */]
                    }
                  ]
                }
              ],
              error: null
            })
          })
        })
      }
    }
    // ... other table mocks ...
  })
}
```

**The Problem:** This local mock implementation **overrides the global mock** and creates inconsistency. The mock structure looks correct, but something in the chaining isn't working.

**Investigation Steps:**
1. Check if the `boards` query is actually reaching the mock
2. Verify the mock chain: `.select()` → `.eq()` → `.order()` → resolves with data
3. Check if the component is looking for the data in the right place
4. Verify that `gameData.clue_set_id` exists and matches the mock

**Recommended Solution:**

**🔴 DO NOT fix the local mock.** Instead, **remove the local mock entirely** and enhance the global mock to handle the `boards` table properly.

**Steps:**
1. **Remove** the `setupMockGameWithPlayers()` function's `mockSupabase.from.mockImplementation()` override
2. **Enhance** the global mock in `src/test/__mocks__/@supabase/supabase-js.ts` to return proper board data for the `boards` table
3. The global mock already has a `boards` case that returns mock data - verify it's structured correctly
4. Ensure the mock chain supports: `.select()` → `.eq()` → `.order()` → resolves with data

**Current Global Mock (already added):**
```typescript
case 'boards':
  // Return mock board data with nested categories and clues for PlayerDashboard tests
  return [
    {
      id: 'board-1',
      round: 'jeopardy',
      categories: [
        {
          id: 'cat-1',
          name: 'Category 1',
          position: 0,
          clues: [
            { id: 'clue-1', prompt: 'Test prompt 1', response: 'Test response 1', value: 200, position: 0 }
          ]
        },
        {
          id: 'cat-2',
          name: 'Category 2',
          position: 1,
          clues: [
            { id: 'clue-2', prompt: 'Test prompt 2', response: 'Test response 2', value: 200, position: 0 }
          ]
        }
      ]
    }
  ]
```

**The issue:** The global mock's chaining might not properly support `.eq()` → `.order()`. Check the `createChainableMethods()` function to ensure `.eq()` returns an object that has an `.order()` method.

## Success Criteria

All 5 tests should pass when you run:
```bash
npm test -- GameHostDashboard.test.tsx PlayerDashboard.test.tsx
```

**Expected output:**
```
Test Suites: 2 passed, 2 total
Tests:       36 passed, 36 total
```

## Testing Your Changes

1. Run the specific failing tests:
   ```bash
   npm test -- GameHostDashboard.test.tsx --testNamePattern="should start game"
   npm test -- PlayerDashboard.test.tsx --testNamePattern="should display game board"
   ```

2. Run the full test suite to ensure no regressions:
   ```bash
   npm test -- --coverage
   ```

3. Verify test coverage remains above 90%

## Key Principles to Follow

1. **🔴 Use global mocks** - Don't create local `mockSupabase.from.mockImplementation()` in test files
2. **🟡 Enhance global mocks** - Add table-specific behavior to the global mock file
3. **🟡 Maintain consistency** - All tests should use the same mock infrastructure
4. **🟢 Keep it simple** - The simpler the mock setup, the easier to maintain

## Files to Modify

**Primary:**
- `src/test/__mocks__/@supabase/supabase-js.ts` - Enhance global mock

**Secondary (if needed):**
- `src/components/games/GameHostDashboard.test.tsx` - Remove local mock overrides
- `src/components/players/PlayerDashboard.test.tsx` - Remove `setupMockGameWithPlayers()` mock override

**Do NOT modify:**
- `src/components/games/GameHostDashboard.tsx` - The component code is correct
- `src/components/players/PlayerDashboard.tsx` - The component code is correct

## Additional Context

- The global mock file already has `unsubscribe` and `send` methods for channels (recently added)
- The global mock already has a `boards` case with nested data (recently added)
- The issue is likely in the mock chaining: `.select()` → `.eq()` → `.order()`
- All other tests (431 of them) are passing, so the global mock infrastructure is sound

Good luck! 🚀

