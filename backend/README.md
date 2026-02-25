# PatrolManager Backend

Backend API and Admin Web Panel for the PatrolManager security guard management system.

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Express.js 4.19+ |
| Language | TypeScript (ES Modules) |
| Database | PostgreSQL (Docker) |
| ORM | Sequelize 6.x |
| Auth | Passport.js (JWT for mobile, Session for web) |
| Real-time | Socket.io 4.x |
| UI | EJS + Tailwind CSS 3.4 |
| API Docs | Swagger/OpenAPI 3.0 |

## Architecture

This backend follows a **4-Layer Architecture** with strict separation of concerns:

```
[EJS Views] → [Controllers] → [Services] → [Repositories] → [Sequelize]
```

### Directory Structure

```
backend/src/
├── core/                    # Framework-agnostic business logic
│   ├── domain/              # Entities, value objects, interfaces
│   └── services/            # Pure business logic (NO Express/Socket.io)
├── infrastructure/          # External dependencies
│   ├── database/            # Sequelize models, repository implementations
│   ├── config/              # Configuration
│   └── websocket/           # Socket.io handlers (delegate to services)
└── interfaces/              # Boundary layer
    ├── http/                # REST controllers (thin, validation + delegation)
    │   ├── controllers/
    │   ├── middleware/
    │   └── routes/
    └── web/                 # EJS views, web controllers
        └── views/
```

### Key Principles

| Rule | Description |
|------|-------------|
| **No Express in Services** | Services cannot import Express or Request/Response types |
| **Controllers are Thin** | Controllers only validate and delegate to services |
| **DTOs at Boundaries** | Use DTOs for API inputs/outputs, not domain entities |
| **Socket Handlers Delegate** | Socket handlers map events to service calls only |
| **Repository Pattern** | All database access through repository interfaces |

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 14+ (via Docker)
- npm 9+

### Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration

4. Run database migrations:
```bash
npm run db:migrate
```

5. Seed database (optional):
```bash
npm run db:seed
```

### Development

Run the development server with hot-reload:
```bash
npm run dev
```

### Production

Build and start:
```bash
npm run build
npm start
```

## API Documentation

When running, Swagger documentation is available at:
- http://localhost:3000/api-docs

## Admin Panel

The admin web panel is available at:
- http://localhost:3000

## Testing

Run tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## Code Quality

Lint code:
```bash
npm run lint
```

Format code:
```bash
npm run format
```

## Database Migrations

Create a new migration:
```bash
npx sequelize-cli migration:generate --name migration_name
```

Run migrations:
```bash
npm run db:migrate
```

Undo last migration:
```bash
npm run db:migrate:undo
```

## Features

### Authentication
- JWT tokens for mobile API
- Session-based authentication for admin web panel
- Role-based access control (RBAC)
- Four roles: Admin, Manager, Supervisor, Guard

### Real-time Features
- Socket.io for live guard tracking
- SOS alert broadcasting
- Dispatch coordination
- Patrol status updates

### Geofencing
- GPS-based clock-in/out validation
- Patrol checkpoint verification
- Accuracy thresholds and position age validation

### Incident Management
- Incident reporting with evidence
- Workflow states and triage
- Push notifications (via Socket.io)

## Security

- Helmet.js for security headers
- CORS configuration
- Rate limiting
- Input validation with Joi
- Bcrypt password hashing
- JWT token expiration and refresh

## Deployment

The backend is designed to be deployed with:
- PM2 for process management
- Docker for PostgreSQL
- Nginx as reverse proxy (optional)

## Environment Variables

See `.env.example` for all available configuration options.

## License

UNLICENSED
