// MTG Brawl Deck Builder - Global Setup Utilities
// Shared setup functions for both main application and tests

/**
 * Initialize global assert function
 * Creates a throwing assert function using browser's console.assert
 */
export function initializeAssert(): void {
  const assert = (condition: unknown, message?: string): asserts condition => {
    if (!condition) {
      const errorMessage = message ?? 'Assertion failed';
      // Use browser's console.assert for logging
      console.assert(condition, errorMessage);
      // Throw error for type narrowing and runtime failure
      throw new Error(errorMessage);
    }
  };

  globalThis.assert = assert;
}

/**
 * Initialize all global utilities
 * Call this function early in application startup
 */
export function initializeGlobals(): void {
  initializeAssert();
}
