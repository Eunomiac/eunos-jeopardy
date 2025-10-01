/**
 * Animation Definitions
 *
 * This file contains all animation definitions for the application.
 * Each animation is self-contained with its execution logic and instant-run checks.
 */

import { gsap } from 'gsap';
import type { Game, GameStatus } from '../games/GameService';
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
    if (!category || !gameState.id) return null;
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
    const displayWindow = await animationService.waitForElement('.dynamic-display-window', 2000);
    const focusedCell = document.querySelector('.clue-cell.focused');

    if (!focusedCell) {
      console.warn(`🎬 [ClueRevealAnimation] No focused clue cell found`);
      config.onComplete?.();
      return;
    }

    if (isInstant) {
      // Instant: Show display window in final centered position
      gsap.set(displayWindow, {
        autoAlpha: 1,
        scale: 1,
        x: '50%',
        y: '50%',
        xPercent: -50,
        yPercent: -50,
        position: 'fixed'
      });
      console.log(`🎬 [ClueRevealAnimation] Instant setup complete`);
      config.onComplete?.();
      return;
    }

    // Animated: Position over cell, then scale/move to center
    return new Promise((resolve) => {
      const cellRect = focusedCell.getBoundingClientRect();

      const timeline = gsap.timeline({
        onComplete: () => {
          console.log(`🎬 [ClueRevealAnimation] Animation complete`);
          config.onComplete?.();
          resolve();
        }
      });

      // Start: Position display window exactly over the focused cell
      timeline.set(displayWindow, {
        position: 'fixed',
        left: cellRect.left,
        top: cellRect.top,
        width: cellRect.width,
        height: cellRect.height,
        autoAlpha: 0,
        scale: 1
      });

      // Fade in at cell position
      timeline.to(displayWindow, {
        autoAlpha: 1,
        duration: 0.2,
        ease: 'power2.out'
      });

      // Scale up and move to center
      timeline.to(displayWindow, {
        x: '50%',
        y: '50%',
        xPercent: -50,
        yPercent: -50,
        width: '80%',
        height: '60%',
        duration: 0.5,
        ease: config.ease || 'power2.inOut'
      });

      (animationService as any).activeTimelines?.push(timeline);
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
    if (!gameState.focused_clue_id || !gameState.id) return null;
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
    const displayWindow = await animationService.waitForElement('.dynamic-display-window', 2000);
    const dailyDoubleSplash = displayWindow.querySelector('.daily-double-splash');
    const focusedCell = document.querySelector('.clue-cell.focused');

    if (!focusedCell || !dailyDoubleSplash) {
      console.warn(`🎬 [DailyDoubleRevealAnimation] Missing required elements`);
      config.onComplete?.();
      return;
    }

    if (isInstant) {
      // Instant: Show display window with daily double splash in final position
      gsap.set(displayWindow, {
        autoAlpha: 1,
        scale: 1,
        x: '50%',
        y: '50%',
        xPercent: -50,
        yPercent: -50,
        position: 'fixed'
      });
      gsap.set(dailyDoubleSplash, { autoAlpha: 1 });
      console.log(`🎬 [DailyDoubleRevealAnimation] Instant setup complete`);
      config.onComplete?.();
      return;
    }

    // Animated: Similar to ClueReveal but with daily double splash
    return new Promise((resolve) => {
      const cellRect = focusedCell.getBoundingClientRect();

      const timeline = gsap.timeline({
        onComplete: () => {
          console.log(`🎬 [DailyDoubleRevealAnimation] Animation complete`);
          config.onComplete?.();
          resolve();
        }
      });

      // Start: Position display window over cell
      timeline.set(displayWindow, {
        position: 'fixed',
        left: cellRect.left,
        top: cellRect.top,
        width: cellRect.width,
        height: cellRect.height,
        autoAlpha: 0,
        scale: 1
      });

      timeline.set(dailyDoubleSplash, { autoAlpha: 1 });

      // Fade in and scale to center with dramatic effect
      timeline.to(displayWindow, {
        autoAlpha: 1,
        duration: 0.3,
        ease: 'power2.out'
      });

      timeline.to(displayWindow, {
        x: '50%',
        y: '50%',
        xPercent: -50,
        yPercent: -50,
        width: '80%',
        height: '60%',
        scale: 1.1,
        duration: 0.6,
        ease: 'back.out(1.7)'
      });

      // Settle to final scale
      timeline.to(displayWindow, {
        scale: 1,
        duration: 0.2,
        ease: 'power2.inOut'
      });

      (animationService as any).activeTimelines?.push(timeline);
    });
  },

  shouldRunInstantly(gameState, params) {
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
 * Animates the clue content appearing in the display window after the player has entered their wager (and the Host 'reveals prompt' on a daily double clue)
 * - populates the display window with the clue prompt, underneath/obscured by the daily double splash graphic
 * - fades out the daily-double splash to reveal the clue prompt
 */
export const DailyDoubleClueRevealAnimation: AnimationDefinition<{ clueId: string; gameId: string }> = {
  id: "DailyDoubleClueReveal",

  async execute(params, config = {}) {
    const isInstant = config.instant === true;
    console.log(`🎬 [DailyDoubleClueRevealAnimation] ${isInstant ? 'Instant' : 'Animated'} daily double clue reveal for ${params.clueId} in game ${params.gameId}`);

    const animationService = AnimationService.getInstance();
    const displayWindow = await animationService.waitForElement('.dynamic-display-window', 2000);
    const dailyDoubleSplash = displayWindow.querySelector('.daily-double-splash');
    const clueContent = displayWindow.querySelector('.clue-content');

    if (!dailyDoubleSplash || !clueContent) {
      console.warn(`🎬 [DailyDoubleClueRevealAnimation] Missing required elements`);
      config.onComplete?.();
      return;
    }

    if (isInstant) {
      // Instant: Hide splash, show clue
      gsap.set(dailyDoubleSplash, { autoAlpha: 0 });
      gsap.set(clueContent, { autoAlpha: 1 });
      console.log(`🎬 [DailyDoubleClueRevealAnimation] Instant setup complete`);
      config.onComplete?.();
      return;
    }

    // Animated: Fade out splash, fade in clue
    return new Promise((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          console.log(`🎬 [DailyDoubleClueRevealAnimation] Animation complete`);
          config.onComplete?.();
          resolve();
        }
      });

      timeline.to(dailyDoubleSplash, {
        autoAlpha: 0,
        duration: 0.4,
        ease: 'power2.inOut'
      });

      timeline.to(clueContent, {
        autoAlpha: 1,
        duration: 0.4,
        ease: 'power2.inOut'
      }, '-=0.2'); // Overlap slightly

      (animationService as any).activeTimelines?.push(timeline);
    });
  },

  shouldRunInstantly(gameState, params) {
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
 * Player Buzz-In Animation
 *
 * Animates the podium of the player who has just buzzed in and become the focused player.
 * - fades the 'podium buzzed in' image overtop of their podium
 * - will work regardless of whether the buzzed-in player is the main player or a competitor (it only affects the podium graphic)
 */
export const PlayerBuzzInAnimation: AnimationDefinition<{ playerId: string; gameId: string }> = {
  id: "PlayerBuzzIn",

  async execute(params, config = {}) {
    const isInstant = config.instant === true;
    console.log(`🎬 [PlayerBuzzInAnimation] ${isInstant ? 'Instant' : 'Animated'} buzz-in for player ${params.playerId} in game ${params.gameId}`);

    const animationService = AnimationService.getInstance();
    const podium = await animationService.waitForElement(`[data-player-id="${params.playerId}"] .podium-buzzed-in`, 2000);

    if (!podium) {
      console.warn(`🎬 [PlayerBuzzInAnimation] Podium not found for player ${params.playerId}`);
      config.onComplete?.();
      return;
    }

    if (isInstant) {
      // Instant: Show buzzed-in state
      gsap.set(podium, { autoAlpha: 1 });
      console.log(`🎬 [PlayerBuzzInAnimation] Instant setup complete`);
      config.onComplete?.();
      return;
    }

    // Animated: Fade in buzzed-in overlay
    return new Promise((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          console.log(`🎬 [PlayerBuzzInAnimation] Animation complete`);
          config.onComplete?.();
          resolve();
        }
      });

      timeline.fromTo(podium,
        { autoAlpha: 0 },
        {
          autoAlpha: 1,
          duration: 0.3,
          ease: config.ease || 'power2.out'
        }
      );

      (animationService as any).activeTimelines?.push(timeline);
    });
  },

  shouldRunInstantly(gameState, params) {
    if (params) {
      const animationService = AnimationService.getInstance();
      const key = `PlayerBuzzIn:${params.gameId}:${params.playerId}`;
      if (animationService.isPlaying(key) || animationService.hasPlayed(key)) {
        return false;
      }
    }

    // Buzz-in is "in the past" if there's a focused player
    return gameState.status === 'in_progress' as GameStatus && !!gameState.focused_player_id;
  },

  getParamsFromGameState(gameState) {
    if (!gameState.focused_player_id || !gameState.id) return null;
    return {
      playerId: gameState.focused_player_id,
      gameId: gameState.id
    };
  }
};

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

    // Round transition is "in the past" if we're in a later round
    // This is complex - for now, never run instantly
    return false;
  },

  getParamsFromGameState(gameState) {
    // Can't derive transition params from current state alone
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
AnimationRegistry.register(PlayerBuzzInAnimation);
AnimationRegistry.register(RoundTransitionAnimation);

// Expose to window for console testing
if (typeof window !== 'undefined') {
  (window as any).AnimationDefinitions = {
    BoardIntroAnimation,
    CategoryIntroAnimation,
    ClueRevealAnimation,
    DailyDoubleRevealAnimation,
    DailyDoubleClueRevealAnimation,
    PlayerBuzzInAnimation,
    RoundTransitionAnimation,
    AnimationRegistry,
    AnimationService
  };
  console.log('🎬 AnimationDefinitions exposed to window for console testing');
  console.log('🎬 Try: AnimationDefinitions.BoardIntroAnimation.execute({ round: "jeopardy", gameId: "test" })');
}
