# PatrolManager - Developer Setup Guide

This guide will help you set up a local development environment for the PatrolManager security guard management system.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running the Development Server](#running-the-development-server)
- [Testing](#testing)
- [Building CSS](#building-css)
- [Docker Development](#docker-development)
- [Troubleshooting](#troubleshooting)
- [Next Steps](#next-steps)

---

## Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| **Node.js** | 18.0.0 or higher | JavaScript runtime |
| **npm** | 9.0.0 or higher | Package manager |
| **PostgreSQL** | 15 or higher | Database (or use Docker) |
| **Git** | Latest | Version control |

### Optional Software

| Software | Purpose |
|----------|---------|
| **Docker** | Containerized database and services |
| **Docker Compose** | Multi-container orchestration |
| **Postman/Insomnia** | API testing |
| **PgAdmin** | Database management UI |
| **Android Studio** | Mobile app development (Phase 2+) |

### Verify Your Installation

```bash
# Check Node.js version (must be 18+)
node --version

# Check npm version (must be 9+)
npm --version

# Check PostgreSQL installation
psql --version

# Check Docker (optional)
docker --version
docker-compose --version
```

---

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/patrol-manager.git
cd patrol-manager
```

### 2. Install Root Dependencies

```bash
npm install
```

### 3. Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 4. Configure Environment

```bash
# Copy the environment template
cp .env.example .env

# Copy backend environment template
cp backend/.env.example backend/.env
```

Edit the `.env` files with your configuration (see [Environment Configuration](#environment-configuration)).

### 5. Start Database Services

**Option A: Using Docker (Recommended)**

```bash
# Start PostgreSQL database
npm run docker:up

# Or with additional services
npm run docker:up:admin  # Includes PgAdmin
npm run docker:up:redis  # Includes Redis
```

**Option B: Using Local PostgreSQL**

Ensure PostgreSQL is running and create the database:

```bash
# Create database
createdb patrolmanager

# Or use psql
psql -U postgres
CREATE DATABASE patrolmanager;
CREATE USER patrolmanager WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE patrolmanager TO patrolmanager;
```

### 6. Setup Database

```bash
# Run migrations
npm run db:migrate

# Seed development data (optional)
npm run db:seed:dev
```

### 7. Start Development Server

```bash
# From project root
npm run dev
```

The server will start at `http://localhost:3000`

---

## Environment Configuration

### Root `.env` File

The root `.env` file contains shared configuration:

```bash
# Environment
NODE_ENV=development

# Server
PORT=3000
SERVER_HOST=0.0.0.0

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=patrolmanager
DB_USER=patrolmanager
DB_PASSWORD=your_secure_password

# JWT (Mobile API)
JWT_SECRET=your_jwt_secret_min_32_characters
JWT_EXPIRES_IN=1h

# Session (Admin Web)
SESSION_SECRET=your_session_secret_min_32_characters

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173
```

### Backend `.env` File

The backend `.env` file contains backend-specific configuration:

```bash
# Server
NODE_ENV=development
PORT=3000
HOST=localhost

# Database Connection Pool
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_LOGGING=true

# Authentication
BCRYPT_ROUNDS=12

# WebSocket
WS_ENABLED=true
WS_CORS_ORIGIN=http://localhost:3000

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads

# Logging
LOG_LEVEL=info
```

### Generating Secure Secrets

Use OpenSSL to generate secure random secrets:

```bash
# Generate JWT Secret
openssl rand -hex 32

# Generate Session Secret
openssl rand -base64 32
```

---

## Database Setup

### Using Docker Compose (Recommended)

```bash
# Start all database services
npm run docker:up

# View logs
npm run docker:logs

# View only PostgreSQL logs
npm run docker:logs:postgres

# Stop services
npm run docker:down
```

### Using Sequelize CLI

```bash
# Create database (if not exists)
npm run db:create

# Run all migrations
npm run db:migrate

# Run latest migration
npm run db:migrate

# Undo last migration
npm run db:migrate:undo

# Undo all migrations
npm run db:migrate:undo:all

# Seed development data
npm run db:seed:dev

# Reset database (danger: destroys all data)
npm run db:reset
```

### Database Connection Test

```bash
# Test database connection
npm run db:test:connection
```

### Accessing Database

**Using psql:**

```bash
psql -h localhost -U patrolmanager -d patrolmanager
```

**Using PgAdmin (when running with Docker):**

1. Navigate to `http://localhost:5050`
2. Login with credentials from `.env`
3. Add a new server:
   - Host: `postgres`
   - Port: `5432`
   - Database: `patrolmanager`
   - Username: `patrolmanager`

---

## Running the Development Server

### Backend Development Server

```bash
# From project root
npm run dev

# Or from backend directory
cd backend
npm run dev
```

The development server includes:
- Hot reload with Nodemon
- TypeScript compilation on-the-fly
- Source maps for debugging
- Detailed error messages

### Access Points

| Service | URL | Description |
|---------|-----|-------------|
| **Admin Web Panel** | http://localhost:3000 | EJS-based admin interface |
| **API Documentation** | http://localhost:3000/api-docs | Swagger/OpenAPI docs |
| **Health Check** | http://localhost:3000/health | Server status endpoint |
| **Socket.io** | ws://localhost:3000/socket.io/ | WebSocket endpoint |

### Production Build

```bash
# Build TypeScript
cd backend
npm run build

# Start production server
npm run start
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Specialized Test Suites

```bash
# Geofencing tests
npm run test:geofence

# Socket.io tests
npm run test:socket

# SOS/alert tests
npm run test:sos

# Incident reporting tests
npm run test:incident

# File upload tests
npm run test:upload

# Performance tests
npm run test:performance

# Load tests (requires Artillery)
npm run test:load
```

### Coverage Requirements

The project enforces the following minimum coverage thresholds:

| Metric | Threshold |
|--------|-----------|
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |
| Statements | 80% |

---

## Building CSS

The admin web panel uses Tailwind CSS for styling.

### Development Build

```bash
# Build CSS with source maps
npm run build:css:dev

# Watch for changes and rebuild
npm run watch:css
```

### Production Build

```bash
# Minify CSS for production
npm run build:css
```

### CSS Source Files

- **Input:** `backend/src/interfaces/web/public/assets/css/main.css`
- **Output:** `backend/src/interfaces/web/public/assets/css/dist.css`

---

## Docker Development

### Available Profiles

| Profile | Services Included |
|---------|-------------------|
| default | PostgreSQL |
| admin | PostgreSQL + PgAdmin |
| redis | PostgreSQL + Redis |

### Common Commands

```bash
# Start default services
docker compose up -d

# Start with specific profile
docker compose --profile admin up -d
docker compose --profile redis up -d

# View running containers
docker compose ps

# View logs
docker compose logs -f

# View logs for specific service
docker compose logs -f postgres

# Stop all services
docker compose down

# Stop and remove volumes (deletes data)
docker compose down -v

# Rebuild containers
docker compose build

# Rebuild and start
docker compose up -d --build
```

### Volume Management

```bash
# List volumes
docker volume ls

# Inspect PostgreSQL volume
docker volume inspect patrolmanager-postgres-data

# Remove all volumes (WARNING: deletes all data)
docker volume prune
```

### Network Configuration

The project uses a custom bridge network `patrolmanager-network`:

```bash
# List networks
docker network ls

# Inspect network
docker network inspect patrolmanager-network
```

---

## Troubleshooting

### Database Connection Issues

**Problem:** `ECONNREFUSED` when connecting to PostgreSQL

**Solutions:**

1. Verify PostgreSQL is running:
   ```bash
   docker compose ps
   ```

2. Check database logs:
   ```bash
   npm run docker:logs:postgres
   ```

3. Verify environment variables:
   ```bash
   # Check .env file
   cat .env | grep DB_
   ```

4. Test connection manually:
   ```bash
   psql -h localhost -U patrolmanager -d patrolmanager
   ```

### Port Conflicts

**Problem:** `EADDRINUSE: address already in use`

**Solutions:**

1. Find process using the port:
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F

   # macOS/Linux
   lsof -ti:3000 | xargs kill -9
   ```

2. Change the port in `.env`:
   ```bash
   PORT=3001
   ```

### Migration Failures

**Problem:** Migrations fail to apply

**Solutions:**

1. Check current migration status:
   ```bash
   npm run db:migrate:status
   ```

2. Undo and redo migrations:
   ```bash
   npm run db:migrate:undo
   npm run db:migrate
   ```

3. Reset database (development only):
   ```bash
   npm run db:reset
   ```

### Permission Errors

**Problem:** `EACCES: permission denied`

**Solutions:**

1. Fix directory permissions:
   ```bash
   # macOS/Linux
   chmod -R 755 backend/src
   chmod +x backend/node_modules/.bin/*
   ```

2. Avoid using `sudo` with npm - instead fix npm permissions:
   ```bash
   mkdir -p ~/.npm-global
   npm config set prefix '~/.npm-global'
   echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
   ```

### Test Failures

**Problem:** Tests fail unexpectedly

**Solutions:**

1. Clear Jest cache:
   ```bash
   npm run test:watch -- --clearCache
   ```

2. Update snapshots:
   ```bash
   npm run test -- -u
   ```

3. Run tests in verbose mode:
   ```bash
   npm run test -- --verbose
   ```

### Docker Issues

**Problem:** Docker containers fail to start

**Solutions:**

1. Remove orphaned containers:
   ```bash
   docker compose down --remove-orphans
   ```

2. Rebuild from scratch:
   ```bash
   docker compose down -v
   docker compose build --no-cache
   docker compose up -d
   ```

3. Check Docker logs:
   ```bash
   docker compose logs
   ```

---

## Next Steps

After completing the setup:

### 1. Explore the Codebase

- Read the [Architecture Documentation](./docs/README.md)
- Review the [Database Schema](./docs/database/schema.md)
- Check the [API Documentation](./docs/api/README.md)

### 2. Development Workflow

- Read [CONTRIBUTING.md](./CONTRIBUTING.md) for coding standards
- Set up your Git workflow
- Create a feature branch

### 3. Common Development Tasks

| Task | Command |
|------|---------|
| Create new migration | `npx sequelize-cli migration:generate --name` |
| Create new seeder | `npx sequelize-cli seed:generate --name` |
| Run linter | `npm run lint` |
| Format code | `npm run format` |
| Build CSS | `npm run build:css` |

### 4. Additional Resources

- [Project Plan](./PROJECT_PLAN.md) - Complete implementation roadmap
- [Implementation Guide](./IMPLEMENTATION_PLAN.md) - Detailed specifications
- [API Reference](./docs/api/openapi.yaml) - OpenAPI specification
- [Security Best Practices](./docs/security/security-best-practices.md)

---

## Getting Help

If you encounter issues not covered here:

1. Check the [Troubleshooting FAQ](./docs/troubleshooting.md)
2. Review existing [GitHub Issues](https://github.com/your-org/patrol-manager/issues)
3. Create a new issue with:
   - Environment details (OS, Node.js version)
   - Error messages and stack traces
   - Steps to reproduce
   - Expected vs actual behavior

---

## License

Proprietary - All rights reserved

---

**Last Updated:** 2025-02-24
