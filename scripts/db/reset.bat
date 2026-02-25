@echo off
REM################################################################################
REM PatrolManager Database Reset Script (Windows Batch)
REM
REM This script resets the PostgreSQL database to a clean state.
REM It drops all tables, re-runs migrations, and re-seeds the data.
REM
REM WARNING: This will delete ALL data in the database!
REM
REM Usage:
REM   scripts\db\reset.bat [options]
REM
REM Options:
REM   /y         Skip confirmation prompt
REM   /s         Skip running seeders
REM   /?         Show this help message
REM################################################################################

setlocal EnableDelayedExpansion

REM Parse command line arguments
set SKIP_CONFIRMATION=0
set SKIP_SEED=0

:parse_args
if "%~1"=="" goto end_parse_args
if /i "%~1"=="/y" set SKIP_CONFIRMATION=1
if /i "%~1"=="/s" set SKIP_SEED=1
if /i "%~1"=="/?" goto show_help
shift
goto parse_args
:end_parse_args

REM Get script directory
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..\..\

REM Change to project root
cd /d "%PROJECT_ROOT%"

REM Print header
echo ================================================================
echo   PatrolManager Database Reset
echo ================================================================
echo.
echo WARNING: This will delete ALL data in the database!
echo.

REM Confirmation prompt
if %SKIP_CONFIRMATION%==0 (
    set /p confirmation="Are you sure you want to reset the database? (yes/no): "
    if /i not "!confirmation!"=="yes" (
        echo Operation cancelled
        pause
        exit /b 0
    )
)

REM Step 1: Stop containers
echo [1/5] Stopping containers...
docker compose --file docker-compose.yml --profile admin down
echo Containers stopped
echo.

REM Step 2: Remove volumes
echo [2/5] Removing database volumes...
docker volume rm patrolmanager-postgres-data 2>nul
echo Volumes removed
echo.

REM Step 3: Start PostgreSQL container
echo [3/5] Starting PostgreSQL container...
docker compose --file docker-compose.yml up -d postgres
if errorlevel 1 (
    echo Error: Failed to start PostgreSQL container
    pause
    exit /b 1
)

REM Wait for PostgreSQL to be healthy
echo Waiting for PostgreSQL to be ready...
set /a RETRY_COUNT=0
set MAX_RETRIES=30

:wait_loop
if %RETRY_COUNT% geq %MAX_RETRIES% goto timeout_error
docker exec patrolmanager-postgres pg_isready -U patrolmanager -d patrolmanager >nul 2>&1
if errorlevel 1 (
    set /a RETRY_COUNT+=1
    echo Waiting... (!RETRY_COUNT!/!MAX_RETRIES!)
    timeout /t 2 /nobreak >nul
    goto wait_loop
)
echo PostgreSQL is ready
goto continue

:timeout_error
echo Error: PostgreSQL failed to start
pause
exit /b 1

:continue
echo.

REM Step 4: Run migrations
echo [4/5] Running database migrations...
cd backend
npx sequelize-cli db:migrate
if errorlevel 1 (
    echo Error: Migrations failed
    cd ..
    pause
    exit /b 1
)
echo Migrations completed
echo.

REM Step 5: Run seeders
if %SKIP_SEED%==0 (
    echo [5/5] Running database seeders...
    npx sequelize-cli db:seed:all
    echo Seeders completed
) else (
    echo [5/5] Skipping seeders
)
echo.

cd ..

REM Final summary
echo ================================================================
echo   Database Reset Complete!
echo ================================================================
echo.
echo Database has been reset to a clean state
echo.
echo Development users ^(password: TestPassword123!^):
echo   - admin@patrolmanager.local ^(Admin^)
echo   - manager@patrolmanager.local ^(Manager^)
echo   - supervisor@patrolmanager.local ^(Supervisor^)
echo   - guard@patrolmanager.local ^(Guard^)
echo.
echo To start the backend server:
echo   npm run dev
echo.
goto end

:show_help
echo Usage: scripts\db\reset.bat [options]
echo.
echo Options:
echo   /y         Skip confirmation prompt
echo   /s         Skip running seeders
echo   /?         Show this help message
echo.

:end
pause
