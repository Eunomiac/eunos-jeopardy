/**
 * Integrated Buzzer Component for PlayerPodiums.
 *
 * This component replaces the traditional player name display with an
 * always-visible buzzer that integrates seamlessly into the player podium.
 * It supports the six-state buzzer system and provides visual feedback
 * for all game states.
 *
 * **Six Buzzer States:**
 * - HIDDEN: Starting state before game begins
 * - INACTIVE: Default state during round, no clue selected
 * - LOCKED: Clue revealed but players cannot buzz in yet
 * - UNLOCKED: Players can buzz in
 * - BUZZED: Player has buzzed in - waiting for host response
 * - FROZEN: Punishment for buzzing in too early or after being marked wrong
 *
 * **Features:**
 * - Always visible on player podiums
 * - Smooth state transitions with GSAP animations
 * - Visual feedback for all buzzer states
 * - Accessible design with proper ARIA labels
 * - Responsive scaling based on podium size
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

import { useEffect, useRef } from 'react';
import { BuzzerState } from '../../types/BuzzerState';
import { BuzzerStateService } from '../../services/animations/BuzzerStateService';
import { AnimationService } from '../../services/animations/AnimationService';
import './IntegratedBuzzer.scss';

/**
 * Props for the IntegratedBuzzer component.
 */
export interface IntegratedBuzzerProps {
  /** Current buzzer state */
  state: BuzzerState;
  /** Player nickname to display */
  playerNickname: string;
  /** Whether this buzzer is for the current user */
  isCurrentUser: boolean;
  /** Whether the player is currently focused by the host */
  isFocused: boolean;
  /** Callback when buzzer is clicked */
  onBuzz?: () => void;
  /** Optional reaction time to display */
  reactionTime?: number | null;
  /** Whether to show reaction time */
  showReactionTime?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Integrated Buzzer component.
 *
 * @param props - Component props
 * @returns IntegratedBuzzer component
 */
export function IntegratedBuzzer({
  state,
  playerNickname,
  isCurrentUser,
  isFocused,
  onBuzz,
  reactionTime,
  showReactionTime = false,
  className = ''
}: Readonly<IntegratedBuzzerProps>) {
  const buzzerRef = useRef<HTMLButtonElement>(null);
  const animationService = AnimationService.getInstance();
  const buzzerStateService = BuzzerStateService.getInstance();

  /**
   * Effect to handle buzzer state animations.
   */
  useEffect(() => {
    if (buzzerRef.current) {
      void animationService.animateBuzzerStateChange(buzzerRef.current, state, {
        duration: 0.3,
        ease: "power2.out"
      });
    }
  }, [state, animationService]);

  /**
   * Handles buzzer click.
   */
  const handleClick = () => {
    if (isCurrentUser && buzzerStateService.isInteractive(state) && onBuzz) {
      onBuzz();
    }
  };

  // Build CSS classes
  const buzzerClasses = [
    'integrated-buzzer',
    buzzerStateService.getStateClassName(state),
    isCurrentUser ? 'current-user' : 'other-player',
    isFocused ? 'focused' : '',
    className
  ].filter(Boolean).join(' ');

  // Determine if buzzer should be interactive
  const isInteractive = isCurrentUser && buzzerStateService.isInteractive(state);

  // Build ARIA label
  const ariaLabel = `${playerNickname}'s buzzer - ${buzzerStateService.getStateDisplayText(state)}${
    isFocused ? ' (currently selected)' : ''
  }`;

  return (
    <div className="integrated-buzzer-container">
      {/* Player Name */}
      <div className="player-name-display">
        {playerNickname}
      </div>

      {/* Buzzer Button */}
      <button
        ref={buzzerRef}
        className={buzzerClasses}
        onClick={handleClick}
        disabled={!isInteractive}
        aria-label={ariaLabel}
        type="button"
      >

        {/* State Icon */}
        <div className="buzzer-state-icon">
          {(() => {
            switch (state) {
              case BuzzerState.HIDDEN:
                return '⏳';
              case BuzzerState.INACTIVE:
                return '⚪';
              case BuzzerState.LOCKED:
                return '🔒';
              case BuzzerState.UNLOCKED:
                return '🔴';
              case BuzzerState.BUZZED:
                return '⚡';
              case BuzzerState.FROZEN:
                return '❄️';
              default:
                return '❓';
            }
          })()}
        </div>

        {/* Reaction Time Display */}
        {showReactionTime && reactionTime && state === BuzzerState.BUZZED && (
          <div className="reaction-time-display">
            {reactionTime} ms
          </div>
        )}
      </button>

    </div>
  );
}

/**
 * Default export for convenience.
 */
export default IntegratedBuzzer;
