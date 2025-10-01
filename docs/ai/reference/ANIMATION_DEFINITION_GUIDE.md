# Animation Definition System Guide

## Overview

The Animation Definition System provides a modular, globally-applicable solution for managing animations that need to handle both:
1. **Live animations** - Triggered by real-time subscription events
2. **Instant setup** - Applied when components mount mid-game (page reload scenarios)

## Core Concepts

### The Problem

Components initialize with `visibility: hidden` to prevent FOUC (Flash of Unstyled Content). However, we need to distinguish between:

- **"Animation hasn't happened yet"** - Stay hidden until subscription triggers animation
- **"Animation already happened"** - Instantly apply final state (page reload/late join)

### The Solution

Each animation is self-contained with:
- **Execution logic** - The GSAP timeline/animation code
- **Instant-run check** - Logic to detect if animation is "in the past"
- **State derivation** - Extract animation params from current game state

## Architecture

### AnimationDefinition Interface

```typescript
interface AnimationDefinition<TParams = any> {
  /** Unique identifier for this animation */
  id: string;
  
  /** Execute the animation (instant or animated based on config) */
  execute(params: TParams, config?: AnimationConfig): Promise<void>;
  
  /** Check if animation should run instantly based on game state */
  shouldRunInstantly(gameState: Game, params?: TParams): boolean;
  
  /** Derive animation parameters from current game state */
  getParamsFromGameState(gameState: Game): TParams | null;
}
```

### AnimationRegistry

Central registry for all animation definitions:

```typescript
class AnimationRegistry {
  static register(def: AnimationDefinition): void;
  static get(id: string): AnimationDefinition | undefined;
  static checkAllForInstantRun(gameState: Game): Array<{ def, params }>;
}
```

## Creating a New Animation

### Step 1: Define the Animation

```typescript
export const MyAnimation: AnimationDefinition<{ myParam: string }> = {
  id: "MyAnimation",
  
  async execute(params, config = {}) {
    const isInstant = config.instant === true;
    console.log(`🎬 [MyAnimation] ${isInstant ? 'Instant' : 'Animated'}`);
    
    if (isInstant) {
      // Set final state immediately without animation
      gsap.set('.my-element', { autoAlpha: 1, x: 100 });
      config.onComplete?.();
      return;
    }
    
    // Animated: Run full GSAP timeline
    return new Promise((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          config.onComplete?.();
          resolve();
        }
      });
      
      timeline.to('.my-element', {
        autoAlpha: 1,
        x: 100,
        duration: config.duration || 1,
        ease: config.ease || 'power2.inOut'
      });
    });
  },
  
  shouldRunInstantly(gameState) {
    // Return true if the triggering event already happened
    // Example: If animation triggers when status becomes "my_status",
    // return true if status IS "my_status" or beyond
    return gameState.status === 'my_status' 
        || gameState.status === 'later_status';
  },
  
  getParamsFromGameState(gameState) {
    // Extract params from game state
    if (!gameState.my_property) return null;
    return { myParam: gameState.my_property };
  }
};
```

### Step 2: Register the Animation

```typescript
// In AnimationDefinitions.ts
AnimationRegistry.register(MyAnimation);
```

### Step 3: Component Usage

Components automatically handle both instant and live animations:

```typescript
// In your component
useEffect(() => {
  if (!game) return;
  
  // Check for instant animations on mount
  const instantAnimations = AnimationRegistry.checkAllForInstantRun(game);
  
  for (const { def, params } of instantAnimations) {
    animationService.playOnce(
      `${def.id}:${gameId}:${JSON.stringify(params)}`,
      async () => {
        await def.execute(params, { instant: true });
      }
    );
  }
}, [game?.status, gameId]);

// Subscribe to live animation intents
useEffect(() => {
  const unsubscribe = AnimationEvents.subscribe(async (intent) => {
    if (intent.gameId !== gameId) return;
    
    const def = AnimationRegistry.get(intent.type);
    if (!def) return;
    
    const params = /* derive from intent */;
    
    await animationService.playOnce(
      `${def.id}:${gameId}:${JSON.stringify(params)}`,
      async () => {
        await def.execute(params);  // Animated by default
      }
    );
  });
  
  return unsubscribe;
}, [gameId]);
```

## Example: BoardIntroAnimation

```typescript
export const BoardIntroAnimation: AnimationDefinition<{ round: string; gameId: string }> = {
  id: "BoardIntro",
  
  async execute(params, config = {}) {
    if (config.instant) {
      // Instant: Set final state
      gsap.set('.jeopardy-board', { autoAlpha: 1 });
      gsap.set('.clue-cell', { autoAlpha: 1 });
      return;
    }
    
    // Animated: Full timeline
    return new Promise((resolve) => {
      const timeline = gsap.timeline({ onComplete: resolve });
      
      timeline
        .to('.jeopardy-board', { autoAlpha: 1, duration: 1 })
        .fromTo('.clue-cell', 
          { autoAlpha: 0 }, 
          { autoAlpha: 1, stagger: { amount: 2, from: 'random' } }
        );
    });
  },
  
  shouldRunInstantly(gameState) {
    // Board intro triggers when status changes TO "game_intro"
    // So if status IS "game_intro", the transition already happened
    return gameState.status === 'game_intro' 
        || gameState.status === 'introducing_categories' 
        || gameState.status === 'in_progress';
  },
  
  getParamsFromGameState(gameState) {
    if (!gameState.current_round || !gameState.id) return null;
    return { round: gameState.current_round, gameId: gameState.id };
  }
};
```

## Key Principles

### 1. Self-Contained Logic
Each animation definition contains ALL logic related to that animation:
- GSAP timeline code
- Instant state setup
- Game state checks
- Parameter derivation

### 2. Instant vs Animated
The `instant` flag in `AnimationConfig` controls behavior:
- `instant: true` - Set final state immediately (page reload)
- `instant: false` or undefined - Run full animation (live trigger)

### 3. shouldRunInstantly Logic
Think about the **triggering event**:
- Animation triggers when status changes **TO** "X"
- If status **IS** "X" on mount, the change already happened
- Return `true` if status is "X" or beyond

### 4. Comprehensive Logging
All animations include logging for debugging:
- When animation starts
- Whether it's instant or animated
- When animation completes
- Any errors or warnings

## Benefits

✅ **Modular** - Each animation is self-contained  
✅ **Consistent** - Same pattern for all animations  
✅ **Maintainable** - Add new animations by implementing interface  
✅ **Testable** - Pure functions, easy to unit test  
✅ **Debuggable** - Comprehensive logging throughout  
✅ **Type-safe** - Each animation has its own param type  
✅ **Automatic** - Registry handles instant-run checks  
✅ **Scalable** - Works for any number of animations  

## Migration from Old System

### Before (animations.ts)
```typescript
// In animations.ts
gsap.registerEffect({
  name: "myEffect",
  effect: (targets) => gsap.timeline().to(targets, { ... })
});

// In component
gsap.effects.myEffect('.my-element');
```

### After (AnimationDefinitions.ts)
```typescript
// In AnimationDefinitions.ts
export const MyAnimation: AnimationDefinition<{ ... }> = {
  id: "MyAnimation",
  execute(params, config) {
    // GSAP code inline here
    return new Promise((resolve) => {
      const timeline = gsap.timeline({ onComplete: resolve });
      timeline.to('.my-element', { ... });
    });
  },
  shouldRunInstantly(gameState) { ... },
  getParamsFromGameState(gameState) { ... }
};

AnimationRegistry.register(MyAnimation);

// In component
const def = AnimationRegistry.get("MyAnimation");
await def.execute(params);
```

## Future Enhancements

- **Animation sequences** - Chain multiple animations
- **Conditional animations** - Skip based on game settings
- **Animation presets** - Reusable config templates
- **Performance monitoring** - Track animation timing
- **Animation history** - Debug what animations ran when

