/**
 * Convert a filename to a display name
 * Examples:
 * - "test-game-1.csv" → "Test Game 1"
 * - "world_capitals_easy.csv" → "World Capitals Easy"
 * - "before-and-after_2024.csv" → "Before And After 2024"
 */
export function filenameToDisplayName(filename: string): string {
  // Remove .csv extension
  let name = filename.replace(/\.csv$/i, '')

  // Replace hyphens and underscores with spaces
  name = name.replace(/[-_]/g, ' ')

  // Convert to title case
  name = toTitleCase(name)

  return name
}

/**
 * Convert string to title case
 * "hello world test" → "Hello World Test"
 */
function toTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Get available clue set files
 * For now, this is hardcoded but could be made dynamic later
 */
export function getAvailableClueSets(): string[] {
  return [
    'test-game-1.csv'
    // Add more files as they become available
  ]
}

/**
 * Build the URL for a clue set file
 * In development: /clue-sets/filename
 * In production: /clue-sets/filename (public folder contents moved to root)
 */
export function getClueSetURL(filename: string): string {
  return `/clue-sets/${filename}`
}
