/**
 * Enhanced buzzer states for the integrated player interface.
 *
 * **State Flow:**
 * HIDDEN → (categories introduced) → INACTIVE → (clue revealed) → LOCKED → (buzzer unlocked) → UNLOCKED → (player buzzes) → BUZZED → (correct/wrong/timeout) → INACTIVE
 *                                                                    ↓ (early buzz)
 *                                                                  FROZEN → (clue completed) → INACTIVE
 */
export enum BuzzerState {
  /** Buzzer is hidden - starting state before game begins */
  HIDDEN = 'hidden',
  /** Buzzer is inactive - default state during round, no clue selected */
  INACTIVE = 'inactive',
  /** Buzzer is locked - clue revealed but players cannot buzz in yet */
  LOCKED = 'locked',
  /** Buzzer is unlocked - players can buzz in */
  UNLOCKED = 'unlocked',
  /** Player has buzzed in - waiting for host response */
  BUZZED = 'buzzed',
  /** Buzzer is frozen - punishment for buzzing in too early or after being marked wrong */
  FROZEN = 'frozen'
}
