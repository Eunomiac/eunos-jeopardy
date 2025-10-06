# Game Round Transition Feature

**Feature Owner**: Development Team
**Status**: Planning
**Priority**: High
**Dependencies**: Animation System (Complete), Daily Double Flow (Complete)

---

## Overview

This document provides a comprehensive implementation plan for host-controlled round transitions in the Jeopardy! game, enabling smooth progression from Jeopardy → Double Jeopardy → Final Jeopardy rounds with proper animations, validations, and user feedback.

### Feature Scope

**Core Functionality:**
- Host-controlled "Next Round" button to advance game rounds
- Automatic button enablement when all clues in current round are completed
- Confirmation dialog when advancing with incomplete clues
- Round transition animations (placeholder implementations)
- Category introduction sequences for each new round
- Progress tracking filtered by current round

**Out of Scope (Deferred):**
- Final Jeopardy-specific gameplay mechanics (wagering, answer submission, etc.)
- Automatic round advancement without host action
- Round-specific scoring multipliers
- Tournament mode or multi-game sessions

---

## Current State Analysis

### Existing Infrastructure

**Database Schema:**
- ✅ `games.current_round` field exists (enum: "jeopardy" | "double" | "final")
- ✅ `clue_states` table tracks completion status per clue
- ✅ `boards` table has round-specific data (jeopardy, double, final)
- ✅ `categories` and `clues` tables linked to boards

**Animation System:**
- ✅ `RoundTransitionAnimation` defined in `AnimationDefinitions.ts`
- ✅ `AnimationOrchestrator` detects `current_round` changes
- ✅ Animation event publishing system in place
- ⚠️ Round transition animations are placeholder implementations

**Host Dashboard:**
- ✅ "Next Round" button exists but is disabled
- ✅ Progress tracking displays clues remaining
- ✅ `calculateClueProgress()` function tracks completion
- ⚠️ Progress calculation doesn't filter by round
- ❌ No confirmation dialog for early transitions
- ❌ No round transition handler

**Game Service:**
- ✅ `GameService.updateGame()` can update `current_round`
- ✅ `GameService.createGame()` initializes with "jeopardy" round
- ❌ No dedicated round transition method with validation

---

## Implementation Plan

### Phase 1: Service Layer & Validation

#### 1.1 Round Completion Detection

**File**: `src/services/clues/ClueService.ts`

**New Method**: `getCompletedCluesCountByRound(gameId: string, round: RoundType): Promise<number>`

```typescript
/**
 * Gets count of completed clues for a specific round.
 *
 * Filters clue states by round to accurately track progress within
 * the current round, ignoring completed clues from previous rounds.
 *
 * @param gameId - UUID of the game
 * @param round - Round type to check ("jeopardy" | "double" | "final")
 * @returns Promise resolving to count of completed clues in the round
 */
static async getCompletedCluesCountByRound(
  gameId: string,
  round: RoundType
): Promise<number> {
  // Query strategy:
  // 1. Get game's clue_set_id
  // 2. Get board_id for the specified round
  // 3. Get all clue_ids for that board
  // 4. Count clue_states where clue_id IN (board clues) AND completed = true
}
```

**New Method**: `isRoundComplete(gameId: string, round: RoundType): Promise<boolean>`

```typescript
/**
 * Checks if all clues in a round have been completed.
 *
 * @param gameId - UUID of the game
 * @param round - Round type to check
 * @returns Promise resolving to true if all clues completed
 */
static async isRoundComplete(gameId: string, round: RoundType): Promise<boolean> {
  const totalClues = round === "final" ? 1 : 30;
  const completedCount = await this.getCompletedCluesCountByRound(gameId, round);
  return completedCount >= totalClues;
}
```

#### 1.2 Round Transition Service Method

**File**: `src/services/games/GameService.ts`

**New Method**: `transitionToNextRound(gameId: string, hostId: string, force?: boolean): Promise<Game>`

```typescript
/**
 * Transitions the game to the next round with validation.
 *
 * Handles round progression: jeopardy → double → final
 * Validates round completion unless force flag is set.
 * Updates game status to trigger round transition animation.
 *
 * **Round Progression:**
 * - jeopardy → double: Advances to Double Jeopardy
 * - double → final: Advances to Final Jeopardy
 * - final → (error): Cannot advance beyond Final Jeopardy
 *
 * **Validation:**
 * - Checks if current round is complete (unless force = true)
 * - Verifies host authorization
 * - Ensures game is in 'in_progress' status
 *
 * **Status Transitions:**
 * - Sets status to 'round_transition' (new status)
 * - Updates current_round to next round
 * - Animation orchestrator detects change and triggers animation
 * - After animation, status transitions to 'introducing_categories'
 *
 * @param gameId - UUID of the game
 * @param hostId - UUID of the host (for authorization)
 * @param force - If true, skip round completion validation
 * @returns Promise resolving to updated game
 * @throws {Error} When unauthorized, invalid state, or already at final round
 */
static async transitionToNextRound(
  gameId: string,
  hostId: string,
  force: boolean = false
): Promise<Game> {
  // 1. Get and validate game
  const game = await this.getGame(gameId, hostId);

  // 2. Validate game status
  if (game.status !== 'in_progress') {
    throw new Error(`Cannot transition rounds: Game is not in progress (status: ${game.status})`);
  }

  // 3. Determine next round
  const nextRound = this.getNextRound(game.current_round);
  if (!nextRound) {
    throw new Error('Cannot advance beyond Final Jeopardy');
  }

  // 4. Check round completion (unless forced)
  if (!force) {
    const isComplete = await ClueService.isRoundComplete(gameId, game.current_round);
    if (!isComplete) {
      throw new Error('Current round is not complete. Use force=true to override.');
    }
  }

  // 5. Update game to trigger round transition
  return this.updateGame(gameId, {
    current_round: nextRound,
    status: 'round_transition' as GameStatus,
    focused_clue_id: null,
    focused_player_id: null,
    is_buzzer_locked: true
  }, hostId);
}

/**
 * Helper method to determine next round in sequence.
 */
private static getNextRound(currentRound: RoundType): RoundType | null {
  const roundSequence: Record<RoundType, RoundType | null> = {
    'jeopardy': 'double',
    'double': 'final',
    'final': null
  };
  return roundSequence[currentRound];
}
```

**Note**: This introduces a new game status `'round_transition'` which needs to be added to the database enum.

---

### Phase 2: Database Schema Updates

#### 2.1 Add Round Transition Status

**SQL Migration**:

```sql
-- Add 'round_transition' to game_status enum
ALTER TYPE game_status ADD VALUE 'round_transition';

-- This allows the game to be in a transitional state between rounds
-- Status flow: in_progress → round_transition → introducing_categories → in_progress
```

**TypeScript Type Updates**:

**File**: `src/types/game.ts`

```typescript
type GameStatus =
  | "lobby"
  | "game_intro"
  | "introducing_categories"
  | "in_progress"
  | "round_transition"  // NEW
  | "completed"
  | "cancelled"
```

**File**: `src/services/supabase/types.ts`

After running the migration, regenerate types:
```bash
npx supabase gen types typescript --project-id szinijrajifovetkthcz > src/services/supabase/types.ts
```

---

### Phase 3: Host Dashboard UI

#### 3.1 Round Progress Calculation Update

**File**: `src/components/games/GameHostDashboard.tsx`

**Update Function**: `calculateClueProgress()`

```typescript
/**
 * Helper function to calculate clue completion progress for current round only.
 */
const calculateClueProgress = (
  clueStates: ClueState[],
  currentRound: string,
  clueSetData: ClueSetData | null
) => {
  if (!clueSetData) {
    return { completedCount: 0, totalClues: 0, percentage: 0 };
  }

  // Get clue IDs for current round
  const currentRoundClueIds = getCurrentRoundClueIds(clueSetData, currentRound);

  // Filter clue states to only include current round
  const currentRoundStates = clueStates.filter(state =>
    currentRoundClueIds.includes(state.clue_id)
  );

  const completedCount = currentRoundStates.filter(state => state.completed).length;
  const totalClues = currentRound === "final" ? 1 : 30;
  const percentage = totalClues > 0 ? (completedCount / totalClues) * 100 : 0;

  return {
    completedCount,
    totalClues,
    percentage: Math.round(percentage),
  };
};

/**
 * Helper to extract clue IDs for a specific round from clue set data.
 */
const getCurrentRoundClueIds = (
  clueSetData: ClueSetData,
  round: string
): string[] => {
  if (round === "final") {
    return clueSetData.rounds.final.clues?.map(c => c.id) || [];
  }

  const roundData = clueSetData.rounds[round as "jeopardy" | "double"];
  if (!Array.isArray(roundData)) return [];

  return roundData.flatMap(category =>
    category.clues.map(clue => clue.id)
  );
};
```

#### 3.2 Next Round Button Logic

**File**: `src/components/games/GameHostDashboard.tsx`

**New State**:
```typescript
const [showRoundTransitionConfirm, setShowRoundTransitionConfirm] = useState(false);
const [isRoundComplete, setIsRoundComplete] = useState(false);
```

**New Effect** (check round completion):
```typescript
useEffect(() => {
  if (!game || !clueSetData) return;

  const checkRoundCompletion = () => {
    const progress = calculateClueProgress(clueStates, game.current_round, clueSetData);
    setIsRoundComplete(progress.completedCount >= progress.totalClues);
  };

  checkRoundCompletion();
}, [clueStates, game?.current_round, clueSetData]);
```

**New Handler**:
```typescript
const handleNextRound = async () => {
  if (!user || !game) return;

  try {
    // Check if round is complete
    if (!isRoundComplete) {
      // Show confirmation dialog
      setShowRoundTransitionConfirm(true);
      return;
    }

    // Proceed with transition
    await performRoundTransition();
  } catch (error) {
    console.error("Failed to transition round:", error);
    setMessage(
      `Failed to advance round: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    setMessageType("error");
  }
};

const performRoundTransition = async () => {
  if (!user || !game) return;

  setMessage("Transitioning to next round...");
  setMessageType("info");

  const updatedGame = await GameService.transitionToNextRound(
    game.id,
    user.id,
    !isRoundComplete // force if not complete
  );

  setGame(updatedGame);
  setMessage(`Advanced to ${updatedGame.current_round} round`);
  setMessageType("success");
};

const handleConfirmRoundTransition = async () => {
  setShowRoundTransitionConfirm(false);
  await performRoundTransition();
};

const handleCancelRoundTransition = () => {
  setShowRoundTransitionConfirm(false);
};
```

**Update Button**:
```typescript
<button
  className="jeopardy-button flex-1"
  onClick={handleNextRound}
  disabled={!game || game.status !== 'in_progress' || game.current_round === 'final'}
  title="Advance to next round"
>
  Next Round
</button>
```

#### 3.3 Debug Helper: Complete All Clues Button

**Purpose**: Development/testing utility to quickly complete all clues in the current round without manually resolving each one.

**File**: `src/components/games/GameHostDashboard.tsx`

**New Handler**:
```typescript
/**
 * DEBUG ONLY: Marks all clues in the current round as completed.
 * This is a development utility to test round transitions without
 * manually resolving all 30 clues.
 */
const handleDebugCompleteAllClues = async () => {
  if (!user || !game || !clueSetData) return;

  try {
    setMessage("DEBUG: Completing all clues in current round...");
    setMessageType("info");

    // Get all clue IDs for current round
    const currentRoundClueIds = getCurrentRoundClueIds(clueSetData, game.current_round);

    // Mark all as completed in database
    const { error } = await supabase
      .from('clue_states')
      .update({ completed: true })
      .eq('game_id', game.id)
      .in('clue_id', currentRoundClueIds);

    if (error) {
      throw new Error(`Failed to complete clues: ${error.message}`);
    }

    // Refresh clue states
    const updatedClueStates = await ClueService.getGameClueStates(game.id);
    setClueStates(updatedClueStates);

    setMessage(`DEBUG: Completed all ${currentRoundClueIds.length} clues in ${game.current_round} round`);
    setMessageType("success");
  } catch (error) {
    console.error("Failed to complete all clues:", error);
    setMessage(
      `DEBUG: Failed to complete clues: ${error instanceof Error ? error.message : "Unknown error"}`
    );
    setMessageType("error");
  }
};
```

**Add Debug Button** (in game control buttons section):
```typescript
<div className="game-control-buttons d-flex gap-2 mb-3">
  <button
    className="jeopardy-button flex-1"
    onClick={() => {
      const buttonConfig = getGameControlButton(game);
      if (buttonConfig.handler === "start") {
        handleStartGame();
      } else if (buttonConfig.handler === "end") {
        handleEndGame();
      }
    }}
    disabled={getGameControlButton(game).disabled}
  >
    {getGameControlButton(game).text}
  </button>
  <button
    className="jeopardy-button flex-1"
    onClick={handleNextRound}
    disabled={!game || game.status !== 'in_progress' || game.current_round === 'final'}
    title="Advance to next round"
  >
    Next Round
  </button>

  {/* DEBUG BUTTON - Remove before production */}
  {import.meta.env.DEV && (
    <button
      className="jeopardy-button flex-1"
      onClick={handleDebugCompleteAllClues}
      disabled={!game || game.status !== 'in_progress'}
      title="DEBUG: Mark all clues in current round as completed"
      style={{ opacity: 0.7, fontSize: '0.85em' }}
    >
      🐛 Complete Round
    </button>
  )}
</div>
```

**Notes**:
- Button only visible in development mode (`import.meta.env.DEV`)
- Styled differently to indicate debug functionality (lower opacity, smaller text, bug emoji)
- Should be removed or disabled before production deployment
- Useful for testing round transitions, Final Jeopardy flow, and game completion

**Add Confirmation Dialog**:
```typescript
{showRoundTransitionConfirm && (
  <div className="confirmation-overlay">
    <div className="confirmation-dialog">
      <h3>Advance Round?</h3>
      <p>
        There are {calculateClueProgress(clueStates, game.current_round, clueSetData).totalClues -
                  calculateClueProgress(clueStates, game.current_round, clueSetData).completedCount} clues
        remaining in this round.
      </p>
      <p>Are you sure you want to advance to the next round?</p>
      <div className="confirmation-buttons">
        <button
          className="jeopardy-button red"
          onClick={handleCancelRoundTransition}
        >
          Cancel
        </button>
        <button
          className="jeopardy-button green"
          onClick={handleConfirmRoundTransition}
        >
          Advance Round
        </button>
      </div>
    </div>
  </div>
)}
```

---

### Phase 4: Animation System Integration

#### 4.1 Round Transition Animation Enhancement

**File**: `src/services/animations/AnimationDefinitions.ts`

**Update**: `RoundTransitionAnimation`

The existing animation is a placeholder. Enhance it to match the game intro pattern:

```typescript
/**
 * Round Transition Animation
 *
 * Animates the transition between game rounds (jeopardy → double → final).
 * Similar to game intro, but with round-specific messaging.
 *
 * Triggers: When current_round changes AND status is 'round_transition'
 * Instant: When status IS 'round_transition' (page reload scenario)
 */
export const RoundTransitionAnimation: AnimationDefinition<{
  fromRound: string;
  toRound: string;
  gameId: string;
}> = {
  id: "RoundTransition",

  async execute(params, config = {}) {
    const isInstant = config.instant === true;
    console.log(`🎬 [RoundTransitionAnimation] ${isInstant ? 'Instant' : 'Animated'} transition from ${params.fromRound} to ${params.toRound}`);

    const animationService = AnimationService.getInstance();
    const board = await animationService.waitForElement('.jeopardy-board', 2000);

    // For now, use a simple fade out/in placeholder
    // TODO: Implement round-specific transition graphics

    if (isInstant) {
      gsap.set(board, { autoAlpha: 0 });
      console.log(`🎬 [RoundTransitionAnimation] Instant setup complete`);
      config.onComplete?.();
      return;
    }

    return new Promise((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          console.log(`🎬 [RoundTransitionAnimation] Animation complete`);
          config.onComplete?.();
          resolve();
        }
      });

      // Fade out current board
      timeline.to(board, {
        autoAlpha: 0,
        duration: 0.5,
        ease: 'power2.inOut'
      });

      // Placeholder: Show round transition message
      // TODO: Add round-specific splash graphics
      timeline.to({}, { duration: 1.0 }); // Hold

      // Note: Board will fade back in during category introduction phase

      (animationService as any).activeTimelines?.push(timeline);
    });
  },

  checkForInstantRun(gameState) {
    return gameState.status === ('round_transition' as GameStatus);
  },

  getParamsFromGameState(gameState) {
    // This animation needs both old and new round info
    // The orchestrator will provide this when publishing the event
    return null; // Params provided by orchestrator
  }
};
```

#### 4.2 Animation Orchestrator Update

**File**: `src/services/animations/AnimationOrchestrator.ts`

The orchestrator already detects round changes. Ensure it only triggers when status is 'round_transition':

```typescript
// Round transition when current_round changes AND status is round_transition
if (
  next.current_round &&
  prev?.current_round &&
  next.current_round !== prev.current_round &&
  next.status === ('round_transition' as GameStatus)
) {
  console.log(`🎬 [AnimationOrchestrator] Detected RoundTransition trigger`);
  AnimationEvents.publish({
    type: "RoundTransition",
    gameId,
    fromRound: prev.current_round,
    toRound: next.current_round
  });
}
```

#### 4.3 Post-Animation Status Transition

After the round transition animation completes, the game needs to transition to category introduction phase.

**File**: `src/components/games/GameHostDashboard.tsx`

**New Effect** (handle round transition completion):

```typescript
useEffect(() => {
  if (!game || game.status !== 'round_transition') return;

  // Subscribe to animation completion
  const handleAnimationComplete = async () => {
    if (!user) return;

    try {
      // Transition to category introduction phase
      await GameService.startCategoryIntroductions(game.id, user.id);
    } catch (error) {
      console.error("Failed to start category introductions:", error);
    }
  };

  // Listen for RoundTransition animation completion
  const unsubscribe = AnimationEvents.subscribe((event) => {
    if (event.type === 'RoundTransition' && event.gameId === game.id) {
      // Animation started - wait for completion
      // This is a simplified approach; in production, we'd track animation state
      setTimeout(handleAnimationComplete, 2000); // Match animation duration
    }
  });

  return () => unsubscribe();
}, [game?.status, game?.id, user]);
```

**Note**: This is a simplified approach. A more robust solution would track animation completion state explicitly.

---

### Phase 5: Testing & Validation

#### 5.1 Unit Tests

**File**: `src/services/games/GameService.test.ts`

```typescript
describe('GameService.transitionToNextRound', () => {
  it('should transition from jeopardy to double', async () => {
    // Test implementation
  });

  it('should transition from double to final', async () => {
    // Test implementation
  });

  it('should throw error when transitioning beyond final', async () => {
    // Test implementation
  });

  it('should throw error when round is incomplete without force flag', async () => {
    // Test implementation
  });

  it('should allow transition with incomplete round when force=true', async () => {
    // Test implementation
  });
});
```

**File**: `src/services/clues/ClueService.test.ts`

```typescript
describe('ClueService.isRoundComplete', () => {
  it('should return true when all 30 clues completed for jeopardy', async () => {
    // Test implementation
  });

  it('should return false when clues remain', async () => {
    // Test implementation
  });

  it('should only count clues from specified round', async () => {
    // Test implementation
  });
});
```

#### 5.2 Integration Testing

**Manual Test Scenarios:**

1. **Complete Round Transition**
   - Play through all 30 clues in Jeopardy round
   - Verify "Next Round" button becomes enabled
   - Click button and verify smooth transition to Double Jeopardy
   - Verify category introductions play
   - Verify new board displays correctly

2. **Early Round Transition**
   - Complete only 20 clues in Jeopardy round
   - Click "Next Round" button
   - Verify confirmation dialog appears
   - Cancel and verify game continues
   - Click again and confirm
   - Verify transition proceeds

3. **Final Round Transition**
   - Complete Double Jeopardy round
   - Transition to Final Jeopardy
   - Verify Final Jeopardy board structure (single category/clue)
   - Verify "Next Round" button is disabled

4. **Animation Continuity**
   - Trigger round transition
   - Reload page mid-animation
   - Verify instant state setup (no re-animation)

---

## Implementation Checklist

### Phase 1: Service Layer ✅
- [ ] Add `ClueService.getCompletedCluesCountByRound()`
- [ ] Add `ClueService.isRoundComplete()`
- [ ] Add `GameService.transitionToNextRound()`
- [ ] Add `GameService.getNextRound()` helper
- [ ] Add unit tests for new methods

### Phase 2: Database ✅
- [ ] Add 'round_transition' to game_status enum
- [ ] Regenerate TypeScript types
- [ ] Update type definitions in `src/types/game.ts`

### Phase 3: Host Dashboard ✅
- [ ] Update `calculateClueProgress()` to filter by round
- [ ] Add `getCurrentRoundClueIds()` helper
- [ ] Add round completion state tracking
- [ ] Implement `handleNextRound()` handler
- [ ] Implement confirmation dialog
- [ ] Enable "Next Round" button with proper logic
- [ ] Add confirmation dialog UI

### Phase 4: Animations ✅
- [ ] Enhance `RoundTransitionAnimation` implementation
- [ ] Update `AnimationOrchestrator` round detection
- [ ] Add post-animation status transition logic
- [ ] Test animation flow end-to-end

### Phase 5: Testing ✅
- [ ] Write unit tests for service methods
- [ ] Write integration tests for UI flow
- [ ] Manual testing of all scenarios
- [ ] Test animation continuity on page reload

---

## Future Enhancements

### Post-MVP Features

1. **Round-Specific Transition Graphics**
   - Custom splash screens for "Double Jeopardy!" and "Final Jeopardy!"
   - Animated round titles with authentic Jeopardy styling
   - Sound effects for round transitions

2. **Automatic Round Advancement**
   - Optional setting to auto-advance when round completes
   - Configurable delay before auto-advancement
   - Host override capability

3. **Round Statistics**
   - Display round completion time
   - Show player performance by round
   - Track Daily Double success rates per round

4. **Round Replay**
   - Allow host to review completed rounds
   - Display final board state for each round
   - Export round data for analysis

---

## Technical Notes

### Database Considerations

- Clue states persist across rounds for reporting purposes
- Progress tracking must filter by round to avoid counting previous rounds
- Round transitions clear focused clue/player state
- Buzzer remains locked during transitions

### Animation Timing

- Round transition animation: ~2 seconds
- Category introduction: ~1 second per category
- Total transition time: ~8-10 seconds per round

### Error Handling

- Validate game status before allowing transitions
- Prevent transitions beyond Final Jeopardy
- Handle animation failures gracefully
- Provide clear error messages to host

### Performance

- Clue state queries should be indexed by game_id and clue_id
- Round completion checks are lightweight (single count query)
- Animation system uses GSAP for optimal performance

---

## Dependencies

### Required Before Implementation
- ✅ Animation system (complete)
- ✅ Daily Double flow (complete)
- ✅ Category introduction system (complete)

### Blocks Future Features
- ❌ Final Jeopardy implementation (depends on round transitions)
- ❌ Game completion workflow (depends on Final Jeopardy)
- ❌ Tournament mode (depends on complete round system)

---

## Estimated Effort

- **Phase 1 (Service Layer)**: 4-6 hours
- **Phase 2 (Database)**: 1-2 hours
- **Phase 3 (Host Dashboard)**: 6-8 hours
- **Phase 4 (Animations)**: 4-6 hours
- **Phase 5 (Testing)**: 4-6 hours

**Total Estimated Effort**: 19-28 hours

---

*Document Version: 1.0*
*Last Updated: 2025-01-21*
*Author: Development Team*
