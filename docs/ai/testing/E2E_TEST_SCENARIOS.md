# E2E Test Scenarios for Euno's Jeopardy

## Overview

This document outlines comprehensive end-to-end testing scenarios for Euno's Jeopardy based on documented requirements and game flow specifications. These scenarios build upon the established multi-context testing pattern demonstrated in the player-joins-game test.

**Status**: Planning Phase
**Last Updated**: 2025-01-11
**Reference**: Phase 1 - Private Development & Testing

---

## Testing Principles

### Multi-User Context Pattern
All multi-user tests should follow the established pattern:
- Separate browser contexts for each user (host, player1, player2, etc.)
- Console logging for debugging
- Proper cleanup in `finally` blocks
- No logout required between user actions

### Test Categories
- **Smoke Tests**: Critical path validation (quick, essential flows)
- **Integration Tests**: Multi-component interactions
- **Flow Tests**: Complete game sequences
- **Edge Case Tests**: Boundary conditions and error handling

---

## 1. Game Setup & Lobby Tests

### 1.1 Multiple Players Join Game (Smoke Test)
**Priority**: HIGH
**Complexity**: Low
**Estimated Time**: 2-3 hours

**Scenario**:
- Player 1 logs in and sets nickname to "Alice". Confirm 'Waiting for Game' button is disabled.
- Host creates game.
- Player 1's 'Waiting for Game' button is now enabled and changes to 'Join Game'.
- Player 2 logs in and sets nickname to "Bob". Confirm they see 'Join Game' button enabled and NO players listed.
- Player 1 clicks "Join Game". Confirm they see game lobby with only "Alice" listed. Confirm host sees "Alice" in Player Control panel.
- Player 2 clicks "Join Game". Confirm they see game lobby with "Alice" and "Bob" listed. Confirm host sees both players in Player Control panel.
- Player 3 logs in and sets nickname to "Charlie". Confirm they see 'Join Game' button enabled and NO players listed.
- Player 3 clicks "Join Game". Confirm they see game lobby with "Alice", "Bob", and "Charlie" listed. Confirm host sees all 3 players in Player Control panel.

**Acceptance Criteria**:
- ✅ All players successfully join
- ✅ Nicknames display correctly for all users
- ✅ Real-time updates show new players joining
- ✅ Host dashboard shows accurate player count

---

### 1.2 Player Joins After Game Starts
**Priority**: MEDIUM
**Complexity**: Medium
**Estimated Time**: 3-4 hours

**Scenario**:
- Host creates game
- Player 1 logs in and joins game.
- Host starts game.
- Player 2 logs in. Confirm they see 'Waiting for Game' button, and that button is disabled.

**Acceptance Criteria**:
- ✅ Player 2 sees "Waiting for Game" message (i.e. they cannot join an in-progress game, and are not notified that a game is in progress
- ✅ Host does not see Player 2 in player list

---

### 1.3 Host Starts Game with No Players
**Priority**: LOW
**Complexity**: Low
**Estimated Time**: 1-2 hours

**Scenario**:
- Host creates game
- Host attempts to start game without any players

**Acceptance Criteria**:
- ✅ "Start Game" button is disabled
- ✅ Clear message indicates minimum player requirement
- ✅ Game status remains "lobby"

---

## 2. Game Introduction & Board Display Tests

### 2.1 Game Introduction Animation Flow
**Priority**: HIGH
**Complexity**: Medium
**Estimated Time**: 4-5 hours

**Scenario**:
- Host starts game with 2 players
- Game intro animation plays for players
- Host clicks "Introduce Categories"
- Category introduction animation plays
- When animation completes, first category is displayed.
- Host clicks 'next category'
- Category 2 slides in and is displayed to all players
- Host repeats five more times. Confirm categories properly displayed to all players.
- Confirm "Next Category" button now displays "Start Game"
- Host clicks "Start Game"
- Game start animation plays for all users.

**Acceptance Criteria**:
- ✅ Game status transitions: lobby → game_intro → introducing_categories → in_progress
- ✅ All players see animations simultaneously
- ✅ Board displays correctly after animations complete
- ✅ Host controls are appropriate for each status

---

### 2.2 Player Joins During Animation (Page Reload)
**Priority**: MEDIUM
**Complexity**: High
**Estimated Time**: 5-6 hours

**Scenario**:
- Game is in "introducing_categories" status
- Player refreshes page or joins late
- Animation should not replay
- Player sees current game state (i.e. currently-displayed category) immediately

**Acceptance Criteria**:
- ✅ Player sees current game state (not animation)
- ✅ Board displays immediately
- ✅ No animation replay
- ✅ Player can interact normally

---

## 3. Buzzer System Tests

### 3.1 Basic Buzzer Flow (Smoke Test)
**Priority**: HIGH
**Complexity**: Medium
**Estimated Time**: 4-5 hours

**Scenario**:
- Host selects clue
- Host unlocks buzzer
- Player 1 buzzes in
- Host marks correct
- Player 1 score increases

**Acceptance Criteria**:
- ✅ Buzzer unlocks for all players (<50ms)
- ✅ First buzz locks buzzer for all players
- ✅ Host sees focused player highlighted
- ✅ Score updates correctly
- ✅ Clue completes and buzzer resets

---

### 3.2 Multiple Players Buzz (Queue System)
**Priority**: HIGH
**Complexity**: High
**Estimated Time**: 6-8 hours

**Scenario**:
- Host unlocks buzzer
- Player 1 buzzes at 1.2s
- Player 2 buzzes at 0.8s
- Player 3 buzzes at 1.5s
- Host sees queue ordered by reaction time

**Acceptance Criteria**:
- ✅ Player 2 is focused (fastest)
- ✅ Queue shows: Player 2 (0.8s), Player 1 (1.2s), Player 3 (1.5s)
- ✅ All players see buzzer locked
- ✅ Reaction times are accurate (<50ms variance)

---

### 3.3 Wrong Answer Lockout Flow
**Priority**: HIGH
**Complexity**: High
**Estimated Time**: 6-8 hours

**Scenario**:
- Player 1 buzzes, host marks wrong
- Player 1 is locked out
- Player 2 buzzes, host marks wrong
- Player 2 is locked out
- Player 3 buzzes, host marks correct

**Acceptance Criteria**:
- ✅ Player 1 buzzer shows "FROZEN" state
- ✅ Player 1 cannot buzz again on this clue
- ✅ Player 2 can buzz after Player 1 marked wrong
- ✅ Player 3 receives points
- ✅ Clue completes after correct answer

---

### 3.4 All Players Wrong (Stumper)
**Priority**: MEDIUM
**Complexity**: Medium
**Estimated Time**: 4-5 hours

**Scenario**:
- 3 players in game
- All 3 players buzz and are marked wrong
- Clue auto-completes

**Acceptance Criteria**:
- ✅ Clue completes after last player marked wrong
- ✅ No points awarded
- ✅ Host sees "stumper" indication
- ✅ Correct answer displayed to host
- ✅ All players' buzzers reset for next clue

---

### 3.5 Buzzer Timeout (No Buzzes)
**Priority**: MEDIUM
**Complexity**: Medium
**Estimated Time**: 3-4 hours

**Scenario**:
- Host unlocks buzzer
- 5-second countdown begins
- No players buzz
- Clue auto-completes

**Acceptance Criteria**:
- ✅ Countdown visible to all users
- ✅ Clue completes at 0 seconds
- ✅ No points awarded
- ✅ Buzzer resets for next clue

---

## 4. Daily Double Tests

### 4.1 Daily Double Complete Flow (Smoke Test)
**Priority**: HIGH
**Complexity**: High
**Estimated Time**: 6-8 hours

**Scenario**:
- Host selects Daily Double clue
- Host clicks "Daily Double!" button
- Current player auto-selected
- Host enters wager
- Host clicks "Daily Double Wager"
- Clue revealed
- Host clicks "Reveal Prompt"
- Player answers (no buzzing)
- Host marks correct/wrong

**Acceptance Criteria**:
- ✅ Daily Double splash displays
- ✅ Button states transition correctly
- ✅ Current player highlighted
- ✅ Wager validated (min/max rules)
- ✅ Clue bypasses buzzer system
- ✅ Score updates with wager amount
- ✅ Clue completes immediately

---

### 4.2 Daily Double Wager Validation
**Priority**: MEDIUM
**Complexity**: Medium
**Estimated Time**: 3-4 hours

**Scenario**:
- Player has $800
- Host attempts various wagers:
  - $0 (invalid)
  - $500 (valid)
  - $1000 (valid - true daily double)
  - $1500 (invalid - exceeds max)

**Acceptance Criteria**:
- ✅ Minimum wager enforced ($5 or current score)
- ✅ Maximum wager enforced (max of current score or clue value)
- ✅ True Daily Double allowed (up to max clue value)
- ✅ Clear error messages for invalid wagers

---

### 4.3 Daily Double with Negative Score
**Priority**: LOW
**Complexity**: Medium
**Estimated Time**: 3-4 hours

**Scenario**:
- Player has -$200
- Host selects Daily Double
- Player must wager minimum ($5 or $1000, whichever is higher)

**Acceptance Criteria**:
- ✅ Minimum wager rules apply correctly
- ✅ Player can wager despite negative score
- ✅ Score updates correctly (can go more negative)

---

## 5. Round Transition Tests

### 5.1 Jeopardy to Double Jeopardy Transition
**Priority**: HIGH
**Complexity**: High
**Estimated Time**: 6-8 hours

**Scenario**:
- All 30 Jeopardy round clues completed
- Host clicks "Next Round"
- Round transition animation plays
- Double Jeopardy board appears

**Acceptance Criteria**:
- ✅ "Next Round" button enabled after all clues complete
- ✅ Game status: in_progress → round_transition → introducing_categories → in_progress
- ✅ Transition animation plays for all users
- ✅ New board displays with correct categories
- ✅ Clue values doubled ($400-$2000)
- ✅ Scores persist from previous round

---

### 5.2 Double Jeopardy to Final Jeopardy Transition
**Priority**: HIGH
**Complexity**: High
**Estimated Time**: 8-10 hours

**Scenario**:
- All 30 Double Jeopardy clues completed
- Host clicks "Next Round"
- Final Jeopardy sequence begins
- Players with negative scores barred

**Acceptance Criteria**:
- ✅ Game status changes to "final"
- ✅ Final Jeopardy splash displays
- ✅ Category revealed
- ✅ Players with negative scores cannot participate
- ✅ Eligible players see wager input
- ✅ Jeopardy theme plays during thinking time

---

## 6. Final Jeopardy Tests

### 6.1 Final Jeopardy Complete Flow (Smoke Test)
**Priority**: HIGH
**Complexity**: Very High
**Estimated Time**: 10-12 hours

**Scenario**:
- 3 players: Alice ($5000), Bob ($3000), Charlie (-$500)
- Final Jeopardy begins
- Alice and Bob enter wagers and answers
- Charlie is barred (negative score)
- Host reveals in reverse score order (Bob, then Alice)
- Host adjudicates each answer
- Final scores calculated

**Acceptance Criteria**:
- ✅ Charlie cannot participate
- ✅ Alice and Bob see wager input
- ✅ Wagers validated (0 to current score)
- ✅ Answers submitted before timeout
- ✅ Reveal sequence: lowest to highest score
- ✅ Answer displayed first, then wager
- ✅ Scores update correctly
- ✅ Winner determined

---

### 6.2 Final Jeopardy Wager Validation
**Priority**: MEDIUM
**Complexity**: Medium
**Estimated Time**: 4-5 hours

**Scenario**:
- Player has $4000
- Test wagers: $0 (valid), $2000 (valid), $4000 (valid), $5000 (invalid)

**Acceptance Criteria**:
- ✅ Minimum wager: $0
- ✅ Maximum wager: current score
- ✅ Invalid wagers rejected with clear message

---

## 7. Scoring & Game Completion Tests

### 7.1 Score Tracking Throughout Game
**Priority**: HIGH
**Complexity**: Medium
**Estimated Time**: 5-6 hours

**Scenario**:
- Track player scores through multiple clues
- Correct answers add points
- Wrong answers subtract points
- Daily Double wagers applied correctly
- Final Jeopardy wagers applied correctly

**Acceptance Criteria**:
- ✅ Scores update in real-time for all users
- ✅ Score calculations are accurate
- ✅ Negative scores allowed
- ✅ Score persistence across rounds

---

### 7.2 Game Completion (Winner Determination)
**Priority**: HIGH
**Complexity**: Medium
**Estimated Time**: 4-5 hours

**Scenario**:
- Complete game through Final Jeopardy
- Host ends game
- Winner determined by highest score

**Acceptance Criteria**:
- ✅ Game status changes to "completed"
- ✅ Winner highlighted
- ✅ Final scores displayed
- ✅ Game cannot be resumed

---

### 7.3 Game Cancellation (Early End)
**Priority**: LOW
**Complexity**: Low
**Estimated Time**: 2-3 hours

**Scenario**:
- Host cancels game before Final Jeopardy
- Game status changes to "cancelled"

**Acceptance Criteria**:
- ✅ Confirmation dialog appears
- ✅ Game status changes to "cancelled"
- ✅ Players notified
- ✅ Scores preserved but game incomplete

---

## 8. Edge Cases & Error Handling

### 8.1 Player Disconnects During Game
**Priority**: MEDIUM
**Complexity**: High
**Estimated Time**: 6-8 hours

**Scenario**:
- Player closes browser during active game
- Player reconnects
- Game state restored

**Acceptance Criteria**:
- ✅ Player can rejoin game
- ✅ Current game state displayed
- ✅ Score preserved
- ✅ Buzzer state correct

---

### 8.2 Host Disconnects During Game
**Priority**: HIGH
**Complexity**: Very High
**Estimated Time**: 8-10 hours

**Scenario**:
- Host closes browser during active game
- Host reconnects
- Game state restored
- Host controls functional

**Acceptance Criteria**:
- ✅ Host can rejoin game
- ✅ Dashboard displays correctly
- ✅ All controls functional
- ✅ Players unaffected

---

### 8.3 Simultaneous Buzzes (Race Condition)
**Priority**: HIGH
**Complexity**: Very High
**Estimated Time**: 8-10 hours

**Scenario**:
- Two players buzz within 10ms of each other
- System determines winner by timestamp
- Loser added to queue

**Acceptance Criteria**:
- ✅ Fastest player focused
- ✅ Second player in queue
- ✅ No duplicate buzzes
- ✅ Accurate reaction times

---

## 9. Real-Time Synchronization Tests

### 9.1 Broadcast vs Database Consistency
**Priority**: HIGH
**Complexity**: Very High
**Estimated Time**: 10-12 hours

**Scenario**:
- Monitor broadcast events vs database updates
- Verify database is authoritative
- Test override scenarios

**Acceptance Criteria**:
- ✅ Broadcast provides immediate UI updates (<50ms)
- ✅ Database updates within 500ms
- ✅ Database overrides broadcast on conflict
- ✅ No state desynchronization

---

### 9.2 Multiple Clients Same Player
**Priority**: LOW
**Complexity**: High
**Estimated Time**: 6-8 hours

**Scenario**:
- Player opens game in two browser windows
- Actions in one window reflected in other

**Acceptance Criteria**:
- ✅ Both windows show same state
- ✅ Buzzer actions synchronized
- ✅ Score updates in both windows
- ✅ No duplicate buzzes allowed

---

## 10. Performance & Load Tests

### 10.1 Maximum Players (Stress Test)
**Priority**: LOW
**Complexity**: High
**Estimated Time**: 8-10 hours

**Scenario**:
- 10+ players join game
- All players buzz simultaneously
- System handles load

**Acceptance Criteria**:
- ✅ All players can join
- ✅ Buzzer queue handles all buzzes
- ✅ Performance remains acceptable
- ✅ No crashes or errors

---

## Implementation Priority

### Phase 1: Critical Path (Smoke Tests)
1. Multiple Players Join Game (1.1)
2. Basic Buzzer Flow (3.1)
3. Daily Double Complete Flow (4.1)
4. Jeopardy to Double Jeopardy Transition (5.1)
5. Final Jeopardy Complete Flow (6.1)
6. Game Completion (7.2)

**Estimated Total**: 40-50 hours

### Phase 2: Core Functionality
1. Multiple Players Buzz (3.2)
2. Wrong Answer Lockout Flow (3.3)
3. Game Introduction Animation Flow (2.1)
4. Double Jeopardy to Final Jeopardy Transition (5.2)
5. Score Tracking Throughout Game (7.1)

**Estimated Total**: 30-40 hours

### Phase 3: Edge Cases & Polish
1. All remaining scenarios
2. Performance testing
3. Error handling refinement

**Estimated Total**: 60-80 hours

---

## Testing Infrastructure Needs

### Tools & Utilities
- ✅ Multi-context test pattern (established)
- ✅ Console logger helper (established)
- ⏳ Timing assertion helpers (for <50ms requirements)
- ⏳ Game state verification helpers
- ⏳ Score calculation validators
- ⏳ Animation completion waiters

### Test Data
- ⏳ Multiple test clue sets with known Daily Doubles
- ⏳ Test users with various score scenarios
- ⏳ Predefined game states for testing

---

## Notes

- All timing-sensitive tests (buzzer, broadcast) should account for network variability
- Animation tests may need special handling for CI environments
- Consider adding visual regression testing for UI components
- Database cleanup is critical - ensure all tests clean up properly
- Real-time tests may be flaky - implement retry logic where appropriate

---

**Next Steps**:
1. Review and prioritize scenarios with team
2. Create test fixtures and helpers
3. Begin Phase 1 implementation
4. Iterate based on findings
