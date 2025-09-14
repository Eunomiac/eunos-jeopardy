# Daily Double Placement Algorithm

## Overview

The Daily Double placement system automatically assigns Daily Double positions during CSV parsing, eliminating the need for manual specification in CSV files. This approach uses authentic Jeopardy! probability data to create realistic Daily Double placement.

## CSV Format Change

**Old Format** (manual specification):
```csv
round,category,value,prompt,response,daily_double
jeopardy,History,400,This war ended in 1945,What is World War II?,true
```

**New Format** (automatic placement):
```csv
round,category,value,prompt,response
jeopardy,History,400,This war ended in 1945,What is World War II?
```

## Probability Distribution

Based on authentic Jeopardy! Daily Double placement data:

| Row (Clue Value) | Final Probability |
|------------------|-------------------|
| Row 1 (lowest)   | 0%               |
| Row 2            | 9%               |
| Row 3            | 26%              |
| Row 4            | 39%              |
| Row 5 (highest)  | 26%              |

*Total: 100%*

## Algorithm Specification

### 1. Category Selection

**Jeopardy Round** (1 Daily Double):
- Randomly select 1 of 6 categories with equal probability (16.67% each)

**Double Jeopardy Round** (2 Daily Doubles):
- Randomly select first category (1 of 6)
- Randomly select second category from remaining 5 categories
- Ensures Daily Doubles appear in different categories

### 2. Row Selection Within Category

Use weighted random selection based on probability distribution:

```typescript
const DAILY_DOUBLE_ROW_PROBABILITIES = [
  { row: 1, weight: 0 },    // Lowest values
  { row: 2, weight: 9 },
  { row: 3, weight: 26 },
  { row: 4, weight: 39 },   // Most likely
  { row: 5, weight: 26 }    // Highest values
];
```

### 3. Implementation Steps

1. **Parse CSV** - Load clues into memory
2. **Validate Structure** - Ensure 6 categories × 5 clues per round
3. **Select Categories** - Random selection based on round type
4. **Select Rows** - Weighted random selection within each category
5. **Store Positions** - Save to database `daily_double_cells` JSONB field
6. **Return Result** - Parsed clues with Daily Double positions assigned

## Database Storage

Daily Double positions stored in `boards.daily_double_cells` as JSONB:

```json
[
  {"category": 2, "row": 4},  // Category 2, Row 4
  {"category": 5, "row": 3}   // Category 5, Row 3 (Double Jeopardy only)
]
```

## Validation Rules

- **Jeopardy Round**: Exactly 1 Daily Double
- **Double Jeopardy Round**: Exactly 2 Daily Doubles in different categories
- **Final Jeopardy**: No Daily Doubles
- **Structure**: Each round must have exactly 6 categories with 5 clues each

## Error Handling

- **Invalid CSV Structure**: Clear error messages about missing categories/clues
- **Malformed Data**: Validation of required columns and data types
- **Placement Conflicts**: Automatic retry if placement algorithm fails

## Benefits

1. **Simplified CSV Creation** - Users don't need to manually specify Daily Double positions
2. **Authentic Placement** - Based on real Jeopardy! data patterns
3. **Automatic Validation** - Ensures proper Daily Double distribution
4. **Consistent Experience** - Matches expectations from actual Jeopardy! games
5. **Reduced Errors** - Eliminates manual placement mistakes

## Future Enhancements

- **Seeded Random** - Option for reproducible Daily Double placement
- **Custom Probabilities** - Allow hosts to adjust probability distribution
- **Placement Preview** - Show Daily Double positions before finalizing
- **Historical Analysis** - Track Daily Double placement patterns over time
