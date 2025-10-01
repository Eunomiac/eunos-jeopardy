# Obsolete Code: Empty GSAP_EFFECTS and Unused registerEffect Function

## Location
`src/utils/animations.ts`

## Description
The file contains obsolete code related to GSAP effect registration:

1. **Lines 19-22**: Empty `GSAP_EFFECTS` object with comment "GSAP effects are being phased out in favor of AnimationDefinitions"
2. **Lines 24-35**: `registerEffect()` function that is never called (because GSAP_EFFECTS is empty)
3. **Lines 43-45**: Loop that iterates over empty GSAP_EFFECTS object

The file is still used because `initializeAnimations()` is called in `main.tsx` to expose GSAP globally for debugging, but the effect registration code is obsolete.

## Assessment: OBSOLETE CODE

### Reason
This code is **obsolete** because:
1. GSAP effects have been phased out in favor of AnimationDefinitions (as stated in the comment)
2. The `GSAP_EFFECTS` object is empty and will never have entries added
3. The `registerEffect()` function is never called
4. The loop in `initializeAnimations()` does nothing (iterates over empty object)
5. The only useful part is exposing GSAP globally for debugging

### Verification
- ✅ Confirmed GSAP_EFFECTS is empty
- ✅ Confirmed registerEffect is never called
- ✅ Confirmed AnimationDefinitions.ts is the new system
- ✅ Confirmed initializeAnimations() is still called in main.tsx (for global exposure)

### Impact of Removal
- **Lines of code removed**: ~20 lines
- **Files affected**: 1 file
- **Breaking changes**: None - the empty object and unused function can be removed
- **Functionality preserved**: Global GSAP exposure for debugging remains

## Recommendation
**SIMPLIFY** - Remove the obsolete effect registration code while preserving the global exposure functionality. The file should only:
1. Import GSAP and AnimationService
2. Export the GSAPEffect type (may still be used elsewhere)
3. Expose GSAP globally for debugging

## Implementation Plan
1. Remove the empty `GSAP_EFFECTS` object
2. Remove the unused `registerEffect()` function
3. Simplify `initializeAnimations()` to only expose GSAP globally
4. Keep the JSDoc comment explaining the file's purpose
5. Run TypeScript compiler to verify no errors
6. Run tests to confirm nothing breaks
7. Commit with message: `refactor(animations): remove obsolete GSAP effect registration code`

## Notes
- The `GSAPEffect` type export should be checked for usage before removal
- The global exposure of GSAP is useful for debugging and should be kept
- This aligns with the project's move to AnimationDefinitions system

