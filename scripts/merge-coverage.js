/**
 * Merge Coverage Reports
 * 
 * This script merges Jest unit test coverage with Playwright E2E test coverage
 * into a single report for SonarQube.
 * 
 * Process:
 * 1. Load Jest coverage from coverage/coverage-final.json
 * 2. Load all Playwright coverage files from .nyc_output/coverage-e2e-*.json
 * 3. Merge them using Istanbul's coverage map
 * 4. Generate LCOV report for SonarQube
 * 5. Generate HTML report for viewing
 */

const { createCoverageMap } = require('istanbul-lib-coverage');
const { createContext } = require('istanbul-lib-report');
const { create } = require('istanbul-reports');
const fs = require('fs');
const path = require('path');
const glob = require('glob');

async function mergeCoverage() {
  console.log('🔄 Merging coverage reports...\n');

  const coverageMap = createCoverageMap();
  let jestCoverageLoaded = false;
  let e2eCoverageCount = 0;

  // ============================================================
  // Load Jest coverage
  // ============================================================
  const jestCoveragePath = path.join(__dirname, '../coverage/coverage-final.json');
  if (fs.existsSync(jestCoveragePath)) {
    try {
      const jestData = JSON.parse(fs.readFileSync(jestCoveragePath, 'utf8'));
      coverageMap.merge(jestData);
      jestCoverageLoaded = true;
      
      const fileCount = Object.keys(jestData).length;
      console.log(`✅ Merged Jest coverage (${fileCount} files)`);
    } catch (error) {
      console.error('❌ Error loading Jest coverage:', error.message);
    }
  } else {
    console.warn('⚠️  No Jest coverage found at:', jestCoveragePath);
    console.warn('   Run `npm run test:coverage` first to generate Jest coverage');
  }

  // ============================================================
  // Load Playwright E2E coverage
  // ============================================================
  const e2eCoveragePattern = path.join(__dirname, '../.nyc_output/coverage-e2e-*.json');
  const e2eCoverageFiles = glob.sync(e2eCoveragePattern);

  if (e2eCoverageFiles.length > 0) {
    e2eCoverageFiles.forEach(file => {
      try {
        const coverage = JSON.parse(fs.readFileSync(file, 'utf8'));
        coverageMap.merge(coverage);
        e2eCoverageCount++;
      } catch (error) {
        console.error(`❌ Error loading ${path.basename(file)}:`, error.message);
      }
    });
    console.log(`✅ Merged ${e2eCoverageCount} Playwright E2E coverage files`);
  } else {
    console.warn('⚠️  No Playwright E2E coverage found');
    console.warn('   Run `npm run test:e2e:coverage` first to generate E2E coverage');
  }

  // ============================================================
  // Check if we have any coverage to merge
  // ============================================================
  if (!jestCoverageLoaded && e2eCoverageCount === 0) {
    console.error('\n❌ No coverage data found to merge!');
    console.error('   Run tests first:');
    console.error('   - npm run test:coverage (for Jest)');
    console.error('   - npm run test:e2e:coverage (for Playwright)');
    process.exit(1);
  }

  // ============================================================
  // Create merged output directory
  // ============================================================
  const mergedDir = path.join(__dirname, '../coverage-merged');
  if (!fs.existsSync(mergedDir)) {
    fs.mkdirSync(mergedDir, { recursive: true });
  }

  // ============================================================
  // Write merged coverage JSON
  // ============================================================
  const mergedCoverageFile = path.join(mergedDir, 'coverage-final.json');
  fs.writeFileSync(
    mergedCoverageFile,
    JSON.stringify(coverageMap.toJSON(), null, 2)
  );
  console.log(`\n✅ Merged coverage JSON: ${path.relative(process.cwd(), mergedCoverageFile)}`);

  // ============================================================
  // Generate reports
  // ============================================================
  const context = createContext({
    dir: mergedDir,
    coverageMap,
  });

  // Generate LCOV report (for SonarQube)
  console.log('📊 Generating LCOV report...');
  const lcov = create('lcov', {});
  lcov.execute(context);
  console.log(`✅ LCOV report: ${path.relative(process.cwd(), path.join(mergedDir, 'lcov.info'))}`);

  // Generate HTML report (for viewing)
  console.log('📊 Generating HTML report...');
  const html = create('html', {});
  html.execute(context);
  console.log(`✅ HTML report: ${path.relative(process.cwd(), path.join(mergedDir, 'lcov-report/index.html'))}`);

  // ============================================================
  // Print summary
  // ============================================================
  const summary = coverageMap.getCoverageSummary();
  const stats = summary.toJSON();

  console.log('\n📈 Coverage Summary:');
  console.log(`   Lines:      ${stats.lines.pct.toFixed(2)}% (${stats.lines.covered}/${stats.lines.total})`);
  console.log(`   Statements: ${stats.statements.pct.toFixed(2)}% (${stats.statements.covered}/${stats.statements.total})`);
  console.log(`   Functions:  ${stats.functions.pct.toFixed(2)}% (${stats.functions.covered}/${stats.functions.total})`);
  console.log(`   Branches:   ${stats.branches.pct.toFixed(2)}% (${stats.branches.covered}/${stats.branches.total})`);

  console.log('\n✅ Coverage merge complete!');
  console.log(`\n📂 View HTML report: open ${path.join(mergedDir, 'lcov-report/index.html')}`);
}

// Run the merge
mergeCoverage().catch(error => {
  console.error('\n❌ Fatal error during coverage merge:', error);
  process.exit(1);
});

