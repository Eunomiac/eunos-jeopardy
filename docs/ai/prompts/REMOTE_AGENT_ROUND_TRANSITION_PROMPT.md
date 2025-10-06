# Remote Agent Task: Game Round Transition Implementation

## 🎯 **Mission Statement**
Implement host-controlled round transitions for Euno's Jeopardy, enabling smooth progression from Jeopardy → Double Jeopardy → Final Jeopardy rounds with proper animations, validations, and user feedback. This feature is critical for completing the core game flow and unblocking Final Jeopardy implementation.

## 📋 **Primary Reference Document**
**READ THIS FIRST**: `docs/ai/features/GAME_ROUND_TRANSITION.md`

This comprehensive implementation plan contains:
- Complete current state analysis and existing infrastructure
- Detailed implementation phases with code examples
- Database schema updates required
- Service layer methods with full specifications
- Host dashboard UI changes and confirmation dialogs
- Animation system integration
- Testing strategy and success criteria

**All implementation details are in that document. This prompt provides workflow and quality standards.**

## 🎯 **Core Requirements**

### **Architecture Principles**
1. **Host-Controlled Progression**: Host explicitly advances rounds via "Next Round" button
2. **Validation with Override**: Automatic enablement when complete, confirmation for early transitions
3. **Animation Integration**: Round transitions follow same pattern as game intro
4. **Progress Tracking**: Filter clue states by round for accurate progress
5. **Database Integrity**: Preserve all clue states for future reporting features

### **Key Features**
- **Automatic button enablement**: "Next Round" enabled when all clues completed
- **Confirmation dialog**: Warning when advancing with incomplete clues
- **Round transition animations**: Placeholder implementations matching game intro pattern
- **Category introductions**: Same flow as Jeopardy round start
- **Progress filtering**: Track only current round's clues in progress display
- **Debug helper**: "Complete Round" button (dev mode only) to instantly complete all clues for testing

## 📂 **Implementation Phases**

Follow the phases exactly as outlined in `docs/ai/features/GAME_ROUND_TRANSITION.md`:

### **Phase 1: Service Layer & Validation** (4-6 hours)
- Add `ClueService.getCompletedCluesCountByRound()` method
- Add `ClueService.isRoundComplete()` method
- Add `GameService.transitionToNextRound()` method
- Add `GameService.getNextRound()` helper method
- Write comprehensive unit tests for all new methods

### **Phase 2: Database Schema Updates** (1-2 hours)
- Add `'round_transition'` to `game_status` enum in database
- Regenerate TypeScript types from Supabase
- Update type definitions in `src/types/game.ts`
- Update all type references throughout codebase

### **Phase 3: Host Dashboard UI** (6-8 hours)
- Update `calculateClueProgress()` to filter by current round
- Add `getCurrentRoundClueIds()` helper function
- Implement round completion state tracking
- Add `handleNextRound()` handler with validation
- Implement confirmation dialog component
- Enable "Next Round" button with proper logic
- Add confirmation dialog UI with styling
- Add debug "Complete Round" button (dev mode only) for testing

### **Phase 4: Animation System Integration** (4-6 hours)
- Enhance `RoundTransitionAnimation` implementation
- Update `AnimationOrchestrator` round detection logic
- Add post-animation status transition handling
- Test animation flow end-to-end with page reload scenarios

### **Phase 5: Testing & Validation** (4-6 hours)
- Write unit tests for service methods
- Write integration tests for UI flow
- Manual testing of all scenarios
- Test animation continuity on page reload
- Verify all acceptance criteria met

## 🔧 **Technical Specifications**

### **Database Migration**
```sql
-- Add 'round_transition' to game_status enum
ALTER TYPE game_status ADD VALUE 'round_transition';
```

### **Status Flow**
```
in_progress → [Host clicks "Next Round"] → round_transition →
[Animation plays] → introducing_categories → [Categories introduced] → in_progress
```

### **Round Progression**
- `jeopardy` → `double` (30 clues each)
- `double` → `final` (1 clue)
- `final` → (no further progression)

### **Performance Targets**
- Round transition animation: ~2 seconds
- Category introduction: ~1 second per category
- Total transition time: ~8-10 seconds per round
- Button state updates: <100ms

## 🚨 **Critical Implementation Notes**

### **DO Follow These Patterns**
- **Match game intro flow**: Round transitions should mirror the existing game intro pattern
- **Filter by round**: Progress tracking must filter clue states by current round
- **Preserve history**: Never delete or "un-flag" completed clues from previous rounds
- **Validate before transition**: Check round completion unless force flag is set
- **Clear focused state**: Reset focused_clue_id and focused_player_id on transition

### **DO NOT Do These Things**
- **Don't modify clue states from previous rounds**: Keep historical data intact
- **Don't skip validation**: Always check round completion unless explicitly forced
- **Don't allow transition beyond final**: Throw error if already at Final Jeopardy
- **Don't implement Final Jeopardy gameplay**: That's a separate feature (deferred)
- **Don't add backwards compatibility**: This is new functionality

### **Comments Should**
- Explain complex round filtering logic
- Document validation rules and edge cases
- Note animation timing and coordination
- Clarify status transition flow
- Describe integration with existing systems

## 📊 **Success Criteria**

### **Functional Requirements**
- [ ] "Next Round" button enables when all clues completed
- [ ] Confirmation dialog appears for early transitions
- [ ] Round transitions update database correctly (jeopardy → double → final)
- [ ] Round transition animation plays smoothly
- [ ] Category introductions follow after animation
- [ ] Progress tracking shows only current round's clues
- [ ] Button disabled at Final Jeopardy (no further progression)
- [ ] All clue states preserved across rounds

### **Code Quality Requirements**
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compilation succeeds (`npm run build`)
- [ ] ESLint passes with no new warnings (`npm run lint`)
- [ ] Comprehensive JSDoc documentation for new methods
- [ ] Unit tests for all service layer methods
- [ ] Integration tests for UI flow

### **User Experience Requirements**
- [ ] Smooth animation transitions
- [ ] Clear confirmation dialog messaging
- [ ] Accurate progress display
- [ ] Responsive button states
- [ ] No visual glitches or flashing

## 🔄 **Git Workflow Requirements**

### **Branch Management**
```bash
# Create feature branch
git checkout -b feature/round-transitions

# Work on implementation
# ... make changes ...

# Commit frequently (see below)
```

### **Commit Strategy - CRITICAL**
**You MUST commit your progress regularly to avoid losing work:**

1. **Commit after each phase completion**:
   ```bash
   git add .
   git commit -m "feat(rounds): Complete Phase 1 - Service Layer & Validation

   - Add ClueService.getCompletedCluesCountByRound() method
   - Add ClueService.isRoundComplete() method
   - Add GameService.transitionToNextRound() method
   - Add GameService.getNextRound() helper
   - Write comprehensive unit tests for all methods

   Progress: Phase 1/5 complete"

   git push origin feature/round-transitions
   ```

2. **Commit after significant milestones within phases**:
   ```bash
   git add .
   git commit -m "feat(rounds): Implement round completion tracking in host dashboard

   - Update calculateClueProgress() to filter by round
   - Add getCurrentRoundClueIds() helper function
   - Add round completion state tracking
   - Update progress display to show current round only

   Progress: Phase 3 - 50% complete"

   git push origin feature/round-transitions
   ```

3. **Commit after fixing failing tests**:
   ```bash
   git add .
   git commit -m "test(rounds): Update tests for round transition functionality

   - Add unit tests for ClueService round methods
   - Add integration tests for GameService.transitionToNextRound()
   - Update GameHostDashboard tests for new button logic
   - All tests passing

   Progress: Phase 5 - 60% complete"

   git push origin feature/round-transitions
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

**Types**: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`, `style`
**Scopes**: `rounds`, `service`, `ui`, `animation`, `database`, `types`

### **Pull Request Submission - CRITICAL**
**When you have completed all 5 phases and all tests pass:**

1. **Final commit**:
   ```bash
   git add .
   git commit -m "feat(rounds): Complete game round transition implementation

   - Implement host-controlled round transitions (jeopardy → double → final)
   - Add automatic button enablement with confirmation for early transitions
   - Implement round transition animations matching game intro pattern
   - Add round-filtered progress tracking
   - Update database schema with round_transition status
   - Write comprehensive tests for all functionality

   All phases complete. Ready for review."

   git push origin feature/round-transitions
   ```

2. **Create Pull Request using GitHub CLI**:
   ```bash
   gh pr create --title "feat: Implement game round transition system" --body "
   ## Summary
   Implements host-controlled round transitions enabling smooth progression from Jeopardy → Double Jeopardy → Final Jeopardy with proper animations, validations, and user feedback.

   ## Implementation Details
   - **Host Control**: Explicit round advancement via 'Next Round' button
   - **Smart Enablement**: Automatic button enable when round complete
   - **Confirmation Dialog**: Warning for early transitions with clue count
   - **Animation Integration**: Round transitions follow game intro pattern
   - **Progress Tracking**: Filtered by current round for accuracy

   ## Changes Made
   ### Phase 1: Service Layer & Validation
   - Added ClueService.getCompletedCluesCountByRound() method
   - Added ClueService.isRoundComplete() method
   - Added GameService.transitionToNextRound() with validation
   - Added GameService.getNextRound() helper
   - Comprehensive unit tests for all methods

   ### Phase 2: Database Schema Updates
   - Added 'round_transition' to game_status enum
   - Regenerated TypeScript types from Supabase
   - Updated type definitions throughout codebase

   ### Phase 3: Host Dashboard UI
   - Updated calculateClueProgress() to filter by round
   - Added getCurrentRoundClueIds() helper
   - Implemented round completion tracking
   - Added handleNextRound() handler with validation
   - Implemented confirmation dialog component
   - Enabled 'Next Round' button with proper logic

   ### Phase 4: Animation System Integration
   - Enhanced RoundTransitionAnimation implementation
   - Updated AnimationOrchestrator round detection
   - Added post-animation status transition handling
   - Tested animation flow with page reload scenarios

   ### Phase 5: Testing & Validation
   - Unit tests for all service methods
   - Integration tests for UI flow
   - Manual testing of all scenarios
   - Animation continuity testing

   ## Testing
   - ✅ All existing tests updated and passing
   - ✅ New tests for round transition functionality
   - ✅ Manual testing with all three rounds
   - ✅ Animation testing with page reloads
   - ✅ Confirmation dialog testing

   ## Database Changes
   - Added 'round_transition' status to game_status enum
   - No breaking changes to existing data

   ## Breaking Changes
   None - all changes are additive

   Ready for review and merge.
   " --head feature/round-transitions --base master
   ```

### **Why Frequent Commits Matter**
1. **Work preservation**: Prevents loss if session crashes
2. **Progress visibility**: Main developer can monitor from VS Code
3. **Collaboration**: Enables feedback during development
4. **Recovery**: Can continue from any commit point
5. **Debugging**: Easier to identify when issues were introduced

## 🧪 **Testing Requirements**

### **Test Coverage**
- [ ] Unit tests for ClueService.getCompletedCluesCountByRound()
- [ ] Unit tests for ClueService.isRoundComplete()
- [ ] Unit tests for GameService.transitionToNextRound()
- [ ] Unit tests for GameService.getNextRound()
- [ ] Integration tests for full round transition flow
- [ ] Component tests for GameHostDashboard round logic
- [ ] Component tests for confirmation dialog
- [ ] Edge case tests (early transition, final round, invalid states)

### **Manual Testing Checklist**
- [ ] Complete Jeopardy round (30 clues) and verify button enables
- [ ] Click "Next Round" and verify smooth transition to Double Jeopardy
- [ ] Complete Double Jeopardy and transition to Final Jeopardy
- [ ] Verify button disabled at Final Jeopardy
- [ ] Test early transition with confirmation dialog
- [ ] Test confirmation dialog cancel functionality
- [ ] Test animation continuity on page reload
- [ ] Verify progress tracking shows only current round clues

### **Commands**
```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- GameService.test.ts

# Build to verify TypeScript compilation
npm run build

# Run linter
npm run lint

# Run dev server for manual testing
npm run dev
```

## 📚 **Key Reference Files**

### **Must Read**
- `docs/ai/features/GAME_ROUND_TRANSITION.md` - Complete implementation plan
- `docs/ai/CURRENT_STATUS.md` - Current project status
- `docs/ai/PROJECT_MANAGEMENT.md` - Project structure and context

### **Code References**
- `src/services/games/GameService.ts` - Game service methods
- `src/services/clues/ClueService.ts` - Clue service methods
- `src/components/games/GameHostDashboard.tsx` - Host interface
- `src/services/animations/AnimationDefinitions.ts` - Animation definitions
- `src/services/animations/AnimationOrchestrator.ts` - Animation orchestration
- `src/types/game.ts` - Type definitions

### **Database Schema**
- `src/services/supabase/types.ts` - TypeScript types
- `games` table: `current_round`, `status`, `focused_clue_id`, `focused_player_id`
- `clue_states` table: `game_id`, `clue_id`, `completed`
- `boards` table: `clue_set_id`, `round`

## 🎯 **Final Checklist Before PR**

- [ ] All 5 phases completed
- [ ] All tests passing (`npm test`)
- [ ] TypeScript compiles (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Database migration applied
- [ ] TypeScript types regenerated
- [ ] Documentation complete
- [ ] Manual testing completed
- [ ] Animation flow tested
- [ ] Frequent commits pushed to branch
- [ ] Pull request created with comprehensive description

## 🚀 **Getting Started**

1. **Read the implementation plan**: `docs/ai/features/GAME_ROUND_TRANSITION.md`
2. **Create feature branch**: `git checkout -b feature/round-transitions`
3. **Start with Phase 1**: Service Layer & Validation
4. **Commit after each phase**: Push immediately
5. **Test thoroughly**: After each phase
6. **Create PR when complete**: Use GitHub CLI as shown above

Remember: Commit frequently, push immediately, and create a PR when all phases are complete! 🚀
