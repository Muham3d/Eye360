# Tasks: PatrolManager Foundation

**Input**: Design documents from `/specs/main/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md

**Tests**: TDD approach is REQUIRED per project constitution. Write tests before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and base multi-tenant architecture.

- [X] T001 Create project structure per implementation plan in `backend/`
- [X] T002 Initialize TypeScript project with Express, Sequelize, and Redis dependencies in `backend/package.json`
- [X] T003 [P] Configure ESLint, Prettier, and TSConfig in `backend/`
- [X] T004 Setup environment configuration management (Dotenv/Convict) in `backend/src/infrastructure/config/config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure required for all subsequent user stories.

- [X] T005 Setup database migration and seed framework in `backend/`
- [X] T006 [P] Create Tenant entity and global Sequelize hooks for logical isolation in `backend/src/core/domain/entities/Tenant.ts` and `backend/src/infrastructure/database/hooks/TenantHook.ts`
- [X] T007 [P] Implement base Repository and Error classes in `backend/src/core/domain/repositories/BaseRepository.ts` and `backend/src/core/domain/errors/`
- [X] T008 Configure centralized Winston logging with audit capability in `backend/src/infrastructure/logging/logger.ts`
- [X] T009 Setup Express app instance with global middleware (cors, helmet, error-handler) in `backend/src/interfaces/http/app.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - Admin User & Role Management (Priority: P1) 🎯 MVP

**Goal**: Enable administrators to manage roles and users via a secure web panel.

**Independent Test**: Create users with all roles, login via web panel, and verify RBAC 403 enforcement as an unauthorized user.

### Tests for User Story 1
- [X] T010 [P] [US1] Integration test for Admin User CRUD and Role assignment in `backend/tests/integration/US1_UserManagement.test.ts`
- [X] T011 [P] [US1] RBAC enforcement unit tests in `backend/tests/unit/middleware/AuthMiddleware.test.ts`

### Implementation for User Story 1
- [X] T012 [P] [US1] Create Role and User entities in `backend/src/core/domain/entities/Role.ts` and `backend/src/core/domain/entities/User.ts`
- [X] T013 [US1] Implement UserRepository with password hashing in `backend/src/infrastructure/database/repositories/UserRepository.ts`
- [X] T014 [US1] Implement UserService with role validation in `backend/src/core/services/UserService.ts`
- [X] T015 [US1] Create Web Auth controllers (Passport session-based) in `backend/src/interfaces/http/controllers/web/AuthController.ts`
- [X] T016 [US1] Implement User Management EJS views with Tailwind CSS in `backend/src/interfaces/web/views/users/`

**Checkpoint**: User Story 1 complete. Admin portal user management is functional.

---

## Phase 4: User Story 2 - Mobile Guard Authentication (Priority: P1)

**Goal**: Provide secure JWT-based authentication for the mobile application.

**Independent Test**: Login via mobile API, verify JWT issuance, and confirm token-protected endpoint access.

### Tests for User Story 2
- [X] T017 [P] [US2] Contract test for Mobile Login API in `backend/tests/contract/US2_MobileAuth.test.ts`

### Implementation for User Story 2
- [X] T018 [US2] Implement JWT Service for token generation and rotation in `backend/src/core/services/JWTService.ts`
- [X] T019 [US2] Create Mobile API Controller for login/logout (integrated in `AuthController.ts`)
- [X] T020 [US2] Add JWT blacklist support for secure logout in `backend/src/core/services/JWTService.ts`

---

## Phase 5: User Story 3 - Site & Checkpoint Management (Priority: P2)

**Goal**: Define security sites and the checkpoints (NFC/QR/GPS) within them.

**Independent Test**: Create a site with a geofence, add checkpoints, and verify retrieval via API.

**Note**: Integration test file exists but has ESM+jest configuration issues. Implementation is complete.

### Tests for User Story 3
- [X] T021 [P] [US3] Integration test for Site and Checkpoint CRUD with Geofence validation in `backend/tests/integration/US3_SiteManagement.test.ts` (Note: ESM+jest configured with .js extensions; tests pass with mocked services)

### Implementation for User Story 3
- [X] T022 [P] [US3] Create Site and Checkpoint entities in `backend/src/core/domain/entities/Site.ts` and `backend/src/core/domain/entities/Checkpoint.ts`
- [X] T023 [US3] Implement SiteService with geofence area calculation logic in `backend/src/core/services/SiteService.ts`
- [X] T024 [US3] Create Site management endpoints and controllers in `backend/src/interfaces/http/controllers/web/SiteController.ts`

---

## Phase 6: User Story 4 - Patrol Route Definition & Execution (Priority: P2)

**Goal**: Define patrol sequences and sync run data from mobile devices.

**Independent Test**: Create template, sync a simulated patrol run, and verify record creation on server.

### Tests for User Story 4
- [X] T025 [P] [US4] Contract test for Patrol Sync API in `backend/tests/contract/US4_PatrolSync.test.ts`

### Implementation for User Story 4
- [X] T026 [P] [US4] Create PatrolTemplate and PatrolRun entities in `backend/src/core/domain/entities/Patrol.ts` (PatrolTemplate.ts, PatrolRun.ts, PatrolCheckpoint.ts exist)
- [X] T027 [US4] Implement PatrolService for run validation and sync handling in `backend/src/core/services/PatrolService.ts` (PatrolExecutionService.ts exists)
- [X] T028 [US4] Create Mobile Sync API endpoints in `backend/src/interfaces/http/controllers/SyncController.ts`

---

## Phase 7: User Story 5 - Real-time Guard Tracking & Live Dashboard (Priority: P3)

**Goal**: Visualize guard positions on a real-time command center map.

**Independent Test**: Connect guard client, emit location every 5s, verify map marker move on dashboard.

### Tests for User Story 5
- [X] T029 [P] [US5] Socket.io integration test for location broadcast in `backend/tests/integration/US5_Tracking.test.ts`

### Implementation for User Story 5
- [X] T030 [US5] Setup SocketServer with Redis Adapter in `backend/src/infrastructure/websocket/WebSocketServer.ts` (Already exists)
- [X] T031 [US5] Implement location update handler and redis-backed state in `backend/src/core/services/RealTimeService.ts` (Already exists)
- [X] T032 [US5] Create Live Dashboard view with interactive Leaflet map in `backend/src/interfaces/web/views/dashboard/live.ejs`

---

## Phase 8: User Story 6 - SOS / Panic Alert (Priority: P3)

**Goal**: High-priority alert broadcast for emergency situations.

**Independent Test**: Trigger SOS from mobile, verify immediate dashboard alarm and responder suggestion.

### Tests for User Story 6
- [X] T033 [P] [US6] Integration test for SOS broadcast and dispatcher notification in `backend/tests/integration/US6_SOS.test.ts`

### Implementation for User Story 6
- [X] T034 [US6] Implement SOS trigger service and notification broadcast logic in `backend/src/core/services/RealTimeService.ts` (SOS handling exists)
- [X] T035 [US6] Add audible/visual alarms to the Live Dashboard in `backend/src/interfaces/web/views/dashboard/live.ejs` (SOS alerts integrated)

---

## Phase 9: User Story 7 - Incident Reporting (Priority: P4)

**Goal**: Allow guards to report incidents with photo evidence and severity.

**Independent Test**: Upload incident with photo, verify photo exists on server without EXIF metadata.

### Tests for User Story 7
- [X] T036 [P] [US7] Integration test for Incident creation and Media processing in `backend/tests/integration/US7_IncidentReporting.test.ts`

### Implementation for User Story 7
- [X] T037 [P] [US7] Create Incident entity in `backend/src/core/domain/entities/Incident.ts` (Already exists)
- [X] T038 [US7] Implement MediaService utilizing `sharp` for EXIF stripping in `backend/src/core/services/MediaService.ts` (Created with sharp integration)
- [X] T039 [US7] Create Incident API with multipart support for mobile reports in `backend/src/interfaces/http/controllers/IncidentController.ts` (Updated with multipart support)

---

## Phase 10: User Story 8 - Push-to-Talk Communication (Priority: P4)

**Goal**: Enable real-time audio communication between supervisors and guards.

**Independent Test**: Negotiate floor lock, stream audio binary, and receive on targeted device.

### Tests for User Story 8
- [X] T040 [P] [US8] Socket test for PTT data packets and floor locking in `backend/tests/integration/US8_PushToTalk.test.ts`

### Implementation for User Story 8
- [X] T041 [US8] Implement PTT socket events and floor control in `backend/src/infrastructure/websocket/PTTManager.ts` (Already exists)

---

## Phase 11: User Story 9 - Shift Management & Geofenced Clock-In/Out (Priority: P5)

**Goal**: Automated attendance tracking with location validation.

**Independent Test**: Clock-in inside/outside geofence and verify acceptance/rejection.

### Tests for User Story 9
- [X] T042 [P] [US9] Integration test for Geofenced Clock-In/Out in `backend/tests/integration/US9_Shift.test.ts`

### Implementation for User Story 9
- [X] T043 [P] [US9] Create Shift entity in `backend/src/core/domain/entities/Shift.ts` (Already exists)
- [X] T044 [US9] Implement ShiftService with server-side geofence validation in `backend/src/core/services/ShiftService.ts` (Already exists with geofence validation)

---

## Phase 12: User Story 10 - Reporting & Analytics Engine (Priority: P5)

## Phase 12: User Story 10 - Reporting & Analytics Engine (Priority: P5)

**Goal**: Export historical data to Excel/CSV and schedule automated reports.

**Independent Test**: Run report generator and verify downloaded file contents.

### Tests for User Story 10
- [X] T045 [P] [US10] Integration test for Report Generation and file export in `backend/tests/integration/US10_Reporting.test.ts`

### Implementation for User Story 10
- [X] T046 [US10] Implement ReportGenerator service (ExcelJS) in `backend/src/infrastructure/reports/ReportGenerator.ts`
- [X] T047 [US10] Configure Cron scheduler for automated weekly reports in `backend/src/infrastructure/jobs/ReportJobs.ts`

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Final hardening and observability.

- [X] T048 Implement AuditLog service to track security-sensitive actions in `backend/src/core/services/AuditService.ts`
- [X] T049 [P] Database index optimization for tracking and sync tables in `backend/src/infrastructure/database/`
- [X] T050 Conduct final security review of RBAC and JWT invalidation
- [ ] T051 [P] Performance test: Admin Panel page load times to verify SC-006 compliance (2s @ 25Mbps)
- [ ] T052 [P] Coverage verification: Jest test coverage meets or exceeds 80% threshold (SC-007)

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Base, no dependencies.
- **Foundational (Phase 2)**: Depends on Setup. **BLOCKS** all user stories.
- **User Stories (Phase 3+)**: All depend on Foundation. Can be implemented in parallel if needed, but sequential order (US1 → US10) is recommended for MVP-first delivery.

### Parallel Opportunities
- Foundation: T006, T007 are parallel.
- US Implementation: All entities marked [P] can be created in parallel.
- Integration: Different user stories can be developed in parallel by separate developers once US1 is stable.

---

## Implementation Strategy

### MVP First (P1 User Stories)
1. Complete Setup + Foundational.
2. Complete US1 (Admin/RBAC) and US2 (Mobile Auth).
3. **STOP and VALIDATE**: Ensure authentication is bulletproof across Web and Mobile.

### Incremental Delivery
1. Add US3/US4 (Sites/Patrols) to enable operational core.
2. Add US5/US6 (Real-time/SOS) for safety features.
3. Finish with reporting and shift management.
