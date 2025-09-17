import React, { useEffect, useState } from 'react'
import { PlayerBuzzer } from './PlayerBuzzer'
import { BuzzerState } from '../../types/BuzzerState'
import './ClueRevealModal.scss'

/**
 * Clue information for display.
 */
export interface ClueInfo {
  /** Clue ID */
  id: string
  /** Clue prompt text */
  prompt: string
  /** Clue value/amount */
  value: number
  /** Category name */
  category: string
  /** Whether this is a Daily Double */
  isDailyDouble: boolean
}

/**
 * Props for the ClueRevealModal component.
 */
interface ClueRevealModalProps {
  /** Clue information to display */
  clue: ClueInfo | null
  /** Current buzzer state */
  buzzerState: BuzzerState
  /** Callback when player buzzes in */
  onBuzz: () => void
  /** Whether the modal is visible */
  isVisible: boolean
  /** Callback when modal should close */
  onClose: () => void
  /** Optional reaction time to display */
  reactionTime?: number | null
  /** Whether to show reaction time */
  showReactionTime?: boolean
}

/**
 * Clue reveal modal component with integrated buzzer.
 *
 * **Features:**
 * - Displays clue prompt and category information
 * - Integrated buzzer with all four states
 * - Client-side timing calculation
 * - Animate-in/animate-out effects
 * - Daily Double indication
 *
 * **Layout:**
 * - Positioned over central podium area
 * - Modal overlay with clue text
 * - Buzzer integrated below clue text
 * - Reaction time display when buzzed
 *
 * **Timing Implementation:**
 * - Records unlock timestamp when buzzer becomes unlocked
 * - Records buzz timestamp when player clicks
 * - Calculates reaction time locally for fairness
 *
 * @param props - Component props
 * @returns ClueRevealModal component
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function ClueRevealModal({
  clue,
  buzzerState,
  onBuzz,
  isVisible,
  onClose,
  reactionTime,
  showReactionTime = false
}: Readonly<ClueRevealModalProps>) {
  const [unlockTimestamp, setUnlockTimestamp] = useState<number | null>(null)
  const [isAnimatingIn, setIsAnimatingIn] = useState(false)
  const [isAnimatingOut, setIsAnimatingOut] = useState(false)

  /**
   * Effect to handle buzzer state changes and timing.
   */
  useEffect(() => {
    if (buzzerState === BuzzerState.UNLOCKED && !unlockTimestamp) {
      // Record when buzzer becomes unlocked for client-side timing
      const timestamp = Date.now()
      setUnlockTimestamp(timestamp)
      console.log('🔓 Buzzer unlocked at:', timestamp)
    } else if (buzzerState === BuzzerState.LOCKED) {
      // Clear timestamp when buzzer is locked
      setUnlockTimestamp(null)
    }
  }, [buzzerState, unlockTimestamp])

  /**
   * Effect to handle modal visibility animations.
   */
  useEffect(() => {
    if (isVisible) {
      setIsAnimatingIn(true)
      setIsAnimatingOut(false)
      // Remove animating-in class after animation completes
      const timer = setTimeout(() => setIsAnimatingIn(false), 300)
      return () => clearTimeout(timer)
    } else {
      setIsAnimatingOut(true)
      // Clean up after animation completes
      const timer = setTimeout(() => {
        setIsAnimatingOut(false)
        setUnlockTimestamp(null) // Reset timing when modal closes
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  // Note: Buzzer logic is handled by parent PlayerDashboard component
  // This modal just displays the buzzer interface and passes events up

  /**
   * Handles modal close (ESC key only - prevent accidental closing)
   */
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }

  /**
   * Prevents modal from closing when clicking on the overlay
   */
  const handleOverlayClick = (event: React.MouseEvent) => {
    // Prevent closing when clicking outside - players might accidentally click
    event.preventDefault()
    event.stopPropagation()
  }

  // Don't render if not visible and not animating out
  if (!isVisible && !isAnimatingOut) {
    return null
  }

  // Don't render if no clue data
  if (!clue) {
    return null
  }

  const modalClasses = [
    'clue-reveal-modal',
    isAnimatingIn ? 'animating-in' : '',
    isAnimatingOut ? 'animating-out' : '',
    clue.isDailyDouble ? 'daily-double' : ''
  ].filter(Boolean).join(' ')

  return (
    <div
      className="clue-reveal-overlay"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-label="Clue reveal modal"
      tabIndex={-1}
    >
      <dialog
        className={modalClasses}
        open={isVisible}
        aria-labelledby="clue-prompt"
      >
        {/* Daily Double Indicator */}
        {clue.isDailyDouble && (
          <div className="daily-double-indicator">
            <span className="daily-double-text">DAILY DOUBLE!</span>
          </div>
        )}

        {/* Clue Header */}
        <div className="clue-header">
          <div className="clue-category">{clue.category}</div>
          <div className="clue-value">${clue.value.toLocaleString()}</div>
        </div>

        {/* Clue Prompt */}
        <div className="jeopardy-clue-display">
            {clue.prompt}
        </div>

        {/* Integrated Buzzer */}
        <div className="buzzer-section">
          <PlayerBuzzer
            state={buzzerState}
            onBuzz={onBuzz}
            reactionTime={reactionTime}
            showReactionTime={showReactionTime}
          />
        </div>
      </dialog>
    </div>
  )
}
