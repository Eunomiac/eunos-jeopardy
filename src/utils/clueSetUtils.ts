/**
 * Clue set utility functions for file handling and display formatting.
 *
 * This module provides utilities for working with CSV clue set files,
 * including filename formatting, file discovery, and URL generation.
 * These utilities support the clue set selection and loading workflow.
 *
 * **Key Features:**
 * - Filename to display name conversion for user-friendly interfaces
 * - Available clue set discovery and management
 * - URL generation for clue set file access
 * - Title case formatting for consistent display
 *
 * **File Naming Conventions:**
 * - CSV files stored in public/clue-sets/ directory
 * - Filenames use hyphens or underscores as separators
 * - .csv extension required for proper file type identification
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */

/**
 * Converts a CSV filename to a user-friendly display name.
 *
 * Transforms technical filenames into readable display names for the user interface.
 * Removes file extensions, replaces separators with spaces, and applies title case
 * formatting for consistent presentation.
 *
 * **Transformation Rules:**
 * 1. Remove .csv extension (case-insensitive)
 * 2. Replace hyphens and underscores with spaces
 * 3. Convert to title case (capitalize each word)
 *
 * **Use Cases:**
 * - ClueSetSelector dropdown options
 * - Game creation confirmation dialogs
 * - File selection UI components
 * - User-facing file references
 *
 * @param filename - The CSV filename to convert
 * @returns User-friendly display name
 *
 * @example
 * ```typescript
 * filenameToDisplayName("test-game-1.csv")           // → "Test Game 1"
 * filenameToDisplayName("world_capitals_easy.csv")  // → "World Capitals Easy"
 * filenameToDisplayName("before-and-after_2024.csv") // → "Before And After 2024"
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function filenameToDisplayName(filename: string): string {
  // Step 1: Remove .csv extension (case-insensitive)
  let name = filename.replace(/\.csv$/i, '')

  // Step 2: Replace hyphens and underscores with spaces
  name = name.replace(/[-_]/g, ' ')

  // Step 3: Convert to title case for consistent formatting
  name = toTitleCase(name)

  return name
}

/**
 * Converts a string to title case formatting.
 *
 * Internal utility function that capitalizes the first letter of each word
 * while converting the rest to lowercase. Used by filenameToDisplayName
 * for consistent text formatting.
 *
 * **Algorithm:**
 * 1. Convert entire string to lowercase
 * 2. Split on spaces to get individual words
 * 3. Capitalize first character of each word
 * 4. Join words back with spaces
 *
 * @param str - String to convert to title case
 * @returns Title case formatted string
 *
 * @example
 * ```typescript
 * toTitleCase("hello world test")  // → "Hello World Test"
 * toTitleCase("MIXED CaSe")        // → "Mixed Case"
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Retrieves the list of available CSV clue set files.
 *
 * Returns an array of filenames for CSV clue sets that are available for
 * game creation. Currently hardcoded for simplicity and reliability, but
 * could be enhanced to dynamically discover files in the future.
 *
 * **Current Implementation:**
 * - Hardcoded list of known clue set files
 * - Ensures reliable file availability
 * - Avoids filesystem access complexity
 * - Simple to maintain and test
 *
 * **File Requirements:**
 * - Files must exist in public/clue-sets/ directory
 * - Must be valid CSV format with proper structure
 * - Should follow naming conventions for display formatting
 *
 * **Future Enhancements:**
 * - Dynamic file discovery via API endpoint
 * - File metadata and validation status
 * - User-uploaded clue set support
 * - File categorization and tagging
 *
 * @returns Array of available clue set filenames
 *
 * @example
 * ```typescript
 * const files = getAvailableClueSets();
 * console.log(files); // ["test-game-1.csv"]
 *
 * // Use with ClueSetSelector
 * files.map(filename => ({
 *   value: filename,
 *   label: filenameToDisplayName(filename)
 * }));
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function getAvailableClueSets(): string[] {
  return [
    'test-game-1.csv'
    // Additional clue sets can be added here as they become available
    // Example: 'world-capitals.csv', 'movie-trivia.csv', etc.
  ]
}

/**
 * Generates the public URL for accessing a clue set CSV file.
 *
 * Constructs the proper URL path for fetching clue set files from the
 * public directory. Works consistently across development and production
 * environments with Vite's static asset handling.
 *
 * **URL Structure:**
 * - Development: /clue-sets/filename
 * - Production: /clue-sets/filename (public folder served at root)
 *
 * **File Location:**
 * - Files stored in public/clue-sets/ directory
 * - Accessible via HTTP GET requests
 * - No authentication required (public assets)
 *
 * **Usage Context:**
 * - CSV file loading in clue set loader
 * - Fetch API requests for file content
 * - Dynamic import of clue set data
 *
 * @param filename - Name of the clue set CSV file
 * @returns Complete URL path for accessing the file
 *
 * @example
 * ```typescript
 * const url = getClueSetURL("test-game-1.csv");
 * console.log(url); // "/clue-sets/test-game-1.csv"
 *
 * // Use with fetch API
 * const response = await fetch(getClueSetURL(filename));
 * const csvContent = await response.text();
 * ```
 *
 * @since 0.1.0
 * @author Euno's Jeopardy Team
 */
export function getClueSetURL(filename: string): string {
  return `/clue-sets/${filename}`
}
