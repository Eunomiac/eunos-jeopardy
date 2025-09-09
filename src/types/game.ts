/**
 * Game-specific type definitions for Euno's Jeopardy
 */

declare global {
  /**
   * Possible states of a game session
   */
  type GameStatus = "lobby" | "in_progress" | "completed" | "archived"

  /**
   * Types of Jeopardy rounds
   */
  type RoundType = "jeopardy" | "double" | "final"
}

/**
 * Type guard to check if a string is a valid RoundType
 */
export function isValidRoundType(value: string): value is RoundType {
  return (value === "jeopardy" || value === "double" || value === "final")
}

/**
 * Type guard to check if a string is a valid GameStatus
 */
export function isValidGameStatus(value: string): value is GameStatus {
  return (value === "lobby" || value === "in_progress" || value === "completed" || value === "archived")
}
