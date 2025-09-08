// Jest setup file for this project
import '../shared/types/index.d';
import '@testing-library/jest-dom';

// Mock window.matchMedia for responsive design tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
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

// Suppress console output in tests unless explicitly testing them
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

beforeEach(() => {
  console.warn = jest.fn();
  console.error = jest.fn();
  console.log = jest.fn(); // Suppress console.log during tests
});

afterEach(() => {
  console.warn = originalConsoleWarn;
  console.error = originalConsoleError;
  console.log = originalConsoleLog;
});
