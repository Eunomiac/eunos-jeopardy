# Unnecessary Code: Unused ClueStateUpdate Type Export

## Location
`src/services/clues/ClueService.ts` (line 14)

## Description
The `ClueStateUpdate` type is exported from ClueService but is never imported or used anywhere in the codebase:
```typescript
/** Update type for modifying existing clue states */
export type ClueStateUpdate = TablesUpdate<'clue_states'>
```

## Assessment: UNNECESSARY CODE

### Reason
This type export is **not used anywhere** in the codebase:
1. No imports of `ClueStateUpdate` found in any file
2. ClueService methods that update clue states use inline object literals instead of this type
3. The type was likely created for consistency with other service types but never actually needed

### Verification
- ✅ Searched entire codebase: `grep -r "ClueStateUpdate" --include="*.ts" --include="*.tsx" src/`
- ✅ Result: Only found in the export statement, never imported
- ✅ Checked ClueService methods: `revealClue()` and `markClueCompleted()` use inline `{ revealed: true }` and `{ completed: true }` instead of typed objects

### Impact of Removal
- **Lines of code removed**: 2 lines (type definition + JSDoc comment)
- **Files affected**: 1 file
- **Breaking changes**: None - type is not used
- **Test coverage impact**: None - type has no tests

## Recommendation
**REMOVE** - This unused type export adds no value and creates maintenance overhead. The inline update objects in the methods are more readable and type-safe through TypeScript's structural typing.

## Implementation Plan
1. Remove the `ClueStateUpdate` type export from ClueService.ts (lines 13-14)
2. Run TypeScript compiler to verify no errors
3. Run tests to confirm nothing breaks
4. Commit with message: `chore(clues): remove unused ClueStateUpdate type export`

