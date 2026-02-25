# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PatrolManager is a security guard management system with real-time tracking, incident reporting, and patrol coordination. The project consists of:
- **Backend API & Admin Web Panel** - Express.js with PostgreSQL
- **Mobile Guard App** - Native Android with Kotlin

See `PROJECT_PLAN.md` for the complete 5-phase implementation roadmap and technical specifications.

## Tech Stack

### Backend
| Component | Technology |
|-----------|------------|
| Framework | Express.js 4.19+ |
| Database | PostgreSQL (Docker) |
| ORM | Sequelize 6.x |
| Auth | Passport.js (JWT for mobile, Session for web) |
| Real-time | Socket.io 4.x |
| UI | EJS + Tailwind CSS 3.4 |
| API Docs | Swagger/OpenAPI 3.0 |

### Mobile (Android)
| Component | Technology |
|-----------|------------|
| Language | Kotlin |
| UI | Jetpack Compose |
| Architecture | Clean Architecture + MVVM |
| DI | Hilt |
| Networking | Retrofit 2 + OkHttp 3 |
| Local DB | Room (offline-first with SyncQueue) |
| Services | Foreground Services (GPS), WorkManager (sync) |

## Architecture Patterns

### Critical Design Principle: Core/UI Separation

**Core Rule:** Business logic must be completely independent from UI/frontend. UI changes should never require modifications to core services or use cases.

### Backend: 4-Layer Architecture

```
[EJS Views] → [Controllers] → [Services] → [Repositories] → [Sequelize]
```

**Dependency Rule:** Unidirectional dependencies - lower layers never depend on upper layers.

#### Directory Structure

```
backend/src/
├── core/                    # Framework-agnostic business logic
│   ├── domain/              # Entities, value objects, interfaces
│   └── services/            # Pure business logic (NO Express/Socket.io)
├── infrastructure/          # External dependencies
│   ├── database/            # Sequelize models, repository implementations
│   └── websocket/           # Socket.io handlers (delegate to services)
└── interfaces/              # Boundary layer
    ├── http/                # REST controllers (thin, validation + delegation)
    └── web/                 # EJS views, web controllers
```

#### Key Rules

| Rule | Description |
|------|-------------|
| **No Express in Services** | Services cannot import `express`, Request/Response types |
| **Controllers are Thin** | Controllers only validate and delegate to services |
| **DTOs at Boundaries** | Use DTOs for API inputs/outputs, not domain entities |
| **Socket Handlers Delegate** | Socket handlers map events to service calls only |
| **Repository Pattern** | All database access through repository interfaces |

#### Backend Features

- **RBAC**: Four roles - Admin, Manager, Supervisor, Guard
- **Hybrid Authentication**: JWT tokens for mobile API, Express-session for admin web
- **Geofencing**: GPS-based clock-in/out validation and patrol checkpoint verification
- **Real-time**: Socket.io for live guard tracking and SOS/dispatch coordination

### Mobile: Clean Architecture

```
[Compose UI] → [ViewModels] → [Use Cases] → [Repositories] → [Data Sources]
```

**Dependency Rule:** Domain layer has ZERO Android framework dependencies.

#### Directory Structure

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

#### Key Rules

| Rule | Description |
|------|-------------|
| **No Android in Domain** | Domain layer has zero Android/framework imports |
| **Use Cases are Stateless** | Single-purpose classes with pure business logic |
| **ViewModels Orchestrate** | ViewModels coordinate use cases, no business logic |
| **Compose is Pure UI** | Composables only render state, no business rules |

#### Mobile Features

- **Offline-first**: Room database with SyncQueue for deferred synchronization
- **Foreground Services**: Persistent GPS tracking during active shifts
- **MVVM**: ViewModels observe use cases and emit UI state

### Shared Core Strategy

**Do NOT create a shared code library** between web and mobile. Instead:
1. Use **OpenAPI/Swagger spec** for shared API contract
2. Document business rules in **ADR (Architecture Decision Records)**
3. **Server-side authority**: Backend validates authoritatively, mobile validates optimistically

## Key Entities

- **Users**: Guards, Supervisors, Managers, Admins
- **Sites**: Locations with geofence boundaries
- **Checkpoints**: NFC/QR/GPS verification points within sites
- **PatrolTemplates**: Sequenced checkpoint routes for scheduled patrols
- **PatrolRuns**: Executed patrol instances with GPS validation
- **Incidents**: Reported events with evidence images and workflow states

## Development Phases

The project follows a 5-phase implementation plan detailed in `PROJECT_PLAN.md`:

1. **Phase 1**: Core Foundation & Identity (RBAC, Auth, Basic Admin UI)
2. **Phase 2**: Patrol Engine & Geofencing (Sites, Checkpoints, GPS tracking)
3. **Phase 3**: Real-time Command & SOS (Socket.io, Live Dashboard)
4. **Phase 4**: Incidents & Communication (Reporting, Push-to-Talk)
5. **Phase 5**: HR, Analytics & Final Polish (Shifts, Reporting Engine)

## Testing

- **Backend**: Jest + Supertest for unit/integration tests
- **Mobile**: Unit tests for ViewModels/UseCases; Compose UI tests
- **E2E**: Manual validation of SOS and Patrol flows
- **Performance**: Stress testing Socket.io with high-frequency location updates

## Deployment

- **Process Manager**: PM2 for zero-downtime reloads
- **Database Migrations**: Sequelize-CLI for version-controlled schema updates
- **Environment**: `.env` configuration for secrets and endpoints

## Multi-Agent Orchestration System

This repository includes a specialized multi-agent framework in `agents/` for orchestrating complex development tasks. Each agent is defined with a name, description, and model preference (opus/sonnet/haiku).

### Agent Categories

| Category | Agents |
|----------|--------|
| **Orchestration** | `tech-lead-orchestrator`, `context-manager`, `code-archaeologist` |
| **Architecture** | `api-architect`, `backend-architect`, `cloud-architect`, `database-optimizer`, `graphql-architect` |
| **Frontend** | `react-expert`, `nextjs-specialist`, `vue-expert`, `vue-nuxt-expert`, `tailwind-css-expert`, `ui-ux-designer` |
| **Backend** | `django-expert`, `laravel-expert`, `rails-expert` |
| **Mobile** | `mobile-developer` (React Native/Flutter) |
| **Languages** | `typescript-expert`, `python-pro`, `golang-pro`, `rust-pro` |
| **QA/Security** | `code-reviewer`, `security-auditor`, `test-automator`, `debugger`, `accessibility-specialist` |
| **DevOps** | `devops-engineer`, `database-admin` |
| **Data/AI** | `data-scientist`, `data-engineer`, `ai-engineer`, `ml-engineer`, `mlops-engineer` |
| **Specialized** | `game-developer`, `payment-integration`, `legacy-modernizer`, `blockchain-developer`, `documentation-specialist` |

### Agent Workflow

For complex missions requiring multiple specialists:

1. **Tech Lead Orchestrator** (`agents/orchestration/tech-lead-orchestrator.md`) analyzes the mission and creates a technical blueprint
2. **Context Manager** (`agents/orchestration/context-manager.md`) maintains state across multi-agent operations
3. **Specialist agents** execute their assigned tasks based on the blueprint

### Key Orchestration Rules

- Only `tech-lead-orchestrator` creates agent-list assignments for complex missions
- Specialist agents execute tasks but never create their own agent lists or delegate
- Use `@agent-name` syntax to reference specific agents
- Each agent definition includes a `model` field (opus for complex planning, sonnet for development, haiku for quick tasks)

### Note for PatrolManager

The `mobile-developer` agent specializes in cross-platform frameworks (React Native/Flutter). For this project's **native Android/Kotlin** development, you may need to adapt or extend the agent's capabilities, as the current agent focuses on cross-platform solutions rather than native Android development with Jetpack Compose.
