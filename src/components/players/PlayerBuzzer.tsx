import React from 'react'
import './PlayerBuzzer.scss'

/**
 * Buzzer states for the player interface.
 */
export enum BuzzerState {
  /** Buzzer is locked - players cannot buzz in */
  LOCKED = 'locked',
  /** Buzzer is unlocked - players can buzz in */
  UNLOCKED = 'unlocked',
  /** Player has buzzed in - waiting for host response */
  BUZZED = 'buzzed',
  /** Buzzer is frozen - punishment for buzzing in too early (before host unlocks) */
  FROZEN = 'frozen'
}

/**
 * Props for the PlayerBuzzer component.
 */
interface PlayerBuzzerProps {
  /** Current state of the buzzer */
  state: BuzzerState
  /** Callback when player clicks the buzzer (only called when unlocked) */
  onBuzz: () => void
  /** Optional reaction time in milliseconds to display */
  reactionTime?: number | null
  /** Whether to show the reaction time */
  showReactionTime?: boolean
}

/**
 * Player buzzer component with four distinct states.
 *
 * **Buzzer States:**
 * - **Locked**: Gray, disabled, "Wait for host..."
 * - **Unlocked**: Blue, clickable, "BUZZ IN!"
 * - **Buzzed**: Green, disabled, shows reaction time
 * - **Frozen**: Red, disabled, "Too early - wait..." (punishment for buzzing before unlock)
 *
 * **Client-Side Timing:**
 * - Records unlock timestamp when state changes to UNLOCKED
 * - Records buzz timestamp when player clicks
 * - Calculates reaction time locally for fairness
 *
 * @param props - Component props
 * @returns PlayerBuzzer component
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function PlayerBuzzer({
  state,
  onBuzz,
  reactionTime,
  showReactionTime = false
}: Readonly<PlayerBuzzerProps>) {

  /**
   * Handles buzzer click - only processes if unlocked.
   */
  const handleBuzzerClick = () => {
    if (state === BuzzerState.UNLOCKED) {
      onBuzz()
    }
  }

  /**
   * Gets the display text based on buzzer state.
   */
  const getBuzzerText = (): string => {
    switch (state) {
      case BuzzerState.LOCKED:
        return 'Wait for host...'
      case BuzzerState.UNLOCKED:
        return 'BUZZ IN!'
      case BuzzerState.BUZZED:
        if (showReactionTime && reactionTime !== null && reactionTime !== undefined) {
          return `Buzzed! (${reactionTime}ms)`
        }
        return 'Buzzed!'
      case BuzzerState.FROZEN:
        return 'Too early - wait...'
      default:
        return 'Wait...'
    }
  }

  /**
   * Gets additional CSS classes based on state.
   */
  const getStateClasses = (): string => {
    const classes = ['player-buzzer']

    switch (state) {
      case BuzzerState.LOCKED:
        classes.push('buzzer-locked')
        break
      case BuzzerState.UNLOCKED:
        classes.push('buzzer-unlocked')
        break
      case BuzzerState.BUZZED:
        classes.push('buzzer-buzzed')
        break
      case BuzzerState.FROZEN:
        classes.push('buzzer-frozen')
        break
    }

    return classes.join(' ')
  }

  /**
   * Determines if the buzzer should be clickable.
   */
  const isClickable = state === BuzzerState.UNLOCKED

  return (
    <div className="player-buzzer-container">
      <button
        className={getStateClasses()}
        onClick={handleBuzzerClick}
        disabled={!isClickable}
        type="button"
        aria-label={`Buzzer - ${getBuzzerText()}`}
      >
        <div className="buzzer-content">
          <div className="buzzer-text">
            {getBuzzerText()}
          </div>

          {/* Visual indicator for state */}
          <div className="buzzer-indicator">
            {state === BuzzerState.LOCKED && (
              <span className="buzzer-icon">🔒</span>
            )}
            {state === BuzzerState.UNLOCKED && (
              <span className="buzzer-icon">⚡</span>
            )}
            {state === BuzzerState.BUZZED && (
              <span className="buzzer-icon">✅</span>
            )}
            {state === BuzzerState.FROZEN && (
              <span className="buzzer-icon">❌</span>
            )}
          </div>
        </div>
      </button>

      {/* Reaction time display (when buzzed and showing time) */}
      {state === BuzzerState.BUZZED && showReactionTime && reactionTime !== null && reactionTime !== undefined && (
        <div className="reaction-time-display">
          <span className="reaction-time-label">Reaction Time:</span>
          <span className="reaction-time-value">{reactionTime}ms</span>
        </div>
      )}
    </div>
  )
}
