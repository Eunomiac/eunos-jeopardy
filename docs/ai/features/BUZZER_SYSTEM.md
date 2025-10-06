# Buzzer System Architecture

## Overview

The buzzer system provides real-time, fair buzzer functionality for Jeopardy gameplay with **broadcast-based communication** for immediate (<50ms) responsiveness, client-side timing calculation, and database backup for persistence.

## Architecture Principles

### Hybrid Broadcast + Database Approach

1. **Broadcast for Immediacy**: All time-sensitive UI updates via Supabase Realtime broadcast
2. **Host as Database Authority**: Only Host writes to database (eliminates race conditions)
3. **Database as Source of Truth**: Database updates can override broadcast state
4. **Client-Side Timing**: Players calculate reaction times locally (eliminates latency bias)
5. **Automatic Selection**: Fastest player immediately focused (no manual host selection required)

### Performance Targets

- **Broadcast latency**: <50ms typical, <100ms p99
- **Lock response**: <50ms from unlock broadcast to player UI update
- **Buzz response**: <50ms from player click to all clients locked
- **Focus update**: <50ms from buzz broadcast to focused player change
- **Database backup**: <500ms from broadcast to database confirmation

## Core Components

### 1. Buzzer States

**Six-State System**:
- **HIDDEN**: Starting state before game begins
- **INACTIVE**: Default state during round, no clue selected
- **LOCKED**: Clue revealed but players cannot buzz in yet
- **UNLOCKED**: Buzzer active, players can buzz in
- **BUZZED**: Player has buzzed in - waiting for host response
- **FROZEN**: Punishment for buzzing in too early or after being marked wrong

### 2. Broadcast Communication

**Broadcast Channel**: `game-buzzer:${gameId}`

**Event Types**:
- `buzzer_unlock`: Host signals buzzers are now active
- `buzzer_lock`: Host signals buzzers are now locked
- `player_buzz`: Player submits buzz with reaction time
- `focus_player`: Host or system sets focused player

**Channel Configuration**:
```typescript
const channel = supabase.channel(`game-buzzer:${gameId}`, {
  config: {
    broadcast: {
      self: true,  // Host receives own broadcasts
      ack: false   // Don't wait for acknowledgment (speed priority)
    }
  }
});
```

### 3. Client-Side Timing

**Fair Timing Calculation**:
- Unlock timestamp recorded when buzzer becomes available
- Reaction time calculated locally: `Date.now() - unlockTimestamp`
- Eliminates server latency for fair competition
- Broadcast immediately, stored in database by host

**Implementation**:
```typescript
// Player side timing and broadcast
const reactionTimeMs = Date.now() - buzzerUnlockTime;
await BroadcastService.broadcastPlayerBuzz(
  gameId, clueId, playerId, playerNickname, reactionTimeMs
);
```

### 4. Automatic Player Focusing

**Fastest Player Selection**:
- All clients track fastest buzz received
- Fastest player immediately focused across all clients
- Late buzz corrections handled automatically
- Visual flash acceptable (<100ms duration)
- Database update confirms correct player

**Late Buzz Correction Flow**:
1. First buzz arrives (Player A, 450ms) → All clients focus Player A
2. Second buzz arrives (Player B, 380ms) → All clients switch to Player B
3. Database update confirms Player B as focused player

## Workflow

### Complete Buzzer Cycle (Broadcast-Based)

1. **Host reveals clue** → Clue appears on player side, buzzer locked
2. **Host unlocks buzzer** →
   - Host broadcasts `buzzer_unlock` event (~20-50ms)
   - All players receive broadcast, enable buzzer UI
   - Players record unlock timestamp for reaction time calculation
   - Host updates database (~200-500ms later)
3. **Player buzzes** →
   - Player calculates reaction time locally
   - Player broadcasts `player_buzz` event (~20-50ms)
   - All clients immediately lock buzzers
   - All clients check if this is fastest buzz
   - All clients auto-focus fastest player
   - Host writes buzz to database
4. **Host sees buzzer queue** → Real player names and reaction times displayed
5. **Fastest player auto-selected** → Focused across all clients immediately
6. **Host marks correct/wrong** → Score updated, buzzer locked, queue cleared

### Buzzer Unlock Flow

1. **Host clicks "Unlock Buzzer"**
   - Host broadcasts `buzzer_unlock` event with timestamp
   - Host updates `games.is_buzzer_locked = false` in database

2. **All clients receive broadcast** (~20-50ms)
   - Players: Buzzer becomes clickable, record unlock timestamp
   - Host: Visual confirmation of unlock state

3. **All clients receive database update** (~200-500ms)
   - If state differs from broadcast, database overrides (rare)
   - Provides recovery for clients that missed broadcast

### Player Buzz Flow

1. **Player clicks buzzer**
   - Calculate reaction time: `Date.now() - unlockTimestamp`
   - Broadcast `player_buzz` event with reaction time
   - Local UI immediately shows "BUZZED" state

2. **All clients receive broadcast** (~20-50ms)
   - **All players**: Buzzers immediately lock
   - **All clients**: Check if this is fastest buzz received so far
   - **All clients**: If fastest, immediately set as focused player
   - **Host**: Add to buzzer queue for monitoring

3. **Host receives broadcast**
   - Maintains in-memory queue of all buzzes with reaction times
   - Automatically focuses fastest player (may switch if faster buzz arrives)
   - Writes buzz to `buzzes` table in database
   - Updates `games.focused_player_id` in database

4. **All clients receive database updates** (~200-500ms)
   - Verify focused player matches fastest buzz
   - If different, database overrides (handles extreme latency cases)

### Late Buzz Correction Flow

**Scenario**: Faster player's broadcast arrives after slower player's broadcast

1. **First buzz arrives** (Player A, 450ms reaction time)
   - All clients focus Player A

2. **Second buzz arrives** (Player B, 380ms reaction time)
   - All clients immediately switch focus to Player B
   - Visual flash acceptable (<100ms duration)
   - Host queue shows both with correct ordering

3. **Database update arrives**
   - Confirms Player B as focused player
   - No visual change (already correct)

## Technical Implementation

### Database Schema

**games table**:
- `is_buzzer_locked`: Boolean controlling buzzer availability
- `focused_player_id`: UUID of currently focused player

**buzzes table**:
- `game_id`: Links to active game
- `clue_id`: Links to current clue
- `user_id`: Player who buzzed
- `reaction_time`: Client-calculated timing (milliseconds)
- `created_at`: Server timestamp for ordering

### Key Services

**BroadcastService** (`src/services/realtime/BroadcastService.ts`):
- `createGameBuzzerChannel()`: Creates broadcast channel for game
- `subscribeToGameBuzzer()`: Subscribes to buzzer events with handlers
- `broadcastBuzzerUnlock()`: Host broadcasts unlock event
- `broadcastBuzzerLock()`: Host broadcasts lock event
- `broadcastPlayerBuzz()`: Player broadcasts buzz event
- `broadcastFocusPlayer()`: Host broadcasts focus change

**BuzzerQueueManager** (`src/services/buzzer/BuzzerQueueManager.ts`):
- `addBuzz()`: Adds buzz to queue, returns if new fastest
- `getFastestPlayer()`: Returns fastest player ID
- `getQueue()`: Returns ordered queue for display
- `clear()`: Clears queue for next clue

**GameService Methods**:
- `recordBuzz()`: Stores buzz with reaction time (Host only)
- `toggleBuzzerLock()`: Controls buzzer availability (Host only)
- `setFocusedPlayer()`: Sets focused player (Host only)
- `adjudicateAnswer()`: Handles scoring and cleanup

**BuzzerStateService** (`src/services/animations/BuzzerStateService.ts`):
- `determineState()`: Determines appropriate buzzer state
- `validateTransition()`: Validates state transitions
- `isInteractive()`: Checks if buzzer is clickable

### Communication Channels

**Broadcast Channel** (Ephemeral, <50ms latency):
- Channel: `game-buzzer:${gameId}`
- Purpose: Immediate UI updates for time-sensitive events
- Events: `buzzer_unlock`, `buzzer_lock`, `player_buzz`, `focus_player`
- Configuration: `self: true`, `ack: false` for maximum speed

**Database Subscriptions** (Persistent, ~200-500ms latency):
- Purpose: Authoritative state, game reports, reconnection recovery
- Tables: `games`, `buzzes`, `players`, `clue_states`
- Role: Backup/override mechanism, initial state on page load

## User Experience

### Host Interface

**Buzzer Control**:
- Single-click workflow: "Reveal Prompt" → "Unlock Buzzer"
- Real-time buzzer queue with player names and reaction times
- **Automatic fastest player selection** - no manual selection required
- Manual override button available for edge cases
- Automatic queue clearing and buzzer locking after adjudication

**Visual Indicators**:
- Button state changes reflect current buzzer status
- Player scores update immediately with negative score styling
- Buzzer queue shows all buzzes with reaction times
- Fastest player highlighted in queue

**Performance Monitoring**:
- Connection status indicator
- Broadcast latency tracking (development mode)
- Discrepancy logging when database overrides broadcast

### Player Interface

**Buzzer Feedback**:
- **Immediate visual state changes** (<50ms) on unlock/lock
- Reaction time calculated and displayed locally
- Buzzer locks immediately when any player buzzes
- Late buzz corrections handled smoothly

**State Indicators**:
- HIDDEN: Game starting, buzzer not visible
- INACTIVE: Default state, no clue selected
- LOCKED: Buzzer disabled, waiting for host
- UNLOCKED: Buzzer active, green glow
- BUZZED: Player has buzzed, showing reaction time
- FROZEN: Punishment for early buzz or wrong answer

## Error Handling

### Broadcast Failures

**Fallback Mechanisms**:
- Database writes continue even if broadcast fails
- Database state can override broadcast state
- Automatic reconnection via Supabase client
- Players see "waiting for host" on disconnect

**Recovery Scenarios**:
- **Missed broadcast**: Database update provides recovery
- **Channel disconnection**: Automatic reconnection
- **State desync**: Database reconciles state
- **Host disconnect**: Game pauses, players notified

## Troubleshooting

### Common Issues

**Buzzer not unlocking**:
- Check broadcast channel subscription status
- Verify database `is_buzzer_locked` field
- Check console for broadcast errors
- Ensure focused clue is set

**Late buzz corrections not working**:
- Verify all clients receiving broadcasts
- Check BuzzerQueueManager state
- Ensure reaction times calculated correctly
- Review broadcast latency logs

**Database state mismatch**:
- Check for broadcast failures in console
- Verify host database writes completing
- Review database override logs
- Ensure proper error handling

### Debug Logging

**Development Mode**:
```typescript
// Broadcast events
console.log(`🔓 Buzzer unlocked at ${timestamp}`);
console.log(`⚡ Received buzz: ${nickname} (${reactionTime}ms)`);
console.log(`🔄 Late correction: ${nickname} is now fastest`);

// Database reconciliation
console.log(`🔄 Database override: locking buzzer`);
```

## Performance & Reliability

### Performance Metrics

**Target Latencies**:
- **Broadcast latency**: <50ms typical, <100ms p99
- **Lock response**: <50ms from unlock to player UI
- **Buzz response**: <50ms from click to all clients locked
- **Focus update**: <50ms from buzz to focused player change
- **Database backup**: <500ms from broadcast to database

**Monitoring**:
- Broadcast event delivery time
- Database write completion time
- State synchronization accuracy
- Late buzz correction frequency
- Manual override usage rate

### Optimization Features

- **Broadcast-first architecture**: Immediate UI updates, database backup
- **Client-side timing**: Eliminates server latency bias
- **Automatic player focusing**: No manual selection delay
- **Late buzz correction**: Handles network timing variations
- **Error handling**: Non-blocking failures with console warnings

### Failsafe Mechanisms

- **Database override**: Reconciles state if broadcast missed
- **Automatic reconnection**: Handles temporary disconnections
- **Queue management**: Prevents duplicate buzzes
- **State validation**: Ensures valid transitions

## Testing & Validation

### Verified Functionality

✅ **Broadcast-based buzzer**: <50ms latency for all buzzer events
✅ **Automatic player focusing**: Fastest player immediately selected
✅ **Late buzz correction**: Faster late buzzes override slower early buzzes
✅ **Client-side timing**: Accurate reaction time calculation
✅ **Database backup**: All buzzes recorded for game reports
✅ **Manual override**: Host can manually select player if needed
✅ **Error recovery**: Database reconciles state on broadcast failures

### Test Coverage

- **Unit tests**: BroadcastService, BuzzerQueueManager
- **Integration tests**: Full buzz flow with broadcast events
- **Edge cases**: Late buzzes, simultaneous buzzes, disconnections
- **Performance tests**: Latency measurements, stress testing
