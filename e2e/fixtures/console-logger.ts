import { Page, ConsoleMessage } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Console Logger for E2E Tests
 * 
 * This helper captures browser console messages during Playwright tests
 * and saves them to a file for debugging purposes.
 * 
 * **Why This Is Useful:**
 * - Debug issues that only happen during E2E tests
 * - See console.log/error/warn messages from the application
 * - Track timing of events and async operations
 * - Identify race conditions and timing issues
 * 
 * **Usage:**
 * ```typescript
 * test('my test', async ({ page }) => {
 *   const logger = startConsoleLogger(page, 'my-test');
 *   
 *   // ... run your test ...
 *   
 *   logger.save(); // Save logs to file
 * });
 * ```
 */

/**
 * Console message with timestamp for logging
 */
interface LogEntry {
  timestamp: string;
  type: string;
  text: string;
  location?: string;
}

/**
 * Console logger instance
 */
export interface ConsoleLogger {
  /** Save captured logs to a file */
  save: () => void;
  /** Get all captured logs as an array */
  getLogs: () => LogEntry[];
  /** Clear all captured logs */
  clear: () => void;
}

/**
 * Start capturing console messages from the browser.
 * 
 * This function sets up a listener on the page that captures all console
 * messages (log, error, warn, info, debug) and stores them with timestamps.
 * 
 * @param page - Playwright page instance
 * @param testName - Name of the test (used for filename)
 * @returns ConsoleLogger instance with save/getLogs/clear methods
 * 
 * @example
 * ```typescript
 * test('player joins game', async ({ page }) => {
 *   const logger = startConsoleLogger(page, 'player-joins-game');
 *   
 *   await page.goto('/');
 *   // ... test actions ...
 *   
 *   logger.save(); // Saves to e2e/logs/player-joins-game-console.log
 * });
 * ```
 */
export function startConsoleLogger(page: Page, testName: string): ConsoleLogger {
  const logs: LogEntry[] = [];

  // Listen to all console messages from the browser
  page.on('console', (msg: ConsoleMessage) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      type: msg.type(),
      text: msg.text(),
    };

    // Try to get the location (file:line) where the log came from
    try {
      const location = msg.location();
      if (location.url) {
        entry.location = `${location.url}:${location.lineNumber}:${location.columnNumber}`;
      }
    } catch {
      // Location might not be available for all messages
    }

    logs.push(entry);

    // Also print to test runner console for immediate visibility
    const emoji = getEmojiForType(msg.type());
    console.log(`${emoji} [${msg.type()}] ${msg.text()}`);
  });

  return {
    save: () => {
      // Create logs directory if it doesn't exist
      const logsDir = join(process.cwd(), 'e2e', 'logs');
      try {
        mkdirSync(logsDir, { recursive: true });
      } catch {
        // Directory might already exist
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${testName}-${timestamp}-console.log`;
      const filepath = join(logsDir, filename);

      // Format logs as readable text
      const logText = logs
        .map((entry) => {
          const location = entry.location ? ` (${entry.location})` : '';
          return `[${entry.timestamp}] [${entry.type.toUpperCase()}]${location}\n${entry.text}\n`;
        })
        .join('\n');

      // Write to file
      writeFileSync(filepath, logText, 'utf-8');
      console.log(`\n📝 Console logs saved to: ${filepath}\n`);
    },

    getLogs: () => logs,

    clear: () => {
      logs.length = 0;
    },
  };
}

/**
 * Get emoji for console message type for better visibility
 */
function getEmojiForType(type: string): string {
  switch (type) {
    case 'error':
      return '❌';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    case 'debug':
      return '🐛';
    case 'log':
      return '📝';
    default:
      return '💬';
  }
}

/**
 * Convenience function to capture console logs for a single test.
 * 
 * This wraps your test function and automatically saves console logs
 * at the end, even if the test fails.
 * 
 * @param page - Playwright page instance
 * @param testName - Name of the test
 * @param testFn - Test function to run
 * 
 * @example
 * ```typescript
 * test('my test', async ({ page }) => {
 *   await withConsoleLogging(page, 'my-test', async () => {
 *     await page.goto('/');
 *     // ... test actions ...
 *   });
 *   // Logs are automatically saved here
 * });
 * ```
 */
export async function withConsoleLogging(
  page: Page,
  testName: string,
  testFn: () => Promise<void>
): Promise<void> {
  const logger = startConsoleLogger(page, testName);

  try {
    await testFn();
  } finally {
    // Always save logs, even if test fails
    logger.save();
  }
}

