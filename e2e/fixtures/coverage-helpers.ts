import { Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';

/**
 * Save coverage data from a Playwright page to disk
 *
 * This extracts the Istanbul coverage object from the browser window
 * and saves it to the .nyc_output directory for later merging with
 * Jest coverage.
 *
 * @param page - Playwright page object
 * @param testName - Name of the test (used in filename)
 */
export async function saveCoverage(page: Page, testName: string): Promise<void> {
  try {
    // Get coverage from the page's window object
    // Istanbul instruments code and stores coverage in window.__coverage__
    const coverage = await page.evaluate(() => (globalThis as { __coverage__?: unknown }).__coverage__);

    if (coverage) {
      // Create .nyc_output directory if it doesn't exist
      const coverageDir = path.join(process.cwd(), '.nyc_output');
      if (!fs.existsSync(coverageDir)) {
        fs.mkdirSync(coverageDir, { recursive: true });
      }

      // Create unique filename with test name and timestamp
      const sanitizedTestName = testName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
      const coverageFile = path.join(
        coverageDir,
        `coverage-e2e-${sanitizedTestName}-${Date.now()}.json`
      );

      // Write coverage data to file
      fs.writeFileSync(coverageFile, JSON.stringify(coverage, null, 2));
      console.log(`✅ Coverage saved: ${path.basename(coverageFile)}`);
    } else {
      console.warn(`⚠️  No coverage data found for test: ${testName}`);
      console.warn('   Make sure vite-plugin-istanbul is configured and dev server is running with coverage mode');
    }
  } catch (error) {
    console.error(`❌ Error saving coverage for ${testName}:`, error);
  }
}

/**
 * Save coverage from multiple pages (for multi-context tests)
 *
 * @param pages - Array of Playwright page objects
 * @param testName - Name of the test
 */
export async function saveMultiContextCoverage(
  pages: Page[],
  testName: string
): Promise<void> {
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    // Defensive check for array access - protects against undefined
    if (!page) {
      throw new Error(`Page at index ${i} is undefined`);
    }
    await saveCoverage(page, `${testName}-context${i + 1}`);
  }
}
