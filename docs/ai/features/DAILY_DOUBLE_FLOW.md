# Daily Double Flow Implementation

## Overview

Complete implementation of the Daily Double flow system that provides an authentic Jeopardy! experience with proper game flow control, current player management, and wager handling.

**Status**: ✅ COMPLETE
**Implementation Date**: 2025-01-20

## Key Features

### 1. Button State Machine
The host's control button dynamically changes based on Daily Double state:

- **"Daily Double!"** - Appears when Daily Double clue is focused
- **"Daily Double Wager"** - Appears after current player is selected
- **"Reveal Prompt"** - Appears after wager is entered
- **Standard flow** - Returns to normal reveal/buzzer flow after Daily Double

### 2. Current Player System
Database-driven system to track who gets Daily Doubles:

- **Random Initialization**: Current player assigned randomly at game start
- **Automatic Updates**: Updated whenever a player answers correctly
- **Visual Indicators**: Current player highlighted with golden glow and crown emoji
- **Database Field**: `current_player_id` in games table

### 3. Wager Management
Proper wager system that preserves clue set integrity:

- **Separate Table**: Uses `wagers` table instead of modifying clue values
- **Data Integrity**: Original clue sets remain unchanged for reuse
- **Game-Specific**: Wagers are tied to specific game/clue/player combinations
- **Automatic Cleanup**: Wagers cleared after clue completion

## Game Flow

### Standard Daily Double Flow
1. **Host focuses Daily Double clue** → Button shows "Daily Double!"
2. **Host clicks "Daily Double!"** → Current player automatically selected
3. **Host enters wager** → Button changes to "Daily Double Wager"
4. **Host clicks "Daily Double Wager"** → Button changes to "Reveal Prompt"
5. **Host clicks "Reveal Prompt"** → Clue displayed to all players
6. **Host marks Correct/Wrong** → Daily Double completes immediately

### Key Differences from Regular Clues
- **No Buzzer Phase**: Current player automatically selected
- **No Second Chances**: Wrong answers complete the clue immediately
- **Wager Integration**: Uses wager amount for scoring instead of clue value

## Technical Implementation

### Database Schema
```sql
-- Added to games table
ALTER TABLE games 
ADD COLUMN current_player_id UUID;

-- Existing wagers table used for Daily Double wagers
-- Structure: game_id, clue_id, user_id, amount, created_at
```

### Service Layer Methods
```typescript
// Current Player Management
GameService.setCurrentPlayer(gameId, playerId, hostId)
GameService.initializeCurrentPlayerRandomly(gameId, hostId)

// Wager Management  
GameService.setDailyDoubleWager(gameId, clueId, playerId, amount, hostId)
GameService.getDailyDoubleWager(gameId, clueId, playerId)
GameService.getEffectiveClueValue(gameId, clueId, playerId)
GameService.clearDailyDoubleWager(gameId, clueId, playerId, hostId)
```

### Button State Detection
```typescript
const getRevealBuzzerButtonState = () => {
  // Check if focused clue is a Daily Double
  const isDailyDouble = dailyDoublePositions.some(position =>
    position.category === categoryIndex + 1 && 
    position.row === cluePosition
  );
  
  if (isDailyDouble) {
    if (!game.focused_player_id) return 'daily-double';
    if (!dailyDoubleWager) return 'daily-double-wager';
  }
  
  return 'reveal'; // Standard flow
};
```

### Visual Styling
```scss
// Current player indicator
.current-player {
  background: rgba($jeopardy-gold, 0.3);
  border-left: 5px solid $jeopardy-gold;
  box-shadow: 0 0 15px rgba($jeopardy-gold, 0.4);
  animation: currentPlayerGlow 2s ease-in-out infinite alternate;
}

// Daily Double button styling
.daily-double-pulse {
  animation: dailyDoublePulse 1.5s ease-in-out infinite;
}
```

## Data Flow

### Current Player Updates
- **Game Start**: `initializeCurrentPlayerRandomly()` called
- **Correct Answer**: `markPlayerCorrect()` updates current player
- **Visual Update**: UI automatically reflects current player changes

### Wager Lifecycle
1. **Creation**: Wager created when host enters amount
2. **Usage**: `getEffectiveClueValue()` returns wager for scoring
3. **Cleanup**: Wager deleted after clue completion

### Database Integrity
- **Clue Sets**: Original values never modified
- **Reusability**: Same clue set can be used across multiple games
- **Isolation**: Wagers are game-specific and don't affect other games

## Benefits

1. **Authentic Experience**: Matches real Jeopardy! Daily Double flow
2. **Data Integrity**: Preserves clue set reusability
3. **Clear Visual Feedback**: Host always knows who the current player is
4. **Proper Game Flow**: Daily Doubles bypass buzzer system appropriately
5. **Database Design**: Clean separation of concerns with proper relationships

## Testing

### Manual Testing Scenarios
- Focus Daily Double clue → Button shows "Daily Double!"
- Click "Daily Double!" → Current player selected automatically
- Enter wager → Button changes to "Daily Double Wager"
- Mark wrong answer → Clue completes immediately (no buzzing)
- Use same clue set in new game → Original values preserved

### Database Migration Required
```sql
-- Run in Supabase dashboard
ALTER TABLE games 
ADD COLUMN current_player_id UUID;
```

## Future Enhancements

- **Wager Validation**: Minimum/maximum wager limits
- **Wager History**: Track wager patterns and statistics  
- **Visual Enhancements**: More sophisticated current player indicators
- **Audio Cues**: Daily Double sound effects and music
- **Analytics**: Daily Double performance tracking

## Related Documentation

- [Daily Double Algorithm](./DAILY_DOUBLE_ALGORITHM.md) - Placement algorithm
- [Buzzer System](./BUZZER_SYSTEM.md) - Core buzzer functionality
- [Supabase Reference](../reference/SUPABASE_REFERENCE.md) - Database schema
