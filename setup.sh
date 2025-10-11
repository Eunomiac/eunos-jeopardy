#!/bin/bash

# Comprehensive setup script for Euno's Jeopardy React + TypeScript + Vite + Jest project
# Designed for remote agents to run tests and solve failing test scenarios
set -e

echo "🚀 Setting up Euno's Jeopardy environment..."

# Navigate to workspace
cd /mnt/persist/workspace

# Verify Node.js and npm versions
echo "📋 Checking Node.js environment..."
node --version
npm --version

# Verify we're in the correct project directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Are we in the correct directory?"
  exit 1
fi

# Check if this is the Euno's Jeopardy project
if ! grep -q "eunos-jeopardy" package.json; then
  echo "❌ Error: This doesn't appear to be the Euno's Jeopardy project"
  exit 1
fi

echo "✅ Confirmed Euno's Jeopardy project directory"

# Install dependencies (this handles all devDependencies including Jest, TypeScript, etc.)
echo "📦 Installing dependencies..."
npm install

# Verify critical dependencies are installed
echo "🔍 Verifying critical dependencies..."
npm list jest @testing-library/react @testing-library/jest-dom typescript ts-jest --depth=0 || {
  echo "❌ Error: Critical testing dependencies missing"
  exit 1
}

# Verify TypeScript configuration files exist
echo "🔧 Checking TypeScript configuration..."
for config_file in "tsconfig.app.json" "tsconfig.test.json" "jest.config.js"; do
  if [ ! -f "$config_file" ]; then
    echo "❌ Error: Missing configuration file: $config_file"
    exit 1
  fi
done

# Verify test setup and mock structure exists
echo "🧪 Verifying test infrastructure..."
if [ ! -f "src/test/setup.ts" ]; then
  echo "❌ Error: Test setup file missing: src/test/setup.ts"
  exit 1
fi

if [ ! -d "src/test/__mocks__" ]; then
  echo "❌ Error: Test mocks directory missing: src/test/__mocks__"
  exit 1
fi

# Verify essential mock files exist (these are critical for tests to run)
echo "🎭 Checking essential mock files..."
essential_mocks=(
  "src/test/__mocks__/@supabase/supabase-js.ts"
  "src/test/__mocks__/supabase-connection.ts"
  "src/test/testUtils.ts"
  "src/services/games/__mocks__/GameService.ts"
)

for mock_file in "${essential_mocks[@]}"; do
  if [ ! -f "$mock_file" ]; then
    echo "❌ Error: Essential mock file missing: $mock_file"
    exit 1
  fi
done

# Verify test fixtures exist
echo "📁 Checking test fixtures..."
if [ ! -d "src/test/fixtures" ]; then
  echo "❌ Error: Test fixtures directory missing: src/test/fixtures"
  exit 1
fi

# Check for CSV test files
csv_fixtures=(
  "src/test/fixtures/test-valid-basic.csv"
  "src/test/fixtures/test-invalid-missing-jeopardy.csv"
  "src/test/fixtures/test-invalid-no-final.csv"
  "src/test/fixtures/test-invalid-malformed.csv"
)

for csv_file in "${csv_fixtures[@]}"; do
  if [ ! -f "$csv_file" ]; then
    echo "⚠️  Warning: CSV test fixture missing: $csv_file"
  fi
done

# Run TypeScript compilation check
echo "🔨 Checking TypeScript compilation..."
npx tsc --noEmit --project tsconfig.test.json || {
  echo "❌ Error: TypeScript compilation failed"
  exit 1
}

# Run a quick lint check to catch obvious issues
echo "🧹 Running lint check..."
npm run lint || {
  echo "⚠️  Warning: Lint issues found, but continuing setup"
}

# Test that Jest can start and find tests
echo "🧪 Verifying Jest configuration..."
npx jest --listTests --passWithNoTests > /dev/null || {
  echo "❌ Error: Jest configuration is invalid"
  exit 1
}

# Run a dry-run test to verify everything is working
echo "🏃 Running test dry-run..."
npm run test:ci || {
  echo "⚠️  Warning: Some tests are failing, but environment setup is complete"
  echo "    This is expected if there are actual test failures to fix"
}

echo ""
echo "✅ Environment setup completed successfully!"
echo ""
echo "📋 Available commands:"
echo "  npm test              - Run tests in watch mode"
echo "  npm run test:coverage - Run tests with coverage report"
echo "  npm run test:ci       - Run tests once (CI mode)"
echo "  npm run lint          - Run ESLint"
echo "  npm run dev           - Start development server"
echo "  npm run build         - Build for production"
echo ""
echo "🎯 Ready to run and solve failing tests!"
