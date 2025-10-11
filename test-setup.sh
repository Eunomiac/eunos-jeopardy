#!/bin/bash

# Quick test script to validate the setup.sh script logic
# This can be run locally to test the validation logic

echo "🧪 Testing setup script validation logic..."

# Test 1: Check if we can find package.json
if [ -f "package.json" ]; then
  echo "✅ package.json found"
else
  echo "❌ package.json not found"
fi

# Test 2: Check if this is the Euno's Jeopardy project
if grep -q "eunos-jeopardy" package.json 2>/dev/null; then
  echo "✅ Confirmed Euno's Jeopardy project"
else
  echo "❌ Not the Euno's Jeopardy project"
fi

# Test 3: Check critical config files
config_files=("tsconfig.app.json" "tsconfig.test.json" "jest.config.js")
for config_file in "${config_files[@]}"; do
  if [ -f "$config_file" ]; then
    echo "✅ $config_file exists"
  else
    echo "❌ $config_file missing"
  fi
done

# Test 4: Check test infrastructure
if [ -f "src/test/setup.ts" ]; then
  echo "✅ Test setup file exists"
else
  echo "❌ Test setup file missing"
fi

if [ -d "src/test/__mocks__" ]; then
  echo "✅ Test mocks directory exists"
else
  echo "❌ Test mocks directory missing"
fi

# Test 5: Check essential mock files
essential_mocks=(
  "src/test/__mocks__/@supabase/supabase-js.ts"
  "src/test/__mocks__/supabase-connection.ts"
  "src/test/testUtils.ts"
  "src/services/games/__mocks__/GameService.ts"
)

for mock_file in "${essential_mocks[@]}"; do
  if [ -f "$mock_file" ]; then
    echo "✅ $mock_file exists"
  else
    echo "❌ $mock_file missing"
  fi
done

# Test 6: Check test fixtures
if [ -d "src/test/fixtures" ]; then
  echo "✅ Test fixtures directory exists"
  
  csv_fixtures=(
    "src/test/fixtures/test-valid-basic.csv"
    "src/test/fixtures/test-invalid-missing-jeopardy.csv"
    "src/test/fixtures/test-invalid-no-final.csv"
    "src/test/fixtures/test-invalid-malformed.csv"
  )
  
  for csv_file in "${csv_fixtures[@]}"; do
    if [ -f "$csv_file" ]; then
      echo "✅ $csv_file exists"
    else
      echo "⚠️  $csv_file missing (warning only)"
    fi
  done
else
  echo "❌ Test fixtures directory missing"
fi

echo ""
echo "🏁 Validation test complete!"
echo "   Run './setup.sh' to perform full setup with npm install and compilation checks"
