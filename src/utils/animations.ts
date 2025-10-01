/**
 * GSAP Animation Effects for Euno's Jeopardy
 *
 * This file contains all custom GSAP effects used throughout the application.
 * Effects are registered globally and can be used anywhere in the app.
 *
 * // Initialize once in main.tsx or App.tsx
 * initializeAnimations();
 *
 * // IMPORTANT STYLING NOTE:
 * - All elements receiving animations should receive the "gsap-animation" class, which sets their autoAlpha: 0 (= visibility: hidden & opacity: 0) to avoid FLASH of UNanimated content (FOUA)
 * - Accordingly, elements will need to be revealed by setting their autoAlpha: 1 (visibility: visible & opacity: 1)
 */
import {gsap} from 'gsap';
import {AnimationService} from "../services/animations/AnimationService";

export type GSAPEffect = (targets?: gsap.TweenTarget, config?: gsap.AnimationVars) => gsap.core.Timeline;

const GSAP_EFFECTS: Record<string, GSAPEffect> = {
  // GSAP effects are being phased out in favor of AnimationDefinitions
  // See src/services/animations/AnimationDefinitions.ts
};

/**
 * Register a single GSAP effect.
 * Helper function to convert GSAP_EFFECTS object into individual registrations.
 */
function registerEffect(name: string, effect: GSAPEffect): void {
    gsap.registerEffect({
      name,
      effect,
      defaults: {},
      extendTimeline: true
    });
}

/**
 * Initialize all GSAP effects for the application.
 * Call this once during app initialization.
 */
export function initializeAnimations(): void {
  // Register all custom effects
  Object.entries(GSAP_EFFECTS).forEach(([name, effect]) => {
    registerEffect(name, effect);
  });

  // Expose GSAP globally for console debugging
  if (typeof window !== 'undefined') {
    Object.assign(globalThis, {gsap, AnimationService});
    console.log('🎬 GSAP animations initialized and exposed globally');
  } else {
    console.log('🎬 GSAP animations initialized');
  }
}