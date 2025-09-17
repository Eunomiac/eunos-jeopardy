# Buzzer System Architecture

## Overview

The buzzer system provides real-time, fair buzzer functionality for Jeopardy gameplay with client-side timing calculation, real-time synchronization, and comprehensive state management.

## Core Components

### 1. Buzzer States

**Four-State System**:
- **LOCKED**: Buzzer disabled, waiting for host to unlock
- **UNLOCKED**: Buzzer active, players can buzz in
- **BUZZED**: Player has buzzed, showing reaction time
- **FROZEN**: Buzzer disabled during adjudication

### 2. Client-Side Timing

**Fair Timing Calculation**:
- Unlock timestamp recorded when buzzer becomes available
- Reaction time calculated locally: `Date.now() - unlockTimestamp`
- Eliminates server latency for fair competition
- Stored in database for host display and historical records

**Implementation**:
```typescript
// Player side timing calculation
const reactionTimeMs = Date.now() - buzzerUnlockTime
await GameService.recordBuzz(gameId, clueId, userId, reactionTimeMs)
```

### 3. Real-Time Synchronization

**Supabase Realtime Integration**:
- Game state changes broadcast to all participants
- Buzzer lock/unlock events synchronized instantly
- Player buzz events appear in host queue immediately
- Score updates reflected across all interfaces

**Subscription Channels**:
- `games-${gameId}`: Game state and buzzer lock status
- `players-${gameId}`: Player score updates
- `clue_states-${gameId}`: Clue reveal and completion status
- `buzzes-${gameId}`: Buzzer events and queue updates

## Workflow

### Complete Buzzer Cycle

1. **Host reveals clue** → Modal appears on player side, buzzer locked
2. **Host unlocks buzzer** → Players can buzz, unlock timestamp recorded
3. **Player buzzes** → Reaction time calculated, buzz recorded in database
4. **Host sees buzzer queue** → Real player names and reaction times displayed
5. **Host selects player** → Modal disappears on player side
6. **Host marks correct/wrong** → Score updated, buzzer locked, queue cleared

### State Transitions

```
LOCKED → (host unlocks) → UNLOCKED → (player buzzes) → BUZZED
   ↑                                                      ↓
   ← (adjudication complete) ← FROZEN ← (host selects) ←
```

## Technical Implementation

### Database Schema

**buzzes table**:
- `game_id`: Links to active game
- `clue_id`: Links to current clue
- `user_id`: Player who buzzed
- `reaction_time`: Client-calculated timing (milliseconds)
- `created_at`: Server timestamp for ordering

### Key Services

**GameService Methods**:
- `recordBuzz()`: Stores buzz with reaction time
- `toggleBuzzerLock()`: Controls buzzer availability
- `adjudicateAnswer()`: Handles scoring and cleanup

**Real-time Features**:
- Automatic buzzer queue clearing after adjudication
- Immediate buzzer locking on Mark Correct/Wrong
- Smooth modal animations without state flashing

## User Experience

### Host Interface

**Buzzer Control**:
- Single-click workflow: "Reveal Prompt" → "Unlock Buzzer"
- Real-time buzzer queue with player names and reaction times
- Automatic queue clearing and buzzer locking after adjudication

**Visual Indicators**:
- Button state changes reflect current buzzer status
- Player scores update immediately with negative score styling
- Daily Double red dots indicate special clues

### Player Interface

**Buzzer Experience**:
- Modal appears when clue is revealed
- Buzzer becomes active when host unlocks
- Reaction time displayed after buzzing
- Modal disappears smoothly when selected by host

**Visual Feedback**:
- Four distinct buzzer states with appropriate styling
- Smooth animations without visual artifacts
- Real-time score updates with negative score styling

## Performance & Reliability

### Optimization Features

- **Incremental updates**: Player data updated without full page refresh
- **Animation timing**: 300ms modal animations with proper state management
- **Error handling**: Non-blocking failures with console warnings
- **Legacy support**: Automatic Daily Double generation for older clue sets

### Failsafe Mechanisms

- **Modal animation protection**: Prevents state changes during fade transitions
- **Database relationship handling**: Proper joins and error recovery
- **Reaction time fallback**: Timestamp-based calculation if client timing fails
- **Queue management**: Automatic clearing prevents stale buzzer data

## Testing & Validation

### Verified Functionality

✅ **Complete buzzer workflow**: Clue reveal → unlock → buzz → adjudication → score update
✅ **Real-time synchronization**: Host and player interfaces stay synchronized
✅ **Client-side timing**: Accurate reaction time calculation and storage
✅ **Modal system**: Smooth animations without visual artifacts
✅ **Score management**: Immediate updates with proper negative styling
✅ **Daily Double support**: Red dot indicators and failsafe generation
✅ **Code quality**: Removed redundant functions and cleaned up architecture

### Performance Metrics

- **Modal animation**: 300ms fade with no state flashing
- **Real-time latency**: Sub-second synchronization via Supabase Realtime
- **Database efficiency**: Optimized queries with proper indexing
- **Client responsiveness**: Immediate visual feedback on all interactions
