// Global Type Definitions
// Ambient types available throughout the application

import { gsap } from 'gsap';

declare global {
  /**
   * Convenience type for optional values
   * Use instead of `T | undefined` for cleaner code
   */
  type Maybe<T> = T | undefined;

  /**
   * GSAP Animation type alias to reduce union type complexity
   * Use instead of `gsap.core.Timeline | gsap.core.Tween`
   */
  type GSAPAnimation = gsap.core.Timeline | gsap.core.Tween;

  /**
   * Override Array.includes() to accept unknown values
   * Allows checking if any value exists in a typed array without pre-validation
   *
   * Example:
   * const colors = ["red", "blue", "green"];
   * colors.includes(3); // No TypeScript error, returns false
   * colors.includes("red"); // Returns true
   */

  // Generic variable required to merge with existing Array<T> definition
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Array<T> {
    includes(searchElement: unknown, fromIndex?: number): boolean;
  }

  /**
   * Override ReadonlyArray.includes() for consistency
   */

  // Generic variable required to merge with existing ReadonlyArray<T> definition
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ReadonlyArray<T> {
    includes(searchElement: unknown, fromIndex?: number): boolean;
  }

  /**
   * Global assert function using Node's console.assert
   * Throws an error if the condition is false, otherwise narrows the type
   *
   * @param condition - The condition to assert
   * @param message - Optional error message
   *
   * Example:
   * const value: string | null = getValue();
   * assert(value !== null, "Value must not be null");
   * // TypeScript now knows value is string, not string | null
   */
  function assert(condition: unknown, message?: string): asserts condition;
}

// This file needs to be a module to work with declare global
export {};
