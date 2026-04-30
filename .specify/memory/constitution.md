# PatrolManager Constitution

## Core Principles

### I. Core/UI Separation (NON-NEGOTIABLE)
Business logic MUST be completely independent from UI/framework code. UI changes MUST never require modifications to core services or use cases. The backend follows a strict 4-layer architecture: Domain → Services → Infrastructure → Interfaces. The mobile app follows Clean Architecture + MVVM with a pure-Kotlin domain layer.

### II. Repository Pattern
All database access MUST go through repository interfaces defined in `core/domain/repositories/`. Sequelize implementations live in `infrastructure/database/repositories/`. Services MUST never import Sequelize models directly.

### III. No Express in Services
Services in `core/services/` MUST NOT import Express types (`Request`, `Response`, `NextFunction`). Services receive plain DTOs and return domain objects or throw domain errors. Framework coupling is confined to the interfaces layer.

### IV. Controllers Are Thin
Controllers MUST only validate input and delegate to services. Controllers MUST NOT contain business logic, database queries, or complex conditional flows. Validation logic uses dedicated validators in `interfaces/http/validators/`.

### V. Offline-First Mobile
The mobile Android app MUST provide offline-first capability using Room database with a SyncQueue for deferred synchronization. Server-side data takes authority in sync conflicts; conflicting mobile edits MUST be flagged for manual review with both versions preserved.

### VI. No Shared Code Library
Web and mobile MUST NOT share a code library. Instead, they share an API contract via OpenAPI/Swagger specification. Business rules are documented in Architecture Decision Records (ADRs). The backend validates authoritatively; the mobile validates optimistically.

### VII. Unidirectional Dependencies
Lower layers MUST never depend on upper layers. The dependency hierarchy is: Domain ← Services ← Infrastructure ← Interfaces. Cross-cutting concerns (logging, metrics) are injected, not imported directly.

### VIII. Event-Driven Module Communication (ASPIRATIONAL)
When the plugin-based module system is implemented (future), modules SHOULD communicate via an Event Bus for cross-module notifications. Direct imports between modules SHOULD be avoided. Until the module system is implemented, services MAY call each other directly within the current layered architecture.

## Technology Stack Requirements

- **Backend**: TypeScript 5.3+, Express.js 4.19+, PostgreSQL 15, Sequelize 6.x
- **Mobile**: Kotlin, Jetpack Compose, Hilt, Retrofit 2, Room
- **Real-time**: Socket.io 4.x for WebSocket communication
- **Authentication**: Passport.js — JWT for mobile API, Express-session for Admin Web Panel
- **Testing**: Jest + Supertest (backend), target 80%+ code coverage
- **Styling**: EJS + Tailwind CSS 3.4 for the Admin Web Panel

## Quality Gates

- All RBAC-protected endpoints MUST return HTTP 403 for unauthorized users
- All API endpoints MUST have input validation
- Domain errors MUST map to consistent HTTP status codes
- Passwords MUST be stored using bcrypt hashing
- Photo evidence MUST have EXIF metadata stripped before storage
- Tests MUST be written before implementation (test-first within each user story phase)

## Governance

This constitution supersedes all other practices. Amendments require explicit documentation and approval via `/speckit.constitution`. Complexity beyond the established patterns MUST be justified in the plan's Complexity Tracking table.

**Version**: 1.0.0 | **Ratified**: 2026-02-25 | **Last Amended**: 2026-02-25
