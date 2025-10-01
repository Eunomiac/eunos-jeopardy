# Remote Agent Task: Code Consolidation & Cleanup

## Your Mission

You are a professional software systems engineer tasked with identifying and eliminating redundant and unnecessary code in the Euno's Jeopardy codebase. Your goal is to improve code quality, maintainability, and reduce technical debt while maintaining 90%+ test coverage and ensuring all functionality remains intact.

## Getting Started

### Step 1: Read the Instructions
Your complete task instructions are in `docs/ai/consolidation/INSTRUCTIONS.md`. Read this file thoroughly before beginning any work.

### Step 2: Understand the Project
Review these files to understand the project context:
- `docs/ai/PROJECT_MANAGEMENT.md` - Project structure and organization
- `docs/ai/CURRENT_STATUS.md` - Current development status
- `docs/ai/reference/strategy/TESTING_STRATEGY.md` - Testing requirements
- `docs/ai/SCSS_STYLING_GUIDELINES.md` - Styling conventions

### Step 3: Examine Priority Areas
Focus your examination on these directories in order:
1. `src/services/` - Service layer consolidation opportunities
2. `src/components/` - Component duplication
3. `src/styles/` - SCSS consolidation
4. `src/utils/` - Utility function duplication

## Your Workflow

For each redundancy or unnecessary code you find:

1. **Document** - Create a `.md` file in `docs/ai/consolidation/` describing the issue
2. **Assess** - Evaluate whether consolidation/removal is beneficial
3. **Plan** - Outline implementation approach
4. **Implement** - Make changes with frequent, detailed commits
5. **Test** - Verify all tests pass and coverage is maintained
6. **Verify** - Run diagnostics to ensure no errors

## Key Principles

- **DRY (Don't Repeat Yourself)** - Eliminate duplication
- **Safety First** - Use "Find All References" before any changes
- **Test Coverage** - Maintain 90%+ coverage at all times
- **Frequent Commits** - One logical change per commit with clear messages
- **Ask When Uncertain** - Pause and document questions if unsure

## Success Criteria

Your task is complete when:
- ✅ All priority areas examined
- ✅ All redundancies documented and addressed
- ✅ All unnecessary code removed
- ✅ All tests passing
- ✅ No diagnostic errors
- ✅ Coverage maintained at 90%+
- ✅ Summary report created in `docs/ai/consolidation/SUMMARY.md`

## Important Notes

- **Commit frequently** - Every consolidation and removal should be its own commit
- **Run tests after every change** - Don't accumulate untested changes
- **Document your reasoning** - Each `.md` file should explain your thinking
- **Follow the commit format** - Use conventional commits (see INSTRUCTIONS.md)
- **Pause if uncertain** - Better to ask than to break something

## Ready to Begin?

1. Confirm you've read `docs/ai/consolidation/INSTRUCTIONS.md`
2. Confirm you understand the project structure
3. Start with `src/services/` directory
4. Document everything you find
5. Make frequent commits
6. Create your summary report when complete

Good luck! 🚀

