# Unnecessary Code: Unused Type Exports in GameService

## Location
`src/services/games/GameService.ts`

## Description
Two type exports are defined but never imported or used anywhere in the codebase:

1. **Line 27**: `export type Answer = Tables<'answers'>`
2. **Line 33**: `export type Wager = Tables<'wagers'>`

These types represent database table entities but are not used in the application code. The corresponding `*Insert` types (`AnswerInsert` and `WagerInsert`) ARE used for creating new records.

## Assessment: UNNECESSARY CODE

### Reason
These type exports are **not used anywhere** in the codebase:
1. No imports of `Answer` or `Wager` types found in any file
2. The `*Insert` variants are used for creating records, but the base entity types are never needed
3. When reading these entities from the database, the code uses inline typing or doesn't need the type at all

### Verification
- ✅ Searched for `Answer` imports: `grep -r "import.*{.*Answer.*}" --include="*.ts" --include="*.tsx" src/ | grep -v "AnswerInsert"` - No results
- ✅ Searched for `Wager` imports: `grep -r "import.*Wager[^I]" --include="*.ts" --include="*.tsx" src/` - No results
- ✅ Confirmed `AnswerInsert` and `WagerInsert` ARE used in GameService methods
- ✅ Confirmed `Buzz` type IS used in BuzzerQueuePanel component

### Impact of Removal
- **Lines of code removed**: 4 lines (2 type definitions + 2 JSDoc comments)
- **Files affected**: 1 file
- **Breaking changes**: None - types are not used
- **Test coverage impact**: None - types have no tests

## Recommendation
**REMOVE** - These unused type exports add no value. The `*Insert` types are sufficient for the application's needs. Keeping unused exports creates maintenance overhead and confusion about which types are actually needed.

## Implementation Plan
1. Remove the `Answer` type export from GameService.ts (lines 26-27)
2. Remove the `Wager` type export from GameService.ts (lines 32-33)
3. Run TypeScript compiler to verify no errors
4. Run tests to confirm nothing breaks
5. Commit with message: `chore(games): remove unused Answer and Wager type exports`

## Notes
- The `Buzz` type (line 29) should be KEPT as it is imported and used in BuzzerQueuePanel.tsx
- The `*Insert` types should be KEPT as they are actively used in GameService methods

