# PowerShell test script to validate setup.sh logic on Windows
# This tests the same validation logic that will run on Linux

Write-Host "🧪 Testing setup script validation logic..." -ForegroundColor Cyan

$allPassed = $true

# Test 1: Check if we can find package.json
Write-Host "`n📋 Testing file existence checks..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "✅ package.json found" -ForegroundColor Green
} else {
    Write-Host "❌ package.json not found" -ForegroundColor Red
    $allPassed = $false
}

# Test 2: Check if this is the Euno's Jeopardy project
$packageContent = Get-Content "package.json" -Raw
if ($packageContent -match '"name":\s*"eunos-jeopardy"') {
    Write-Host "✅ Confirmed Euno's Jeopardy project" -ForegroundColor Green
} else {
    Write-Host "❌ Not the Euno's Jeopardy project" -ForegroundColor Red
    Write-Host "   Package name found: $((Get-Content 'package.json' | ConvertFrom-Json).name)" -ForegroundColor Gray
    $allPassed = $false
}

# Test 3: Check critical config files
Write-Host "`n🔧 Testing configuration files..." -ForegroundColor Yellow
$configFiles = @("tsconfig.app.json", "tsconfig.test.json", "jest.config.js")
foreach ($configFile in $configFiles) {
    if (Test-Path $configFile) {
        Write-Host "✅ $configFile exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $configFile missing" -ForegroundColor Red
        $allPassed = $false
    }
}

# Test 4: Check test infrastructure
Write-Host "`n🧪 Testing test infrastructure..." -ForegroundColor Yellow
if (Test-Path "src/test/setup.ts") {
    Write-Host "✅ Test setup file exists" -ForegroundColor Green
} else {
    Write-Host "❌ Test setup file missing" -ForegroundColor Red
    $allPassed = $false
}

if (Test-Path "src/test/__mocks__" -PathType Container) {
    Write-Host "✅ Test mocks directory exists" -ForegroundColor Green
} else {
    Write-Host "❌ Test mocks directory missing" -ForegroundColor Red
    $allPassed = $false
}

# Test 5: Check essential mock files
Write-Host "`n🎭 Testing essential mock files..." -ForegroundColor Yellow
$essentialMocks = @(
    "src/test/__mocks__/@supabase/supabase-js.ts",
    "src/test/__mocks__/supabase-connection.ts",
    "src/test/testUtils.ts",
    "src/services/games/__mocks__/GameService.ts"
)

foreach ($mockFile in $essentialMocks) {
    if (Test-Path $mockFile) {
        Write-Host "✅ $mockFile exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $mockFile missing" -ForegroundColor Red
        $allPassed = $false
    }
}

# Test 6: Check test fixtures
Write-Host "`n📁 Testing test fixtures..." -ForegroundColor Yellow
if (Test-Path "src/test/fixtures" -PathType Container) {
    Write-Host "✅ Test fixtures directory exists" -ForegroundColor Green
    
    $csvFixtures = @(
        "src/test/fixtures/test-valid-basic.csv",
        "src/test/fixtures/test-invalid-missing-jeopardy.csv",
        "src/test/fixtures/test-invalid-no-final.csv",
        "src/test/fixtures/test-invalid-malformed.csv"
    )
    
    foreach ($csvFile in $csvFixtures) {
        if (Test-Path $csvFile) {
            Write-Host "✅ $csvFile exists" -ForegroundColor Green
        } else {
            Write-Host "⚠️  $csvFile missing (warning only)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "❌ Test fixtures directory missing" -ForegroundColor Red
    $allPassed = $false
}

# Test 7: Check if npm is available and can list dependencies
Write-Host "`n📦 Testing npm availability..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "✅ npm available (version: $npmVersion)" -ForegroundColor Green
        
        # Check if node_modules exists (indicates dependencies are installed)
        if (Test-Path "node_modules" -PathType Container) {
            Write-Host "✅ node_modules directory exists" -ForegroundColor Green
        } else {
            Write-Host "⚠️  node_modules missing - dependencies need to be installed" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ npm not available" -ForegroundColor Red
        $allPassed = $false
    }
} catch {
    Write-Host "❌ npm not available" -ForegroundColor Red
    $allPassed = $false
}

# Test 8: Check TypeScript availability
Write-Host "`n🔨 Testing TypeScript availability..." -ForegroundColor Yellow
try {
    $tscVersion = npx tsc --version 2>$null
    if ($tscVersion) {
        Write-Host "✅ TypeScript available ($tscVersion)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  TypeScript not available - may need npm install" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  TypeScript not available - may need npm install" -ForegroundColor Yellow
}

# Summary
Write-Host "`n🏁 Validation test complete!" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✅ All critical checks passed! The setup script should work correctly." -ForegroundColor Green
} else {
    Write-Host "❌ Some critical checks failed. The setup script will catch these issues." -ForegroundColor Red
}

Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
Write-Host "   • Run 'npm install' if dependencies are missing" -ForegroundColor Gray
Write-Host "   • The setup.sh script will perform these same checks on Linux" -ForegroundColor Gray
Write-Host "   • Any missing files will cause the setup script to exit with clear error messages" -ForegroundColor Gray
