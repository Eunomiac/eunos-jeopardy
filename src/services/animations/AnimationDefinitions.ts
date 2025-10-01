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
    return gameState.status === 'game_intro'
        || gameState.status === 'introducing_categories'
        || gameState.status === 'in_progress';
  },

  getParamsFromGameState(gameState) {
    if (!gameState.current_round || !gameState.id) return null;
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
    return gameState.status === 'introducing_categories'
        || gameState.status === 'in_progress';
  },

  getParamsFromGameState(gameState) {
    const category = (gameState as Game & { current_introduction_category?: number }).current_introduction_category;
    if (!category || !gameState.id) return null;
    return {
      categoryNumber: category,
      gameId: gameState.id
    };
  }
};

/**
 * Animation Registry
 *
 * Central registry for all animation definitions.
 * Provides methods to register, retrieve, and check animations.
 */
export class AnimationRegistry {
  private static definitions = new Map<string, AnimationDefinition>();

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

// Expose to window for console testing
if (typeof window !== 'undefined') {
  (window as any).AnimationDefinitions = {
    BoardIntroAnimation,
    CategoryIntroAnimation,
    AnimationRegistry,
    AnimationService
  };
  console.log('🎬 AnimationDefinitions exposed to window for console testing');
  console.log('🎬 Try: AnimationDefinitions.BoardIntroAnimation.execute({ round: "jeopardy", gameId: "test" })');
}
