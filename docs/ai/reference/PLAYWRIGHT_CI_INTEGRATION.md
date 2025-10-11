# Playwright CI/CD Integration

## What is CI/CD?

**CI = Continuous Integration**  
**CD = Continuous Deployment**

CI/CD is an automated system that runs every time you push code to GitHub. Think of it as a robot assistant that:

1. **Checks out your code** from GitHub
2. **Installs dependencies** (npm packages)
3. **Runs tests** (unit tests + E2E tests)
4. **Runs linters** (code quality checks)
5. **Builds the application** (creates production bundle)
6. **Reports results** (pass/fail, with details)

**Why it matters**: Catches bugs before they reach production. If tests fail, you know immediately and can fix them before merging code.

## GitHub Actions

**GitHub Actions** is GitHub's built-in CI/CD system. It's:
- ✅ Free for public repositories
- ✅ Integrated directly into GitHub
- ✅ Configured via YAML files in `.github/workflows/`
- ✅ Runs on GitHub's servers (not your computer)

## How Playwright Runs in CI

### Local Development vs CI

| Aspect | Local Development | CI (GitHub Actions) |
|--------|------------------|---------------------|
| **Browser** | Visible (headed mode) | Invisible (headless mode) |
| **Speed** | Slower (500ms delays) | Faster (no delays) |
| **Server** | Reuses existing server | Starts fresh server |
| **Retries** | 0 (see failures immediately) | 2 (handle flaky network) |
| **Artifacts** | Saved locally | Uploaded to GitHub |
| **Environment** | Your computer | GitHub's Linux servers |

### Workflow File: `.github/workflows/playwright.yml`

This file tells GitHub Actions how to run Playwright tests:

```yaml
name: Playwright E2E Tests

on:
  push:
    branches: [master]  # Run on pushes to master
  pull_request:         # Run on pull requests

jobs:
  test:
    runs-on: ubuntu-latest  # Use Linux server
    
    steps:
      - Checkout code
      - Install Node.js
      - Install dependencies (npm ci)
      - Install Playwright browsers
      - Run tests (npm run test:e2e)
      - Upload artifacts (screenshots, videos, traces)
```

### What Happens When You Push Code

1. **You push code** to GitHub (or open a pull request)
2. **GitHub Actions triggers** the Playwright workflow
3. **Server spins up** (fresh Ubuntu Linux machine)
4. **Code is checked out** from your repository
5. **Dependencies installed** (npm packages + Playwright browsers)
6. **Dev server starts** (via `webServer` config in `playwright.config.ts`)
7. **Tests run** in headless Chromium browser
8. **Results reported** in GitHub UI
9. **Artifacts uploaded** (if tests fail, screenshots/videos saved)
10. **Server shuts down** (GitHub cleans up)

**Total time**: Usually 3-5 minutes for E2E tests

## Viewing Test Results in GitHub

### Step 1: Go to Actions Tab

1. Open your GitHub repository
2. Click the **"Actions"** tab at the top
3. You'll see a list of workflow runs

### Step 2: Click on a Workflow Run

Each push/PR creates a new workflow run. Click on one to see:
- ✅ Which tests passed
- ❌ Which tests failed
- ⏱️ How long tests took
- 📊 Summary of results

### Step 3: View Test Details

Click on the **"Run E2E Tests"** job to see:
- Console output from each step
- Error messages from failed tests
- Links to download artifacts

### Step 4: Download Artifacts (If Tests Failed)

If tests failed, you can download:
- **Screenshots** of the failure
- **Videos** of the test execution
- **Traces** (step-by-step replay of what happened)

**To view a trace:**
1. Download the `playwright-report` artifact
2. Unzip it
3. Run: `npx playwright show-trace trace.zip`
4. Interactive UI shows exactly what happened

## Environment Variables in CI

Tests need access to Supabase. In CI, credentials come from **GitHub Secrets**:

### Setting Up Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add these secrets:
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

**Why secrets?**: Keeps credentials secure. They're encrypted and never visible in logs.

### How Secrets Are Used

In `.github/workflows/playwright.yml`:

```yaml
- name: Run Playwright tests
  run: npm run test:e2e
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

These environment variables are passed to your application, just like in local development.

## Playwright Configuration for CI

In `playwright.config.ts`, several settings adapt to CI:

```typescript
// Retry failed tests in CI (network issues more common)
retries: process.env.CI ? 2 : 0

// Use all CPU cores in CI (speed matters)
workers: process.env.CI ? undefined : 1

// Start fresh server in CI (clean state)
reuseExistingServer: !process.env.CI

// Prevent test.only() in CI (catches mistakes)
forbidOnly: !!process.env.CI
```

**How it knows it's in CI**: GitHub Actions automatically sets `CI=true` environment variable.

## Debugging Failed CI Tests

### Strategy 1: Check the Console Output

1. Go to Actions → Click workflow run → Click job
2. Expand the **"Run Playwright tests"** step
3. Read error messages (same as local failures)

### Strategy 2: Download and View Trace

1. Scroll to bottom of job page
2. Download **"playwright-report"** artifact
3. Unzip and run: `npx playwright show-trace trace.zip`
4. See exactly what happened, step by step

### Strategy 3: Run Tests Locally in CI Mode

Simulate CI environment on your computer:

```bash
# Set CI environment variable
$env:CI = "true"  # PowerShell
# or
export CI=true    # Bash

# Run tests in CI mode
npm run test:e2e
```

This runs tests with CI settings (headless, retries, etc.)

### Strategy 4: Add Debug Logging

Add `console.log()` statements in your tests:

```typescript
test('should do something', async ({ page }) => {
  console.log('Navigating to home page...');
  await page.goto('/');
  
  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());
  
  // ... rest of test
});
```

These logs appear in the GitHub Actions console output.

## Best Practices for CI

### ✅ DO:
- Keep tests fast (under 5 minutes total)
- Use retries for flaky network issues
- Upload artifacts for debugging
- Run tests on every PR
- Fix failing tests immediately

### ❌ DON'T:
- Ignore failing tests ("it works locally")
- Disable tests instead of fixing them
- Use `test.only()` (CI will catch this)
- Rely on specific timing (use proper waits)
- Test against production data (use test data)

## Cost and Limits

**GitHub Actions is free for public repositories!**

For private repositories:
- 2,000 minutes/month free
- E2E tests use ~5 minutes per run
- ~400 test runs per month free

**Tip**: Run E2E tests only on master and PRs, not every commit.

## Integration with Other CI Steps

Playwright tests run alongside other CI jobs:

```
Push to GitHub
    ↓
┌───────────────────────────────────┐
│  GitHub Actions Workflows         │
├───────────────────────────────────┤
│  1. Unit Tests (Jest)             │ ← Fast (30 seconds)
│  2. Linting (ESLint)              │ ← Fast (10 seconds)
│  3. E2E Tests (Playwright)        │ ← Slower (3-5 minutes)
│  4. SonarQube Analysis            │ ← Medium (1-2 minutes)
│  5. Build (Vite)                  │ ← Medium (1 minute)
└───────────────────────────────────┘
    ↓
All pass? → Merge allowed ✅
Any fail? → Merge blocked ❌
```

## Future Enhancements

As you progress, you can add:

### Phase 2: Parallel Execution
- Run tests across multiple browsers (Chrome, Firefox, Safari)
- Shard tests across multiple machines (faster execution)

### Phase 3: Visual Regression Testing
- Compare screenshots to detect unintended UI changes
- Automatically flag visual differences

### Phase 4: Performance Testing
- Measure page load times
- Assert on performance budgets
- Track performance over time

## Summary

**CI/CD with Playwright means:**
- ✅ Automated testing on every push
- ✅ Catch bugs before they reach production
- ✅ Confidence that code works in clean environment
- ✅ Detailed debugging artifacts when tests fail
- ✅ Free for public repositories

**You're already set up!** The `.github/workflows/playwright.yml` file is ready to go. Next time you push code, watch the Actions tab to see your tests run automatically! 🚀

