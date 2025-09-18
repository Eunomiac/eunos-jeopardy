/**
 * GSAP Animation Effects for Euno's Jeopardy
 *
 * This file contains all custom GSAP effects used throughout the application.
 * Effects are registered globally and can be used anywhere in the app.
 *
 * Usage:
 * ```typescript
 * import { initializeAnimations } from '@/utils/animations';
 *
 * // Initialize once in main.tsx or App.tsx
 * initializeAnimations();
 *
 * // Use anywhere in components
 * gsap.effects.jeopardyReveal(element, { duration: 1.5 });
 * ```
 */

import { gsap } from 'gsap';

/**
 * Initialize all GSAP effects for the application.
 * Call this once during app initialization.
 */
export function initializeAnimations(): void {
  // Register all custom effects
  registerJeopardyEffects();
  registerBuzzerEffects();
  registerScoreEffects();
  registerTransitionEffects();

  // Expose GSAP globally for console debugging
  if (typeof window !== 'undefined') {
    (window as any).gsap = gsap;
    console.log('🎬 GSAP animations initialized and exposed globally');
  } else {
    console.log('🎬 GSAP animations initialized');
  }
}

/**
 * Jeopardy-specific reveal and display animations
 */
function registerJeopardyEffects(): void {
  // Clue reveal animation (classic Jeopardy style)
  gsap.registerEffect({
    name: "jeopardyReveal",
    effect: (targets: gsap.TweenTarget, config: any) => {
      const tl = gsap.timeline();

      return tl
        .set(targets, {
          opacity: 0,
          scale: 0.8,
          rotationY: -90
        })
        .to(targets, {
          opacity: 1,
          scale: 1,
          rotationY: 0,
          duration: config.duration || 0.8,
          ease: "back.out(1.7)"
        });
    },
    defaults: { duration: 0.8 },
    extendTimeline: true
  });

  // Board clue selection highlight
  gsap.registerEffect({
    name: "clueSelect",
    effect: (targets: gsap.TweenTarget, config: any) => {
      return gsap.to(targets, {
        scale: 1.05,
        boxShadow: "0 0 20px rgba(255, 215, 0, 0.8)",
        duration: config.duration || 0.3,
        ease: "power2.out",
        yoyo: true,
        repeat: 1
      });
    },
    defaults: { duration: 0.3 },
    extendTimeline: true
  });
}

/**
 * Buzzer system animations
 */
function registerBuzzerEffects(): void {
  // Buzzer activation animation
  gsap.registerEffect({
    name: "buzzerActivate",
    effect: (targets: gsap.TweenTarget, config: any) => {
      const tl = gsap.timeline();

      return tl
        .to(targets, {
          scale: 1.2,
          backgroundColor: "#ff4444",
          duration: 0.1,
          ease: "power2.out"
        })
        .to(targets, {
          scale: 1,
          duration: 0.2,
          ease: "elastic.out(1, 0.3)"
        });
    },
    extendTimeline: true
  });

  // Player podium highlight when buzzed
  gsap.registerEffect({
    name: "playerBuzz",
    effect: (targets: gsap.TweenTarget, config: any) => {
      return gsap.to(targets, {
        boxShadow: "0 0 30px rgba(255, 215, 0, 1)",
        scale: 1.02,
        duration: config.duration || 0.5,
        ease: "power2.out"
      });
    },
    defaults: { duration: 0.5 },
    extendTimeline: true
  });
}

/**
 * Score and money animations
 */
function registerScoreEffects(): void {
  // Score change animation (money counting effect)
  gsap.registerEffect({
    name: "scoreChange",
    effect: (targets: gsap.TweenTarget, config: any) => {
      const tl = gsap.timeline();

      return tl
        .to(targets, {
          scale: 1.3,
          color: config.positive ? "#00ff00" : "#ff4444",
          duration: 0.2,
          ease: "power2.out"
        })
        .to(targets, {
          scale: 1,
          color: "#ffffff",
          duration: 0.4,
          ease: "elastic.out(1, 0.3)"
        });
    },
    extendTimeline: true
  });

  // Money value counter animation
  gsap.registerEffect({
    name: "countMoney",
    effect: (targets: gsap.TweenTarget, config: any) => {
      const element = targets as HTMLElement;
      const startValue = config.from || 0;
      const endValue = config.to || 0;

      return gsap.to({ value: startValue }, {
        value: endValue,
        duration: config.duration || 1,
        ease: "power2.out",
        onUpdate: function() {
          const currentValue = Math.round(this.targets()[0].value);
          element.textContent = `$${currentValue.toLocaleString()}`;
        }
      });
    },
    defaults: { duration: 1 },
    extendTimeline: true
  });
}

/**
 * Page and component transition animations
 */
function registerTransitionEffects(): void {
  // Slide in from right (for new screens)
  gsap.registerEffect({
    name: "slideInRight",
    effect: (targets: gsap.TweenTarget, config: any) => {
      return gsap.fromTo(targets,
        {
          x: "100%",
          opacity: 0
        },
        {
          x: "0%",
          opacity: 1,
          duration: config.duration || 0.6,
          ease: "power3.out"
        }
      );
    },
    defaults: { duration: 0.6 },
    extendTimeline: true
  });

  // Fade and scale in (for modals)
  gsap.registerEffect({
    name: "modalAppear",
    effect: (targets: gsap.TweenTarget, config: any) => {
      return gsap.fromTo(targets,
        {
          opacity: 0,
          scale: 0.7,
          y: -50
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: config.duration || 0.4,
          ease: "back.out(1.7)"
        }
      );
    },
    defaults: { duration: 0.4 },
    extendTimeline: true
  });
}

/**
 * Utility function to create a master timeline for complex sequences
 */
export function createJeopardyTimeline(): gsap.core.Timeline {
  return gsap.timeline({
    defaults: {
      ease: "power2.out"
    }
  });
}

/**
 * Common animation configurations
 */
export const ANIMATION_CONFIG = {
  // Durations
  FAST: 0.2,
  NORMAL: 0.5,
  SLOW: 1.0,

  // Easing
  EASE_OUT: "power2.out",
  EASE_ELASTIC: "elastic.out(1, 0.3)",
  EASE_BACK: "back.out(1.7)",

  // Colors
  JEOPARDY_GOLD: "#FFD700",
  JEOPARDY_BLUE: "#0066CC",
  SUCCESS_GREEN: "#00ff00",
  ERROR_RED: "#ff4444"
} as const;
