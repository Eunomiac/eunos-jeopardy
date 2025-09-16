/**
 * Game-specific type definitions and validation utilities for Euno's Jeopardy.
 *
 * This module provides core type definitions for game states and rounds, along with
 * type guard functions for runtime validation. These types are used throughout the
 * application for type safety and consistent game state management.
 *
 * **Global Types:**
 * - GameStatus: Defines the lifecycle states of a Jeopardy game
 * - RoundType: Defines the three types of Jeopardy rounds
 *
 * **Type Guards:**
 * - isValidRoundType: Runtime validation for RoundType values
 * - isValidGameStatus: Runtime validation for GameStatus values
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

declare global {
  /**
   * Possible states of a Jeopardy game session throughout its lifecycle.
   *
   * Defines the progression of a game from creation to completion:
   * - lobby: Game created, waiting for players to join
   * - in_progress: Game actively being played
   * - completed: Game finished, scores finalized
   * - cancelled: Game ended early before completion
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  type GameStatus = "lobby" | "in_progress" | "completed" | "cancelled"

  /**
   * Types of Jeopardy rounds following the traditional game format.
   *
   * Represents the three standard rounds in a Jeopardy game:
   * - jeopardy: First round with standard clue values
   * - double: Second round with doubled clue values and 2 Daily Doubles
   * - final: Final Jeopardy round with single clue and wagering
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  type RoundType = "jeopardy" | "double" | "final"
}

/**
 * Type guard function to validate if a string value is a valid RoundType.
 *
 * Provides runtime type checking for RoundType values, useful for validating
 * user input, API responses, or data from external sources. Ensures type safety
 * when working with dynamic round type values.
 *
 * **Use Cases:**
 * - Validating CSV data during clue set parsing
 * - Checking API responses from database queries
 * - Validating user input in game controls
 * - Type narrowing in conditional logic
 *
 * @param value - String value to check against RoundType union
 * @returns True if value is a valid RoundType, false otherwise
 *
 * @example
 * ```typescript
 * const userInput = "jeopardy";
 * if (isValidRoundType(userInput)) {
 *   // userInput is now typed as RoundType
 *   console.log(`Valid round: ${userInput}`);
 * } else {
 *   console.error("Invalid round type");
 * }
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function isValidRoundType(value: unknown): value is RoundType {
  const validRounds: RoundType[] = ["jeopardy", "double", "final"]
  return typeof value === "string" && validRounds.includes(value as RoundType)
}

/**
 * Type guard function to validate if a string value is a valid GameStatus.
 *
 * Provides runtime type checking for GameStatus values, ensuring type safety
 * when working with dynamic game status values from databases, APIs, or user input.
 * Essential for maintaining data integrity in game state management.
 *
 * **Use Cases:**
 * - Validating database query results
 * - Checking game state transitions
 * - Validating API request parameters
 * - Type narrowing in game logic
 *
 * @param value - String value to check against GameStatus union
 * @returns True if value is a valid GameStatus, false otherwise
 *
 * @example
 * ```typescript
 * const dbStatus = "in_progress";
 * if (isValidGameStatus(dbStatus)) {
 *   // dbStatus is now typed as GameStatus
 *   updateGameUI(dbStatus);
 * } else {
 *   throw new Error(`Invalid game status: ${dbStatus}`);
 * }
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function isValidGameStatus(value: unknown): value is GameStatus {
  const validStatuses: GameStatus[] = ["lobby", "in_progress", "completed", "cancelled"]
  return typeof value === "string" && validStatuses.includes(value as GameStatus)
}
