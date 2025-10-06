/**
 * GSAP Animation Initialization for Euno's Jeopardy
 *
 * This file initializes GSAP and exposes it globally for debugging purposes.
 * All animation logic is now handled by AnimationDefinitions.ts.
 *
 * Initialize once in main.tsx:
 * ```typescript
 * initializeAnimations();
 * ```
 *
 * IMPORTANT STYLING NOTE:
 * - All elements receiving animations should have the "gsap-animation" class,
 *   which sets autoAlpha: 0 (visibility: hidden & opacity: 0) to avoid
 *   FLASH of UNanimated content (FOUA)
 * - Elements are revealed by setting autoAlpha: 1 (visibility: visible & opacity: 1)
 *
 * @see src/services/animations/AnimationDefinitions.ts for animation implementations
 */
import {gsap} from 'gsap';
import {AnimationService} from "../services/animations/AnimationService";

/**
 * Initialize GSAP and expose it globally for console debugging.
 * Call this once during app initialization.
 *
 * This function exposes GSAP and AnimationService to the global scope,
 * allowing developers to test animations directly from the browser console.
 */
export function initializeAnimations(): void {
  // Expose GSAP globally for console debugging
  if (typeof window !== 'undefined') {
    Object.assign(globalThis, {gsap, AnimationService});
    console.log('🎬 GSAP initialized and exposed globally for debugging');
  } else {
    console.log('🎬 GSAP initialized');
  }
}