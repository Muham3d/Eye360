#!/bin/bash

################################################################################
# PatrolManager Database Reset Script
#
# This script resets the PostgreSQL database to a clean state.
# It drops all tables, re-runs migrations, and re-seeds the data.
#
# WARNING: This will delete ALL data in the database!
#
# Usage:
#   ./scripts/db/reset.sh [options]
#
# Options:
#   -y, --yes      Skip confirmation prompt
#   -s, --skip-seed Skip running seeders
#   -h, --help     Show this help message
################################################################################

set -e  # Exit on error
set -u  # Exit on undefined variable

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
SKIP_CONFIRMATION=false
SKIP_SEED=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -y|--yes)
      SKIP_CONFIRMATION=true
      shift
      ;;
    -s|--skip-seed)
      SKIP_SEED=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  -y, --yes      Skip confirmation prompt"
      echo "  -s, --skip-seed Skip running seeders"
      echo "  -h, --help     Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use -h or --help for usage information"
      exit 1
      ;;
  esac
done

# Print header
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}  PatrolManager Database Reset${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""
echo -e "${RED}WARNING: This will delete ALL data in the database!${NC}"
echo ""

# Confirmation prompt
if [ "$SKIP_CONFIRMATION" = false ]; then
    read -p "Are you sure you want to reset the database? (yes/no): " confirmation
    if [ "$confirmation" != "yes" ]; then
        echo "Operation cancelled"
        exit 0
    fi
fi

# Change to project root
cd "$PROJECT_ROOT"

# Determine docker compose command
DOCKER_COMPOSE="docker compose"
if ! docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
fi

# Step 1: Stop containers
echo -e "${BLUE}[1/5] Stopping containers...${NC}"
$DOCKER_COMPOSE --file docker-compose.yml --profile admin down
echo -e "${GREEN}Containers stopped${NC}"

# Step 2: Remove volumes (this deletes all data)
echo -e "${BLUE}[2/5] Removing database volumes...${NC}"
docker volume rm patrolmanager-postgres-data 2>/dev/null || true
echo -e "${GREEN}Volumes removed${NC}"

# Step 3: Start PostgreSQL container
echo -e "${BLUE}[3/5] Starting PostgreSQL container...${NC}"
$DOCKER_COMPOSE --file docker-compose.yml up -d postgres

# Wait for PostgreSQL to be healthy
echo "Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if docker exec patrolmanager-postgres pg_isready -U patrolmanager -d patrolmanager &> /dev/null; then
        echo -e "${GREEN}PostgreSQL is ready${NC}"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "Waiting... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}Error: PostgreSQL failed to start${NC}"
    exit 1
fi

# Step 4: Run migrations
echo -e "${BLUE}[4/5] Running database migrations...${NC}"
cd "$PROJECT_ROOT/backend"
npx sequelize-cli db:migrate
echo -e "${GREEN}Migrations completed${NC}"

# Step 5: Run seeders
if [ "$SKIP_SEED" = false ]; then
    echo -e "${BLUE}[5/5] Running database seeders...${NC}"
    npx sequelize-cli db:seed:all
    echo -e "${GREEN}Seeders completed${NC}"
else
    echo -e "${YELLOW}[5/5] Skipping seeders${NC}"
fi

# Final summary
echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  Database Reset Complete!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Database has been reset to a clean state"
echo ""
echo "Development users (password: TestPassword123!):"
echo "  - admin@patrolmanager.local (Admin)"
echo "  - manager@patrolmanager.local (Manager)"
echo "  - supervisor@patrolmanager.local (Supervisor)"
echo "  - guard@patrolmanager.local (Guard)"
echo ""
echo "To start the backend server:"
echo "  npm run dev"
echo ""
