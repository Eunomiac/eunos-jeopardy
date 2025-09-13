/**
 * Global type definitions and ambient types for Euno's Jeopardy application.
 *
 * This module provides global type definitions, utility types, and interface
 * augmentations that are available throughout the entire application without
 * explicit imports. These types enhance TypeScript's type system with
 * application-specific utilities and overrides.
 *
 * **Key Features:**
 * - Utility types for common patterns (Maybe<T>)
 * - GSAP animation type aliases for cleaner code
 * - Array.includes() override for better type checking
 * - Global assert function declaration
 *
 * **Global Availability:**
 * All types and functions declared here are available globally without imports.
 * This is achieved through TypeScript's ambient module declarations.
 *
 * **Integration:**
 * - Works with setup.ts for global function initialization
 * - Provides type safety for global utilities
 * - Enhances built-in TypeScript types with application needs
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

import { gsap } from 'gsap';

declare global {
  /**
   * Convenience type for optional values that may be undefined.
   *
   * Provides a cleaner alternative to `T | undefined` for optional values
   * throughout the application. Improves code readability and reduces
   * repetitive union type declarations.
   *
   * **Use Cases:**
   * - Function parameters that may be undefined
   * - State variables that start as undefined
   * - API response fields that may be missing
   * - Configuration options that are optional
   *
   * @template T - The type that may be undefined
   *
   * @example
   * ```typescript
   * // Instead of: string | undefined
   * type UserName = Maybe<string>;
   *
   * // Function with optional parameter
   * function processUser(id: string, name: Maybe<string>) {
   *   if (name) {
   *     // TypeScript knows name is string here
   *     console.log(`Processing ${name}`);
   *   }
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  type Maybe<T> = T | undefined;

  /**
   * GSAP Animation type alias for cleaner animation type declarations.
   *
   * Simplifies the complex GSAP union type into a single, readable type alias.
   * Used for animation variables and function parameters that can accept
   * either GSAP timelines or tweens.
   *
   * **GSAP Integration:**
   * - Covers both Timeline and Tween animation types
   * - Maintains full GSAP functionality and methods
   * - Reduces verbose union type declarations
   *
   * **Use Cases:**
   * - Animation state variables
   * - Function parameters accepting animations
   * - Animation utility function return types
   * - Component props for animation objects
   *
   * @example
   * ```typescript
   * // Instead of: gsap.core.Timeline | gsap.core.Tween
   * let currentAnimation: GSAPAnimation;
   *
   * function playAnimation(animation: GSAPAnimation) {
   *   animation.play();
   * }
   *
   * // Works with both timelines and tweens
   * const tween = gsap.to('.element', { x: 100 });
   * const timeline = gsap.timeline();
   * playAnimation(tween);     // ✓ Valid
   * playAnimation(timeline);  // ✓ Valid
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  type GSAPAnimation = gsap.core.Timeline | gsap.core.Tween;

  /**
   * Enhanced Array.includes() method that accepts unknown values for flexible type checking.
   *
   * Overrides the default TypeScript Array.includes() method to accept unknown values
   * instead of requiring exact type matches. This allows for more flexible runtime
   * type checking without TypeScript compilation errors.
   *
   * **Benefits:**
   * - Eliminates TypeScript errors when checking unknown values
   * - Maintains runtime safety (returns false for non-matching types)
   * - Enables flexible type validation patterns
   * - Supports dynamic value checking scenarios
   *
   * **Use Cases:**
   * - Validating user input against known values
   * - Type guards with unknown input types
   * - API response validation
   * - Dynamic configuration checking
   *
   * **Safety:**
   * - Runtime behavior unchanged (still uses strict equality)
   * - Type safety maintained for array elements
   * - No performance impact on array operations
   *
   * @example
   * ```typescript
   * const validColors = ["red", "blue", "green"] as const;
   * const userInput: unknown = "purple";
   *
   * // Without override: TypeScript error
   * // With override: No error, returns false
   * if (validColors.includes(userInput)) {
   *   // userInput is now typed as "red" | "blue" | "green"
   *   console.log(`Valid color: ${userInput}`);
   * }
   *
   * // Works with numbers too
   * validColors.includes(42); // No error, returns false
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  // Generic variable required to merge with existing Array<T> definition
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Array<T> {
    includes(searchElement: unknown, fromIndex?: number): boolean;
  }

  /**
   * Enhanced ReadonlyArray.includes() method for consistency with Array override.
   *
   * Provides the same unknown value acceptance for readonly arrays to maintain
   * consistent behavior across all array types in the application.
   *
   * **Consistency:**
   * - Matches Array.includes() behavior exactly
   * - Works with readonly and const arrays
   * - Maintains immutability guarantees
   *
   * @example
   * ```typescript
   * const readonlyColors = ["red", "blue"] as const;
   * const input: unknown = "red";
   *
   * if (readonlyColors.includes(input)) {
   *   // Works without TypeScript errors
   *   console.log("Color found");
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  // Generic variable required to merge with existing ReadonlyArray<T> definition
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ReadonlyArray<T> {
    includes(searchElement: unknown, fromIndex?: number): boolean;
  }

  /**
   * Global assert function for runtime validation and TypeScript type narrowing.
   *
   * Provides a global assert function that combines runtime validation with
   * TypeScript's assertion signatures for type narrowing. Throws an error if
   * the condition is false, otherwise narrows the type for subsequent code.
   *
   * **Implementation:**
   * - Actual implementation provided by setup.ts initializeAssert()
   * - This is just the type declaration for global availability
   * - Must call initializeGlobals() before using this function
   *
   * **Type Narrowing:**
   * - Uses TypeScript's `asserts condition` signature
   * - Narrows union types when assertion passes
   * - Eliminates null/undefined from types after successful assertion
   *
   * **Runtime Behavior:**
   * - Logs to console.assert() for debugging
   * - Throws Error with descriptive message on failure
   * - No-op when condition is truthy
   *
   * **Use Cases:**
   * - Runtime validation of function parameters
   * - Type narrowing for union types
   * - Null/undefined checks with type safety
   * - Development debugging and validation
   *
   * @param condition - The condition to assert (must be truthy)
   * @param message - Optional error message for failed assertions
   *
   * @throws {Error} When condition is falsy
   *
   * @example
   * ```typescript
   * // Type narrowing example
   * function processUser(user: User | null) {
   *   assert(user, "User must be provided");
   *   // TypeScript now knows user is User, not User | null
   *   console.log(user.email); // No TypeScript error
   * }
   *
   * // Parameter validation
   * function divide(a: number, b: number) {
   *   assert(b !== 0, "Division by zero is not allowed");
   *   return a / b;
   * }
   *
   * // Array bounds checking
   * function getItem<T>(array: T[], index: number): T {
   *   assert(index >= 0 && index < array.length, "Index out of bounds");
   *   return array[index]; // TypeScript knows this is safe
   * }
   * ```
   *
   * @since 0.1.0
   * @author Euno's Jeopardy Team
   */
  function assert(condition: unknown, message?: string): asserts condition;
}

/**
 * Export statement to make this file a module for TypeScript.
 *
 * Required for `declare global` to work properly in TypeScript.
 * Without this export, the global declarations would not be recognized.
 */
export {};
