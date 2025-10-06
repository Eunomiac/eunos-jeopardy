/**
 * Animation Definitions
 *
 * This file contains all animation definitions for the application.
 * Each animation is self-contained with its execution logic and instant-run checks.
 */

import { gsap } from 'gsap';
import type { Game } from '../games/GameService';
import { AnimationService } from './AnimationService';
import type { AnimationConfig } from './AnimationService';
import { ClueDisplayService } from './ClueDisplayService';

/**
 * Animation Definition Interface
 *
 * Defines the contract for all animations in the application.
 * Each animation must implement:
 * - execute: The animation logic (can be instant or animated)
 * - shouldRunInstantly: Check if animation is "in the past" based on game state
 * - getParamsFromGameState: Derive animation parameters from current game state
 */
export interface AnimationDefinition<TParams = any> {
  /** Unique identifier for this animation */
  id: string;

  /**
   * Execute the animation.
   * @param params - Animation-specific parameters
   * @param config - Animation configuration (duration, easing, instant flag, etc.)
   * @returns Promise that resolves when animation completes
   */
  execute(params: TParams, config?: AnimationConfig): Promise<void>;

  /**
   * Check if animation should run instantly on component mount.
   * Returns true if the game state indicates this animation is "in the past"
   * (i.e., the triggering event already happened before component mounted).
   *
   * @param gameState - Current game state
   * @param params - Animation parameters (optional, for context)
   * @returns true if animation should run instantly, false otherwise
   */
  shouldRunInstantly(gameState: Game, params?: TParams): boolean;

  /**
   * Derive animation parameters from current game state.
   * Used when shouldRunInstantly returns true to get the correct params.
   *
   * @param gameState - Current game state
   * @returns Animation parameters, or null if cannot be derived
   */
  getParamsFromGameState(gameState: Game): TParams | null;
}

/**
 * Board Introduction Animation
 *
 * Animates the game board appearing at the start of a round.
 * - Fades in the board container
 * - Staggers in clue cells with random pattern
 *
 * Triggers: When game status changes to "game_intro"
 * Instant: When game status IS "game_intro" or beyond (page reload scenario)
 */
export const BoardIntroAnimation: AnimationDefinition<{ round: string; gameId: string }> = {
  id: "BoardIntro",

  async execute(params, config = {}) {
    const isInstant = config.instant === true;
    console.log(`🎬 [BoardIntroAnimation] ${isInstant ? 'Instant' : 'Animated'} board intro for round ${params.round} in game ${params.gameId}`);

    // Wait for DOM elements to be ready
    const animationService = AnimationService.getInstance();
    await animationService.waitForElement('.jeopardy-board', 2000);

    if (isInstant) {
      // Instant: Set final state immediately without animation
      gsap.set('.jeopardy-board-container', {autoAlpha: 1});
      gsap.set('.jeopardy-board', { autoAlpha: 1 });
      gsap.set('.clue-cell', { autoAlpha: 1 });
      console.log(`🎬 [BoardIntroAnimation] Instant setup complete`);
      config.onComplete?.();
      return;
    }

    // Animated: Run full GSAP timeline
    return new Promise((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          console.log(`🎬 [BoardIntroAnimation] Animation complete`);
          config.onComplete?.();
          resolve();
        }
      });

      // Fade in board container
      timeline.fromTo('.jeopardy-board-container, .jeopardy-board', {
        scale: 1.25,
        autoAlpha: 0
      },{
        scale: 1,
        autoAlpha: 1,
        duration: 0.25,
        ease: config.ease || 'power2.inOut'
      });

      // Stagger in clue cells with random pattern
      timeline.fromTo('.clue-cell',
        { autoAlpha: 0 },
        {
          duration: 0.15,
          autoAlpha: 1,
          ease: 'power2.inOut',
          stagger: {
            amount: 2,
            grid: [5, 6],
            ease: 'steps(7)',
            from: 'random'
          }
        }
      );

      // Track timeline in AnimationService
      (animationService as any).activeTimelines?.push(timeline);
    });
  },

  shouldRunInstantly(gameState, params) {
    // Don't run instantly if animation is currently playing or already played
    if (params) {
      const animationService = AnimationService.getInstance();
      const key = `BoardIntro:${params.gameId}:${params.round}`;
      if (animationService.isPlaying(key) || animationService.hasPlayed(key)) {
        return false;
      }
    }

    // Board intro is "in the past" if we're currently IN game_intro or beyond
    // (meaning the transition TO game_intro already happened)
    // The subscription is now set up before this check, so we can safely check game_intro
    return gameState.status === 'game_intro' as GameStatus
        || gameState.status === 'introducing_categories' as GameStatus
        || gameState.status === 'in_progress' as GameStatus;
  },

  getParamsFromGameState(gameState) {
    if (!gameState.current_round || !gameState.id) {return null;}
    return {
      round: gameState.current_round,
      gameId: gameState.id
    };
  }
};

/**
 * Category Introduction Animation
 *
 * Animates the category strip sliding to reveal the next category.
 * - Slides the strip horizontally
 * - Fades out the splash image for the current category
 *
 * Triggers: When current_introduction_category increments during "introducing_categories"
 * Instant: When game status IS "introducing_categories" (sets strip to current position)
 */
export const CategoryIntroAnimation: AnimationDefinition<{ categoryNumber: number; gameId: string }> = {
  id: "CategoryIntro",

  async execute(params, config = {}) {
    const isInstant = config.instant === true;
    console.log(`🎬 [CategoryIntroAnimation] ${isInstant ? 'Instant' : 'Animated'} category ${params.categoryNumber} in game ${params.gameId}`);

    const animationService = AnimationService.getInstance();
    const stripElement = await animationService.waitForElement('.jeopardy-category-display-strip', 1000);
    const targetX = -((params.categoryNumber - 1) * 100 / 6);

    if (isInstant) {
      // Instant: Set final state immediately
      animationService.setCategoryStripInitialState(stripElement, targetX, params.categoryNumber);
      console.log(`🎬 [CategoryIntroAnimation] Instant setup complete for category ${params.categoryNumber}`);
      config.onComplete?.();
      return;
    }

    // Animated: Run full animation
    return animationService.animateCategoryStripMovement(
      stripElement,
      targetX,
      params.categoryNumber,
      config
    );
  },

  shouldRunInstantly(gameState) {
    // Category intro is "in the past" if we're currently IN introducing_categories or beyond
    return gameState.status === 'introducing_categories' as GameStatus
        || gameState.status === 'in_progress' as GameStatus;
  },

  getParamsFromGameState(gameState) {
    const category = (gameState as Game & { current_introduction_category?: number }).current_introduction_category;
    if (!category || !gameState.id) {return null;};
    return {
      categoryNumber: category,
      gameId: gameState.id
    };
  }
};

/**
 * Clue Reveal Animation
 *
 * Animates the clue content appearing in the display window.
 * - Sizes and positions the .dynamic-display-window so that it exactly overlays the focused clue cell (without revealing it)
 * - Populates the clue content in the .dynamic-display-window
 * - Fades in, scales up, and centers the dynamic display window to a fixed central position
 */
export const ClueRevealAnimation: AnimationDefinition<{ clueId: string; gameId: string }> = {
  id: "ClueReveal",

  async execute(params, config = {}) {
    const isInstant = config.instant === true;
    console.log(`🎬 [ClueRevealAnimation] ${isInstant ? 'Instant' : 'Animated'} clue reveal for ${params.clueId} in game ${params.gameId}`);

    const animationService = AnimationService.getInstance();
    const clueDisplayService = ClueDisplayService.getInstance();
    const displayWindow = await animationService.waitForElement('.dynamic-display-window', 2000);
    const focusedCell = document.querySelector('.clue-cell.focused');

    if (!focusedCell) {
      console.warn(`🎬 [ClueRevealAnimation] No focused clue cell found`);
      config.onComplete?.();
      return;
    }

    // Hide display window before populating to avoid flash
    gsap.set(displayWindow, { visibility: 'hidden' });

    // Populate display window with clue content (adds .jeopardy-clue-display class)
    await clueDisplayService.populateDisplayWindow(params.clueId, params.gameId, displayWindow);

    if (isInstant) {
      // Instant: Just show at final CSS-defined position
      gsap.set(displayWindow, { visibility: 'visible', opacity: 1 });
      console.log(`🎬 [ClueRevealAnimation] Instant setup complete`);
      config.onComplete?.();
      return;
    }

    // Animated: Position at cell, then animate to center
    return new Promise((resolve) => {
      const cellRect = focusedCell.getBoundingClientRect();

      // Calculate the scale factor to match cell size
      // Final size is defined in CSS as 80% width with 6/4 aspect ratio
      const finalWidth = window.innerWidth * 0.8;
      const finalHeight = finalWidth * (4 / 6);
      const scaleX = cellRect.width / finalWidth;
      const scaleY = cellRect.height / finalHeight;

      // Calculate position offset from center to cell
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const cellCenterX = cellRect.left + cellRect.width / 2;
      const cellCenterY = cellRect.top + cellRect.height / 2;
      const offsetX = cellCenterX - centerX;
      const offsetY = cellCenterY - centerY;

      const timeline = gsap.timeline({
        onComplete: () => {
          console.log(`🎬 [ClueRevealAnimation] Animation complete`);
          config.onComplete?.();
          resolve();
        }
      });

      timeline.from(displayWindow, {
        autoAlpha: 0,
        x: offsetX,
        y: offsetY,
        scaleX,
        scaleY,
        duration: 0.3,
        ease: config.ease || 'power2.out'
      });

      timeline.to(displayWindow, {autoAlpha: 1, duration: 0.3}, 0);

      (animationService).activeTimelines?.push(timeline);
    });
  },

  shouldRunInstantly(gameState, params) {
    if (params) {
      const animationService = AnimationService.getInstance();
      const key = `ClueReveal:${params.gameId}:${params.clueId}`;
      if (animationService.isPlaying(key) || animationService.hasPlayed(key)) {
        return false;
      }
    }

    // Clue reveal is "in the past" if there's a focused clue
    return gameState.status === 'in_progress' as GameStatus && !!gameState.focused_clue_id;
  },

  getParamsFromGameState(gameState) {
    if (!gameState.focused_clue_id || !gameState.id) {return null;};
    return {
      clueId: gameState.focused_clue_id,
      gameId: gameState.id
    };
  }
};

/**
 * Daily Double Reveal Animation
 *
 * Animates the Daily Double logo and text appearing in the display window.
 * - Sizes and positions the .dynamic-display-window so that it exactly overlays the focused clue cell (without revealing it)
 * - Populates the display window with the daily double splash graphic
 * - Fades in, scales up, and centers the dynamic display window to a fixed central position
 */
export const DailyDoubleRevealAnimation: AnimationDefinition<{ clueId: string; gameId: string }> = {
  id: "DailyDoubleReveal",

  async execute(params, config = {}) {
    const isInstant = config.instant === true;
    console.log(`🎬 [DailyDoubleRevealAnimation] ${isInstant ? 'Instant' : 'Animated'} daily double reveal for ${params.clueId} in game ${params.gameId}`);

    const animationService = AnimationService.getInstance();
    const clueDisplayService = ClueDisplayService.getInstance();
    const displayWindow = await animationService.waitForElement('.dynamic-display-window', 2000);
    const focusedCell = document.querySelector('.clue-cell.focused');

    if (!focusedCell) {
      console.warn(`🎬 [DailyDoubleRevealAnimation] No focused clue cell found`);
      config.onComplete?.();
      return;
    }

    // Hide display window before populating to avoid flash
    gsap.set(displayWindow, { visibility: 'hidden' });

    // Populate display window with daily double content (adds both classes + splash image)
    await clueDisplayService.populateDisplayWindow(params.clueId, params.gameId, displayWindow);

    if (isInstant) {
      // Instant: Just show at final CSS-defined position
      gsap.set(displayWindow, { visibility: 'visible', opacity: 1 });
      console.log(`🎬 [DailyDoubleRevealAnimation] Instant setup complete`);
      config.onComplete?.();
      return;
    }

    // Animated: Position at cell, then animate to center with dramatic easing
    return new Promise((resolve) => {
      const cellRect = focusedCell.getBoundingClientRect();

      // Calculate the scale factor to match cell size
      const finalWidth = window.innerWidth * 0.8;
      const finalHeight = finalWidth * (4 / 6);
      const scaleX = cellRect.width / finalWidth;
      const scaleY = cellRect.height / finalHeight;

      // Calculate position offset from center to cell
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const cellCenterX = cellRect.left + cellRect.width / 2;
      const cellCenterY = cellRect.top + cellRect.height / 2;
      const offsetX = cellCenterX - centerX;
      const offsetY = cellCenterY - centerY;

      const timeline = gsap.timeline({
        onComplete: () => {
          console.log(`🎬 [DailyDoubleRevealAnimation] Animation complete`);
          config.onComplete?.();
          resolve();
        }
      });

      // Set initial state: positioned at cell with cell scale, hidden
      timeline.set(displayWindow, {
        x: offsetX,
        y: offsetY,
        scaleX: scaleX,
        scaleY: scaleY,
        visibility: 'visible',
        opacity: 0
      });

      // Animate TO final CSS position with dramatic overshoot and fade in
      timeline.to(displayWindow, {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        duration: 0.8,
        ease: 'back.out(1.7)' // Dramatic overshoot effect for daily double
      });

      (animationService as any).activeTimelines?.push(timeline);
    });
  },

  shouldRunInstantly(_gameState, params) {
    if (params) {
      const animationService = AnimationService.getInstance();
      const key = `DailyDoubleReveal:${params.gameId}:${params.clueId}`;
      if (animationService.isPlaying(key) || animationService.hasPlayed(key)) {
        return false;
      }
    }

    // Daily double reveal is "in the past" if there's a focused clue that's a daily double
    // Note: We'd need to check if the clue is actually a daily double from game state
    return false; // For now, never run instantly (requires more context)
  },

  getParamsFromGameState(gameState) {
    if (!gameState.focused_clue_id || !gameState.id) return null;
    // TODO: Check if focused clue is actually a daily double
    return {
      clueId: gameState.focused_clue_id,
      gameId: gameState.id
    };
  }
};

/**
 * Daily Double Clue Reveal Animation
 *
 * Animates the clue content appearing after the player has entered their wager
 * - The display window already has the clue text (populated during DailyDoubleReveal)
 * - The splash image is overlaid on top, obscuring the text
 * - This animation simply hides the splash image to reveal the clue text underneath
 */
export const DailyDoubleClueRevealAnimation: AnimationDefinition<{ clueId: string; gameId: string }> = {
  id: "DailyDoubleClueReveal",

  async execute(params, config = {}) {
    const isInstant = config.instant === true;
    console.log(`🎬 [DailyDoubleClueRevealAnimation] ${isInstant ? 'Instant' : 'Animated'} daily double clue reveal for ${params.clueId} in game ${params.gameId}`);

    const animationService = AnimationService.getInstance();
    const displayWindow = await animationService.waitForElement('.dynamic-display-window', 2000);
    const dailyDoubleSplash = displayWindow.querySelector('.daily-double-splash');

    if (!dailyDoubleSplash) {
      console.warn(`🎬 [DailyDoubleClueRevealAnimation] Daily double splash not found`);
      config.onComplete?.();
      return;
    }

    if (isInstant) {
      // Instant: Just hide the splash
      gsap.set(dailyDoubleSplash, { visibility: 'hidden' });
      console.log(`🎬 [DailyDoubleClueRevealAnimation] Instant setup complete`);
      config.onComplete?.();
      return;
    }

    // Animated: Fade out splash to reveal clue text underneath
    return new Promise((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          console.log(`🎬 [DailyDoubleClueRevealAnimation] Animation complete`);
          config.onComplete?.();
          resolve();
        }
      });

      timeline.to(dailyDoubleSplash, {
        visibility: 'hidden',
        duration: 0.5,
        ease: 'power2.inOut'
      });

      (animationService as any).activeTimelines?.push(timeline);
    });
  },

  shouldRunInstantly(_gameState, params) {
    if (params) {
      const animationService = AnimationService.getInstance();
      const key = `DailyDoubleClueReveal:${params.gameId}:${params.clueId}`;
      if (animationService.isPlaying(key) || animationService.hasPlayed(key)) {
        return false;
      }
    }
    return false; // Requires more context about daily double state
  },

  getParamsFromGameState(gameState) {
    if (!gameState.focused_clue_id || !gameState.id) return null;
    return {
      clueId: gameState.focused_clue_id,
      gameId: gameState.id
    };
  }
};

/**
 * Player Buzz-In Visual Feedback
 *
 * NOTE: This is now handled via CSS transitions, not GSAP animations.
 * When a player buzzes in, the .buzzed-in class is added to their podium,
 * which triggers a CSS transition on the .podium-buzzed-in overlay image.
 * See PlayerPodiums.scss for the CSS implementation.
 */

/**
 * Round Transition Animation
 *
 * Animates the transition from "jeopardy" to "double" rounds
 * - Fades out the current board
 * - Shows transition graphic/text
 * - Prepares for new board intro
 */
export const RoundTransitionAnimation: AnimationDefinition<{ fromRound: string; toRound: string; gameId: string }> = {
  id: "RoundTransition",

  async execute(params, config = {}) {
    const isInstant = config.instant === true;
    console.log(`🎬 [RoundTransitionAnimation] ${isInstant ? 'Instant' : 'Animated'} transition from ${params.fromRound} to ${params.toRound} in game ${params.gameId}`);

    const animationService = AnimationService.getInstance();
    const board = await animationService.waitForElement('.jeopardy-board', 2000);
    const transitionOverlay = document.querySelector('.round-transition-overlay');

    if (isInstant) {
      // Instant: Just hide the board, ready for new round
      gsap.set(board, { autoAlpha: 0 });
      if (transitionOverlay) {
        gsap.set(transitionOverlay, { autoAlpha: 0 });
      }
      console.log(`🎬 [RoundTransitionAnimation] Instant setup complete`);
      config.onComplete?.();
      return;
    }

    // Animated: Fade out board, show transition, fade out transition
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

      // Show transition overlay if it exists
      if (transitionOverlay) {
        timeline.fromTo(transitionOverlay,
          { autoAlpha: 0, scale: 0.8 },
          {
            autoAlpha: 1,
            scale: 1,
            duration: 0.6,
            ease: 'back.out(1.7)'
          }
        );

        // Hold for a moment
        timeline.to({}, { duration: 1.5 });

        // Fade out transition
        timeline.to(transitionOverlay, {
          autoAlpha: 0,
          duration: 0.5,
          ease: 'power2.inOut'
        });
      }

      (animationService as any).activeTimelines?.push(timeline);
    });
  },

  shouldRunInstantly(gameState, params) {
    if (params) {
      const animationService = AnimationService.getInstance();
      const key = `RoundTransition:${params.gameId}:${params.fromRound}-${params.toRound}`;
      if (animationService.isPlaying(key) || animationService.hasPlayed(key)) {
        return false;
      }
    }

    // Round transition should run instantly if status is 'round_transition'
    // This handles page reloads during round transitions
    return gameState.status === ('round_transition' as GameStatus);
  },

  getParamsFromGameState(_gameState) {
    // Can't derive transition params from current state alone
    // The orchestrator provides params when publishing the event
    return null;
  }
};

/**
 * Animation Registry
 *
 * Central registry for all animation definitions.
 * Provides methods to register, retrieve, and check animations.
 */
export class AnimationRegistry {
  private static readonly definitions = new Map<string, AnimationDefinition>();

  /**
   * Register an animation definition.
   */
  static register(def: AnimationDefinition): void {
    this.definitions.set(def.id, def);
    console.log(`🎬 [AnimationRegistry] Registered animation: ${def.id}`);
  }

  /**
   * Get an animation definition by ID.
   */
  static get(id: string): AnimationDefinition | undefined {
    return this.definitions.get(id);
  }

  /**
   * Check all registered animations to see which should run instantly
   * based on current game state.
   *
   * @param gameState - Current game state
   * @returns Array of animations that should run instantly with their params
   */
  static checkAllForInstantRun(gameState: Game): Array<{ def: AnimationDefinition; params: any }> {
    const toRun: Array<{ def: AnimationDefinition; params: any }> = [];

    console.log(`🎬 [AnimationRegistry] Checking ${this.definitions.size} animations for instant run`);

    for (const def of this.definitions.values()) {
      if (def.shouldRunInstantly(gameState)) {
        const params = def.getParamsFromGameState(gameState);
        if (params) {
          console.log(`🎬 [AnimationRegistry] Animation ${def.id} should run instantly`, params);
          toRun.push({ def, params });
        }
      }
    }

    return toRun;
  }

  /**
   * Get all registered animation IDs.
   */
  static getAllIds(): string[] {
    return Array.from(this.definitions.keys());
  }
}

// Register all animations
AnimationRegistry.register(BoardIntroAnimation);
AnimationRegistry.register(CategoryIntroAnimation);
AnimationRegistry.register(ClueRevealAnimation);
AnimationRegistry.register(DailyDoubleRevealAnimation);
AnimationRegistry.register(DailyDoubleClueRevealAnimation);
AnimationRegistry.register(RoundTransitionAnimation);

// Expose to window for console testing
if (typeof window !== 'undefined') {
  (window as any).AnimationDefinitions = {
    BoardIntroAnimation,
    CategoryIntroAnimation,
    ClueRevealAnimation,
    DailyDoubleRevealAnimation,
    DailyDoubleClueRevealAnimation,
    RoundTransitionAnimation,
    AnimationRegistry,
    AnimationService
  };
  console.log('🎬 AnimationDefinitions exposed to window for console testing');
  console.log('🎬 Try: AnimationDefinitions.BoardIntroAnimation.execute({ round: "jeopardy", gameId: "test" })');
}
