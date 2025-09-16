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
