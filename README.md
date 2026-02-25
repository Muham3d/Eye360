# PatrolManager

A comprehensive security guard management system with real-time tracking, incident reporting, and patrol coordination.

## Overview

PatrolManager is a full-stack security management platform consisting of:

1. **Backend API & Admin Web Panel** - Built with Express.js, PostgreSQL, and EJS/Tailwind CSS
2. **Mobile Guard App** - Native Android app built with Kotlin and Jetpack Compose

The system enables security companies to manage guards, patrol routes, incidents, and real-time operations with GPS tracking and SOS capabilities.

---

## Features

### Core Capabilities

| Feature | Description |
|---------|-------------|
| **Real-time Guard Tracking** | Live GPS positioning via Socket.io with location updates every 5 seconds |
| **Patrol Management** | Scheduled and on-demand patrol routes with NFC/QR/GPS checkpoint verification |
| **Geofencing** | GPS-based clock-in/out validation and patrol zone enforcement |
| **Incident Reporting** | Evidence-based incident management with photo attachments and workflow states |
| **SOS Alerts** | Panic button with geospatial dispatch coordination to nearby guards |
| **RBAC** | Role-based access control (Admin, Manager, Supervisor, Guard) |
| **Offline-first Mobile** | Room database with sync queue for poor connectivity scenarios |
| **Push-to-Talk** | Real-time audio communication between dispatch and guards |
| **Shift Management** | Automated clock-in/out with geofence validation |
| **Reporting Engine** | Excel/CSV exports for site performance and analytics |

---

## Tech Stack

### Backend

| Component | Technology |
|-----------|------------|
| **Framework** | Express.js 4.19+ |
| **Language** | TypeScript 5.3+ |
| **Database** | PostgreSQL 15 (Docker) |
| **ORM** | Sequelize 6.x |
| **Authentication** | Passport.js (JWT for mobile, Session for web) |
| **Real-time** | Socket.io 4.x |
| **UI** | EJS + Tailwind CSS 3.4 |
| **API Docs** | Swagger/OpenAPI 3.0 |
| **Testing** | Jest + Supertest |
| **Process Manager** | PM2 |

### Mobile (Android)

| Component | Technology |
|-----------|------------|
| **Platform** | Native Android |
| **Language** | Kotlin |
| **UI** | Jetpack Compose |
| **Architecture** | Clean Architecture + MVVM |
| **DI** | Hilt |
| **Networking** | Retrofit 2 + OkHttp 3 |
| **Local DB** | Room (offline-first with SyncQueue) |
| **Services** | Foreground Services (GPS), WorkManager (sync) |

### Infrastructure

| Component | Technology |
|-----------|------------|
| **Containerization** | Docker + Docker Compose |
| **Database** | PostgreSQL (via Docker) |
| **Optional Cache** | Redis (via Docker) |
| **Database Admin** | PgAdmin (via Docker) |

---

## Architecture

Both backend and mobile follow strict layering with core business logic completely independent from UI/framework code.

### Backend: 4-Layer Architecture

```
[EJS Views] → [Controllers] → [Services] → [Repositories] → [Sequelize]
```

**Directory Structure:**

```
backend/src/
├── core/                    # Framework-agnostic business logic
│   ├── domain/              # Entities, value objects, interfaces
│   └── services/            # Pure business logic (NO Express/Socket.io)
├── infrastructure/          # External dependencies
│   ├── database/            # Sequelize models, repositories
│   └── websocket/           # Socket.io handlers
└── interfaces/              # Boundary layer
    ├── http/                # REST controllers (thin, validation + delegation)
    └── web/                 # EJS views, web controllers
```

### Mobile: Clean Architecture

```
[Compose UI] → [ViewModels] → [Use Cases] → [Repositories] → [Data Sources]
```

**Directory Structure:**

```
mobile/app/src/main/
├── domain/                  # Pure Kotlin, NO Android imports
│   ├── model/               # Domain entities
│   ├── repository/          # Abstract interfaces
│   └── usecase/             # Business logic orchestrators
├── data/                    # Platform-specific implementations
│   ├── repository/          # Repository implementations
│   └── datasource/          # Retrofit, Room, Socket.io
└── presentation/            # Jetpack Compose UI
    └── *.ui.kt              # Screens, ViewModels
```

---

## Quick Start

### Prerequisites

| Software | Version |
|----------|---------|
| **Node.js** | 18.0.0+ |
| **npm** | 9.0.0+ |
| **PostgreSQL** | 15+ (Docker recommended) |
| **Docker** (optional) | Latest |

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/your-org/patrol-manager.git
cd patrol-manager

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Configure environment
cp .env.example .env
cp backend/.env.example backend/.env

# 4. Edit .env files with your configuration
# Generate secure secrets:
# openssl rand -hex 32  # for JWT_SECRET
# openssl rand -base64 32  # for SESSION_SECRET

# 5. Start database (Docker)
npm run docker:up

# 6. Setup database
npm run db:migrate
npm run db:seed:dev

# 7. Start development server
npm run dev
```

### Access Points

| Service | URL |
|---------|-----|
| **Admin Web Panel** | http://localhost:3000 |
| **API Documentation** | http://localhost:3000/api-docs |
| **Health Check** | http://localhost:3000/health |
| **WebSocket** | ws://localhost:3000/socket.io/ |
| **PgAdmin** (optional) | http://localhost:5050 |

---

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server with hot reload
npm run build            # Build TypeScript
npm run start            # Start production server

# Database
npm run db:create        # Create database
npm run db:migrate       # Run migrations
npm run db:seed:dev      # Seed development data
npm run db:reset         # Reset database (destructive)

# Testing
npm test                 # Run all tests
npm run test:coverage    # Run tests with coverage
npm run test:watch       # Watch mode

# CSS
npm run build:css:dev    # Build CSS for development
npm run watch:css        # Watch CSS changes

# Docker
npm run docker:up        # Start PostgreSQL
npm run docker:up:admin  # Start PostgreSQL + PgAdmin
npm run docker:down      # Stop all services

# Linting
npm run lint             # Run ESLint
npm run format           # Format code with Prettier
```

### Default Users (Development)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@patrolmanager.local | Admin123! |
| Manager | manager@patrolmanager.local | Manager123! |
| Supervisor | supervisor@patrolmanager.local | Supervisor123! |
| Guard | guard@patrolmanager.local | Guard123! |

---

## Documentation

| Document | Description |
|----------|-------------|
| [**SETUP.md**](./SETUP.md) | Complete developer setup guide |
| [**CONTRIBUTING.md**](./CONTRIBUTING.md) | Contribution guidelines and workflow |
| [**PROJECT_PLAN.md**](./PROJECT_PLAN.md) | Complete 5-phase implementation roadmap |
| [**CLAUDE.md**](./CLAUDE.md) | Project instructions for AI-assisted development |
| [**IMPLEMENTATION_PLAN.md**](./IMPLEMENTATION_PLAN.md) | Detailed implementation specifications |
| [**PHASE_GATE_EXECUTION.md**](./PHASE_GATE_EXECUTION.md) | Phase gate execution guidelines |
| [**TASK_TRACKER.md**](./TASK_TRACKER.md) | Task tracking for all phases |

### Additional Documentation

| Directory | Contents |
|-----------|----------|
| [`docs/`](./docs) | Architecture, API, database documentation |
| [`docs/api/`](./docs/api) | OpenAPI specification and API reference |
| [`docs/database/`](./docs/database) | Database schema and relationships |
| [`docs/docker/`](./docs/docker) | Docker commands and troubleshooting |
| [`docs/security/`](./docs/security) | Security best practices and audits |

---

## Development Phases

The project follows a 5-phase implementation plan:

| Phase | Status | Description |
|-------|--------|-------------|
| **Phase 1** | 🔄 In Progress | Core Foundation & Identity (RBAC, Auth, Basic Admin UI) |
| **Phase 2** | Planned | Patrol Engine & Geofencing (Sites, Checkpoints, GPS tracking) |
| **Phase 3** | Planned | Real-time Command & SOS (Socket.io, Live Dashboard) |
| **Phase 4** | Planned | Incidents & Communication (Reporting, Push-to-Talk) |
| **Phase 5** | Planned | HR, Analytics & Final Polish (Shifts, Reporting Engine) |

See [PROJECT_PLAN.md](./PROJECT_PLAN.md) for detailed specifications of each phase.

---

## Testing

| Test Type | Tool | Coverage Target |
|-----------|------|-----------------|
| **Unit Tests** | Jest | 80%+ |
| **Integration Tests** | Jest + Supertest | Critical paths |
| **E2E Tests** | Manual / Playwright | User flows |
| **Load Tests** | Artillery | Performance baselines |

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:geofence
npm run test:socket
npm run test:sos
npm run test:incident
npm run test:performance
```

---

## Deployment

### Production Setup

```bash
# 1. Set production environment
NODE_ENV=production

# 2. Build TypeScript
cd backend
npm run build

# 3. Start with PM2
pm2 start ecosystem.config.js

# 4. Enable PM2 on startup
pm2 startup
pm2 save
```

### Environment Variables

Key production variables (see `.env.example` for full list):

```bash
NODE_ENV=production
PORT=3000

# Database (use strong password)
DB_HOST=your-db-host
DB_PASSWORD=strong_production_password

# Secrets (generate with openssl)
JWT_SECRET=<32+ character random string>
SESSION_SECRET=<32+ character random string>

# CORS (set to actual frontend domain)
CORS_ORIGIN=https://your-domain.com
```

### Docker Deployment

```bash
# Build and start all services
docker compose -f docker-compose.prod.yml up -d

# View logs
docker compose logs -f
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Database connection failed** | Ensure Docker is running: `npm run docker:up` |
| **Port already in use** | Kill process or change `PORT` in `.env` |
| **Migration failed** | Run `npm run db:reset` (dev only) |
| **Tests failing** | Clear cache: `npm run test:watch -- --clearCache` |
| **Build errors** | Delete `node_modules` and reinstall |

For more troubleshooting, see:
- [SETUP.md - Troubleshooting](./SETUP.md#troubleshooting)
- [docs/troubleshooting.md](./docs/troubleshooting.md)

---

## Contributing

We welcome contributions! Please follow these guidelines:

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines
2. Fork the repository and create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass and code is formatted
5. Submit a pull request with a clear description

### Contribution Guidelines

- Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification
- Write meaningful commit messages
- Add tests for all new features
- Update documentation as needed
- Keep the [Core/UI separation principle](./CLAUDE.md#critical-design-principle-coreui-separation) in mind

---

## License

UNLICENSED - Proprietary software

All rights reserved. Unauthorized copying, distribution, or use of this software is strictly prohibited.

---

## Support

For questions, issues, or contributions:

- **Documentation**: Check the [docs](./docs) directory
- **Issues**: [GitHub Issues](https://github.com/your-org/patrol-manager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/patrol-manager/discussions)

---

## Project Status

**Current Phase:** Phase 1 - Core Foundation & Identity

**Last Updated:** 2025-02-24

**Version:** 1.0.0 (In Development)

---

## Roadmap

### Upcoming Features

- [ ] Phase 2: Patrol Engine & Geofencing
- [ ] Phase 3: Real-time Command & SOS
- [ ] Phase 4: Incidents & Communication
- [ ] Phase 5: HR, Analytics & Final Polish
- [ ] Mobile App (Android)
- [ ] iOS Mobile App (future consideration)

### Technology Evolution

- Exploring GraphQL for API queries
- Considering microservices for scalability
- Evaluating serverless options for specific functions

---

**Built with ❤️ for the security industry**
