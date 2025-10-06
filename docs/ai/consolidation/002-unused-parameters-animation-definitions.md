# Unnecessary Code: Unused Parameters in AnimationDefinitions.ts

## Location
`src/services/animations/AnimationDefinitions.ts`

## Description
Four methods have unused `gameState` parameters that are declared but never read:
1. Line 406: `DailyDoubleReveal.shouldRunInstantly(gameState, params)`
2. Line 483: `DailyDoubleClueReveal.shouldRunInstantly(gameState, params)`
3. Line 586: `RoundTransition.shouldRunInstantly(gameState, params)`
4. Line 600: `RoundTransition.getParamsFromGameState(gameState)`

## Assessment: UNNECESSARY CODE

### Reason
These parameters are required by the `AnimationDefinition` interface but are not used in the implementation. TypeScript is correctly flagging them as unused (TS6133 error).

### Verification
- ✅ TypeScript compiler errors confirm parameters are unused
- ✅ Parameters are part of interface contract but not needed in these specific implementations
- ✅ Can be prefixed with underscore to indicate intentionally unused

### Impact of Removal
- **Lines of code changed**: 4 lines
- **Files affected**: 1 file
- **Breaking changes**: None - only parameter naming change
- **Test coverage impact**: None - no functional change

## Recommendation
**FIX** - Prefix unused parameters with underscore (`_gameState`) to follow TypeScript convention for intentionally unused parameters. This:
1. Satisfies the interface requirement
2. Indicates to developers the parameter is intentionally unused
3. Eliminates TypeScript errors
4. Maintains code clarity

## Implementation Plan
1. Change `gameState` to `_gameState` in the four methods
2. Run TypeScript compiler to verify errors are resolved
3. Run tests to confirm no functional changes
4. Commit with message: `fix(animations): prefix unused gameState parameters with underscore`

