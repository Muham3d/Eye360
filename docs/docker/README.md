# Docker Quick Reference

This guide provides a quick reference for Docker commands used in the PatrolManager project.

## Table of Contents

- [Overview](#overview)
- [Services](#services)
- [Quick Start Commands](#quick-start-commands)
- [Docker Compose Commands](#docker-compose-commands)
- [Service Profiles](#service-profiles)
- [Volume Management](#volume-management)
- [Network Configuration](#network-configuration)
- [Troubleshooting](#troubleshooting)

---

## Overview

PatrolManager uses Docker Compose to orchestrate development infrastructure services. The `docker-compose.yml` file defines the following services:

- **PostgreSQL 15** - Primary database
- **PgAdmin** - Database management UI (optional)
- **Redis** - Caching and session storage (optional, Phase 3+)

---

## Services

### PostgreSQL

| Setting | Value |
|---------|-------|
| **Image** | `postgres:15-alpine` |
| **Container Name** | `patrolmanager-postgres` |
| **Default Port** | `5432` |
| **Default Database** | `patrolmanager` |
| **Default User** | `patrolmanager` |
| **Health Check** | `pg_isready` every 10s |

### PgAdmin (Optional)

| Setting | Value |
|---------|-------|
| **Image** | `dpage/pgadmin4:latest` |
| **Container Name** | `patrolmanager-pgadmin` |
| **Default Port** | `5050` |
| **Web UI** | `http://localhost:5050` |
| **Profile** | `admin` |

### Redis (Optional)

| Setting | Value |
|---------|-------|
| **Image** | `redis:7-alpine` |
| **Container Name** | `patrolmanager-redis` |
| **Default Port** | `6379` |
| **Persistence** | AOF enabled |
| **Profile** | `redis` |

---

## Quick Start Commands

### Start Services

```bash
# Start PostgreSQL only
docker compose up -d

# Start PostgreSQL + PgAdmin
docker compose --profile admin up -d

# Start PostgreSQL + Redis
docker compose --profile redis up -d

# Start all services
docker compose --profile admin --profile redis up -d
```

### Stop Services

```bash
# Stop all running services
docker compose down

# Stop and remove volumes (WARNING: deletes data)
docker compose down -v
```

### View Status

```bash
# List running containers
docker compose ps

# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f postgres
docker compose logs -f pgadmin
docker compose logs -f redis
```

---

## Docker Compose Commands

### Lifecycle Commands

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start services in detached mode |
| `docker compose up` | Start services in foreground |
| `docker compose down` | Stop and remove containers |
| `docker compose restart` | Restart all services |
| `docker compose start` | Start stopped services |
| `docker compose stop` | Stop services without removing |

### Build Commands

| Command | Description |
|---------|-------------|
| `docker compose build` | Rebuild images |
| `docker compose build --no-cache` | Rebuild without cache |
| `docker compose up -d --build` | Rebuild and start |

### Logs Commands

| Command | Description |
|---------|-------------|
| `docker compose logs` | View all logs |
| `docker compose logs -f` | Follow logs |
| `docker compose logs --tail=100` | Last 100 lines |
| `docker compose logs postgres` | Specific service logs |
| `docker compose logs -f postgres` | Follow specific service |

### Execution Commands

| Command | Description |
|---------|-------------|
| `docker compose exec postgres bash` | Execute command in container |
| `docker compose exec postgres psql -U patrolmanager` | Connect to PostgreSQL |
| `docker compose exec postgres pg_dump patrolmanager` | Dump database |

---

## Service Profiles

Docker Compose profiles allow you to start specific groups of services.

### Default Profile

```bash
docker compose up -d
```

**Services Started:** PostgreSQL only

### Admin Profile

```bash
docker compose --profile admin up -d
```

**Services Started:** PostgreSQL + PgAdmin

**Access PgAdmin:**
- URL: `http://localhost:5050`
- Email: From `.env` (`PGADMIN_EMAIL`)
- Password: From `.env` (`PGADMIN_PASSWORD`)

**Add Server in PgAdmin:**
1. Click "Add New Server"
2. **General Tab:**
   - Name: `PatrolManager`
3. **Connection Tab:**
   - Host: `postgres`
   - Port: `5432`
   - Database: `patrolmanager`
   - Username: `patrolmanager`
   - Password: From `.env` (`DB_PASSWORD`)

### Redis Profile

```bash
docker compose --profile redis up -d
```

**Services Started:** PostgreSQL + Redis

**Redis Connection:**
- Host: `localhost`
- Port: `6379`
- No authentication by default

### Combined Profiles

```bash
# Start all services
docker compose --profile admin --profile redis up -d

# Or use npm script
npm run docker:up:admin
```

---

## Volume Management

Docker volumes persist data beyond container lifecycle.

### Available Volumes

| Volume Name | Purpose | Container Path |
|-------------|---------|----------------|
| `patrolmanager-postgres-data` | PostgreSQL data | `/var/lib/postgresql/data` |
| `patrolmanager-pgadmin-data` | PgAdmin configuration | `/var/lib/pgadmin` |
| `patrolmanager-redis-data` | Redis persistence | `/data` |

### Volume Commands

```bash
# List all volumes
docker volume ls

# Inspect a volume
docker volume inspect patrolmanager-postgres-data

# Remove unused volumes
docker volume prune

# Remove a specific volume (WARNING: deletes data)
docker volume rm patrolmanager-postgres-data

# Backup PostgreSQL volume
docker run --rm \
  -v patrolmanager-postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz -C /data .

# Restore PostgreSQL volume
docker run --rm \
  -v patrolmanager-postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /data
```

### Volume Best Practices

1. **Never delete volumes without backup** in production
2. **Use volume backups** before major migrations
3. **Label volumes** clearly for multiple environments
4. **Monitor volume size** to prevent disk space issues

---

## Network Configuration

Services communicate via a custom Docker bridge network.

### Network Details

| Setting | Value |
|---------|-------|
| **Network Name** | `patrolmanager-network` |
| **Driver** | `bridge` |
| **Scope** | Local |

### Network Commands

```bash
# List networks
docker network ls

# Inspect network
docker network inspect patrolmanager-network

# View connected containers
docker network inspect patrolmanager-network -f '{{range .Containers}}{{.Name}} {{end}}'

# Remove network (only when no containers are using it)
docker network rm patrolmanager-network
```

### Service Communication

Containers can reach each other using service names:

| From | To | Hostname |
|------|-----|----------|
| Backend | PostgreSQL | `postgres:5432` |
| Backend | Redis | `redis:6379` |
| PgAdmin | PostgreSQL | `postgres:5432` |

### Environment Configuration

When services run in Docker, update `.env`:

```bash
# For backend to connect to Docker PostgreSQL
DB_HOST=postgres  # Not localhost
DB_PORT=5432
```

---

## Troubleshooting

### Container Won't Start

```bash
# Check container logs
docker compose logs <service>

# Check container status
docker compose ps

# Force recreate
docker compose up -d --force-recreate
```

### Database Connection Issues

```bash
# Verify PostgreSQL is healthy
docker compose exec postgres pg_isready -U patrolmanager

# Test connection from backend container
docker compose exec postgres psql -U patrolmanager -d patrolmanager

# Check if port is exposed
docker compose ps
```

### Volume Permission Issues

```bash
# Fix volume permissions (Linux/macOS)
docker compose exec postgres chown -R postgres:postgres /var/lib/postgresql/data

# On Windows, ensure Docker Desktop has file sharing enabled
```

### Port Already in Use

```bash
# Find process using the port
netstat -ano | findstr :5432  # Windows
lsof -ti:5432                  # macOS/Linux

# Change port in docker-compose.yml:
ports:
  - "5433:5432"  # Maps to localhost:5433
```

### Out of Disk Space

```bash
# Check Docker disk usage
docker system df

# Clean up unused resources
docker system prune -a

# Remove unused images
docker image prune -a

# Remove unused volumes (WARNING: deletes data)
docker volume prune
```

### Reset Everything

```bash
# Complete reset (WARNING: deletes all data)
docker compose down -v
docker volume prune
docker compose build --no-cache
docker compose up -d
```

---

## Production Considerations

### Security

1. **Change default passwords** in production
2. **Use secrets management** (not `.env` files)
3. **Enable SSL** for database connections
4. **Restrict network access** - don't expose ports publicly
5. **Run non-root** containers when possible

### Resource Limits

Add to `docker-compose.yml`:

```yaml
services:
  postgres:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Backup Strategy

```bash
# Automated backup script
#!/bin/bash
BACKUP_DIR="/backup/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
docker compose exec -T postgres pg_dump -U patrolmanager patrolmanager | gzip > "$BACKUP_DIR/backup_$DATE.sql.gz"
```

### Health Checks

All services include built-in health checks. Monitor with:

```bash
docker compose ps
```

---

## Useful Aliases

Add to your shell configuration (`~/.bashrc`, `~/.zshrc`):

```bash
# PatrolManager Docker aliases
alias pm-up='docker compose up -d'
alias pm-down='docker compose down'
alias pm-logs='docker compose logs -f'
alias pm-ps='docker compose ps'
alias pm-restart='docker compose restart'
alias pm-pg='docker compose exec postgres psql -U patrolmanager'
alias pm-redis='docker compose exec redis redis-cli'
```

---

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [Redis Docker Image](https://hub.docker.com/_/redis)
- [PgAdmin Docker Image](https://hub.docker.com/r/dpage/pgadmin4)

---

**Last Updated:** 2025-02-24
