/** @type {import('jest').Config} */

export default {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.test.json',
    }],
  },

  // Module name mapping for path aliases and assets
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@supabase/supabase-js$': '<rootDir>/src/test/__mocks__/@supabase/supabase-js.ts',
    '^.*\\/services\\/supabase\\/connection$': '<rootDir>/src/test/__mocks__/supabase-connection.ts',
    '^@test/mocks/commonTestData$': '<rootDir>/src/test/__mocks__/commonTestData.ts',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': 'jest-transform-stub',
  },

  // Global setup for environment variables
  globals: {
    'import.meta': {
      env: {
        VITE_SUPABASE_URL: 'https://szinijrajifovetkthcz.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN6aW5panJhamlmb3ZldGt0aGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczMDQzMzgsImV4cCI6MjA3Mjg4MDMzOH0.WSBn14JZZFUwf-zRoQDLNq30bP9nE7_ItB352znOBdk',
      },
    },
  },

  // Test file patterns
  testMatch: [
    '**/src/**/__tests__/**/*.(ts|tsx|js)',
    '**/src/**/*.(test|spec).(ts|tsx|js)',
  ],

  // Exclude debug components from test runs
  testPathIgnorePatterns: [
    '/node_modules/'
  ],

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  coverageReporters: ['text', 'lcov', 'html', 'json', 'json-summary'],

  // Coverage collection patterns
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',

    /* ❌ EXCLUDED: Type Definition Files */
    '!src/**/*.d.ts',

    /* ❌ EXCLUDED: Vite Environment Variables Definition File */
    '!src/vite-env.d.ts',

    /* ❌ EXCLUDED: Test Files */
    '!src/**/__tests__/**',
    '!src/**/*.test.{ts,tsx}',
    '!src/**/*.spec.{ts,tsx}',
    '!src/test/**',

    /* ❌ EXCLUDED: Entry Point Files */
    '!src/main.tsx',
    '!src/test-schema.ts',

    /* ❌ EXCLUDED: Barrel Export Files */
    '!src/services/index.ts',

    /* ❌ EXCLUDED: Supabase Files */
    '!src/services/supabase/types.ts',
    '!src/services/supabase/client.ts',
    '!src/services/supabase/index.ts',
    '!src/services/supabase/connection.ts',
    '!src/services/supabase/database-test.ts',

    /* ❌ EXCLUDED: Complex Integration Code Requiring Integration Testing */
    '!src/services/clueSets/loader.ts',

    /* ❌ EXCLUDED: Higher-Order Testing Required */
    // e.g. animations, DOM manipulation, etc.

    /* ❌ EXCLUDED: Debug Components - Development utilities only */
    '!src/components/debug/**',

    /* ❌ EXCLUDED: Animation Initialization - Simple setup, no business logic */
    '!src/utils/animations.ts',

  ],

  // Coverage thresholds - 80% for new code, 90% global
  coverageThreshold: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
    // Note: Jest doesn't support "new code" thresholds like SonarQube
    // SonarQube will enforce 80% on new code via sonar-project.properties
  },

  // Test results reporter for SonarQube
  testResultsProcessor: 'jest-sonar-reporter',

  // ESM support
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts', '.tsx'],

  // Transform ignore patterns - ensure Supabase modules are transformed
  transformIgnorePatterns: [
    'node_modules/(?!(@supabase|@supabase/.*)/)',
  ],

  // Clear mocks between tests
  clearMocks: true,

  // Verbose output
  verbose: true,
};
