# Animation System Guide

## Overview

The Animation System provides a comprehensive, production-ready solution for managing all game animations with:
1. **GSAP Animations** - Complex multi-step animations using GSAP timelines
2. **CSS Transitions** - Simple, performant animations using pure CSS
3. **Host-Driven Triggers** - Animations fire on host actions, not automatic state changes
4. **Live & Instant Modes** - Handle both real-time gameplay and page reload scenarios
5. **CSS-First Design** - Final states defined in CSS, JavaScript only animates

## System Architecture

### Complete Animation Inventory

**6 GSAP Animations:**
1. **BoardIntro** - Board fade-in with staggered cells
2. **CategoryIntro** - Category strip sliding animation
3. **ClueReveal** - Scale from focused cell to center
4. **DailyDoubleReveal** - Dramatic scale with overshoot effect
5. **DailyDoubleClueReveal** - Hide splash to reveal clue text
6. **RoundTransition** - Board fade-out → transition overlay

**1 CSS Transition:**
7. **Player Buzz-In** - Podium overlay fade via `.buzzed-in` class

### Core Principles

1. **Host-Driven Triggers** - Animations fire when host clicks buttons, not on automatic state changes
2. **CSS-First Design** - Final animation states defined in CSS, JavaScript only handles animation logic
3. **No Content Flash** - Elements hidden before population to prevent FOUC
4. **Proper Positioning** - Animations start from correct DOM positions (focused cells)
5. **Complete Cleanup** - Display window cleared when clues complete
6. **Use CSS When Simple** - CSS transitions for basic effects, GSAP for complex sequences

## System Components

### 1. AnimationDefinitions.ts
Contains all GSAP animation definitions with:
- **execute()** - Animation logic (instant or animated)
- **shouldRunInstantly()** - Detect if animation already happened
- **getParamsFromGameState()** - Extract params from game state

### 2. AnimationOrchestrator.ts
Watches game state changes and publishes animation intents:
- Subscribes to `games` table changes
- Compares previous vs next state
- Publishes intents to AnimationEvents bus
- **Host-driven triggers** - Fires on host button clicks

### 3. AnimationEvents.ts
Pub/sub bus for animation intents:
- Lightweight event system
- Recent intent caching (2-second TTL)
- Prevents instant fallback during live transitions

### 4. AnimationService.ts
Orchestrates animation execution:
- `playOnce()` - Dedupe animations
- `waitForElement()` - DOM readiness
- `activeTimelines` - Timeline tracking
- `isPlaying()` / `hasPlayed()` - State queries

### 5. ClueDisplayService.ts
Manages dynamic display window content:
- Populates clue text
- Adds appropriate CSS classes
- Handles daily double splash images

### 6. CSS Transitions
Simple animations via CSS:
- `.buzzed-in` class on podiums
- `.podium-buzzed-in` overlay fades in/out
- No JavaScript needed for simple effects

## Complete Animation Flows

### Regular Clue Flow

1. **Host selects clue** → `focused_clue_id` set → **(no animation)**
2. **Host clicks "Reveal Prompt"** → `clue_states.revealed = true` → **ClueReveal animation**
   - Hide display window (`visibility: hidden`)
   - Populate with clue text + `.jeopardy-clue-display` class
   - Position at focused cell with cell scale
   - Animate to center with full scale and fade in
3. **Host unlocks buzzer** → Players can buzz in
4. **Player buzzes** → `focused_player_id` set → **CSS transition shows buzz-in overlay**
5. **Host adjudicates**:
   - **Correct**: `clue_states.completed = true` → Display fades out and clears
   - **Wrong**: Player locked out, buzzer unlocked for others
   - **All wrong**: `clue_states.completed = true` → Display fades out and clears
   - **Timeout**: `clue_states.completed = true` → Display fades out and clears

### Daily Double Flow

1. **Host selects clue** → `focused_clue_id` set → **(no animation)**
2. **Host clicks "Daily Double!"** → `focused_player_id` set → **DailyDoubleReveal animation**
   - Hide display window (`visibility: hidden`)
   - Populate with clue text + splash image + both classes
   - Position at focused cell with cell scale
   - Animate to center with dramatic overshoot (`back.out(1.7)`)
3. **Host enters wager** → Stored in database
4. **Host clicks "Reveal Prompt"** → `clue_states.revealed = true` → **DailyDoubleClueReveal animation**
   - Hide splash image (`visibility: hidden`)
   - Clue text revealed underneath
5. **Player answers** (no buzzer needed)
6. **Host adjudicates**:
   - **Correct or Wrong**: `clue_states.completed = true` → Display fades out and clears

## Technical Implementation Details

### CSS-First Animation Pattern

**Problem**: JavaScript defining both animation AND final state leads to duplication and maintenance issues.

**Solution**: CSS defines final state, JavaScript only animates.

```scss
// CSS defines final state
.jeopardy-clue-display {
  visibility: hidden; // Prevent FOUC
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  transform-origin: center center;
  width: 80%;
  aspect-ratio: 6/4;
  background: linear-gradient(135deg, $jeopardy-blue 0%, #1a4b8c 100%);
  border: 4px solid $jeopardy-gold;
  font-size: 3rem;
  // ... all styling here
}
```

```typescript
// JavaScript only handles animation
async execute(params, config = {}) {
  const displayWindow = await animationService.waitForElement('.dynamic-display-window');
  const focusedCell = document.querySelector('.clue-cell.focused');

  // Hide before populating (prevent flash)
  gsap.set(displayWindow, { visibility: 'hidden' });

  // Populate content
  await clueDisplayService.populateDisplayWindow(params.clueId, params.gameId, displayWindow);

  // Calculate cell position/scale
  const cellRect = focusedCell.getBoundingClientRect();
  const finalWidth = window.innerWidth * 0.8;
  const finalHeight = finalWidth * (4 / 6);
  const scaleX = cellRect.width / finalWidth;
  const scaleY = cellRect.height / finalHeight;

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;
  const cellCenterX = cellRect.left + cellRect.width / 2;
  const cellCenterY = cellRect.top + cellRect.height / 2;
  const offsetX = cellCenterX - centerX;
  const offsetY = cellCenterY - centerY;

  const timeline = gsap.timeline();

  // Animate FROM cell position TO CSS-defined center position
  timeline.from(displayWindow, {
    autoAlpha: 0,
    x: offsetX,
    y: offsetY,
    scaleX,
    scaleY,
    duration: 0.3,
    ease: 'power2.out'
  });

  timeline.to(displayWindow, { autoAlpha: 1, duration: 0.3 }, 0);
}
```

### CSS Transition Pattern (Buzz-In)

**When to use**: Simple fade-in/fade-out effects that don't need complex sequencing.

```scss
// CSS handles the entire animation
.player-podium {
  position: relative;

  .podium-buzzed-in {
    position: absolute;
    top: 50%;
    left: 50%;
    width: 100%;
    height: 100%;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.5s ease-in-out; // CSS transition
    transform: translate(-50%, -50%);
  }

  &.buzzed-in {
    .podium-buzzed-in {
      opacity: 1; // Triggered by class
    }
    .integrated-buzzer {
      visibility: hidden;
    }
  }
}
```

```typescript
// React component just adds/removes class
const podiumClasses = [
  isMain ? 'player-podium main' : 'player-podium competitor',
  player.isFocused ? 'buzzed-in' : ''
].filter(Boolean).join(' ');

return <div className={podiumClasses}>...</div>;
```

### Display Window Cleanup

**When clue completes**, clear the display window:

```typescript
// In PlayerDashboard clue_states subscription
if (clueState.completed) {
  setShowClueModal(false);
  setCurrentClue(null);
  setBuzzerState(BuzzerState.LOCKED);

  // Clear the dynamic display window
  if (displayWindowRef.current) {
    gsap.to(displayWindowRef.current, {
      autoAlpha: 0,
      duration: 0.3,
      ease: 'power2.out',
      onComplete: () => {
        if (displayWindowRef.current) {
          displayWindowRef.current.innerHTML = '';
          displayWindowRef.current.className = 'dynamic-display-window';
        }
      }
    });
  }
}
```

## Animation Triggers (Host-Driven)

### ClueReveal & DailyDoubleClueReveal
**Trigger**: `clue_states.revealed` changes to `true`
**When**: Host clicks "Reveal Prompt" button
**Location**: PlayerDashboard clue_states subscription

```typescript
// In PlayerDashboard.tsx
useEffect(() => {
  const channel = supabase
    .channel(`clue_states:${gameId}`)
    .on('postgres_changes', { ... }, async (payload) => {
      const clueState = payload.new as ClueState;

      // Trigger animation when clue is revealed
      if (clueState.revealed && (!prevClueState || !prevClueState.revealed)) {
        const isDailyDouble = await ClueService.isDailyDouble(clueState.clue_id);
        if (isDailyDouble) {
          AnimationEvents.publish({
            type: "DailyDoubleClueReveal",
            gameId,
            clueId: clueState.clue_id
          });
        } else {
          AnimationEvents.publish({
            type: "ClueReveal",
            gameId,
            clueId: clueState.clue_id
          });
        }
      }
    });
}, [gameId]);
```

### DailyDoubleReveal
**Trigger**: `focused_player_id` set for daily double clue
**When**: Host clicks "Daily Double!" button
**Location**: AnimationOrchestrator

```typescript
// In AnimationOrchestrator.ts
if (next.focused_player_id && next.focused_player_id !== prev?.focused_player_id && next.focused_clue_id) {
  ClueService.isDailyDouble(next.focused_clue_id).then((isDailyDouble) => {
    if (isDailyDouble) {
      AnimationEvents.publish({
        type: "DailyDoubleReveal",
        gameId,
        clueId: next.focused_clue_id!
      });
    }
  });
}
```

### Player Buzz-In (CSS)
**Trigger**: `player.isFocused` becomes `true`
**When**: Player buzzes in
**Location**: PlayerPodiums component

```typescript
// In PlayerPodiums.tsx
const podiumClasses = [
  isMain ? 'player-podium main' : 'player-podium competitor',
  player.isFocused ? 'buzzed-in' : ''
].filter(Boolean).join(' ');
```

## Key Benefits

✅ **Host-driven triggers** - Animations fire on host actions, not automatic state changes
✅ **CSS-first design** - Final states defined in CSS, JavaScript only animates
✅ **No content flash** - Elements hidden before population
✅ **Correct positioning** - Animations start from focused cell location
✅ **Complete cleanup** - Display window clears on clue completion
✅ **Simplified structure** - Daily doubles use same base as regular clues
✅ **CSS transitions** - Buzz-in uses performant CSS
✅ **Live & instant modes** - Handle both real-time and page reload
✅ **Recent intent caching** - Prevents instant fallback during live transitions
✅ **Modular architecture** - Each animation is self-contained
✅ **Type-safe** - Each animation has its own param type
✅ **Comprehensive logging** - Debug-friendly console output

## Common Patterns

### Creating a New GSAP Animation

1. **Define the animation** in `AnimationDefinitions.ts`:
```typescript
export const MyAnimation: AnimationDefinition<{ myParam: string }> = {
  id: "MyAnimation",

  async execute(params, config = {}) {
    const isInstant = config.instant === true;

    if (isInstant) {
      // Set final state immediately
      gsap.set('.my-element', { autoAlpha: 1 });
      config.onComplete?.();
      return;
    }

    // Animated: Run full timeline
    const timeline = gsap.timeline({
      onComplete: () => {
        config.onComplete?.();
      }
    });

    timeline.to('.my-element', {
      autoAlpha: 1,
      duration: 0.6,
      ease: 'power2.out'
    });

    animationService.activeTimelines.push(timeline);
  },

  shouldRunInstantly(gameState, params) {
    // Check if animation already happened
    const key = `MyAnimation:${params.myParam}`;
    return animationService.hasPlayed(key);
  },

  getParamsFromGameState(gameState) {
    // Extract params from game state
    if (!gameState.my_property) return null;
    return { myParam: gameState.my_property };
  }
};
```

2. **Register the animation**:
```typescript
AnimationRegistry.register(MyAnimation);
```

3. **Publish intent** from orchestrator or component:
```typescript
AnimationEvents.publish({
  type: "MyAnimation",
  gameId,
  myParam: "value"
});
```

### Creating a New CSS Transition

1. **Define CSS** in component SCSS file:
```scss
.my-element {
  opacity: 0;
  transition: opacity 0.5s ease-in-out;

  &.visible {
    opacity: 1;
  }
}
```

2. **Toggle class** in React component:
```typescript
const elementClasses = [
  'my-element',
  isVisible ? 'visible' : ''
].filter(Boolean).join(' ');
```

## Troubleshooting

### Animation not firing
- Check AnimationOrchestrator is publishing the intent
- Verify component is subscribed to AnimationEvents
- Check `shouldRunInstantly()` logic isn't preventing execution
- Look for console logs with 🎬 emoji

### Animation fires instantly instead of animated
- Check `wasRecentlyPublished()` in AnimationEvents
- Verify intent was published within 2-second TTL
- Check `hasPlayed()` isn't returning true incorrectly

### Content flashes before animation
- Ensure element has `visibility: hidden` in CSS
- Verify `gsap.set(element, { visibility: 'hidden' })` before populating
- Check timing of content population vs animation start

### Animation starts from wrong position
- Verify focused cell has `.focused` class
- Check cell position calculation logic
- Ensure transform-origin is set correctly in CSS

### Display window not clearing
- Check `clue_states.completed` subscription is firing
- Verify `displayWindowRef.current` exists
- Check gsap.to() onComplete callback is executing
