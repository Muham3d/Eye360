################################################################################
# PatrolManager Database Reset Script (PowerShell)
#
# This script resets the PostgreSQL database to a clean state.
# It drops all tables, re-runs migrations, and re-seeds the data.
#
# WARNING: This will delete ALL data in the database!
#
# Usage:
#   .\scripts\db\reset.ps1 [options]
#
# Options:
#   -Yes          Skip confirmation prompt
#   -SkipSeed     Skip running seeders
#   -Help         Show this help message
################################################################################

[CmdletBinding()]
param(
    [switch]$Yes,
    [switch]$SkipSeed,
    [switch]$Help
)

# Show help
if ($Help) {
    Write-Host "Usage: .\scripts\db\reset.ps1 [options]" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Yes          Skip confirmation prompt"
    Write-Host "  -SkipSeed     Skip running seeders"
    Write-Host "  -Help         Show this help message"
    exit 0
}

# Script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $ScriptDir)

# Change to project root
Set-Location $ProjectRoot

# Print header
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  PatrolManager Database Reset" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "WARNING: This will delete ALL data in the database!" -ForegroundColor Red
Write-Host ""

# Confirmation prompt
if (-not $Yes) {
    $confirmation = Read-Host "Are you sure you want to reset the database? (yes/no)"
    if ($confirmation -ne "yes") {
        Write-Host "Operation cancelled"
        exit 0
    }
}

# Step 1: Stop containers
Write-Host "[1/5] Stopping containers..." -ForegroundColor Cyan
docker compose --file docker-compose.yml --profile admin down 2>$null
Write-Host "Containers stopped" -ForegroundColor Green

# Step 2: Remove volumes (this deletes all data)
Write-Host "[2/5] Removing database volumes..." -ForegroundColor Cyan
docker volume rm patrolmanager-postgres-data 2>$null
Write-Host "Volumes removed" -ForegroundColor Green

# Step 3: Start PostgreSQL container
Write-Host "[3/5] Starting PostgreSQL container..." -ForegroundColor Cyan
docker compose --file docker-compose.yml up -d postgres

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to start PostgreSQL container" -ForegroundColor Red
    exit 1
}

# Wait for PostgreSQL to be healthy
Write-Host "Waiting for PostgreSQL to be ready..."
$MaxRetries = 30
$RetryCount = 0
$Ready = $false

while ($RetryCount -lt $MaxRetries) {
    $result = docker exec patrolmanager-postgres pg_isready -U patrolmanager -d patrolmanager 2>&1
    if ($LASTEXITCODE -eq 0) {
        $Ready = $true
        Write-Host "PostgreSQL is ready" -ForegroundColor Green
        break
    }
    $RetryCount++
    Write-Host "Waiting... ($RetryCount/$MaxRetries)"
    Start-Sleep -Seconds 2
}

if (-not $Ready) {
    Write-Host "Error: PostgreSQL failed to start" -ForegroundColor Red
    exit 1
}

# Step 4: Run migrations
Write-Host "[4/5] Running database migrations..." -ForegroundColor Cyan
Set-Location (Join-Path $ProjectRoot "backend")
npx sequelize-cli db:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Migrations failed" -ForegroundColor Red
    Set-Location $ProjectRoot
    exit 1
}
Write-Host "Migrations completed" -ForegroundColor Green

# Step 5: Run seeders
if (-not $SkipSeed) {
    Write-Host "[5/5] Running database seeders..." -ForegroundColor Cyan
    npx sequelize-cli db:seed:all
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Warning: Some seeders may have failed" -ForegroundColor Yellow
    } else {
        Write-Host "Seeders completed" -ForegroundColor Green
    }
} else {
    Write-Host "[5/5] Skipping seeders" -ForegroundColor Yellow
}

Set-Location $ProjectRoot

# Final summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "  Database Reset Complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Database has been reset to a clean state"
Write-Host ""
Write-Host "Development users (password: TestPassword123!):"
Write-Host "  - admin@patrolmanager.local (Admin)"
Write-Host "  - manager@patrolmanager.local (Manager)"
Write-Host "  - supervisor@patrolmanager.local (Supervisor)"
Write-Host "  - guard@patrolmanager.local (Guard)"
Write-Host ""
Write-Host "To start the backend server:"
Write-Host "  npm run dev"
Write-Host ""
