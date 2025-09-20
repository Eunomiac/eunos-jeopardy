/**
 * Animation Service for PlayerDashboard GSAP animations.
 *
 * This service provides centralized animation management for the PlayerDashboard
 * component, handling clue reveals, category introductions, and UI transitions
 * with authentic Jeopardy-style effects.
 *
 * **Key Features:**
 * - Clue reveal animations with classic Jeopardy timing
 * - Category introduction sequences
 * - Dynamic display window transitions
 * - Buzzer state animations
 * - Coordinated multi-element animations
 *
 * **Integration:**
 * - Works with existing GSAP effects from utils/animations.ts
 * - Provides high-level animation orchestration
 * - Manages animation state and cleanup
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

import { gsap } from 'gsap';
import type { ClueInfo } from '../../components/players/ClueRevealModal';

/**
 * Animation configuration options.
 */
export interface AnimationConfig {
  /** Animation duration in seconds */
  duration?: number;
  /** Animation easing function */
  ease?: string;
  /** Delay before animation starts */
  delay?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

/**
 * Animation Service class for PlayerDashboard.
 */
export class AnimationService {
  private static instance: AnimationService;
  private activeTimelines: gsap.core.Timeline[] = [];

  /**
   * Gets the singleton instance of AnimationService.
   */
  static getInstance(): AnimationService {
    if (!AnimationService.instance) {
      AnimationService.instance = new AnimationService();
    }
    return AnimationService.instance;
  }

  /**
   * Animates clue reveal in the dynamic display window.
   *
   * @param element - Target element to animate
   * @param clue - Clue information for display
   * @param config - Animation configuration
   * @returns Promise that resolves when animation completes
   */
  async animateClueReveal(
    element: HTMLElement,
    _clue: ClueInfo,
    config: AnimationConfig = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          config.onComplete?.();
          resolve();
        }
      });

      // Set initial state
      gsap.set(element, { autoAlpha: 0, scale: 0.8 });

      // Animate in with classic Jeopardy reveal effect
      timeline
        .to(element, {
          autoAlpha: 1,
          scale: 1,
          duration: config.duration || 0.8,
          ease: config.ease || "power2.out",
          delay: config.delay || 0
        })
        .to(element.querySelector('.clue-category'), {
          y: 0,
          opacity: 1,
          duration: 0.3,
          ease: "power2.out"
        }, "-=0.5")
        .to(element.querySelector('.clue-prompt'), {
          y: 0,
          opacity: 1,
          duration: 0.5,
          ease: "power2.out"
        }, "-=0.2");

      this.activeTimelines.push(timeline);
    });
  }

  /**
   * Animates category introduction sequence.
   *
   * @param element - Target element to animate
   * @param categoryName - Name of the category being introduced
   * @param config - Animation configuration
   * @returns Promise that resolves when animation completes
   */
  async animateCategoryIntroduction(
    element: HTMLElement,
    _categoryName: string,
    config: AnimationConfig = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          config.onComplete?.();
          resolve();
        }
      });

      // Set initial state
      gsap.set(element, { autoAlpha: 0, y: 50 });

      // Animate category introduction
      timeline
        .to(element, {
          autoAlpha: 1,
          y: 0,
          duration: config.duration || 1.2,
          ease: config.ease || "power2.out",
          delay: config.delay || 0
        })
        .to(element.querySelector('.category-name'), {
          scale: 1.1,
          duration: 0.3,
          ease: "elastic.out",
          yoyo: true,
          repeat: 1
        }, "-=0.5");

      this.activeTimelines.push(timeline);
    });
  }

  /**
   * Animates dynamic display window transitions.
   *
   * @param fromElement - Element to animate out
   * @param toElement - Element to animate in
   * @param config - Animation configuration
   * @returns Promise that resolves when animation completes
   */
  async animateDisplayTransition(
    fromElement: HTMLElement | null,
    toElement: HTMLElement,
    config: AnimationConfig = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          config.onComplete?.();
          resolve();
        }
      });

      if (fromElement) {
        // Animate out current content
        timeline.to(fromElement, {
          autoAlpha: 0,
          scale: 0.9,
          duration: 0.3,
          ease: "power2.in"
        });
      }

      // Set initial state for new content
      gsap.set(toElement, { autoAlpha: 0, scale: 1.1 });

      // Animate in new content
      timeline.to(toElement, {
        autoAlpha: 1,
        scale: 1,
        duration: config.duration || 0.5,
        ease: config.ease || "power2.out",
        delay: config.delay || 0.1
      });

      this.activeTimelines.push(timeline);
    });
  }

  /**
   * Animates buzzer state changes.
   *
   * @param element - Buzzer element to animate
   * @param newState - New buzzer state
   * @param config - Animation configuration
   * @returns Promise that resolves when animation completes
   */
  async animateBuzzerStateChange(
    element: HTMLElement,
    newState: string,
    config: AnimationConfig = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          config.onComplete?.();
          resolve();
        }
      });

      // Different animations based on state
      switch (newState) {
        case 'unlocked':
          timeline.to(element, {
            scale: 1.05,
            duration: 0.2,
            ease: "power2.out",
            yoyo: true,
            repeat: 1
          });
          break;

        case 'buzzed':
          timeline.to(element, {
            scale: 1.2,
            duration: 0.1,
            ease: "power2.out"
          }).to(element, {
            scale: 1,
            duration: 0.3,
            ease: "elastic.out"
          });
          break;

        case 'frozen':
          timeline.to(element, {
            x: -5,
            duration: 0.1,
            ease: "power2.inOut",
            yoyo: true,
            repeat: 5
          });
          break;

        default:
          timeline.to(element, {
            scale: 1,
            duration: config.duration || 0.3,
            ease: config.ease || "power2.out"
          });
      }

      this.activeTimelines.push(timeline);
    });
  }

  /**
   * Clears all active animations.
   */
  clearAllAnimations(): void {
    this.activeTimelines.forEach((timeline) => {
      timeline.kill();
    });
    this.activeTimelines = [];
  }

  /**
   * Pauses all active animations.
   */
  pauseAllAnimations(): void {
    this.activeTimelines.forEach((timeline) => {
      timeline.pause();
    });
  }

  /**
   * Resumes all paused animations.
   */
  resumeAllAnimations(): void {
    this.activeTimelines.forEach((timeline) => {
      timeline.resume();
    });
  }
}
