/**
 * Run All Coverage Tests
 *
 * This script runs Jest and Playwright tests sequentially, then merges coverage.
 * Unlike using && in npm scripts, this continues even if individual tests fail
 * (e.g., if coverage thresholds aren't met), ensuring all tests run and coverage
 * is merged.
 */

import { execSync } from 'child_process';

function runCommand(command, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🚀 ${description}`);
  console.log(`${'='.repeat(60)}\n`);

  try {
    execSync(command, { stdio: 'inherit', shell: true });
    console.log(`\n✅ ${description} completed\n`);
    return true;
  } catch (error) {
    console.log(`\n⚠️  ${description} completed with errors (exit code: ${error.status})`);
    console.log(`   This is OK - continuing with next step...\n`);
    return false;
  }
}

async function runAllCoverage() {
  console.log('\n📊 Running All Coverage Tests\n');

  const results = {
    jest: false,
    e2e: false,
    merge: false,
  };

  // Run Jest tests with coverage
  results.jest = runCommand('npm run test:coverage', 'Jest Unit Tests');

  // Run Playwright E2E tests with coverage
  results.e2e = runCommand('npm run test:e2e:coverage', 'Playwright E2E Tests');

  // Merge coverage reports
  results.merge = runCommand('npm run coverage:merge', 'Merge Coverage Reports');

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📈 Coverage Run Summary');
  console.log('='.repeat(60));
  console.log(`Jest Tests:     ${results.jest ? '✅ Passed' : '⚠️  Failed/Incomplete'}`);
  console.log(`E2E Tests:      ${results.e2e ? '✅ Passed' : '⚠️  Failed/Incomplete'}`);
  console.log(`Merge Coverage: ${results.merge ? '✅ Success' : '❌ Failed'}`);
  console.log('='.repeat(60));

  if (results.merge) {
    console.log('\n✅ Coverage reports merged successfully!');
    console.log('📂 View HTML report: coverage-merged/lcov-report/index.html\n');
  } else {
    console.log('\n❌ Coverage merge failed - check errors above\n');
    process.exit(1);
  }
}

runAllCoverage().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
