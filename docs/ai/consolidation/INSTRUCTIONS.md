# Professional Software Systems Engineer

## Task: Flag Redundant & Unnecessary Code

---

## Before You Begin

### Required Reading
1. **Project Structure**: `docs/ai/PROJECT_MANAGEMENT.md` - Understand project organization and issues
2. **Current Status**: `docs/ai/CURRENT_STATUS.md` - Know what's currently being worked on
3. **Testing Strategy**: `docs/ai/reference/strategy/TESTING_STRATEGY.md` - Understand testing requirements
4. **SCSS Guidelines**: `docs/ai/SCSS_STYLING_GUIDELINES.md` - Follow styling conventions

### Key Project Principles
- **DRY (Don't Repeat Yourself)** - Actively search for and reuse existing code
- **Security Awareness** - Consider implications of changes
- **Impact Awareness** - Understand change consequences
- **Complete Cleanup** - Remove ALL obsolete artifacts
- **Maintainability** - Write clear, understandable code

### Scope of Examination

**Priority Areas** (examine first):
1. `src/services/` - Service layer consolidation opportunities
2. `src/components/` - Component duplication
3. `src/styles/` - SCSS consolidation
4. `src/utils/` - Utility function duplication

**Exclude from examination**:
- `node_modules/`
- `dist/` or `build/`
- Test files (`.test.tsx`, `.test.ts`) - unless mocks are duplicated
- Documentation files in `docs/`

---

### Redundant Code
For the purposes of this task, code _may_ be "redundant" if it duplicates existing code, duplicates functionality, or otherwise achieves a goal that is already being achieved elsewhere. Such code is only redundant, however, if consolidating the functionality is overly complex or ill advised for other reasons (i.e. there may be cases where repeated functionality is the best solution).

#### Decision Criteria for Consolidation

**Consolidate if:**
- ✅ Reduces total lines of code by >20%
- ✅ Eliminates 3+ instances of duplication
- ✅ Creates single source of truth
- ✅ Improves maintainability
- ✅ Doesn't break existing patterns

**Don't consolidate if:**
- ❌ Creates tight coupling between unrelated features
- ❌ Requires complex abstraction that obscures intent
- ❌ Breaks component encapsulation
- ❌ Makes code harder to understand
- ❌ Introduces performance issues

#### SCSS Consolidation Rules
Refer to `docs/ai/SCSS_STYLING_GUIDELINES.md` for specificity rules:
- **Component-specific styles** → Component `.scss` file
- **Shared component styles** → `_shared.scss` or parent component
- **Global utilities** → `_variables.scss` or `_mixins.scss`
- **Maintain high nesting depth** where appropriate

#### Protocol: Redundant Code
Follow this step-by-step procedure. You may find it easier to proceed through the steps with each instance of potentially redundant code you find, or you might prefer to fully complete step 1 before moving onto step 2 --- I leave the decision to you.  **IMPORTANT:** Your examination should include the SCSS style files -- if classes are being defined in multiple places, they should be consolidated in the correct location given the desired specificity.  Maintain a high degree of SCSS nesting wherever possible.

**Safety Checks Before Consolidation:**
1. **Search for all usages**: Use IDE "Find All References"
2. **Check for dynamic imports**: Search for string-based imports
3. **Verify no runtime dependencies**: Check for reflection/dynamic access
4. **Review git history**: Understand why code exists (`git log --follow <file>`)
5. **Check for external dependencies**: Ensure no breaking changes to APIs

**Step-by-Step Procedure:**

1. **Identify** potential redundant code, by looking for duplication of functionality or, perhaps more helpful, the same 'goal' being achieved in multiple locations in the code (e.g. unnecessary subscription services, when the global game subscription service already provides current data).

2. **Document** - For each instance you find, create a unique `.md` document in `docs\ai\consolidation` with an appropriate name. Describe the potential redundancy in a brief paragraph.

3. **Assess** - For each instance you find, proceed to assess whether consolidating it would result in less elegant, professional code, than would leaving the code as-is. Use the Decision Criteria above. Update the file created in Step 2 with the results of this assessment. If the code requires no changes, proceed to the next instance of potentially-redundant code.

4. **Plan** - If consolidation IS recommended, outline a thorough implementation plan in the instance file, paying special attention to:
   - All implementations of the existing code throughout the app
   - All files that will need to be altered to use the consolidated functionality
   - Impact on tests and mocks
   - Potential breaking changes

5. **Implement** - Once you are confident that your consolidation plan is thorough, proceed to implementation. Make FREQUENT commits as you achieve piecemeal goals, with detailed commit messages (see Commit Message Format below).

6. **Test** - Maintain unit testing fidelity throughout your work. Refer to the various documents on testing strategy and reference to ensure your unit tests meet project standards (see Testing Requirements below).

#### Testing Requirements

After each consolidation:
1. **Run affected tests**: `npm test -- <test-file>`
2. **Verify coverage maintained**: Check coverage reports
3. **Update test mocks**: If consolidating mocked functionality
4. **Add new tests**: If creating new shared utilities
5. **Run full suite**: Before final commit (`npm test`)

**Coverage Standards**:
- Maintain 90% coverage goal
- Document any exclusions with comments explaining why
- Update test documentation if patterns change

#### Examples: Previously-Fixed Redundancies
- **Consolidated Animations Functionality** --- Previously, we were calling GSAP animations piecemeal throughout the script; we've now **consolidated** all animations into the `AnimationsService` component. Complexity of new component was mitigated by the advantage of having all animation lifecycle and tracking functionality in one place.
- **Consolidated Test Mocks** --- Previously, tests would often define their own mocks of various components, each one mocked differently to suit the needs of the given test; we've now **consolidated** all mocks of game components into one place, and tests now import the mocks they need.  Extra layer of complexity mitigated by the advantage of having only one mock to update if schemas are changed in development, among many other advantages.

---

### Unnecessary Code
For the purpose of this task, code is "unnecessary" if it is not being actively used by the app in its current state.  This includes ALL of the following:
- **Unused Code** - Remnants of abandoned designs, orphaned functions, unused exports
- **Obsolete Code** - Backwards compatibility functionality, deprecated code. This app is a hobby project and does not need to be backwards compatible, to flag deprecations or otherwise continue to support obsolete functionality: all such concessions to outdated functions, including comments about the same, should be purged.
- **Unhelpful Comments** - Comments describing how code has been changed, any comments that are not actively relevant to development (i.e. "TODO"'s should be kept) or that do not describe the current state of the code should be purged or corrected.
- **Unused Styles** - Check the `.scss` files against JSX components for styles that are not being used in any actual DOM components.

#### Protocol: Unnecessary Code
In general, unnecessary code (and comments, styles, and classes) should be purged, then diagnostics run to ensure the removal did not break anything. Make commits frequently, with each purge action you take, so that any errors can easily be remedied by reverting specific commits without undoing unrelated purges.

**Verification Steps:**
1. **Search for usages**: Use IDE "Find All References" to confirm code is unused
2. **Check imports**: Verify no imports of the code exist
3. **Run diagnostics**: `npm run lint` to catch any issues
4. **Run tests**: `npm test` to ensure nothing breaks
5. **Commit immediately**: One removal per commit for easy reversion if needed

---

## Commit Message Format

Use conventional commits format:

### For Consolidation:
```
refactor(scope): consolidate <functionality>

- Moved <X> from <location A> to <location B>
- Updated <N> references to use consolidated version
- Removed <M> duplicate implementations
- Tests: all passing / coverage maintained at X%
```

**Example:**
```
refactor(services): consolidate game state subscriptions

- Moved subscription logic from PlayerDashboard to GameStateService
- Updated 5 components to use centralized subscription
- Removed 3 duplicate subscription implementations
- Tests: all passing / coverage maintained at 92%
```

### For Removal:
```
chore(scope): remove unused <code-type>

- Removed unused <function/class/style>
- Previously used in <context> (now obsolete)
- Tests: all passing
```

**Example:**
```
chore(components): remove unused ClueModal styles

- Removed .clue-modal-legacy class and related styles
- Previously used in old modal implementation (replaced in Issue #4)
- Tests: all passing
```

---

## Error Recovery

### If Something Breaks

1. **Run diagnostics**: `npm run lint` and `npm test`
2. **Check console errors**: Look for import/reference errors
3. **Review the change**: Use `git diff HEAD~1` to see what changed
4. **Revert if needed**: `git revert <commit-hash>` (don't use reset)
5. **Document the issue**: Create `.md` file in `docs/ai/consolidation/` explaining why consolidation failed
6. **Ask for guidance**: If stuck, document the problem and pause

### Common Issues and Solutions

**Import errors after consolidation:**
- Check all import paths were updated
- Verify exported names match
- Check for circular dependencies

**Tests failing after removal:**
- Code may not have been truly unused
- Check for dynamic imports or string-based references
- Revert and document why code is needed

**Type errors after consolidation:**
- Ensure TypeScript types are properly exported
- Check for type compatibility between consolidated versions
- Update type imports in affected files

---

## Communication Protocol

### When to Pause and Ask:

- Consolidation would affect >10 files
- Unclear if code is actually unused (no references but suspicious)
- Breaking changes to public APIs
- Major architectural changes needed
- Test coverage would drop below 90%
- Uncertain about correct consolidation location
- Any safety check fails
- Encountering repeated errors after multiple attempts

### How to Ask:

Create a `.md` file in `docs/ai/consolidation/` with:
- Clear description of the issue
- What you've tried
- Why you're uncertain
- Specific question(s) for guidance

---

## Task Completion Criteria

### Task is Complete When:

- ✅ All priority areas examined
- ✅ All redundancies documented in `docs/ai/consolidation/`
- ✅ All recommended consolidations implemented
- ✅ All unnecessary code removed
- ✅ All tests passing (`npm test`)
- ✅ No diagnostic errors (`npm run lint`)
- ✅ Coverage maintained at 90%+
- ✅ Summary report created (see below)

### Final Deliverable

Create `docs/ai/consolidation/SUMMARY.md` with:

```markdown
# Code Consolidation Summary

**Date Completed**: YYYY-MM-DD
**Agent**: [Your identifier]

## Statistics

- **Total redundancies found**: X
- **Consolidations completed**: Y
- **Consolidations deferred**: Z (with reasons)
- **Total lines of code removed**: N
- **Files affected**: M
- **Test coverage before**: X%
- **Test coverage after**: Y%

## Consolidations Completed

### 1. [Consolidation Name]
- **Files affected**: list
- **Lines removed**: N
- **Commit**: hash
- **Impact**: brief description

[Repeat for each consolidation]

## Unnecessary Code Removed

### 1. [Code Type - Location]
- **Reason**: why it was unnecessary
- **Commit**: hash

[Repeat for each removal]

## Deferred Items

### 1. [Item Name]
- **Reason deferred**: explanation
- **Recommendation**: what should be done

## Commits Made

- commit-hash-1: message
- commit-hash-2: message
[etc.]

## Recommendations

[Any suggestions for future improvements or areas that need attention]
```

---

## Quick Reference Checklist

### Before Starting:
- [ ] Read all required documentation
- [ ] Understand project principles
- [ ] Know the scope of examination
- [ ] Understand decision criteria

### For Each Redundancy:
- [ ] Run safety checks
- [ ] Document in `.md` file
- [ ] Assess using decision criteria
- [ ] Create implementation plan
- [ ] Implement with frequent commits
- [ ] Run tests after each change
- [ ] Update documentation if needed

### For Each Removal:
- [ ] Verify code is truly unused
- [ ] Check for dynamic references
- [ ] Remove code
- [ ] Run diagnostics
- [ ] Run tests
- [ ] Commit immediately

### Before Completing:
- [ ] All priority areas examined
- [ ] All tests passing
- [ ] No diagnostic errors
- [ ] Coverage at 90%+
- [ ] Summary report created
- [ ] All commits have clear messages