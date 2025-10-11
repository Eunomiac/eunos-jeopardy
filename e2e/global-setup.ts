import { config } from 'dotenv';
import { cleanupAllTestData, verifyTestUsers } from './fixtures/database-helpers';

/**
 * Playwright Global Setup
 *
 * This file runs ONCE before all tests start. It's the perfect place to:
 * - Load environment variables
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
  config({ path: '.env.local' });
  console.log('\n🚀 Starting Playwright E2E Tests\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Global Setup - Preparing Test Environment');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  try {
    // Step 1: Verify test users are configured
    console.log('1️⃣  Verifying test user configuration...');
    const verification = verifyTestUsers();

    if (verification.configured === 0) {
      console.error('\n❌ ERROR: No test users configured!');
      console.error('   Please update e2e/fixtures/test-users.ts with actual Supabase user IDs.');
      console.error('   See the file comments for setup instructions.\n');
      throw new Error('Test users not configured');
    }

    if (verification.missing.length > 0) {
      console.warn(`⚠️  Warning: ${verification.missing.length} test users not configured:`);
      verification.missing.forEach((user) => { console.warn(`   - ${user}`) });
      console.warn('   Some tests may be skipped.\n');
    } else {
      console.log(`✅ All ${verification.total} test users configured\n`);
    }

    // Step 2: Clean up test data from previous runs
    console.log('2️⃣  Cleaning up test data from previous runs...');
    await cleanupAllTestData();
    console.log(''); // Empty line for readability

    // Step 3: Verify environment variables
    console.log('3️⃣  Verifying environment configuration...');
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
