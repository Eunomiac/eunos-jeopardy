/**
 * GSAP Animation Usage Examples for Euno's Jeopardy
 * 
 * This file demonstrates how to use GSAP animations in React components.
 * These are examples you can reference when implementing animations.
 */

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ANIMATION_CONFIG } from './animations';

/**
 * Example: Clue Reveal Animation
 * Use this pattern for revealing clues with the classic Jeopardy effect
 */
export function ClueRevealExample() {
  const clueRef = useRef<HTMLDivElement>(null);

  const handleRevealClue = () => {
    if (clueRef.current) {
      // Use the custom jeopardyReveal effect
      gsap.effects.jeopardyReveal(clueRef.current, { 
        duration: ANIMATION_CONFIG.SLOW 
      });
    }
  };

  return (
    <div>
      <button onClick={handleRevealClue}>Reveal Clue</button>
      <div 
        ref={clueRef}
        className="clue-display"
        style={{ opacity: 0 }}
      >
        This is a sample clue that will animate in!
      </div>
    </div>
  );
}

/**
 * Example: Buzzer Animation
 * Use this pattern for buzzer activation effects
 */
export function BuzzerExample() {
  const buzzerRef = useRef<HTMLButtonElement>(null);

  const handleBuzz = () => {
    if (buzzerRef.current) {
      // Use the custom buzzerActivate effect
      gsap.effects.buzzerActivate(buzzerRef.current);
    }
  };

  return (
    <button 
      ref={buzzerRef}
      onClick={handleBuzz}
      className="buzzer-button"
    >
      BUZZ!
    </button>
  );
}

/**
 * Example: Score Animation
 * Use this pattern for animating score changes
 */
export function ScoreAnimationExample() {
  const scoreRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = React.useState(0);

  const addPoints = (points: number) => {
    const newScore = score + points;
    setScore(newScore);

    if (scoreRef.current) {
      // Animate the score change
      gsap.effects.scoreChange(scoreRef.current, { 
        positive: points > 0 
      });

      // Also animate the number counting up/down
      gsap.effects.countMoney(scoreRef.current, {
        from: score,
        to: newScore,
        duration: ANIMATION_CONFIG.NORMAL
      });
    }
  };

  return (
    <div>
      <div ref={scoreRef} className="score-display">
        ${score.toLocaleString()}
      </div>
      <button onClick={() => addPoints(200)}>+$200</button>
      <button onClick={() => addPoints(-200)}>-$200</button>
    </div>
  );
}

/**
 * Example: Complex Timeline Animation
 * Use this pattern for multi-step animations
 */
export function ComplexAnimationExample() {
  const containerRef = useRef<HTMLDivElement>(null);
  const clue1Ref = useRef<HTMLDivElement>(null);
  const clue2Ref = useRef<HTMLDivElement>(null);
  const clue3Ref = useRef<HTMLDivElement>(null);

  const playSequence = () => {
    if (!containerRef.current) return;

    // Create a master timeline
    const tl = gsap.timeline();

    // Chain multiple animations
    tl
      .effects.jeopardyReveal(clue1Ref.current, { duration: 0.5 })
      .effects.jeopardyReveal(clue2Ref.current, { duration: 0.5 }, "-=0.3")
      .effects.jeopardyReveal(clue3Ref.current, { duration: 0.5 }, "-=0.3")
      .to(containerRef.current, {
        backgroundColor: ANIMATION_CONFIG.JEOPARDY_GOLD,
        duration: 0.3
      })
      .to(containerRef.current, {
        backgroundColor: ANIMATION_CONFIG.JEOPARDY_BLUE,
        duration: 0.3
      });
  };

  return (
    <div>
      <button onClick={playSequence}>Play Sequence</button>
      <div ref={containerRef} className="animation-container">
        <div ref={clue1Ref} style={{ opacity: 0 }}>Clue 1</div>
        <div ref={clue2Ref} style={{ opacity: 0 }}>Clue 2</div>
        <div ref={clue3Ref} style={{ opacity: 0 }}>Clue 3</div>
      </div>
    </div>
  );
}

/**
 * Example: useEffect Animation Hook
 * Use this pattern for animations that trigger on component mount/state changes
 */
export function AutoAnimationExample({ isVisible }: { isVisible: boolean }) {
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!elementRef.current) return;

    if (isVisible) {
      // Animate in
      gsap.effects.modalAppear(elementRef.current);
    } else {
      // Animate out
      gsap.to(elementRef.current, {
        opacity: 0,
        scale: 0.7,
        duration: ANIMATION_CONFIG.FAST,
        ease: ANIMATION_CONFIG.EASE_OUT
      });
    }
  }, [isVisible]);

  return (
    <div 
      ref={elementRef}
      className="auto-animated-element"
      style={{ opacity: 0 }}
    >
      This element animates automatically based on props!
    </div>
  );
}

/**
 * Custom Hook: useGSAPAnimation
 * Use this pattern to create reusable animation hooks
 */
export function useGSAPAnimation() {
  const elementRef = useRef<HTMLElement>(null);

  const animateIn = () => {
    if (elementRef.current) {
      gsap.effects.slideInRight(elementRef.current);
    }
  };

  const animateOut = () => {
    if (elementRef.current) {
      gsap.to(elementRef.current, {
        x: "-100%",
        opacity: 0,
        duration: ANIMATION_CONFIG.NORMAL,
        ease: ANIMATION_CONFIG.EASE_OUT
      });
    }
  };

  const pulse = () => {
    if (elementRef.current) {
      gsap.to(elementRef.current, {
        scale: 1.1,
        duration: 0.2,
        yoyo: true,
        repeat: 1,
        ease: ANIMATION_CONFIG.EASE_ELASTIC
      });
    }
  };

  return {
    elementRef,
    animateIn,
    animateOut,
    pulse
  };
}

/**
 * Example usage of the custom hook
 */
export function CustomHookExample() {
  const { elementRef, animateIn, animateOut, pulse } = useGSAPAnimation();

  return (
    <div>
      <button onClick={animateIn}>Animate In</button>
      <button onClick={animateOut}>Animate Out</button>
      <button onClick={pulse}>Pulse</button>
      
      <div 
        ref={elementRef as React.RefObject<HTMLDivElement>}
        className="custom-hook-element"
      >
        Element controlled by custom hook
      </div>
    </div>
  );
}
