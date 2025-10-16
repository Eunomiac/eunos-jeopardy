import { config } from 'dotenv';
import { cleanupAllTestData } from './fixtures/database-helpers';

/**
 * Playwright Global Setup
 *
 * This file runs ONCE before all tests start. It's the perfect place to:
 * - Load environment variables
 * - Load test user IDs from Supabase
 * - Clean up test data from previous runs
 * - Verify test environment is configured correctly
 * - Set up any global state needed for tests
 *
 * LEARNING NOTE: Global setup is better than beforeEach() because:
 * - Runs once (fast) instead of before every test (slow)
 * - Single place to manage setup (DRY principle)
 * - "Set it and forget it" - no need to remember in each test file
 *
 * This function is referenced in playwright.config.ts:
 * ```typescript
 * export default defineConfig({
 *   globalSetup: './e2e/global-setup.ts',
 *   // ...
 * });
 * ```
 *
 * @see https://playwright.dev/docs/test-global-setup-teardown
 */
async function globalSetup() {
  // Load environment variables from .env.local file
  // LEARNING NOTE: Vite automatically loads .env.local in the app, but Playwright
  // runs in Node.js (not Vite), so we need to load it manually.
  config({ path: '.env.local', quiet: true });
  console.log('\n🚀 Starting Playwright E2E Tests\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Global Setup - Preparing Test Environment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Verify environment variables
    console.log('1️⃣  Verifying environment configuration...');
    const requiredEnvVars = [
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
    ];

    const missingEnvVars = requiredEnvVars.filter(
      (varName) => !process.env[varName]
    );

    if (missingEnvVars.length > 0) {
      console.error('\n❌ ERROR: Missing required environment variables:');
      missingEnvVars.forEach((varName) => { console.error(`   - ${varName}`) });
      console.error('\n   Make sure your .env file is configured correctly.\n');
      throw new Error('Missing environment variables');
    }

    console.log('✅ Environment variables configured\n');

    // Step 2: Clean up test data from previous runs
    console.log('2️⃣  Cleaning up test data from previous runs...');
    console.log('   This includes cancelling any active games from failed test runs');
    await cleanupAllTestData();
    console.log(''); // Empty line for readability

    // Success!
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Global Setup Complete - Ready to Run Tests!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Global Setup Failed!');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.error('Error details:', error);
    console.error('\nTests will not run until setup succeeds.\n');

    // Re-throw to fail the test run
    throw error;
  }
}

export default globalSetup;
