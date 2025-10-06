# Real-Time Buzzer Implementation Plan

## Overview

This document outlines the implementation plan for converting the current database-driven buzzer system to a real-time broadcast-based system with database backup. The goal is to achieve immediate buzzer responsiveness (<50ms typical) while maintaining data integrity for game reports.

## Current System Analysis

### Current Architecture
- **Communication**: Supabase postgres_changes subscriptions (database-driven)
- **Buzz Recording**: Players write directly to `buzzes` table via `GameService.recordBuzz()`
- **State Management**: `is_buzzer_locked` field in `games` table controls buzzer availability
- **Player Selection**: Host manually selects from buzzer queue after reviewing reaction times
- **Latency**: 200-500ms typical (database round-trip time)

### Current Flow
1. Host unlocks buzzer → Updates `games.is_buzzer_locked = false`
2. Players receive postgres_changes event → Buzzer becomes clickable
3. Player clicks buzzer → Writes to `buzzes` table with reaction time
4. Host receives postgres_changes event → Buzz appears in queue
5. Host clicks player in queue → Updates `games.focused_player_id`
6. Players receive postgres_changes event → Modal updates

### Components Involved
- **PlayerDashboard.tsx**: Player buzzer interface, real-time subscriptions
- **IntegratedBuzzer.tsx**: Visual buzzer component on player podiums
- **GameHostDashboard.tsx**: Host controls, buzzer queue display
- **GameService.ts**: `recordBuzz()`, `toggleBuzzerLock()`, `setFocusedPlayer()`
- **BuzzerStateService.ts**: Buzzer state management and transitions
- **Database Tables**: `games` (is_buzzer_locked, focused_player_id), `buzzes` (reaction times)

## Target Architecture

### Design Principles
1. **Broadcast for Immediacy**: All time-sensitive UI updates via Supabase Realtime broadcast
2. **Host as Database Authority**: Only Host writes to database (eliminates race conditions)
3. **Database as Source of Truth**: Database updates can override broadcast state
4. **Client-Side Timing**: Players calculate reaction times locally (eliminates latency bias)
5. **Automatic Selection**: Fastest player immediately focused (no manual host selection required)

### Communication Channels

#### Broadcast Channel (New)
**Purpose**: Immediate, ephemeral communication for time-sensitive events

**Channel Name**: `game-buzzer:${gameId}`

**Events**:
- `buzzer_unlock`: Host signals buzzers are now active
- `buzzer_lock`: Host signals buzzers are now locked
- `player_buzz`: Player submits buzz with reaction time
- `focus_player`: Host or system sets focused player

**Payload Structures**:
```typescript
// Buzzer unlock event
type BuzzerUnlockPayload = {
  gameId: string;
  clueId: string;
  timestamp: number;  // Server timestamp for client sync
};

// Buzzer lock event
type BuzzerLockPayload = {
  gameId: string;
  timestamp: number;
};

// Player buzz event
type PlayerBuzzPayload = {
  gameId: string;
  clueId: string;
  playerId: string;
  playerNickname: string;
  reactionTimeMs: number;  // Client-calculated
  clientTimestamp: number; // For audit/debugging
};

// Focus player event
type FocusPlayerPayload = {
  gameId: string;
  playerId: string;
  playerNickname: string;
  source: 'auto' | 'manual' | 'correction';
};
```

#### Database Channel (Existing)
**Purpose**: Authoritative state, game reports, reconnection recovery

**Continues to monitor**: `games`, `buzzes`, `players`, `clue_states` tables

**Role**: Backup/override mechanism, initial state on page load

### New Flow

#### Buzzer Unlock Flow
1. **Host clicks "Unlock Buzzer"**
   - Host broadcasts `buzzer_unlock` event with timestamp
   - Host updates `games.is_buzzer_locked = false` in database
   
2. **All clients receive broadcast** (~20-50ms)
   - Players: Buzzer becomes clickable, record unlock timestamp
   - Host: Visual confirmation of unlock state
   
3. **All clients receive database update** (~200-500ms)
   - If state differs from broadcast, database overrides (rare)
   - Provides recovery for clients that missed broadcast

#### Player Buzz Flow
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

#### Late Buzz Correction Flow
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

#### Buzzer Lock Flow
1. **Host clicks "Lock Buzzer"** (or after adjudication)
   - Host broadcasts `buzzer_lock` event
   - Host updates `games.is_buzzer_locked = true` in database
   
2. **All clients receive broadcast** (~20-50ms)
   - Players: Buzzers immediately lock
   - Host: Visual confirmation
   
3. **All clients receive database update** (~200-500ms)
   - Confirms lock state (should match broadcast)

## Implementation Plan

### Phase 1: Broadcast Infrastructure (Foundation)

#### 1.1 Create Broadcast Service
**File**: `src/services/realtime/BroadcastService.ts` (new)

**Responsibilities**:
- Manage Supabase broadcast channel lifecycle
- Provide type-safe broadcast/receive methods
- Handle channel subscription/unsubscription
- Maintain connection health

**Key Methods**:
```typescript
class BroadcastService {
  // Channel management
  static createGameBuzzerChannel(gameId: string): RealtimeChannel
  static subscribeToGameBuzzer(gameId: string, handlers: BuzzerEventHandlers): Subscription
  
  // Broadcast methods (Host only)
  static broadcastBuzzerUnlock(gameId: string, clueId: string): Promise<void>
  static broadcastBuzzerLock(gameId: string): Promise<void>
  static broadcastFocusPlayer(gameId: string, playerId: string, source: string): Promise<void>
  
  // Broadcast methods (Players)
  static broadcastPlayerBuzz(gameId: string, clueId: string, playerId: string, reactionTimeMs: number): Promise<void>
}
```

#### 1.2 Define Broadcast Types
**File**: `src/types/BroadcastEvents.ts` (new)

**Contents**:
- All payload type definitions
- Event name constants
- Handler function types
- Validation schemas (optional)

### Phase 2: Host Implementation

#### 2.1 Update GameHostDashboard
**File**: `src/components/games/GameHostDashboard.tsx`

**Changes**:
1. **Add broadcast channel subscription**
   - Subscribe to `game-buzzer:${gameId}` channel
   - Handle incoming `player_buzz` events
   - Maintain in-memory buzzer queue

2. **Update buzzer lock/unlock handlers**
   - Broadcast unlock/lock events immediately
   - Then update database (existing code)
   - Remove manual player selection requirement

3. **Implement automatic player focusing**
   - Track all received buzzes with reaction times
   - Automatically focus fastest player
   - Update focus when faster buzz arrives
   - Broadcast focus changes
   - Write to database after broadcast

4. **Update buzzer queue display**
   - Show all buzzes received (for monitoring)
   - Highlight focused player
   - Display reaction times
   - Keep manual override button for edge cases

5. **Handle database reconciliation**
   - Compare database state with broadcast state
   - Log discrepancies for debugging
   - Allow database to override if different

#### 2.2 Update GameService (Host Methods)
**File**: `src/services/games/GameService.ts`

**Changes**:
1. **Modify `recordBuzz()` method**
   - Change signature to accept pre-calculated reaction time
   - Remove client-side database writes
   - Only called by Host after receiving broadcast
   - Keep existing database write logic

2. **Keep `toggleBuzzerLock()` method**
   - No changes needed (Host still updates database)
   - Broadcast happens in component before database call

3. **Keep `setFocusedPlayer()` method**
   - No changes needed (Host still updates database)
   - Broadcast happens in component before database call

### Phase 3: Player Implementation

#### 3.1 Update PlayerDashboard
**File**: `src/components/players/PlayerDashboard.tsx`

**Changes**:
1. **Add broadcast channel subscription**
   - Subscribe to `game-buzzer:${gameId}` channel
   - Handle `buzzer_unlock`, `buzzer_lock`, `player_buzz`, `focus_player` events

2. **Update buzzer unlock handling**
   - Record unlock timestamp from broadcast
   - Immediately enable buzzer UI
   - Keep database subscription as backup

3. **Update buzz handler**
   - Calculate reaction time locally
   - Broadcast buzz immediately (don't write to database)
   - Immediately show "BUZZED" state
   - Remove database write call

4. **Implement buzz event handling**
   - Lock buzzer immediately on any `player_buzz` event
   - Track fastest buzz received
   - Update focused player based on fastest buzz
   - Handle late corrections (faster buzz arrives after slower)

5. **Handle database reconciliation**
   - Use database state on initial load
   - Allow database to override broadcast state
   - Log discrepancies for debugging

#### 3.2 Update IntegratedBuzzer
**File**: `src/components/players/IntegratedBuzzer.tsx`

**Changes**:
- Minimal changes (receives state from parent)
- May need faster animation transitions for real-time feel
- Ensure no blocking animations during state changes

### Phase 4: State Management Updates

#### 4.1 Update BuzzerStateService
**File**: `src/services/animations/BuzzerStateService.ts`

**Changes**:
- Review state transition logic for broadcast-driven flow
- Ensure state changes are instantaneous (no delays)
- Add methods for handling late corrections
- May need new state for "correcting" visual feedback

#### 4.2 Create Buzzer Queue Manager
**File**: `src/services/buzzer/BuzzerQueueManager.ts` (new)

**Purpose**: Centralized logic for managing buzzer queue and determining fastest player

**Responsibilities**:
- Maintain ordered list of buzzes by reaction time
- Determine current fastest player
- Handle late buzz insertions
- Provide queue state for UI display

**Key Methods**:
```typescript
class BuzzerQueueManager {
  addBuzz(playerId: string, reactionTimeMs: number): void
  getFastestPlayer(): string | null
  getQueue(): BuzzEntry[]
  clear(): void
  hasBuzz(playerId: string): boolean
}
```

### Phase 5: Cleanup and Optimization

#### 5.1 Remove Deprecated Code
**Files**: Multiple

**Remove**:
- Auto-selection timeout logic (no longer needed)
- Manual player selection requirement
- Host "Select Player" workflow (keep button for manual override only)
- Any latency compensation code
- Redundant database write calls from players

#### 5.2 Update Tests
**Files**: `*.test.tsx`, `*.test.ts`

**Changes**:
- Update mocks for broadcast channel
- Test broadcast event handling
- Test late buzz correction logic
- Test database reconciliation
- Remove tests for deprecated features

### Phase 6: Documentation and Polish

#### 6.1 Update Documentation
**Files**: 
- `docs/ai/features/BUZZER_SYSTEM.md`
- `docs/ai/reference/SUPABASE_REFERENCE.md`

**Updates**:
- Document new broadcast-based architecture
- Update flow diagrams
- Add troubleshooting section for broadcast issues
- Document manual override procedures

#### 6.2 Add Monitoring and Debugging
**Enhancements**:
- Console logging for broadcast events (development only)
- Latency tracking (broadcast vs database arrival times)
- Discrepancy logging (when database overrides broadcast)
- Host UI indicators for broadcast health

## Technical Considerations

### Broadcast Channel Configuration
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

### Error Handling
- **Broadcast failure**: Fall back to database writes (existing behavior)
- **Channel disconnection**: Automatic reconnection via Supabase client
- **State desync**: Database update reconciles state
- **Host disconnect**: Game pauses, players see "waiting for host" message

### Performance Targets
- **Broadcast latency**: <50ms typical, <100ms p99
- **Lock response**: <50ms from unlock broadcast to player UI update
- **Buzz response**: <50ms from player click to all clients locked
- **Focus update**: <50ms from buzz broadcast to focused player change
- **Database backup**: <500ms from broadcast to database confirmation

### Testing Strategy
1. **Unit tests**: Broadcast service methods, queue manager logic
2. **Integration tests**: Full buzz flow with mocked broadcast channel
3. **Manual testing**: Multi-client testing with network throttling
4. **Latency testing**: Measure broadcast vs database timing
5. **Edge cases**: Late buzzes, simultaneous buzzes, host disconnect

## Migration Strategy

### Development Approach
1. Implement broadcast infrastructure without removing existing code
2. Run both systems in parallel (broadcast + database)
3. Add feature flag to toggle between old/new behavior
4. Test thoroughly with real gameplay
5. Remove old code once new system is validated

### Rollback Plan
- Keep database-driven code intact during initial deployment
- Feature flag allows instant rollback if issues arise
- Database continues to work as before (no schema changes)

## Success Criteria

### Functional Requirements
- ✅ Buzzer unlocks within 50ms of host action
- ✅ Player buzz locks all other buzzers within 50ms
- ✅ Fastest player automatically focused within 50ms
- ✅ Late buzzes correctly reorder focus within 100ms
- ✅ Database updates provide backup/recovery
- ✅ Manual host override still available
- ✅ All buzzes recorded in database for reports

### Non-Functional Requirements
- ✅ No breaking changes to existing database schema
- ✅ Graceful degradation if broadcast fails
- ✅ Clear console logging for debugging
- ✅ Comprehensive test coverage maintained
- ✅ Documentation updated and accurate

## Timeline Estimate

- **Phase 1** (Broadcast Infrastructure): 4-6 hours
- **Phase 2** (Host Implementation): 6-8 hours
- **Phase 3** (Player Implementation): 6-8 hours
- **Phase 4** (State Management): 4-6 hours
- **Phase 5** (Cleanup): 4-6 hours
- **Phase 6** (Documentation): 2-4 hours

**Total**: 26-38 hours of development time

## Next Steps

1. Review and approve this implementation plan
2. Create feature branch: `feature/real-time-buzzer`
3. Begin Phase 1: Broadcast Infrastructure
4. Implement phases sequentially with testing between each
5. Conduct multi-client testing before cleanup phase
6. Final review and merge to main branch

