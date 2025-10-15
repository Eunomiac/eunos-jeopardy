# Database Helpers Usage Guide

This guide explains how to use the database helper functions in your E2E tests to query and manipulate game state directly in the Supabase database.

## Why Use Database Helpers?

Database helpers allow you to:
- **Find Daily Double clues** without manually searching through the board
- **Mark clues as completed** to test round transitions without playing through all clues
- **Query game state** to verify database changes
- **Set up specific test scenarios** that would be difficult to achieve through the UI

## Available Functions

### Game State Query Helpers

#### `getHostGame(hostId: string)`
Get the current active game for a host user.

```typescript
import { getHostGame } from '../fixtures/database-helpers';
import { TEST_USERS } from '../fixtures/test-users';

const game = await getHostGame(TEST_USERS.host.id);
console.log('Game ID:', game?.id);
console.log('Game Status:', game?.status);
console.log('Current Round:', game?.current_round);
```

#### `getGameClues(gameId: string)`
Get all clues for a game with their state information (revealed, completed).

```typescript
import { getGameClues } from '../fixtures/database-helpers';

const clues = await getGameClues(gameId);
console.log(`Found ${clues.length} clues`);

// Check if a clue is completed
const firstClue = clues[0];
console.log('Clue completed:', firstClue.state?.completed);
```

#### `getDailyDoubleIndices(gameId: string, round: 'jeopardy' | 'double')`
Find which clue indices are Daily Doubles for a specific round.

```typescript
import { getDailyDoubleIndices } from '../fixtures/database-helpers';

// Get Daily Double indices for Jeopardy round
const ddIndices = await getDailyDoubleIndices(gameId, 'jeopardy');
console.log('Daily Double at index:', ddIndices[0]);

// Use this to select the Daily Double clue
await selectClue(hostPage, ddIndices[0]);
```

#### `getGamePlayers(gameId: string)`
Get all players in a game.

```typescript
import { getGamePlayers } from '../fixtures/database-helpers';

const players = await getGamePlayers(gameId);
console.log(`Game has ${players.length} players`);
players.forEach(player => {
  console.log(`- ${player.nickname}: $${player.score}`);
});
```

### Game State Manipulation Helpers

#### `markClueCompleted(gameId: string, clueId: string)`
Mark a single clue as completed.

```typescript
import { markClueCompleted } from '../fixtures/database-helpers';

// Mark a specific clue as completed
await markClueCompleted(gameId, clueId);
```

#### `markRoundCompleted(gameId: string, round: 'jeopardy' | 'double')`
Mark all clues in a round as completed. Useful for testing round transitions.

```typescript
import { markRoundCompleted } from '../fixtures/database-helpers';

// Complete all Jeopardy round clues to trigger transition to Double Jeopardy
await markRoundCompleted(gameId, 'jeopardy');

// Now the host can trigger the round transition
await hostPage.getByRole('button', { name: /Next Round|Double Jeopardy/i }).click();
```

#### `updateGameStatus(gameId: string, status: GameStatus)`
Update the game status directly.

```typescript
import { updateGameStatus } from '../fixtures/database-helpers';

// Force game to in_progress status
await updateGameStatus(gameId, 'in_progress');
```

#### `updateGameRound(gameId: string, round: 'jeopardy' | 'double' | 'final')`
Update the current round directly.

```typescript
import { updateGameRound } from '../fixtures/database-helpers';

// Force game to Double Jeopardy round
await updateGameRound(gameId, 'double');
```

## Common Usage Patterns

### Testing Daily Double Flow

```typescript
test('should handle Daily Double correctly', async ({ browser }) => {
  const ctx = await setupTestInProgress(browser, ['Alice', 'Bob'], 'daily-double-test');
  
  try {
    const { hostPage, playerPages, gameId } = ctx;
    
    // Find the Daily Double clue
    const ddIndices = await getDailyDoubleIndices(gameId, 'jeopardy');
    
    // Select the Daily Double clue
    await selectClue(hostPage, ddIndices[0]);
    
    // Verify Daily Double splash appears
    await expect(hostPage.getByText(/Daily Double/i)).toBeVisible();
    
    // Continue with Daily Double flow...
  } finally {
    await cleanupTestContext(ctx);
  }
});
```

### Testing Round Transitions

```typescript
test('should transition from Jeopardy to Double Jeopardy', async ({ browser }) => {
  const ctx = await setupTestInProgress(browser, ['Alice', 'Bob'], 'round-transition-test');
  
  try {
    const { hostPage, gameId } = ctx;
    
    // Complete all Jeopardy round clues instantly
    await markRoundCompleted(gameId, 'jeopardy');
    
    // Trigger round transition
    await hostPage.getByRole('button', { name: /Next Round/i }).click();
    
    // Verify transition to Double Jeopardy
    await expect(hostPage.getByText(/Double Jeopardy/i)).toBeVisible();
    
    // Verify game round updated in database
    const game = await getHostGame(TEST_USERS.host.id);
    expect(game?.current_round).toBe('double');
  } finally {
    await cleanupTestContext(ctx);
  }
});
```

### Testing Final Jeopardy

```typescript
test('should transition to Final Jeopardy', async ({ browser }) => {
  const ctx = await setupTestInProgress(browser, ['Alice', 'Bob'], 'final-jeopardy-test');
  
  try {
    const { hostPage, gameId } = ctx;
    
    // Complete both Jeopardy and Double Jeopardy rounds
    await markRoundCompleted(gameId, 'jeopardy');
    await markRoundCompleted(gameId, 'double');
    
    // Trigger Final Jeopardy
    await hostPage.getByRole('button', { name: /Final Jeopardy/i }).click();
    
    // Verify Final Jeopardy started
    await expect(hostPage.getByText(/Final Jeopardy/i)).toBeVisible();
  } finally {
    await cleanupTestContext(ctx);
  }
});
```

## Best Practices

1. **Always use database helpers for setup, not assertions**: Use database helpers to set up test scenarios quickly, but verify behavior through the UI when possible.

2. **Clean up after tests**: Always use `cleanupTestContext()` in a `finally` block to ensure test data is cleaned up even if the test fails.

3. **Combine with UI helpers**: Database helpers work best when combined with UI helpers like `selectClue()`, `unlockBuzzer()`, etc.

4. **Use for hard-to-reach states**: Database helpers are perfect for setting up states that would take many UI interactions to reach (like completing an entire round).

5. **Verify both UI and database**: When testing critical flows, verify both the UI state and the database state to ensure consistency.

## Troubleshooting

### "Supabase credentials not configured"
Make sure your `.env.local` file has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` set.

### "No rows returned" errors
This usually means the game or clue doesn't exist. Make sure you're using the correct IDs and that the game was created successfully.

### Type errors with Tables
Import the `Tables` type from database-helpers:
```typescript
import { Tables } from '../fixtures/database-helpers';
```

## Security Note

These helpers use the Supabase anonymous key (same as the application). They respect Row Level Security (RLS) policies, so they can only access data that the authenticated user has permission to access.

