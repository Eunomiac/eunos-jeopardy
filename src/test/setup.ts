// Jest setup file for this project
import '../shared/types/index.d';
import '@testing-library/jest-dom';

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver for any future lazy loading
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver for responsive components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Global assert function implementation using Node's console.assert
global.assert = (condition: unknown, message?: string): asserts condition => {
  if (!condition) {
    throw new Error(message ?? 'Assertion failed');
  }
};

// Initialize global utilities for tests
import { initializeGlobals } from '../shared/utils/setup';
initializeGlobals();

/**
 * NOTE: Console methods (log, warn, error) are NOT globally suppressed.
 *
 * If a test needs to suppress console output (e.g., testing error handling),
 * mock console methods locally within that specific test:
 *
 * @example
 * it('should handle error', () => {
 *   const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
 *   // ... test code that triggers expected error ...
 *   expect(consoleSpy).toHaveBeenCalled();
 *   consoleSpy.mockRestore();
 * });
 *
 * This approach:
 * - Makes debugging easier (you can see actual console output during failures)
 * - Makes tests more explicit about what they're testing
 * - Avoids confusion about missing console output
 *
 * IMPORTANT: Local console mocking is NOT the same as mocking service dependencies.
 * Service dependencies (Supabase, GameService, etc.) MUST use global mocks from
 * src/test/__mocks__/ or src/services/__mocks__/. See TESTING_MOCKS_REFERENCE.md.
 */
