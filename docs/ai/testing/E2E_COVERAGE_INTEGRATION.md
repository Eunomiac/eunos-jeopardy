# E2E Coverage Integration with SonarQube

This document explains how E2E test coverage from Playwright is integrated with Jest unit test coverage for SonarQube reporting.

## Overview

The project uses a **merged coverage approach** where:
1. **Jest** generates unit test coverage
2. **Playwright** generates E2E test coverage
3. Coverage reports are **merged** into a single report
4. **SonarQube** reads the merged report

This ensures that both unit tests AND E2E tests count toward the 90% coverage threshold.

---

## Architecture

```
┌─────────────────┐         ┌──────────────────┐
│  Jest Tests     │         │ Playwright Tests │
│  (Unit/Integ)   │         │  (E2E)           │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │ Generates                 │ Generates
         │ coverage/                 │ .nyc_output/
         │ coverage-final.json       │ coverage-e2e-*.json
         │                           │
         └───────────┬───────────────┘
                     │
                     │ Merged by
                     │ scripts/merge-coverage.js
                     │
                     ▼
         ┌───────────────────────┐
         │  coverage-merged/     │
         │  - lcov.info          │
         │  - coverage-final.json│
         │  - lcov-report/       │
         └───────────┬───────────┘
                     │
                     │ Read by
                     ▼
         ┌───────────────────────┐
         │  SonarQube            │
         │  Quality Gate         │
         └───────────────────────┘
```

---

## How It Works

### 1. Code Instrumentation

**Vite Plugin Istanbul** instruments the source code during E2E tests:

```typescript
// vite.config.ts
istanbul({
  include: 'src/*',
  exclude: ['node_modules', 'test/', 'e2e/', '**/*.test.*'],
  requireEnv: true, // Only when VITE_COVERAGE=true
})
```

When the dev server runs with `VITE_COVERAGE=true`, Istanbul adds tracking code to every function/statement.

### 2. Coverage Collection

During E2E tests, coverage data is stored in `window.__coverage__`:

```typescript
// e2e/fixtures/coverage-helpers.ts
export async function saveCoverage(page: Page, testName: string) {
  const coverage = await page.evaluate(() => {
    return (window as any).__coverage__;
  });
  
  // Save to .nyc_output/coverage-e2e-{testName}-{timestamp}.json
  fs.writeFileSync(coverageFile, JSON.stringify(coverage));
}
```

### 3. Coverage Merging

The merge script combines Jest and Playwright coverage:

```javascript
// scripts/merge-coverage.js
const coverageMap = createCoverageMap();

// Load Jest coverage
coverageMap.merge(jestCoverage);

// Load all Playwright coverage files
playwrightFiles.forEach(file => {
  coverageMap.merge(JSON.parse(file));
});

// Generate merged LCOV report
lcov.execute(context);
```

### 4. SonarQube Integration

SonarQube reads the merged LCOV report:

```properties
# sonar-project.properties
sonar.typescript.lcov.reportPaths=coverage-merged/lcov.info
sonar.javascript.lcov.reportPaths=coverage-merged/lcov.info
```

---

## Usage

### Running Tests with Coverage

```bash
# 1. Run Jest tests with coverage
npm run test:coverage

# 2. Run Playwright E2E tests with coverage
npm run test:e2e:coverage

# 3. Merge coverage reports
npm run coverage:merge

# 4. View merged HTML report
open coverage-merged/lcov-report/index.html
```

### All-in-One Command

```bash
# Run all tests and merge coverage
npm run coverage:all
```

### In CI/CD

```yaml
# .github/workflows/ci.yml
- name: Run Jest tests
  run: npm run test:coverage

- name: Run E2E tests
  run: npm run test:e2e:coverage

- name: Merge coverage
  run: npm run coverage:merge

- name: SonarQube Scan
  run: npm run sonar
```

---

## Adding Coverage to E2E Tests

### Option 1: Automatic (Recommended)

Coverage is automatically collected when using `npm run test:e2e:coverage`.

No code changes needed in tests!

### Option 2: Manual (For Specific Tests)

If you want to save coverage at specific points:

```typescript
import { saveCoverage } from '../fixtures/coverage-helpers';

test('my test', async ({ page }) => {
  // ... test code ...
  
  // Save coverage at end
  await saveCoverage(page, 'my-test');
});
```

For multi-context tests:

```typescript
import { saveMultiContextCoverage } from '../fixtures/coverage-helpers';

test('multi-user test', async ({ browser }) => {
  const hostPage = await hostContext.newPage();
  const player1Page = await player1Context.newPage();
  const player2Page = await player2Context.newPage();
  
  // ... test code ...
  
  // Save coverage from all contexts
  await saveMultiContextCoverage(
    [hostPage, player1Page, player2Page],
    'multi-user-test'
  );
});
```

---

## Troubleshooting

### Coverage Not Collected

**Symptom**: No `.nyc_output/coverage-e2e-*.json` files created

**Solutions**:
1. Verify `VITE_COVERAGE=true` is set:
   ```bash
   npm run test:e2e:coverage  # Uses cross-env to set it
   ```

2. Check browser console for `window.__coverage__`:
   ```typescript
   await page.evaluate(() => console.log(window.__coverage__));
   ```

3. Verify vite-plugin-istanbul is loaded:
   ```bash
   # Should see istanbul plugin in output
   npm run dev
   ```

### Coverage Not Merged

**Symptom**: `coverage-merged/` directory empty or missing files

**Solutions**:
1. Verify both Jest and Playwright generated coverage:
   ```bash
   ls coverage/coverage-final.json
   ls .nyc_output/coverage-e2e-*.json
   ```

2. Run merge script with verbose output:
   ```bash
   node scripts/merge-coverage.js
   ```

3. Check for errors in merge script output

### SonarQube Not Showing Coverage

**Symptom**: SonarQube shows 0% coverage or doesn't update

**Solutions**:
1. Verify LCOV file exists:
   ```bash
   ls coverage-merged/lcov.info
   ```

2. Check SonarQube configuration:
   ```properties
   # sonar-project.properties
   sonar.typescript.lcov.reportPaths=coverage-merged/lcov.info
   ```

3. Verify file paths are relative to project root

4. Check SonarQube scanner logs for errors

### Coverage Lower Than Expected

**Symptom**: Merged coverage is lower than Jest coverage alone

**Possible Causes**:
1. **E2E tests not exercising code**: E2E tests may not reach all code paths
2. **Coverage exclusions**: Check `sonar.coverage.exclusions` in `sonar-project.properties`
3. **Instrumentation issues**: Some code may not be instrumented properly

**Solutions**:
1. Review which files have low coverage in HTML report
2. Add more E2E test scenarios
3. Verify exclusions are intentional

---

## File Structure

```
project-root/
├── coverage/                    # Jest coverage output
│   ├── coverage-final.json
│   └── lcov.info
├── .nyc_output/                 # Playwright coverage output
│   ├── coverage-e2e-test1-*.json
│   ├── coverage-e2e-test2-*.json
│   └── ...
├── coverage-merged/             # Merged coverage output
│   ├── coverage-final.json      # Merged JSON
│   ├── lcov.info                # For SonarQube
│   └── lcov-report/             # HTML report
│       └── index.html
├── e2e/
│   └── fixtures/
│       └── coverage-helpers.ts  # Coverage collection utilities
├── scripts/
│   └── merge-coverage.js        # Merge script
├── vite.config.ts               # Istanbul plugin config
├── sonar-project.properties     # SonarQube config
└── package.json                 # Scripts
```

---

## Best Practices

### 1. Run Coverage Locally Before Pushing

```bash
npm run coverage:all
open coverage-merged/lcov-report/index.html
```

Verify coverage meets threshold (90%) before pushing.

### 2. Focus E2E Tests on Integration

E2E tests should focus on:
- User workflows
- Component integration
- Real-time synchronization
- Multi-user scenarios

Don't try to achieve 100% coverage with E2E tests - use unit tests for edge cases.

### 3. Monitor Coverage Trends

Check SonarQube dashboard regularly to:
- Track coverage trends over time
- Identify files with low coverage
- Ensure new code is tested

### 4. Clean Coverage Data Between Runs

```bash
# Clean all coverage data
rm -rf coverage/ .nyc_output/ coverage-merged/

# Then run fresh
npm run coverage:all
```

---

## Performance Considerations

### E2E Tests with Coverage Are Slower

Instrumented code runs ~20-30% slower due to tracking overhead.

**Mitigation**:
- Only run with coverage in CI or when needed
- Use `npm run test:e2e` (without coverage) for development
- Run coverage tests in parallel in CI

### Large Coverage Files

E2E tests generate large coverage files (1-5MB each).

**Mitigation**:
- `.nyc_output/` is gitignored
- Coverage files are cleaned between CI runs
- Merge script handles large files efficiently

---

## Summary

✅ **E2E coverage is now integrated with SonarQube**
✅ **Both Jest and Playwright tests count toward 90% threshold**
✅ **Merged coverage report shows complete picture**
✅ **CI/CD pipeline automatically generates and uploads coverage**

**Next Steps**:
1. Run `npm run coverage:all` to test locally
2. Review merged HTML report
3. Push changes and verify SonarQube updates
4. Monitor coverage trends over time

