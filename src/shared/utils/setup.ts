/**
 * Global setup utilities for Euno's Jeopardy application initialization.
 *
 * This module provides essential global utility functions that must be initialized
 * early in the application lifecycle. These utilities extend the global namespace
 * with custom functions used throughout the codebase for type safety and debugging.
 *
 * **Key Features:**
 * - Global assert function for runtime type checking and validation
 * - Centralized initialization for all global utilities
 * - Shared between main application and test environments
 * - TypeScript-friendly with proper type assertions
 *
 * **Usage:**
 * - Called from main.tsx during application startup
 * - Called from test setup for consistent test environment
 * - Must be initialized before any code that uses global utilities
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

/**
 * Initializes the global assert function for runtime validation and type narrowing.
 *
 * Creates a custom assert function that combines browser console logging with
 * TypeScript type assertions. This function is essential for runtime validation
 * and helps catch errors early in development while providing type narrowing
 * benefits in TypeScript.
 *
 * **Assert Function Features:**
 * - TypeScript type assertion support (asserts condition)
 * - Browser console.assert integration for debugging
 * - Throws Error for runtime failure handling
 * - Custom error messages for better debugging
 * - Works in both development and production environments
 *
 * **Use Cases:**
 * - Runtime validation of function parameters
 * - Type narrowing for union types
 * - Debugging and development assertions
 * - Input validation in critical code paths
 *
 * **Global Availability:**
 * After initialization, the assert function is available globally as:
 * ```typescript
 * assert(condition, "Optional error message");
 * ```
 *
 * @example
 * ```typescript
 * // After initializeAssert() is called
 * function processUser(user: User | null) {
 *   assert(user, "User must be provided");
 *   // user is now typed as User (not null)
 *   console.log(user.email);
 * }
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function initializeAssert(): void {
  /**
   * Global assert function implementation.
   *
   * Provides runtime validation with TypeScript type assertion support.
   * Logs to console and throws errors for failed assertions.
   */
  const assert = (condition: unknown, message?: string): asserts condition => {
    if (!condition) {
      // Create descriptive error message with fallback
      const errorMessage = message ?? 'Assertion failed';

      // Log to browser console for debugging (non-throwing)
      console.assert(condition, errorMessage);

      // Throw error for runtime failure and type narrowing
      throw new Error(errorMessage);
    }
  };

  // Attach to global namespace for application-wide access
  globalThis.assert = assert;
}

/**
 * Initializes all global utilities required by the Euno's Jeopardy application.
 *
 * This is the main initialization function that should be called early in the
 * application startup process. It sets up all global utilities in the correct
 * order and ensures they are available throughout the application lifecycle.
 *
 * **Initialization Order:**
 * 1. Assert function for runtime validation
 * 2. Future global utilities can be added here
 *
 * **Usage Requirements:**
 * - Must be called before any code that uses global utilities
 * - Should be called from main.tsx during application startup
 * - Should be called from test setup for consistent test environment
 * - Safe to call multiple times (idempotent operations)
 *
 * **Integration Points:**
 * - Called from main.tsx in the main application
 * - Called from test setup files for consistent test environment
 * - Required for proper TypeScript type checking of global utilities
 *
 * @example
 * ```typescript
 * // In main.tsx
 * import { initializeGlobals } from './shared/utils/setup';
 *
 * // Initialize before rendering app
 * initializeGlobals();
 *
 * createRoot(document.getElementById('root')!).render(<App />);
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function initializeGlobals(): void {
  // Initialize assert function for runtime validation
  initializeAssert();

  // Future global utilities can be initialized here
  // Example: initializeCustomLogger();
  // Example: initializeGlobalConstants();
}
