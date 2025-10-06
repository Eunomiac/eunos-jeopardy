# Remote Agent Task: Real-Time Buzzer Implementation

## 🎯 **Mission Statement**
Implement a real-time broadcast-based buzzer system for Euno's Jeopardy that provides immediate (<50ms) buzzer responsiveness while maintaining database integrity for game reports. This replaces the current database-driven buzzer system with a hybrid approach using Supabase Realtime broadcast for immediate UI updates and database as the authoritative source of truth.

## 📋 **Primary Reference Document**
**READ THIS FIRST**: `docs/ai/features/REAL-TIME BUZZER.md`

This comprehensive implementation plan contains:
- Complete architecture overview and design principles
- Current system analysis and target architecture
- Detailed implementation phases with code examples
- Technical specifications for broadcast channels and payloads
- Success criteria and testing strategy

**All implementation details are in that document. This prompt provides workflow and quality standards.**

## 🎯 **Core Requirements**

### **Architecture Principles**
1. **Broadcast for Immediacy**: All time-sensitive UI updates via Supabase Realtime broadcast
2. **Host as Database Authority**: Only Host writes to database (eliminates race conditions)
3. **Database as Source of Truth**: Database updates can override broadcast state
4. **Client-Side Timing**: Players calculate reaction times locally (eliminates latency bias)
5. **Automatic Selection**: Fastest player immediately focused (no manual host selection required)

### **Key Features**
- **<50ms buzzer response**: From unlock to player UI update
- **Automatic player focusing**: Fastest buzz immediately selected across all clients
- **Late buzz correction**: Faster late buzzes automatically override slower early buzzes
- **Manual override capability**: Host can manually change focused player for edge cases
- **Database backup**: All buzzes recorded for game reports and state recovery

## 📂 **Implementation Phases**

Follow the phases exactly as outlined in `docs/ai/features/REAL-TIME BUZZER.md`:

### **Phase 1: Broadcast Infrastructure** (4-6 hours)
- Create `BroadcastService.ts` for channel management
- Define broadcast event types and payloads
- Implement type-safe broadcast/receive methods

### **Phase 2: Host Implementation** (6-8 hours)
- Update `GameHostDashboard.tsx` with broadcast channel
- Implement automatic player focusing logic
- Create `BuzzerQueueManager.ts` for queue management
- Update buzzer lock/unlock to broadcast first, then database

### **Phase 3: Player Implementation** (6-8 hours)
- Update `PlayerDashboard.tsx` with broadcast channel
- Remove direct database writes from players
- Implement broadcast-driven buzzer state changes
- Handle late buzz corrections

### **Phase 4: State Management Updates** (4-6 hours)
- Update `BuzzerStateService.ts` for real-time flow
- Ensure instantaneous state transitions
- Add late correction handling

### **Phase 5: Cleanup and Optimization** (4-6 hours)
- Remove deprecated auto-selection timeout logic
- Remove manual player selection requirement (keep override button)
- Remove latency compensation code
- Update all tests for new architecture

### **Phase 6: Documentation and Polish** (2-4 hours)
- Update `docs/ai/features/BUZZER_SYSTEM.md`
- Add monitoring and debugging features
- Document manual override procedures

## 🔧 **Technical Specifications**

### **Broadcast Channel Configuration**
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

### **Event Types**
- `buzzer_unlock`: Host signals buzzers are now active
- `buzzer_lock`: Host signals buzzers are now locked
- `player_buzz`: Player submits buzz with reaction time
- `focus_player`: Host or system sets focused player

### **Performance Targets**
- **Broadcast latency**: <50ms typical, <100ms p99
- **Lock response**: <50ms from unlock broadcast to player UI update
- **Buzz response**: <50ms from player click to all clients locked
- **Focus update**: <50ms from buzz broadcast to focused player change
- **Database backup**: <500ms from broadcast to database confirmation

## 🚨 **Critical Implementation Notes**

### **DO NOT Retain Deprecated Code**
- **Remove** auto-selection timeout logic (no longer needed)
- **Remove** manual player selection requirement (keep override button only)
- **Remove** latency compensation code
- **Remove** player database writes to `buzzes` table
- **Do not** add deprecation warnings or backwards compatibility
- **Do not** add comments referencing changes or what was removed

### **Comments Should Only**
- Explain complex logic that remains
- Document security considerations
- Note performance optimizations
- Describe integration points
- Clarify non-obvious behavior

### **Database Writes**
- **Only Host** writes to database
- Players broadcast buzzes, Host records them
- Database updates follow broadcasts (~500ms later)
- Database can override broadcast state if different

### **Late Buzz Handling**
- All clients track fastest buzz received
- Faster late buzzes immediately override slower early buzzes
- Visual flash acceptable (<100ms duration)
- Database update confirms correct player

## 📊 **Success Criteria**

### **Functional Requirements**
- [ ] Buzzer unlocks within 50ms of host action
- [ ] Player buzz locks all other buzzers within 50ms
- [ ] Fastest player automatically focused within 50ms
- [ ] Late buzzes correctly reorder focus within 100ms
- [ ] Database updates provide backup/recovery
- [ ] Manual host override still available
- [ ] All buzzes recorded in database for reports

### **Code Quality Requirements**
- [ ] No deprecated code retained
- [ ] All tests updated and passing
- [ ] TypeScript compilation succeeds with no errors
- [ ] ESLint passes with no new warnings
- [ ] Comments describe current code only (no change references)
- [ ] Comprehensive test coverage for new features

### **Performance Requirements**
- [ ] Broadcast latency <50ms typical
- [ ] No blocking operations in broadcast handlers
- [ ] Smooth UI transitions (no jank)
- [ ] Database writes don't block UI updates

## 🔄 **Git Workflow Requirements**

### **Branch Management**
```bash
# Create feature branch
git checkout -b feature/real-time-buzzer

# Work on implementation
# ... make changes ...

# Commit frequently (see below)
```

### **Commit Strategy - CRITICAL**
**You MUST commit your progress regularly to avoid losing work:**

1. **Commit after each phase completion**:
   ```bash
   git add .
   git commit -m "feat(buzzer): Complete Phase 1 - Broadcast Infrastructure
   
   - Create BroadcastService with channel management
   - Define all broadcast event types and payloads
   - Implement type-safe broadcast/receive methods
   - Add comprehensive JSDoc documentation
   
   Progress: Phase 1/6 complete"
   
   git push origin feature/real-time-buzzer
   ```

2. **Commit after significant milestones within phases**:
   ```bash
   git add .
   git commit -m "feat(buzzer): Implement automatic player focusing in host dashboard
   
   - Add broadcast channel subscription to GameHostDashboard
   - Implement in-memory buzzer queue with reaction time tracking
   - Add automatic fastest player selection logic
   - Handle late buzz corrections
   
   Progress: Phase 2 - 60% complete"
   
   git push origin feature/real-time-buzzer
   ```

3. **Commit after fixing failing tests**:
   ```bash
   git add .
   git commit -m "test(buzzer): Update tests for broadcast-based buzzer system
   
   - Mock broadcast channel in GameHostDashboard tests
   - Update PlayerDashboard tests for new event handlers
   - Remove tests for deprecated manual selection
   - All tests passing
   
   Progress: Phase 5 - 40% complete"
   
   git push origin feature/real-time-buzzer
   ```

4. **Push immediately after every commit**:
   - Always push after committing
   - This ensures work is backed up and visible
   - Enables monitoring of progress from main development environment

### **Commit Message Format**
```
<type>(<scope>): <subject>

<body>

Progress: <phase info>
```

**Types**: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`
**Scopes**: `buzzer`, `host`, `player`, `service`, `types`

### **Pull Request Submission - CRITICAL**
**When you have completed all 6 phases and all tests pass:**

1. **Final commit**:
   ```bash
   git add .
   git commit -m "feat(buzzer): Complete real-time buzzer implementation
   
   - Implement broadcast-based buzzer system with <50ms latency
   - Add automatic player focusing with late buzz correction
   - Remove deprecated manual selection and timeout logic
   - Update all tests and documentation
   - Achieve all performance and functional requirements
   
   All phases complete. Ready for review."
   
   git push origin feature/real-time-buzzer
   ```

2. **Create Pull Request using GitHub CLI**:
   ```bash
   gh pr create --title "feat: Implement real-time broadcast-based buzzer system" --body "
   ## Summary
   Implements real-time buzzer system using Supabase Realtime broadcast for immediate (<50ms) responsiveness while maintaining database integrity for game reports.

   ## Implementation Details
   - **Architecture**: Hybrid broadcast + database approach
   - **Broadcast latency**: <50ms typical for all buzzer events
   - **Automatic focusing**: Fastest player immediately selected across all clients
   - **Late buzz correction**: Faster late buzzes automatically override
   - **Database authority**: Host-only writes, database as source of truth

   ## Changes Made
   ### Phase 1: Broadcast Infrastructure
   - Created BroadcastService for channel management
   - Defined all broadcast event types and payloads
   - Implemented type-safe broadcast/receive methods

   ### Phase 2: Host Implementation
   - Updated GameHostDashboard with broadcast channel
   - Implemented automatic player focusing logic
   - Created BuzzerQueueManager for queue management
   - Updated buzzer lock/unlock to broadcast first

   ### Phase 3: Player Implementation
   - Updated PlayerDashboard with broadcast channel
   - Removed direct database writes from players
   - Implemented broadcast-driven state changes
   - Added late buzz correction handling

   ### Phase 4: State Management
   - Updated BuzzerStateService for real-time flow
   - Ensured instantaneous state transitions
   - Added late correction handling

   ### Phase 5: Cleanup
   - Removed deprecated auto-selection timeout logic
   - Removed manual selection requirement (kept override)
   - Removed latency compensation code
   - Updated all tests for new architecture

   ### Phase 6: Documentation
   - Updated BUZZER_SYSTEM.md with new architecture
   - Added monitoring and debugging features
   - Documented manual override procedures

   ## Testing
   - ✅ All existing tests updated and passing
   - ✅ New tests for broadcast functionality
   - ✅ Manual testing with multiple clients
   - ✅ Latency testing confirms <50ms performance

   ## Performance Results
   - Broadcast latency: <50ms typical
   - Lock response: <50ms
   - Buzz response: <50ms
   - Focus update: <50ms
   - Database backup: <500ms

   ## Breaking Changes
   None - database schema unchanged, graceful degradation if broadcast fails

   Ready for review and merge.
   " --head feature/real-time-buzzer --base master
   ```

### **Why Frequent Commits Matter**
1. **Work preservation**: Prevents loss if session crashes
2. **Progress visibility**: Main developer can monitor from VS Code
3. **Collaboration**: Enables feedback during development
4. **Recovery**: Can continue from any commit point
5. **Debugging**: Easier to identify when issues were introduced

## 🧪 **Testing Requirements**

### **Test Coverage**
- [ ] Unit tests for BroadcastService methods
- [ ] Unit tests for BuzzerQueueManager logic
- [ ] Integration tests for full buzz flow
- [ ] Component tests for GameHostDashboard broadcast handling
- [ ] Component tests for PlayerDashboard broadcast handling
- [ ] Edge case tests (late buzzes, simultaneous buzzes, disconnections)

### **Manual Testing Checklist**
- [ ] Multi-client testing (3+ players)
- [ ] Network throttling tests (simulate latency)
- [ ] Host disconnect/reconnect scenarios
- [ ] Player disconnect/reconnect scenarios
- [ ] Late buzz correction visual verification
- [ ] Manual override functionality
- [ ] Database reconciliation verification

### **Commands**
```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- BroadcastService.test.ts

# Build to verify TypeScript compilation
npm run build

# Run linter
npm run lint
```

## 📚 **Key Reference Files**

### **Must Read**
- `docs/ai/features/REAL-TIME BUZZER.md` - Complete implementation plan
- `docs/ai/features/BUZZER_SYSTEM.md` - Current buzzer system documentation
- `docs/ai/architecture/VERCEL_IMPLEMENTATION_GUIDELINES.md` - Realtime strategy

### **Code References**
- `src/components/games/GameHostDashboard.tsx` - Host interface
- `src/components/players/PlayerDashboard.tsx` - Player interface
- `src/services/games/GameService.ts` - Game service methods
- `src/services/animations/BuzzerStateService.ts` - State management
- `src/types/BuzzerState.ts` - Buzzer state enum

### **Database Schema**
- `src/services/supabase/types.ts` - TypeScript types
- `games` table: `is_buzzer_locked`, `focused_player_id`
- `buzzes` table: `game_id`, `clue_id`, `user_id`, `reaction_time`

## 🎯 **Final Checklist Before PR**

- [ ] All 6 phases completed
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] No deprecated code retained
- [ ] Comments describe current code only
- [ ] Documentation updated
- [ ] Manual testing completed
- [ ] Performance targets met
- [ ] Frequent commits pushed to branch
- [ ] Pull request created with comprehensive description

## 🚀 **Getting Started**

1. **Read the implementation plan**: `docs/ai/features/REAL-TIME BUZZER.md`
2. **Create feature branch**: `git checkout -b feature/real-time-buzzer`
3. **Start with Phase 1**: Broadcast Infrastructure
4. **Commit after each phase**: Push immediately
5. **Test thoroughly**: After each phase
6. **Create PR when complete**: Use GitHub CLI as shown above

Remember: Commit frequently, push immediately, and create a PR when all phases are complete! 🚀

