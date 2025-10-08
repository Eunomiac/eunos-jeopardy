# App Testing Issues and Resolution Strategies

This document summarizes all known behavioral issues and improvement strategies for the app.
It is written for an **AI coding assistant** and focuses on *intent, expected behavior, and implementation goals.*
Each issue entry should be interpreted as a direct instruction for diagnosing, refactoring, or implementing specific logic or UI corrections.

---
## Issue 1
**Problem:** Board size and dynamic display window sizes are unresponsive and inconsistent

**Resolution Strategy:** Ensure board (including clues) has the same aspect ratio as the dynamic display window, make sure they are always displayed in the same position

## Issue 2
**Directive:** Remove the pulsing yellow border around focused elements like buttons. This is a purely cosmetic fix and should not affect focus behavior or accessibility.

## Issue 3
**Problem:** Player names extend beyond their podium widths

**Resolution Strategy:** Review why the "`scaleX` to fit" functionality isn't working, and ensure that ellipsis overflow is used if the x-scaling would require half size or less

## Issue 4
**Problem:** Main player buzzer does not lock after (successful) buzz-in

**Resolution Strategy:** All buzzer states should be handled by the instant/real-time broadcast service, even that of the player who sent the broadcast (by buzzing in). When this player receives their own broadcast, his buzzer should immediately be set to the "buzzed in" state.

## Issue 5
**Problem:** Other players' buzzers do not lock after a different player has successfully buzzed in

**Resolution Strategy:** When any other player (i.e. other than the one who sent the broadcast) receives the buzzed-in broadcast, their buzzer should immediately lock.  (Note: We do allow for late broadcasts and the host's database update to override and change buzzer states even after the initial broadcast should have locked them, to account for players who have high latency --- so buzzers should always be able to change their state whenever they receive a broadcast message or database update; in other words, they should be completely controlled by those broadcasts/database updates, without for example ignoring any that come after they've been locked)

## Issue 6
**Problem:** The five second clue timer is not being cancelled when a player buzzes in

**Resolution Strategy:** When any player buzzes in, the auto-cancel 5-second clue timer should be disabled.  (Keep in mind that the timer should restart at 5 seconds if the buzzers are subsequently unlocked, which usually happens if a player gets the answer wrong and a new round of buzzing is initiated)

## Issue 7
**Problem:** The initial position of the dynamic display window is not being set to overlay the clue cell that triggered it (so that it appears as if that cell were expanding to reveal the prompt).

**Resolution Strategy:** The clue reveal and daily double animations need to determine the position of the triggering cell, and both scale and absolutely position the dynamic display window to the same location. Only then should the fade-in and scale-up animation proceed.

## Issue 8
**Problem:** The 'continue to next round when clues are remaining' confirmation dialog is not properly positioned.

**Resolution Strategy:** Implement a centralized `Alert` component for the `GameHostDashboard` and consolidate all notifications into this unified system. The component should support three alert types:

1. **Status Updates** – Displayed at the top of the interface (e.g. “Clue selected: …”). Always show the full text of the alert, even across multiple lines or smaller font sizes.
2. **Notification Pop-Ups** – Centered modal popups that pause gameplay with a single `OK` button to close and resume play.
3. **Confirmation Pop-Ups** – Identical to Notification Pop-Ups but include both `OK` and `Cancel` buttons. Used for actions requiring confirmation (e.g. ending a round early).

## Issue 9
**Problem:** After confirming advancement to the next round while clues are remaining, the `GameHostDashboard` jumps immediately to the fully-populated board, despite the game status reading "Round Transition. There are no category introduction controls, and the Board Control panel is active, allowing the Host to trigger clue selection.  On the `PlayerDashboard`, nothing happens _until_ the host selects a clue – this causes an update on the player side, which immediately refreshes the board to the next round, without playing any animation. (It should be noted that, during this time, the game status never advances past “Round Transition”)

**Resolution Strategy:** The "Round Transition" state should last only as long as the round start animation takes to play (it's identical to the "Game Intro" status, used at the start of the "jeopardy" round).  Moreover, the Board Control panel should not be enabled during this state: Again, just like the "Game Intro" state, the controls for category introduction should instead display in that panel (i.e. the "Introduce Categories" button and associated text).  I suspect many of the other problems relating to the "double" round are the result of the game state never advancing past "Round Transition", so I won't elaborate on them until we get that part fixed.

## Issue 10
**Problem:** After advancing to the next round when all clues have been completed, the jeopardy board element on the player UI fades out (likely in preparation for the round transition animation, which doesn't appear to play).

**Resolution Strategy:** The board should not fade out when a round transition is triggered:  All changes to the board's appearance will be handled by the round transition animation.
