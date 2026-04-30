# Implementation Plan: Users Module Functional Integrity

**Branch**: `001-fix-users-actions` | **Date**: 2026-03-07 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-fix-users-actions/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Fix and harden the Users module in the Admin Web Panel to ensure all list actions (view, edit, delete) work reliably, all displayed data comes from real database records (not hardcoded values), and the module follows the project's 4-layer architecture principles. This feature targets the web interface layer (EJS views, web controllers) while respecting the existing clean separation between core services and UI.

## Technical Context

**Language/Version**: TypeScript 5.3+ (backend), JavaScript (EJS views)
**Primary Dependencies**: Express.js 4.19+, EJS, Tailwind CSS 3.4, Sequelize 6.x, Passport.js
**Storage**: PostgreSQL 15
**Testing**: Jest + Supertest
**Target Platform**: Linux server (Node.js 20+)
**Project Type**: Web application (Admin Web Panel) - existing backend with 4-layer architecture
**Performance Goals**: <500ms p95 for list actions, <200ms for individual user operations
**Constraints**: Must follow existing 4-layer architecture (Domain → Services → Infrastructure → Interfaces), no Express types in services, controllers must be thin
**Scale/Scope**: ~50-200 users per tenant, 4 RBAC roles (Admin, Manager, Supervisor, Guard)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Core Principles Verification

| Principle | Status | Notes |
|-----------|--------|-------|
| **I. Core/UI Separation** | ✅ PASS | Feature targets only the interfaces layer (web controllers, EJS views). Core services remain untouched. |
| **II. Repository Pattern** | ✅ PASS | Will use existing UserRepository. No direct database access from controllers. |
| **III. No Express in Services** | ✅ PASS | Changes only in web controllers and views. Services layer already compliant. |
| **IV. Controllers Are Thin** | ✅ PASS | Web controllers will only validate and delegate to existing UserService. |
| **V. Offline-First Mobile** | ⚪ N/A | This feature is for the Admin Web Panel only. |
| **VI. No Shared Code Library** | ✅ PASS | No shared library being created. Uses existing API contract. |
| **VII. Unidirectional Dependencies** | ✅ PASS | Maintains existing dependency hierarchy. |
| **VIII. Event-Driven Module Communication** | ⚪ ASPIRATIONAL | Not applicable for this feature. |

### Technology Stack Verification

| Requirement | Status | Notes |
|-------------|--------|-------|
| TypeScript 5.3+ | ✅ PASS | Backend uses TypeScript 5.3+ |
| Express.js 4.19+ | ✅ PASS | Existing Express.js 4.19+ |
| PostgreSQL 15 | ✅ PASS | Existing PostgreSQL 15 |
| Sequelize 6.x | ✅ PASS | Existing Sequelize 6.x |
| EJS + Tailwind CSS 3.4 | ✅ PASS | Existing EJS + Tailwind CSS 3.4 |
| Jest + Supertest | ✅ PASS | Existing test framework |

### Quality Gates Verification

| Gate | Status | Notes |
|------|--------|-------|
| RBAC-protected endpoints return 403 | ✅ PASS | Will ensure all user actions respect RBAC |
| API endpoints have input validation | ✅ PASS | Will validate inputs in web controllers |
| Domain errors map to HTTP status codes | ✅ PASS | Will use existing error mapping |
| Tests written before implementation | ✅ PASS | Will follow TDD within each user story phase |

### Gate Decision: ✅ **PROCEED**

All constitution requirements are satisfied. This feature is a focused hardening of existing functionality within the established architecture patterns.

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-users-actions/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

This feature targets the existing PatrolManager backend which follows a 4-layer architecture:

```text
backend/src/
├── core/                           # Framework-agnostic business logic
│   ├── domain/
│   │   ├── entities/
│   │   │   ├── User.ts            # User domain entity
│   │   │   └── Role.ts            # Role domain entity
│   │   └── repositories/
│   │       └── IUserRepository.ts # User repository interface
│   └── services/
│       ├── UserService.ts         # User business logic (DO NOT MODIFY)
│       └── PasswordService.ts     # Password hashing logic
├── infrastructure/
│   └── database/
│       ├── models/
│       │   ├── UserModel.ts       # Sequelize User model
│       │   └── RoleModel.ts       # Sequelize Role model
│       └── repositories/
│           └── UserRepository.ts  # Sequelize implementation
└── interfaces/
    ├── http/
    │   ├── controllers/
    │   │   └── WebUserController.js   # Web user controller (TARGET FOR CHANGES)
    │   └── routes/
    │       └── index.js            # Web routes (TARGET FOR CHANGES)
    └── web/
        ├── controllers/
        │   └── WebAuthController.js  # Web auth controller (MAY NEED CHANGES)
        └── views/
            └── users/
                ├── index.ejs       # Users list view (TARGET FOR CHANGES)
                └── form.ejs        # User create/edit form (TARGET FOR CHANGES)

backend/tests/
├── integration/
│   └── web/
│       └── user-workflow.test.ts  # Integration tests for user workflows
└── unit/
    └── interfaces/
        └── web/
            └── WebUserController.test.ts  # Unit tests for web controller
```

**Structure Decision**: This feature targets only the `interfaces/web` layer (EJS views, web controllers, and web routes). The core services and domain layers remain untouched to maintain the principle of Core/UI Separation. All changes are additive (fixing bugs, removing hardcoded values) rather than architectural modifications.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
