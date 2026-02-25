# Database Setup & Management

This directory contains scripts for setting up and managing the PostgreSQL database for PatrolManager.

## Prerequisites

- Docker Desktop installed and running
- Node.js 18+ and npm 9+
- (Optional) PowerShell execution policy allows running scripts (Windows)

## Quick Start

### Using npm scripts (Recommended)

```bash
# Initial database setup
npm run db:setup

# Force re-create database from scratch
npm run db:setup:force

# Reset database (drop all data and re-seed)
npm run db:clean

# Reset database without confirmation
npm run db:clean:yes
```

### Using scripts directly

**Windows (PowerShell):**
```powershell
.\scripts\db\setup.ps1
.\scripts\db\setup.ps1 -Force
.\scripts\db\reset.ps1
.\scripts\db\reset.ps1 -Yes
```

**Linux/macOS (Bash):**
```bash
./scripts/db/setup.sh
./scripts/db/setup.sh --force
./scripts/db/reset.sh
./scripts/db/reset.sh --yes
```

## Docker Services

### PostgreSQL
The main database service. Starts by default with `docker compose up -d`.

**Connection Details:**
- Host: `localhost`
- Port: `5432`
- Database: `patrolmanager`
- User: `patrolmanager`
- Password: (from `.env` file)

### PgAdmin (Optional)
Web-based PostgreSQL management interface.

```bash
# Start with PgAdmin
docker compose --profile admin up -d

# Access at http://localhost:5050
# Default credentials: admin@patrolmanager.local / pgadmin_password
```

### Redis (Optional)
In-memory data store for caching and future features.

```bash
# Start with Redis
docker compose --profile redis up -d
```

## Database Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Undo the last migration
npm run db:migrate:undo

# Undo all migrations
npm run db:migrate:undo:all
```

## Database Seeders

```bash
# Run all seeders
npm run db:seed

# Undo all seeders
npm run db:seed:undo

# Run only development users seeder
cd backend && npx sequelize-cli db:seed --seeders-path src/infrastructure/database/seeders/20240224000001-seed-development-users.js
```

## Development Users

After running the seeders, you'll have these test users available:

| Email | Role | Password |
|-------|------|----------|
| admin@patrolmanager.local | Admin | TestPassword123! |
| manager@patrolmanager.local | Manager | TestPassword123! |
| supervisor@patrolmanager.local | Supervisor | TestPassword123! |
| guard@patrolmanager.local | Guard | TestPassword123! |

## Environment Configuration

The setup script will create a `.env` file if it doesn't exist. For production, ensure you:

1. Update `DB_PASSWORD` to a strong password
2. Update `JWT_SECRET` and `SESSION_SECRET` with cryptographically secure values
3. Set `NODE_ENV=production`
4. Review and update all other configuration values

## Custom Functions

The database initialization script (`scripts/docker/init-db.sql`) installs these custom PostgreSQL functions:

### `calculate_distance(lat1, lon1, lat2, lon2)`
Calculates the distance between two GPS coordinates using the Haversine formula.

**Returns:** Distance in meters

**Example:**
```sql
SELECT calculate_distance(40.7128, -74.0060, 40.7589, -73.9851) as distance;
-- Returns approximately 8628 meters (5.36 miles)
```

### `point_in_polygon(lat, lon, lat_array, lon_array)`
Checks if a GPS point is within a geofence polygon.

**Returns:** Boolean

**Example:**
```sql
SELECT point_in_polygon(
  40.7128, -74.0060,
  ARRAY[40.7128, 40.7484, 40.7484, 40.7128],
  ARRAY[-74.0060, -74.0060, -73.9753, -73.9753]
) as is_inside;
```

## Troubleshooting

### Container won't start

```bash
# Check container logs
docker compose logs postgres

# Recreate from scratch
docker compose down -v
docker compose up -d postgres
```

### Migration errors

```bash
# Check current migration status
cd backend
npx sequelize-cli db:migrate:status

# Force reset (WARNING: deletes all data)
npm run db:clean
```

### Permission denied on scripts

**Linux/macOS:**
```bash
chmod +x scripts/db/*.sh
```

**Windows PowerShell:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Volume Management

Database data persists in Docker volumes:

```bash
# List volumes
docker volume ls | grep patrolmanager

# Remove volume (WARNING: deletes all data)
docker volume rm patrolmanager-postgres-data
```

## Backup & Restore

### Backup database
```bash
docker exec patrolmanager-postgres pg_dump -U patrolmanager patrolmanager > backup.sql
```

### Restore database
```bash
docker exec -i patrolmanager-postgres psql -U patrolmanager patrolmanager < backup.sql
```

## Connection Testing

```bash
# Test connection from backend
npm run db:test:connection

# Test with psql
docker exec -it patrolmanager-postgres psql -U patrolmanager -d patrolmanager
```
