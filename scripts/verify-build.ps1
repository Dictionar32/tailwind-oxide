#!/usr/bin/env pwsh
# tailwind-styled-v4 build verification script
# Verifies workflow shape plus the full two-stage build gate.

$ErrorActionPreference = "Stop"
$projectRoot = $PSScriptRoot | Split-Path -Parent

Set-Location $projectRoot

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "tailwind-styled-v4 Build Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$failures = @()

# 1. Check for required npm scripts
Write-Host "[1/6] Checking npm scripts..." -ForegroundColor Yellow
$packageJson = Get-Content "package.json" | ConvertFrom-Json
$validScripts = @(
    "build",
    "build:packages",
    "build:rust",
    "dev",
    "test",
    "test:examples",
    "verify:builds",
    "check",
    "lint"
)

foreach ($script in $validScripts) {
    if (-not $packageJson.scripts.PSObject.Properties[$script]) {
        $failures += "Missing script: $script"
        Write-Host "  x Missing: $script" -ForegroundColor Red
    } else {
        Write-Host "  OK $script" -ForegroundColor Green
    }
}

# 2. Validate workflow YAML files
Write-Host ""
Write-Host "[2/6] Validating workflow YAML files..." -ForegroundColor Yellow
$workflowsPath = ".github/workflows"
if (Test-Path $workflowsPath) {
    $workflowFiles = Get-ChildItem "$workflowsPath/*.yml"
    foreach ($file in $workflowFiles) {
        try {
            $content = Get-Content $file.FullName -Raw
            $null = $content -replace '(?m)^.*#.*$', ''
            Write-Host "  OK $($file.Name)" -ForegroundColor Green
        } catch {
            $failures += "Invalid YAML: $($file.Name) - $($_.Exception.Message)"
            Write-Host "  x $($file.Name): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    $failures += "Workflows directory not found: $workflowsPath"
}

# 3. Check workflow files have Rust toolchain
Write-Host ""
Write-Host "[3/6] Checking workflow Rust toolchain setup..." -ForegroundColor Yellow
$workflowFiles = Get-ChildItem "$workflowsPath/*.yml"
$rustWorkflowsMissing = @()
foreach ($file in $workflowFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -notmatch 'actions-rust-lang/setup-rust-toolchain') {
        $rustWorkflowsMissing += $file.Name
        Write-Host "  x $($file.Name): Missing Rust toolchain setup" -ForegroundColor Red
    } else {
        Write-Host "  OK $($file.Name): Has Rust toolchain" -ForegroundColor Green
    }
}
if ($rustWorkflowsMissing.Count -gt 0) {
    $failures += "Workflows missing Rust toolchain: $($rustWorkflowsMissing -join ', ')"
}

# 4. Check workflow files run the two-stage build gate
Write-Host ""
Write-Host "[4/6] Checking workflow build verification steps..." -ForegroundColor Yellow
foreach ($file in $workflowFiles) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match 'npm run verify:builds') {
        Write-Host "  OK $($file.Name): uses verify:builds" -ForegroundColor Green
    } elseif ($content -match 'npm run build') {
        $failures += "$($file.Name): uses npm run build without verify:builds"
        Write-Host "  x $($file.Name): uses npm run build without verify:builds" -ForegroundColor Red
    } else {
        Write-Host "  WARN $($file.Name): no build step detected" -ForegroundColor Yellow
    }
}

# 5. Run npm ci
Write-Host ""
Write-Host "[5/6] Running npm ci..." -ForegroundColor Yellow
try {
    npm ci 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK npm ci succeeded" -ForegroundColor Green
    } else {
        $failures += "npm ci failed with exit code $LASTEXITCODE"
        Write-Host "  x npm ci failed" -ForegroundColor Red
    }
} catch {
    $failures += "npm ci failed: $($_.Exception.Message)"
    Write-Host "  x npm ci failed: $($_.Exception.Message)" -ForegroundColor Red
}

# 6. Run the full two-stage build verification
Write-Host ""
Write-Host "[6/6] Running npm run verify:builds..." -ForegroundColor Yellow
try {
    npm run verify:builds 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  OK npm run verify:builds succeeded" -ForegroundColor Green
    } else {
        $failures += "npm run verify:builds failed with exit code $LASTEXITCODE"
        Write-Host "  x npm run verify:builds failed" -ForegroundColor Red
    }
} catch {
    $failures += "npm run verify:builds failed: $($_.Exception.Message)"
    Write-Host "  x npm run verify:builds failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
if ($failures.Count -eq 0) {
    Write-Host "All checks passed" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    exit 0
}

Write-Host "$($failures.Count) check(s) failed:" -ForegroundColor Red
foreach ($failure in $failures) {
    Write-Host "  - $failure" -ForegroundColor Red
}
Write-Host "========================================" -ForegroundColor Cyan
exit 1
