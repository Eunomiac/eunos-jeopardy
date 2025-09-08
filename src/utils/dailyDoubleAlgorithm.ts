/**
 * Daily Double Placement Algorithm
 * Automatically assigns Daily Double positions based on authentic Jeopardy! probability data
 */

// Probability distribution based on authentic Jeopardy! Daily Double placement data
const DAILY_DOUBLE_ROW_PROBABILITIES = [
  { row: 1, weight: 0 },   // Row 1 (lowest values): 0% - never appears
  { row: 2, weight: 9 },   // Row 2: 9%
  { row: 3, weight: 26 },  // Row 3: 26%
  { row: 4, weight: 39 },  // Row 4: 39% (most likely)
  { row: 5, weight: 26 }   // Row 5 (highest values): 26%
] as const;

export interface DailyDoublePosition {
  category: number; // 1-6
  row: number;      // 1-5
}

export interface RoundData {
  round: 'jeopardy' | 'double';
  categories: string[];
  clues: Array<{
    category: number;
    row: number;
    value: number;
    question: string;
    answer: string;
  }>;
}

/**
 * Weighted random selection utility
 */
function weightedRandomSelect<T extends { weight: number }>(items: readonly T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }

  // Fallback (should never happen with proper weights)
  return items[items.length - 1];
}

/**
 * Select random categories for Daily Double placement
 */
function selectDailyDoubleCategories(roundType: 'jeopardy' | 'double'): number[] {
  const categories = [1, 2, 3, 4, 5, 6];

  if (roundType === 'jeopardy') {
    // Jeopardy round: 1 Daily Double
    const randomIndex = Math.floor(Math.random() * categories.length);
    return [categories[randomIndex]];
  } else {
    // Double Jeopardy round: 2 Daily Doubles in different categories
    const shuffled = [...categories].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }
}

/**
 * Select row within category using weighted probability
 */
function selectDailyDoubleRow(): number {
  const selected = weightedRandomSelect(DAILY_DOUBLE_ROW_PROBABILITIES);
  return selected.row;
}

/**
 * Generate Daily Double positions for a round
 */
export function generateDailyDoublePositions(roundType: 'jeopardy' | 'double'): DailyDoublePosition[] {
  const categories = selectDailyDoubleCategories(roundType);

  return categories.map((category) => ({
    category,
    row: selectDailyDoubleRow()
  }));
}

/**
 * Validate round structure for Daily Double placement
 */
export function validateRoundStructure(roundData: RoundData): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check category count
  if (roundData.categories.length !== 6) {
    errors.push(`Expected 6 categories, found ${roundData.categories.length}`);
  }

  // Check clue structure (6 categories × 5 clues = 30 total)
  const expectedClueCount = 30;
  if (roundData.clues.length !== expectedClueCount) {
    errors.push(`Expected ${expectedClueCount} clues, found ${roundData.clues.length}`);
  }

  // Check that each category has exactly 5 clues
  for (let category = 1; category <= 6; category++) {
    const categoryClues = roundData.clues.filter((clue) => clue.category === category);
    if (categoryClues.length !== 5) {
      errors.push(`Category ${category} has ${categoryClues.length} clues, expected 5`);
    }

    // Check that rows 1-5 are present
    const rows = categoryClues.map((clue) => clue.row).sort((a, b) => a - b);
    const expectedRows = [1, 2, 3, 4, 5];
    if (JSON.stringify(rows) !== JSON.stringify(expectedRows)) {
      errors.push(`Category ${category} missing rows: expected [1,2,3,4,5], found [${rows.join(',')}]`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Apply Daily Double positions to round data
 */
export function applyDailyDoublePositions(
  roundData: RoundData,
  positions: DailyDoublePosition[]
): RoundData & { dailyDoublePositions: DailyDoublePosition[] } {
  return {
    ...roundData,
    dailyDoublePositions: positions
  };
}

/**
 * Main function to process a round and assign Daily Doubles
 */
export function processDailyDoubles(roundData: RoundData): {
  success: boolean;
  data?: RoundData & { dailyDoublePositions: DailyDoublePosition[] };
  errors?: string[];
} {
  // Validate structure
  const validation = validateRoundStructure(roundData);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors
    };
  }

  // Generate Daily Double positions
  const positions = generateDailyDoublePositions(roundData.round);

  // Apply positions to round data
  const processedData = applyDailyDoublePositions(roundData, positions);

  return {
    success: true,
    data: processedData
  };
}
