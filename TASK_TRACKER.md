# PatrolManager Task Documentation Tracker

**Project:** PatrolManager - Security Guard Management System
**Goal:** Build and test the full product from scratch to live production
**Document Version:** 1.0
**Last Updated:** 2026-02-23

---

## Task Status Legend

| Status | Icon | Description |
|--------|------|-------------|
| Pending | `pending` | Task not yet started |
| In Progress | `in_progress` | Task currently being worked on |
| Completed | `completed` | Task finished and verified |
| Blocked | `blocked` | Task waiting on dependency |

---

## Agent Roster Reference

### Orchestration Agents
- `@tech-lead-orchestrator` - Technical architect and mission planner
- `@context-manager` - State tracking across multi-agent operations
- `@code-archaeologist` - Codebase analysis and documentation

### Architecture Agents
- `@api-architect` - API design and OpenAPI/Swagger contracts
- `@backend-architect` - Server-side architecture design
- `@cloud-architect` - Infrastructure and deployment architecture
- `@database-optimizer` - Database schema design and optimization
- `@graphql-architect` - GraphQL schemas (if needed)

### Language Specialists
- `@typescript-expert` - TypeScript development (Backend Node.js)
- `@python-pro` - Python utilities and testing scripts
- `@golang-pro` - Go microservices (if needed)
- `@rust-pro` - Rust performance-critical modules (if needed)

### Frontend Development
- `@tailwind-css-expert` - Tailwind CSS styling
- `@ui-ux-designer` - User interface design

### Backend Development
- Note: Express.js specialists will use `@typescript-expert` + `@backend-architect`

### Mobile Development
- `@mobile-developer` - Cross-platform (Note: Native Android/Kotlin requires adaptation)

### Quality Assurance
- `@code-reviewer` - Code quality and best practices review
- `@security-auditor` - Security assessment and vulnerability scanning
- `@test-automator` - Test suite creation and automation
- `@debugger` - Bug investigation and resolution
- `@accessibility-specialist` - A11y compliance for web UI

### DevOps & Infrastructure
- `@devops-engineer` - CI/CD, Docker, deployment automation
- `@database-admin` - Database operations and migrations

### Documentation
- `@documentation-specialist` - Technical documentation and API docs

---

## Phase 1: Core Foundation & Identity

### Overview
Establish the foundational architecture, authentication system, and basic admin interface.

---

### 1.1 Project Initialization & Architecture Design

#### Task 1.1.1: Repository Structure & Tooling Setup
```
ID: P1-T1-001
Status: pending
Priority: Critical
Agent: @backend-architect, @devops-engineer
Effort: 4 hours
```

**Description:**
- Initialize monorepo structure with `backend/` and `mobile/` directories
- Configure ESLint, Prettier for backend
- Setup Git hooks with Husky for pre-commit validation
- Create initial directory structure following 4-layer architecture

**Dependencies:** None

**Deliverables:**
- Monorepo structure with separate backend and mobile folders
- Shared `.editorconfig`, `.eslintignore`, `.prettierignore`
- Husky pre-commit hooks configured
- README with project structure documentation

**Acceptance Criteria:**
- [ ] Repository follows CLAUDE.md architecture patterns
- [ ] Linting runs without errors
- [ ] Git hooks are active and functional

---

#### Task 1.1.2: Database Schema Design
```
ID: P1-T1-002
Status: pending
Priority: Critical
Agent: @database-optimizer
Effort: 8 hours
```

**Description:**
- Design PostgreSQL schema for core entities (Users, Roles, Permissions)
- Define relationships and constraints
- Create Sequelize models following repository pattern
- Design migration strategy

**Dependencies:** P1-T1-001

**Deliverables:**
- ERD diagram for core entities
- Sequelize model definitions
- Initial migration files
- Repository interface definitions

**Acceptance Criteria:**
- [ ] RBAC properly modeled with 4 roles
- [ ] Foreign key relationships defined
- [ ] Indexes created for frequently queried fields
- [ ] Migrations can run up/down successfully

---

#### Task 1.1.3: API Contract Specification
```
ID: P1-T1-003
Status: pending
Priority: Critical
Agent: @api-architect
Effort: 6 hours
```

**Description:**
- Design RESTful API contract using OpenAPI 3.0
- Define authentication endpoints (JWT for mobile, session for web)
- Define user management endpoints
- Specify error response formats

**Dependencies:** P1-T1-002

**Deliverables:**
- OpenAPI 3.0 specification file
- API endpoint documentation
- Request/response DTO specifications
- Error code reference

**Acceptance Criteria:**
- [ ] All auth endpoints documented
- [ ] User CRUD endpoints documented
- [ ] Standardized error format defined
- [ ] Swagger UI can render the spec

---

### 1.2 Backend Core Implementation

#### Task 1.2.1: Express.js Server Setup
```
ID: P1-T2-001
Status: pending
Priority: Critical
Agent: @typescript-expert
Effort: 6 hours
```

**Description:**
- Setup Express.js 4.19+ server with TypeScript
- Configure environment variables with dotenv
- Setup Winston for logging
- Implement 4-layer architecture skeleton

**Dependencies:** P1-T1-001, P1-T1-003

**Deliverables:**
- Configured Express server with TypeScript
- Environment configuration module
- Structured logging setup
- Layer skeleton (core/infrastructure/interfaces)

**Acceptance Criteria:**
- [ ] Server starts without errors
- [ ] TypeScript compilation succeeds
- [ ] Environment variables properly loaded
- [ ] Logs output to console and file

---

#### Task 1.2.2: PostgreSQL & Docker Integration
```
ID: P1-T2-002
Status: pending
Priority: Critical
Agent: @devops-engineer, @database-admin
Effort: 4 hours
```

**Description:**
- Create Docker Compose configuration for PostgreSQL
- Configure Sequelize connection
- Setup database seeding for development
- Configure connection pooling

**Dependencies:** P1-T1-002, P1-T2-001

**Deliverables:**
- `docker-compose.yml` with PostgreSQL service
- Sequelize configuration
- Development seed data script
- Connection pool configuration

**Acceptance Criteria:**
- [ ] PostgreSQL starts via Docker Compose
- [ ] Sequelize connects successfully
- [ ] Seed data populates tables
- [ ] Connection pool properly configured

---

#### Task 1.2.3: Repository Implementation
```
ID: P1-T2-003
Status: pending
Priority: High
Agent: @typescript-expert
Effort: 8 hours
```

**Description:**
- Implement repository pattern for User entity
- Create repository interfaces in core/domain
- Implement Sequelize-based repositories in infrastructure/database
- Add transaction support

**Dependencies:** P1-T1-002, P1-T2-002

**Deliverables:**
- UserRepository interface
- SequelizeUserRepository implementation
- Base repository class with common operations
- Transaction management utilities

**Acceptance Criteria:**
- [ ] CRUD operations work for Users
- [ ] Transactions properly rollback on error
- [ ] Repository implements defined interface
- [ ] No SQL injection vulnerabilities

---

#### Task 1.2.4: Authentication Service
```
ID: P1-T2-004
Status: pending
Priority: Critical
Agent: @typescript-expert, @security-auditor
Effort: 10 hours
```

**Description:**
- Implement JWT token generation/validation for mobile
- Implement session management for web admin
- Create Passport.js strategies
- Implement password hashing with bcrypt
- Add refresh token support

**Dependencies:** P1-T2-003

**Deliverables:**
- AuthService in core/services
- JWT and Session Passport strategies
- Password hashing utilities
- Token refresh logic

**Acceptance Criteria:**
- [ ] JWT tokens signed and verified correctly
- [ ] Sessions stored securely
- [ ] Passwords hashed with bcrypt (cost factor >= 10)
- [ ] Refresh tokens work correctly
- [ ] Token expiration properly enforced

---

#### Task 1.2.5: User Management Service
```
ID: P1-T2-005
Status: pending
Priority: High
Agent: @typescript-expert
Effort: 6 hours
```

**Description:**
- Implement User service with business logic
- Add role-based permission checks
- Implement user creation, update, deletion
- Add password reset functionality

**Dependencies:** P1-T2-003, P1-T2-004

**Deliverables:**
- UserService in core/services
- Permission checking utilities
- Password reset token generation
- User validation logic

**Acceptance Criteria:**
- [ ] Business logic independent of Express
- [ ] Role checks enforced correctly
- [ ] Validation prevents invalid data
- [ ] Password reset tokens are secure

---

#### Task 1.2.6: HTTP Controllers
```
ID: P1-T2-006
Status: pending
Priority: High
Agent: @typescript-expert
Effort: 6 hours
```

**Description:**
- Create thin controllers for auth and user endpoints
- Implement request validation middleware
- Add error handling middleware
- Map routes to controllers

**Dependencies:** P1-T2-004, P1-T2-005, P1-T1-003

**Deliverables:**
- AuthController with login/register endpoints
- UserController with CRUD endpoints
- Validation schemas using Joi/Zod
- Error handling middleware

**Acceptance Criteria:**
- [ ] Controllers only validate and delegate
- [ ] No business logic in controllers
- [ ] Validation returns clear error messages
- [ ] Errors handled consistently

---

### 1.3 Admin Web Interface

#### Task 1.3.1: EJS & Tailwind Setup
```
ID: P1-T3-001
Status: pending
Priority: High
Agent: @tailwind-css-expert, @ui-ux-designer
Effort: 4 hours
```

**Description:**
- Setup EJS templating engine
- Configure Tailwind CSS 3.4
- Create base layout template
- Design navigation component

**Dependencies:** P1-T2-001

**Deliverables:**
- EJS configuration
- Tailwind CSS build setup
- Base layout template
- Navigation component

**Acceptance Criteria:**
- [ ] EJS renders templates correctly
- [ ] Tailwind styles apply
- [ ] Layout responsive on desktop/tablet
- [ ] Navigation active state works

---

#### Task 1.3.2: Login & Auth Pages
```
ID: P1-T3-002
Status: pending
Priority: Critical
Agent: @ui-ux-designer, @tailwind-css-expert
Effort: 6 hours
```

**Description:**
- Design login page UI
- Implement session-based auth flow
- Add protected route middleware
- Create logout functionality

**Dependencies:** P1-T3-001, P1-T2-006

**Deliverables:**
- Login page EJS template
- Auth middleware for protected routes
- Logout endpoint
- Session management UI

**Acceptance Criteria:**
- [ ] Login form validates input
- [ ] Successful login redirects to dashboard
- [ ] Protected routes redirect unauthenticated users
- [ ] Logout clears session

---

#### Task 1.3.3: User Management Dashboard
```
ID: P1-T3-003
Status: pending
Priority: High
Agent: @ui-ux-designer, @tailwind-css-expert
Effort: 10 hours
```

**Description:**
- Design user list view with filters
- Create user add/edit forms
- Implement delete confirmation modal
- Add role assignment UI

**Dependencies:** P1-T3-002, P1-T2-006

**Deliverables:**
- User list page with pagination
- User create/edit form
- Delete confirmation modal
- Role assignment component

**Acceptance Criteria:**
- [ ] Users display in table with sorting
- [ ] Create/edit forms validate inputs
- [ ] Delete requires confirmation
- [ ] Roles can be assigned/changed

---

### 1.4 Phase 1 Testing & Quality Assurance

#### Task 1.4.1: Backend Unit Tests
```
ID: P1-T4-001
Status: pending
Priority: High
Agent: @test-automator
Effort: 12 hours
```

**Description:**
- Setup Jest for backend testing
- Write unit tests for services
- Write integration tests for controllers
- Mock external dependencies

**Dependencies:** P1-T2-006

**Deliverables:**
- Jest configuration
- Service unit tests (>80% coverage)
- Controller integration tests
- Test utilities and mocks

**Acceptance Criteria:**
- [ ] All tests pass
- [ ] Service coverage > 80%
- [ ] Controller tests cover happy and error paths
- [ ] Tests run in < 30 seconds

---

#### Task 1.4.2: Security Audit
```
ID: P1-T4-002
Status: pending
Priority: Critical
Agent: @security-auditor
Effort: 6 hours
```

**Description:**
- Audit authentication implementation
- Check for common vulnerabilities (OWASP Top 10)
- Review password security
- Test for SQL injection, XSS

**Dependencies:** P1-T2-006

**Deliverables:**
- Security audit report
- Vulnerability findings with severity
- Remediation recommendations
- Security best practices doc

**Acceptance Criteria:**
- [ ] No critical vulnerabilities
- [ ] All high severity issues addressed
- [ ] Passwords properly hashed
- [ ] Input validation on all endpoints

---

#### Task 1.4.3: Code Review
```
ID: P1-T4-003
Status: pending
Priority: High
Agent: @code-reviewer
Effort: 4 hours
```

**Description:**
- Review code against architecture patterns
- Check TypeScript best practices
- Verify layer separation
- Review error handling

**Dependencies:** P1-T2-006

**Deliverables:**
- Code review report
- Improvement recommendations
- Architecture compliance checklist
- Approved/rejected items

**Acceptance Criteria:**
- [ ] No Express imports in services
- [ ] Controllers are thin (<50 lines)
- [ ] Repository pattern followed
- [ ] TypeScript strict mode compliance

---

### 1.5 Phase 1 Documentation

#### Task 1.5.1: API Documentation
```
ID: P1-T5-001
Status: pending
Priority: High
Agent: @documentation-specialist
Effort: 4 hours
```

**Description:**
- Generate Swagger documentation
- Create API usage examples
- Document authentication flows
- Add error response examples

**Dependencies:** P1-T2-006, P1-T1-003

**Deliverables:**
- Swagger UI accessible at /api-docs
- API usage guide
- Authentication flow diagram
- Error reference

**Acceptance Criteria:**
- [ ] Swagger UI renders correctly
- [ ] All endpoints documented
- [ ] Examples are accurate
- [ ] Auth flows clearly explained

---

#### Task 1.5.2: Developer Setup Guide
```
ID: P1-T5-002
Status: pending
Priority: Medium
Agent: @documentation-specialist
Effort: 3 hours
```

**Description:**
- Create local development setup guide
- Document Docker commands
- Add troubleshooting section
- Create contribution guidelines

**Dependencies:** P1-T2-002

**Deliverables:**
- SETUP.md guide
- Docker quick reference
- Troubleshooting FAQ
- CONTRIBUTING.md

**Acceptance Criteria:**
- [ ] New developer can setup from guide
- [ ] All commands tested
- [ ] Common issues documented
- [ ] Code style defined

---

## Phase 2: Patrol Engine & Geofencing

### Overview
Implement the core patrol functionality with sites, checkpoints, and GPS tracking.

---

### 2.1 Domain Modeling

#### Task 2.1.1: Patrol Domain Design
```
ID: P2-T1-001
Status: pending
Priority: Critical
Agent: @backend-architect, @database-optimizer
Effort: 8 hours
```

**Description:**
- Design domain entities: Sites, Checkpoints, PatrolTemplates, PatrolRuns
- Define geofence boundaries structure
- Design GPS validation logic
- Create checkpoint verification types (NFC/QR/GPS)

**Dependencies:** Phase 1 complete

**Deliverables:**
- Domain entity specifications
- Geofence boundary schema
- GPS validation algorithm
- Checkpoint verification types

**Acceptance Criteria:**
- [ ] All entities properly related
- [ ] Geofence supports polygon shapes
- [ ] GPS validation accounts for accuracy
- [ ] Checkpoint types extensible

---

#### Task 2.1.2: Database Schema Extension
```
ID: P2-T1-002
Status: pending
Priority: Critical
Agent: @database-optimizer
Effort: 6 hours
```

**Description:**
- Create Sequelize models for patrol entities
- Add spatial indexes for GPS fields
- Create migrations for new tables
- Add PostGIS extension for geospatial queries

**Dependencies:** P2-T1-001

**Deliverables:**
- Sequelize models for Sites, Checkpoints, PatrolTemplates, PatrolRuns
- Database migrations
- Spatial index definitions
- PostGIS setup script

**Acceptance Criteria:**
- [ ] All models created
- [ ] Spatial indexes on GPS fields
- [ ] Migrations run cleanly
- [ ] PostGIS functions available

---

#### Task 2.1.3: Patrol API Specification
```
ID: P2-T1-003
Status: pending
Priority: High
Agent: @api-architect
Effort: 6 hours
```

**Description:**
- Design REST API for patrol management
- Define GPS update endpoints
- Specify checkpoint verification API
- Document geofence validation endpoints

**Dependencies:** P2-T1-001

**Deliverables:**
- OpenAPI specification update
- GPS endpoint contracts
- Checkpoint verification API
- Geofence validation API

**Acceptance Criteria:**
- [ ] All patrol endpoints documented
- [ ] GPS data format specified
- [ ] Verification flows documented
- [ ] Error cases covered

---

### 2.2 Backend Implementation

#### Task 2.2.1: Patrol Repositories
```
ID: P2-T2-001
Status: pending
Priority: High
Agent: @typescript-expert
Effort: 10 hours
```

**Description:**
- Implement repository classes for patrol entities
- Add geospatial query methods
- Implement transaction support for patrol runs
- Create checkpoint lookup queries

**Dependencies:** P2-T1-002

**Deliverables:**
- SiteRepository, CheckpointRepository, PatrolTemplateRepository, PatrolRunRepository
- Geospatial query implementations
- Transaction handlers
- Query optimization

**Acceptance Criteria:**
- [ ] CRUD operations for all entities
- [ ] Geospatial queries use PostGIS
- [ ] Transactions work correctly
- [ ] Queries optimized with indexes

---

#### Task 2.2.2: Geofencing Service
```
ID: P2-T2-002
Status: completed
Priority: Critical
Agent: @typescript-expert
Effort: 12 hours
```

**Description:**
- Implement point-in-polygon validation
- Add GPS accuracy filtering
- Create geofence breach detection
- Implement buffer zone calculations

**Dependencies:** Phase 1 complete

**Deliverables:**
- GeofenceService in core/services
- Point-in-polygon algorithm
- GPS accuracy validator
- Breach detection logic

**Acceptance Criteria:**
- [x] Point-in-polygon accurate
- [x] Low-accuracy GPS rejected
- [x] Breach detection triggers correctly
- [x] Buffer zones calculated properly

---

#### Task 2.2.3: Patrol Execution Service
```
ID: P2-T2-003
Status: completed
Priority: Critical
Agent: @typescript-expert
Effort: 14 hours
```

**Description:**
- Implement patrol run initialization
- Create checkpoint sequence validation
- Add GPS-based checkpoint verification
- Implement patrol completion logic
- Handle missed checkpoints

**Dependencies:** P2-T2-001, P2-T2-002

**Deliverables:**
- PatrolExecutionService
- Sequence validator
- GPS verification handler
- Completion calculator

**Acceptance Criteria:**
- [x] Patrols initialize correctly
- [x] Sequences enforced
- [x] GPS verification accurate
- [x] Completion status calculated
- [x] Missed checkpoints tracked

---

#### Task 2.2.4: Checkpoint Verification Service
```
ID: P2-T2-004
Status: completed
Priority: High
Agent: @typescript-expert
Effort: 10 hours
```

**Description:**
- Implement NFC code verification
- Add QR code validation
- Create GPS-based verification
- Support multiple verification types
- Add anti-cheat measures

**Dependencies:** P2-T2-003

**Deliverables:**
- CheckpointVerificationService
- NFC validation logic
- QR validation logic
- GPS proximity validation
- Anti-cheat algorithms

**Acceptance Criteria:**
- [x] NFC codes validate correctly
- [x] QR codes verified securely
- [x] GPS proximity accurate
- [x] Multiple types supported
- [x] Anti-cheat prevents spoofing

---

#### Task 2.2.5: Patrol Controllers
```
ID: P2-T2-005
Status: completed
Priority: High
Agent: @typescript-expert
Effort: 8 hours
```

**Description:**
- Create controllers for patrol management
- Implement GPS update endpoints
- Add checkpoint verification endpoints
- Create patrol history queries

**Dependencies:** P2-T2-003, P2-T2-004, P2-T1-003

**Deliverables:**
- PatrolManagementController
- GPSUpdateController
- CheckpointVerificationController
- Validation middleware

**Acceptance Criteria:**
- [x] All endpoints functional
- [x] GPS updates accepted
- [x] Checkpoints verify correctly
- [x] History queries work
- [x] Input validation complete

---

### 2.3 Admin Web Interface

#### Task 2.3.1: Site Management UI
```
ID: P2-T3-001
Status: completed
Priority: High
Agent: @ui-ux-designer, @tailwind-css-expert
Effort: 12 hours
```

**Description:**
- Design site list and detail views
- Create geofence drawing interface
- Add site form with map integration
- Implement site CRUD operations

**Dependencies:** P2-T2-005

**Deliverables:**
- Site list page
- Site detail page with map
- Geofence drawing component
- Site create/edit forms

**Acceptance Criteria:**
- [x] Sites display in list
- [x] Map shows geofence
- [x] Drawing interface works
- [x] CRUD operations functional

---

#### Task 2.3.2: Checkpoint Management UI
```
ID: P2-T3-002
Status: completed
Priority: High
Agent: @ui-ux-designer, @tailwind-css-expert
Effort: 10 hours
```

**Description:**
- Design checkpoint list with site filtering
- Create checkpoint form with verification type selection
- Add QR/NFC code generation
- Implement checkpoint map placement

**Dependencies:** P2-T3-001

**Deliverables:**
- Checkpoint list page
- Checkpoint form
- QR/NFC code generator
- Map placement component

**Acceptance Criteria:**
- [x] Checkpoints filtered by site
- [x] Form supports all types
- [x] Codes generate correctly
- [x] Map placement accurate

---

#### Task 2.3.3: Patrol Template Designer
```
ID: P2-T3-003
Status: completed
Priority: High
Agent: @ui-ux-designer, @tailwind-css-expert
Effort: 14 hours
```

**Description:**
- Design template list view
- Create template builder with drag-drop sequencing
- Add time window configuration
- Implement template preview

**Dependencies:** P2-T3-002

**Deliverables:**
- Template list page
- Template builder UI
- Sequence editor
- Time picker component
- Template preview

**Acceptance Criteria:**
- [x] Templates display correctly
- [x] Drag-drop works smoothly
- [x] Sequencing enforced
- [x] Time windows configurable
- [x] Preview accurate

---

### 2.4 Mobile Foundation

#### Task 2.4.1: Android Project Setup
```
ID: P2-T4-001
Status: completed
Priority: Critical
Agent: @mobile-developer (adapted for Native Android/Kotlin)
Effort: 8 hours
```

**Description:**
- Initialize Android project with Kotlin
- Setup Jetpack Compose
- Configure Hilt for DI
- Setup Navigation Compose

**Dependencies:** Phase 1 complete

**Deliverables:**
- Android project structure
- Gradle configuration
- Hilt modules
- Navigation graph

**Acceptance Criteria:**
- [x] Project builds without errors
- [x] Compose UI renders
- [x] Hilt injection works
- [x] Navigation functional

---

#### Task 2.4.2: Mobile Architecture Setup
```
ID: P2-T4-002
Status: completed
Priority: Critical
Agent: @mobile-developer (adapted for Native Android/Kotlin)
Effort: 10 hours
```

**Description:**
- Implement Clean Architecture structure
- Create domain layer (entities, repositories, use cases)
- Setup data layer (data sources, repositories)
- Create presentation layer foundation

**Dependencies:** P2-T4-001

**Deliverables:**
- Domain layer structure
- Data layer structure
- Presentation layer structure
- Base classes for each layer

**Acceptance Criteria:**
- [x] Domain has no Android imports
- [x] Data implements repositories
- [x] Presentation uses Compose
- [x] Layers properly separated

---

#### Task 2.4.3: Room Database Setup
```
ID: P2-T4-003
Status: completed
Priority: High
Agent: @mobile-developer (adapted for Native Android/Kotlin)
Effort: 8 hours
```

**Description:**
- Setup Room database
- Create entities for offline storage
- Implement DAOs
- Setup database migrations

**Dependencies:** P2-T4-002

**Deliverables:**
- Room database configuration
- Entity definitions
- DAO interfaces
- Migration plans

**Acceptance Criteria:**
- [x] Database creates successfully
- [x] DAOs work correctly
- [x] Migrations handle changes
- [x] Offline storage functional

---

#### Task 2.4.4: Retrofit & API Integration
```
ID: P2-T4-004
Status: completed
Priority: High
Agent: @mobile-developer (adapted for Native Android/Kotlin)
Effort: 10 hours
```

**Description:**
- Setup Retrofit with OkHttp
- Create API interfaces
- Implement authentication interceptors
- Add network error handling

**Dependencies:** P2-T4-002

**Deliverables:**
- Retrofit configuration
- API service interfaces
- Auth interceptor
- Error handler

**Acceptance Criteria:**
- [x] API calls successful
- [x] JWT tokens attached
- [x] Errors handled gracefully
- [x] Network state monitored

---

#### Task 2.4.5: SyncQueue Implementation
```
ID: P2-T4-005
Status: completed
Priority: Critical
Agent: @mobile-developer (adapted for Native Android/Kotlin)
Effort: 12 hours
```

**Description:**
- Implement SyncQueue for offline operations
- Create queue persistence with Room
- Add conflict resolution logic
- Implement retry mechanism

**Dependencies:** P2-T4-003, P2-T4-004

**Deliverables:**
- SyncQueue implementation
- Queue entity and DAO
- Conflict resolver
- Retry handler

**Acceptance Criteria:**
- [x] Operations queue offline
- [x] Sync executes when online
- [x] Conflicts resolved correctly
- [x] Retry works with backoff

---

#### Task 2.4.6: Login & Profile Screens
```
ID: P2-T4-006
Status: completed
Priority: High
Agent: @mobile-developer (adapted for Native Android/Kotlin), @ui-ux-designer
Effort: 12 hours
```

**Description:**
- Create login screen with Compose
- Implement JWT storage
- Create profile screen
- Add logout functionality

**Dependencies:** P2-T4-004

**Deliverables:**
- Login Compose screen
- JWT secure storage
- Profile screen
- Logout handler

**Acceptance Criteria:**
- [x] Login validates credentials
- [x] JWT stored securely
- [x] Profile displays user info
- [x] Logout clears data

---

### 2.5 GPS & Patrol Mobile Features

#### Task 2.5.1: Foreground Service for GPS
```
ID: P2-T5-001
Status: completed
Priority: Critical
Agent: @mobile-developer (adapted for Native Android/Kotlin)
Effort: 14 hours
```

**Description:**
- Implement foreground service for GPS tracking
- Setup location updates with FusedLocationProvider
- Add notification for active tracking
- Implement battery optimization handling

**Dependencies:** P2-T4-006

**Deliverables:**
- Foreground service
- Location manager
- Notification setup
- Battery optimization handler

**Acceptance Criteria:**
- [x] Service runs during shifts
- [x] Location updates received
- [x] Notification displays
- [x] Battery optimization handled

---

#### Task 2.5.2: Checkpoint Scanning
```
ID: P2-T5-002
Status: completed
Priority: High
Agent: @mobile-developer (adapted for Native Android/Kotlin)
Effort: 16 hours
```

**Description:**
- Implement NFC scanning
- Add QR code scanning with camera
- Create GPS-based verification
- Design checkpoint scan UI

**Dependencies:** P2-T5-001

**Deliverables:**
- NFC scanner
- QR scanner
- GPS verifier
- Scan UI screens

**Acceptance Criteria:**
- [x] NFC reads tags
- [x] QR scans correctly
- [x] GPS verifies proximity
- [x] UI guides user

---

#### Task 2.5.3: Patrol Run Execution
```
ID: P2-T5-003
Status: completed
Priority: Critical
Agent: @mobile-developer (adapted for Native Android/Kotlin)
Effort: 18 hours
```

**Description:**
- Create patrol run screen
- Implement sequence progress tracking
- Add checkpoint list with status
- Handle offline scanning with SyncQueue

**Dependencies:** P2-T5-002, P2-T4-005

**Deliverables:**
- Patrol run screen
- Progress tracker
- Checkpoint list
- Offline handler

**Acceptance Criteria:**
- [x] Patrol starts correctly
- [x] Progress updates
- [x] Checkpoints mark complete
- [x] Offline scans queue

---

### 2.6 Phase 2 Testing

#### Task 2.6.1: Geofencing Tests
```
ID: P2-T6-001
Status: completed
Priority: High
Agent: @test-automator
Effort: 10 hours
```

**Description:**
- Test point-in-polygon accuracy
- Test GPS accuracy filtering
- Test geofence breach detection
- Test edge cases (boundary, poles)

**Dependencies:** P2-T2-002

**Deliverables:**
- Geofence test suite
- GPS mock data
- Edge case tests
- Performance benchmarks

**Acceptance Criteria:**
- [x] All tests pass
- [x] Edge cases handled
- [x] Performance acceptable
- [x] Accuracy verified

---

#### Task 2.6.2: Patrol Flow Tests
```
ID: P2-T6-002
Status: completed
Priority: High
Agent: @test-automator
Effort: 12 hours
```

**Description:**
- Test patrol run lifecycle
- Test checkpoint verification
- Test sequence validation
- Test completion calculation

**Dependencies:** P2-T2-003, P2-T2-004

**Deliverables:**
- Patrol flow tests
- Verification tests
- Sequence tests
- Completion tests

**Acceptance Criteria:**
- [x] Lifecycle correct
- [x] Verification accurate
- [x] Sequences enforced
- [x] Completion calculated

---

#### Task 2.6.3: Mobile Tests
```
ID: P2-T6-003
Status: completed
Priority: High
Agent: @test-automator
Effort: 14 hours
```

**Description:**
- Write ViewModel tests
- Write use case tests
- Test SyncQueue behavior
- Test offline/online transitions

**Dependencies:** P2-T5-003

**Deliverables:**
- ViewModel test suite
- Use case tests
- SyncQueue tests
- Transition tests

**Acceptance Criteria:**
- [x] ViewModels tested
- [x] Use cases verified
- [x] SyncQueue works
- [x] Transitions handled

---

#### Task 2.6.4: Security Audit
```
ID: P2-T6-004
Status: completed
Priority: Critical
Agent: @security-auditor
Effort: 8 hours
```

**Description:**
- Audit GPS spoofing protection
- Test checkpoint verification security
- Review offline data security
- Check for location tampering

**Dependencies:** P2-T5-003

**Deliverables:**
- Security audit report
- Vulnerability findings
- Anti-cheat verification
- Security recommendations

**Acceptance Criteria:**
- [x] GPS spoofing prevented
- [x] Checkpoints secure
- [x] Offline data encrypted
- [x] Tampering detected

---

## Phase 3: Real-time Command & SOS

### Overview
Implement real-time tracking with Socket.io and SOS panic button functionality.

---

### 3.1 Real-time Architecture

#### Task 3.1.1: WebSocket Architecture Design
```
ID: P3-T1-001
Status: completed
Priority: Critical
Agent: @backend-architect
Effort: 6 hours
```

**Description:**
- Design Socket.io architecture
- Define event contracts
- Plan room/namespace structure
- Design reconnection strategy

**Dependencies:** Phase 2 complete

**Deliverables:**
- Socket.io architecture doc
- Event specification
- Room design
- Reconnection strategy

**Acceptance Criteria:**
- [x] Events clearly defined
- [x] Rooms organized logically
- [x] Reconnection handles failures
- [x] Scalability considered

---

#### Task 3.1.2: Real-time Data Model
```
ID: P3-T1-002
Status: completed
Priority: High
Agent: @database-optimizer
Effort: 4 hours
```

**Description:**
- Design location batch storage
- Plan SOS event storage
- Create active guard tracking
- Design dispatch assignment

**Dependencies:** P3-T1-001

**Deliverables:**
- Location batch schema
- SOS event schema
- Active guard model
- Dispatch model

**Acceptance Criteria:**
- [x] Location efficient storage
- [x] SOS events captured
- [x] Guards tracked real-time
- [x] Dispatch modeled

---

### 3.2 Backend Real-time Implementation

#### Task 3.2.1: Socket.io Server Setup
```
ID: P3-T2-001
Status: completed
Priority: Critical
Agent: @typescript-expert
Effort: 10 hours
```

**Description:**
- Setup Socket.io server
- Implement authentication middleware
- Create room management
- Add connection lifecycle handlers

**Dependencies:** P3-T1-001

**Deliverables:**
- Socket.io server
- Auth middleware
- Room manager
- Connection handlers

**Acceptance Criteria:**
- [x] Server starts correctly
- [x] JWT auth works
- [x] Rooms managed properly
- [x] Connections handled

---

#### Task 3.2.2: Location Update Handler
```
ID: P3-T2-002
Status: completed
Priority: Critical
Agent: @typescript-expert
Effort: 12 hours
```

**Description:**
- Implement location batch receiving
- Add GPS validation
- Store location updates
- Broadcast to supervisors

**Dependencies:** P3-T2-001

**Deliverables:**
- Location handler
- GPS validator
- Storage service
- Broadcaster

**Acceptance Criteria:**
- [x] Batches processed
- [x] GPS validated
- [x] Locations stored
- [x] Supervisors receive updates

---

#### Task 3.2.3: SOS Handler
```
ID: P3-T2-003
Status: completed
Priority: Critical
Agent: @typescript-expert
Effort: 10 hours
```

**Description:**
- Implement SOS event receiving
- Create alert broadcasting
- Add dispatch assignment logic
- Store SOS events

**Dependencies:** P3-T2-001

**Deliverables:**
- SOS handler
- Alert broadcaster
- Dispatch assigner
- SOS storage

**Acceptance Criteria:**
- [x] SOS received instantly
- [x] Alerts broadcast
- [x] Dispatch assigned
- [x] Events stored

---

#### Task 3.2.4: Guard Tracking Service
```
ID: P3-T2-004
Status: completed
Priority: High
Agent: @typescript-expert
Effort: 8 hours
```

**Description:**
- Implement active guard tracking
- Add timeout detection
- Create status aggregation
- Handle disconnect gracefully

**Dependencies:** P3-T2-002

**Deliverables:**
- Guard tracker
- Timeout detector
- Status aggregator
- Disconnect handler

**Acceptance Criteria:**
- [x] Guards tracked accurately
- [x] Timeouts detected
- [x] Status aggregated
- [x] Disconnect handled

---

### 3.3 Command Center Dashboard

#### Task 3.3.1: Live Map Dashboard
```
ID: P3-T3-001
Status: completed
Priority: Critical
Agent: @ui-ux-designer, @tailwind-css-expert
Effort: 16 hours
```

**Description:**
- Design live map interface
- Implement map with guard markers
- Add marker updates via Socket.io
- Create guard detail panels

**Dependencies:** P3-T2-004

**Deliverables:**
- Live map screen
- Map component (Leaflet/Mapbox)
- Marker manager
- Detail panels

**Acceptance Criteria:**
- [x] Map displays guards
- [x] Markers update in real-time
- [x] Details shown on click
- [x] Performance acceptable

---

#### Task 3.3.2: SOS Alert Interface
```
ID: P3-T3-002
Status: completed
Priority: Critical
Agent: @ui-ux-designer, @tailwind-css-expert
Effort: 12 hours
```

**Description:**
- Design SOS alert feed
- Add alert notifications
- Create dispatch assignment UI
- Implement alert resolution flow

**Dependencies:** P3-T2-003

**Deliverables:**
- Alert feed component
- Notification system
- Dispatch UI
- Resolution flow

**Acceptance Criteria:**
- [x] Alerts appear instantly
- [x] Notifications work
- [x] Dispatch assigns correctly
- [x] Resolution tracked

---

#### Task 3.3.3: Guard Status Dashboard
```
ID: P3-T3-003
Status: completed
Priority: High
Agent: @ui-ux-designer, @tailwind-css-expert
Effort: 10 hours
```

**Description:**
- Design guard status list
- Add filtering and search
- Create status indicators
- Implement quick actions

**Dependencies:** P3-T2-004

**Deliverables:**
- Status list component
- Filter controls
- Status indicators
- Action buttons

**Acceptance Criteria:**
- [x] Guards listed with status
- [x] Filters work
- [x] Status clear
- [x] Actions functional

---

### 3.4 Mobile Real-time Features

#### Task 3.4.1: Socket.io Client
```
ID: P3-T4-001
Status: completed
Priority: Critical
Agent: @mobile-developer (adapted for Native Android/Kotlin)
Effort: 12 hours
```

**Description:**
- Setup Socket.io client
- Implement authentication
- Create event handlers
- Add reconnection logic

**Dependencies:** P2-T5-001

**Deliverables:**
- Socket.io client setup
- Auth implementation
- Event handlers
- Reconnection handler

**Acceptance Criteria:**
- [x] Client connects
- [x] JWT auth works
- [x] Events received
- [x] Reconnection handles failures

---

#### Task 3.4.2: Location Batching
```
ID: P3-T4-002
Status: completed
Priority: Critical
Agent: @mobile-developer (adapted for Native Android/Kotlin)
Effort: 10 hours
```

**Description:**
- Implement location batching
- Add 5-second interval sending
- Create battery-efficient batching
- Handle offline queuing

**Dependencies:** P3-T4-001, P2-T5-001

**Deliverables:**
- Location batcher
- Interval sender
- Battery optimizer
- Offline queue

**Acceptance Criteria:**
- [x] Batches every 5s
- [x] Battery efficient
- [x] Offline queued
- [x] Sync when online

---

#### Task 3.4.3: SOS Panic Button
```
ID: P3-T4-003
Status: completed
Priority: Critical
Agent: @mobile-developer (adapted for Native Android/Kotlin), @ui-ux-designer
Effort: 8 hours
```

**Description:**
- Design panic button UI
- Implement SOS trigger
- Add confirmation dialog
- Create feedback UI

**Dependencies:** P3-T4-001

**Deliverables:**
- Panic button UI
- SOS trigger
- Confirmation dialog
- Feedback screen

**Acceptance Criteria:**
- [x] Button easily accessible
- [x] Confirmation prevents accidents
- [x] SOS sent instantly
- [x] Feedback shown

---

#### Task 3.4.4: Alert Reception
```
ID: P3-T4-004
Status: completed
Priority: High
Agent: @mobile-developer (adapted for Native Android/Kotlin)
Effort: 10 hours
```

**Description:**
- Implement alert reception
- Add push notifications
- Create alert list UI
- Add alert response

**Dependencies:** P3-T4-001

**Deliverables:**
- Alert receiver
- Push notification handler
- Alert list screen
- Response handler

**Acceptance Criteria:**
- [x] Alerts received
- [x] Notifications trigger
- [x] List shows alerts
- [x] Response sent

---

### 3.5 Phase 3 Testing

#### Task 3.5.1: Real-time Tests
```
ID: P3-T5-001
Status: completed
Priority: High
Agent: @test-automator
Effort: 12 hours
```

**Description:**
- Test Socket.io connections
- Test event broadcasting
- Test reconnection scenarios
- Stress test with multiple clients

**Dependencies:** P3-T2-004

**Deliverables:**
- Connection tests
- Broadcast tests
- Reconnection tests
- Stress test report

**Acceptance Criteria:**
- [x] Connections stable
- [x] Events delivered
- [x] Reconnection works
- [x] Handles 100+ concurrent

---

#### Task 3.5.2: SOS Flow Tests
```
ID: P3-T5-002
Status: completed
Priority: Critical
Agent: @test-automator
Effort: 8 hours
```

**Description:**
- Test SOS trigger flow
- Test alert broadcasting
- Test dispatch assignment
- Test resolution flow

**Dependencies:** P3-T2-003, P3-T3-002

**Deliverables:**
- SOS trigger tests
- Alert broadcast tests
- Dispatch tests
- Resolution tests

**Acceptance Criteria:**
- [x] SOS triggers instantly
- [x] Alerts broadcast correctly
- [x] Dispatch assigns
- [x] Resolution tracked

---

#### Task 3.5.3: Security Audit
```
ID: P3-T5-003
Status: completed
Priority: Critical
Agent: @security-auditor
Effort: 6 hours
```

**Description:**
- Audit WebSocket security
- Test for unauthorized access
- Review SOS spam prevention
- Check location privacy

**Dependencies:** P3-T2-004

**Deliverables:**
- Security audit report
- Access control verification
- Spam prevention review
- Privacy assessment

**Acceptance Criteria:**
- [x] WebSocket secure
- [x] Unauthorized access blocked
- [x] Spam prevented
- [x] Privacy protected

---

## Phase 4: Incidents & Communication

### Overview
Implement incident reporting with evidence and push-to-talk communication.

---

### 4.1 Incident Domain

#### Task 4.1.1: Incident Domain Design
```
ID: P4-T1-001
Status: completed
Priority: Critical
Agent: @backend-architect
Effort: 8 hours
```

**Description:**
- Design incident entity with workflow
- Define incident types and priorities
- Create evidence storage model
- Design comment/attachment model

**Dependencies:** Phase 3 complete

**Deliverables:**
- Incident entity spec
- Workflow state machine
- Evidence storage design
- Comment/attachment model

**Acceptance Criteria:**
- [x] States: New → Investigating → Resolved → Closed
- [x] Types and priorities defined
- [x] Evidence storage scalable
- [x] Comments track history

---

#### Task 4.1.2: Incident Database Schema
```
ID: P4-T1-002
Status: completed
Priority: High
Agent: @database-optimizer
Effort: 6 hours
```

**Description:**
- Create incident Sequelize models
- Add evidence table with references
- Create comment and attachment tables
- Add indexes for queries

**Dependencies:** P4-T1-001

**Deliverables:**
- Incident model
- Evidence model
- Comment/Attachment models
- Database migrations

**Acceptance Criteria:**
- [x] All models created
- [x] Relationships defined
- [x] Indexes optimized
- [x] Migrations clean

---

#### Task 4.1.3: Incident API Specification
```
ID: P4-T1-003
Status: completed
Priority: High
Agent: @api-architect
Effort: 6 hours
```

**Description:**
- Design incident CRUD API
- Define file upload endpoints
- Specify workflow transition API
- Add incident query endpoints

**Dependencies:** P4-T1-001

**Deliverables:**
- Incident API spec
- Upload API spec
- Workflow API spec
- Query parameters doc

**Acceptance Criteria:**
- [x] CRUD endpoints defined
- [x] Upload spec clear
- [x] Transitions specified
- [x] Query filters documented

---

### 4.2 Backend Incident Implementation

#### Task 4.2.1: Incident Service
```
ID: P4-T2-001
Status: completed
Priority: Critical
Agent: @typescript-expert
Effort: 12 hours
```

**Description:**
- Implement incident creation
- Add workflow state management
- Create assignment logic
- Implement incident queries

**Dependencies:** P4-T1-002

**Deliverables:**
- IncidentService
- Workflow manager
- Assignment handler
- Query builder

**Acceptance Criteria:**
- [x] Incidents create correctly
- [x] Workflow enforced
- [x] Assignment works
- [x] Queries return correctly

---

#### Task 4.2.2: Evidence Processing
```
ID: P4-T2-002
Status: completed
Priority: High
Agent: @typescript-expert
Effort: 10 hours
```

**Description:**
- Implement image upload handling
- Add Base64 processing
- Create storage service (S3/local)
- Add image validation

**Dependencies:** P4-T1-003

**Deliverables:**
- Upload handler
- Base64 processor
- Storage service
- Image validator

**Acceptance Criteria:**
- [x] Uploads accepted
- [x] Base64 decoded
- [x] Storage works
- [x] Validation rejects invalid

---

#### Task 4.2.3: Incident Controllers
```
ID: P4-T2-003
Status: completed
Priority: High
Agent: @typescript-expert
Effort: 8 hours
```

**Description:**
- Create incident CRUD controllers
- Implement file upload endpoint
- Add workflow transition endpoints
- Create incident list with filters

**Dependencies:** P4-T2-001, P4-T2-002

**Deliverables:**
- IncidentController
- Upload endpoint
- Workflow endpoints
- Filter middleware

**Acceptance Criteria:**
- [x] CRUD operations work
- [x] Files upload
- [x] Transitions execute
- [x] Filters apply correctly

---

### 4.3 Push-to-Talk

#### Task 4.3.1: PTT Architecture
```
ID: P4-T3-001
Status: completed
Priority: High
Agent: @backend-architect
Effort: 6 hours
```

**Description:**
- Design PTT audio streaming architecture
- Define audio format requirements
- Plan channel/room structure
- Design push notification flow

**Dependencies:** Phase 3 complete

**Deliverables:**
- PTT architecture doc
- Audio format spec
- Channel design
- Notification flow

**Acceptance Criteria:**
- [x] Architecture scalable
- [x] Format defined
- [x] Channels logical
- [x] Notifications instant

---

#### Task 4.3.2: PTT Server Implementation
```
ID: P4-T3-002
Status: completed
Priority: High
Agent: @typescript-expert
Effort: 14 hours
```

**Description:**
- Implement WebSocket audio streaming
- Add active speaker management
- Create channel management
- Implement push notifications

**Dependencies:** P4-T3-001

**Deliverables:**
- Audio stream handler
- Speaker manager
- Channel manager
- Push notification sender

**Acceptance Criteria:**
- [x] Audio streams
- [x] Single speaker enforced
- [x] Channels managed
- [x] Notifications sent

---

### 4.4 Admin Incident UI

#### Task 4.4.1: Incident List & Filters
```
ID: P4-T4-001
Status: completed
Priority: High
Agent: @ui-ux-designer, @tailwind-css-expert
Effort: 10 hours
```

**Description:**
- Design incident list with filters
- Add status and priority indicators
- Implement search functionality
- Create bulk actions

**Dependencies:** P4-T2-003

**Deliverables:**
- Incident list component
- Filter controls
- Search input
- Bulk action menu

**Acceptance Criteria:**
- [x] List displays incidents
- [x] Filters work
- [x] Search returns results
- [x] Bulk actions execute

---

#### Task 4.4.2: Incident Detail & Workflow
```
ID: P4-T4-002
Status: completed
Priority: High
Agent: @ui-ux-designer, @tailwind-css-expert
Effort: 12 hours
```

**Description:**
- Design incident detail view
- Implement workflow transition buttons
- Add evidence display
- Create comment/attachment UI

**Dependencies:** P4-T4-001

**Deliverables:**
- Detail view component
- Workflow buttons
- Evidence gallery
- Comment/attachment UI

**Acceptance Criteria:**
- [x] Details display
- [x] Transitions work
- [x] Evidence shows
- [x] Comments post

---

### 4.5 Mobile Incident Features

#### Task 4.5.1: Incident Creation
```
ID: P4-T5-001
Status: completed
Priority: High
Agent: @mobile-developer (adapted for Native Android/Kotlin), @ui-ux-designer
Effort: 14 hours
```

**Description:**
- Design incident creation form
- Implement camera integration
- Add image upload with offline queue
- Create incident type selection

**Dependencies:** P2-T4-005

**Deliverables:**
- Incident form screen
- Camera handler
- Upload manager
- Type selector

**Acceptance Criteria:**
- [x] Form validates
- [x] Camera captures
- [x] Upload queues offline
- [x] Types selectable

---

#### Task 4.5.2: Incident History
```
ID: P4-T5-002
Status: completed
Priority: Medium
Agent: @mobile-developer (adapted for Native Android/Kotlin)
Effort: 8 hours
```

**Description:**
- Create incident list screen
- Add status indicators
- Implement pull-to-refresh
- Create incident detail view

**Dependencies:** P4-T5-001

**Deliverables:**
- Incident list screen
- Status indicators
- Refresh handler
- Detail view

**Acceptance Criteria:**
- [x] List displays
- [x] Status shown
- [x] Refresh works
- [x] Details accessible

---

#### Task 4.5.3: PTT Implementation
```
ID: P4-T5-003
Status: completed
Priority: High
Agent: @mobile-developer (adapted for Native Android/Kotlin)
Effort: 16 hours
```

**Description:**
- Implement PTT button UI
- Add audio recording
- Create WebSocket audio streaming
- Add push notification handling

**Dependencies:** P4-T3-002, P3-T4-001

**Deliverables:**
- PTT button
- Audio recorder
- Stream handler
- Notification receiver

**Acceptance Criteria:**
- [x] Button accessible
- [x] Audio records
- [x] Streaming works
- [x] Notifications trigger

---

### 4.6 Phase 4 Testing

#### Task 4.6.1: Incident Flow Tests
```
ID: P4-T6-001
Status: completed
Priority: High
Agent: @test-automator
Effort: 10 hours
```

**Description:**
- Test incident creation
- Test workflow transitions
- Test evidence uploads
- Test assignments

**Dependencies:** P4-T2-003

**Deliverables:**
- Creation tests
- Workflow tests
- Upload tests
- Assignment tests

**Acceptance Criteria:**
- [x] Creation works
- [x] Workflow enforced
- [x] Uploads complete
- [x] Assignments correct

---

#### Task 4.6.2: PTT Tests
```
ID: P4-T6-002
Status: completed
Priority: High
Agent: @test-automator
Effort: 8 hours
```

**Description:**
- Test audio streaming
- Test speaker management
- Test channel operations
- Test notifications

**Dependencies:** P4-T3-002

**Deliverables:**
- Stream tests
- Speaker tests
- Channel tests
- Notification tests

**Acceptance Criteria:**
- [x] Streaming works
- [x] Speaker enforced
- [x] Channels operate
- [x] Notifications received

---

#### Task 4.6.3: Security Audit
```
ID: P4-T6-003
Status: completed
Priority: Critical
Agent: @security-auditor
Effort: 8 hours
```

**Description:**
- Audit file upload security
- Test for malicious files
- Review PTT access control
- Check evidence privacy

**Dependencies:** P4-T2-003

**Deliverables:**
- Upload security report
- Malware test results
- Access control review
- Privacy assessment

**Acceptance Criteria:**
- [x] Uploads sanitized
- [x] Malware blocked
- [x] Access controlled
- [x] Privacy maintained

---

## Phase 5: HR, Analytics & Final Polish

### Overview
Implement shift management, reporting engine, and final production polish.

---

### 5.1 Shift Management

#### Task 5.1.1: Shift Domain Design
```
ID: P5-T1-001
Status: completed
Priority: High
Agent: @backend-architect
Effort: 6 hours
```

**Description:**
- Design shift entity with schedules
- Define clock-in/out logic
- Create attendance tracking model
- Design geofenced validation

**Dependencies:** Phase 4 complete

**Deliverables:**
- Shift entity spec
- Schedule model
- Attendance model
- Geofence validation

**Acceptance Criteria:**
- [x] Shifts modeled
- [x] Schedules flexible
- [x] Attendance tracked
- [x] Geofence enforced

---

#### Task 5.1.2: Shift Database & Service
```
ID: P5-T1-002
Status: completed
Priority: High
Agent: @typescript-expert
Effort: 10 hours
```

**Description:**
- Create shift Sequelize models
- Implement shift service
- Add clock-in/out logic
- Create attendance calculator

**Dependencies:** P5-T1-001

**Deliverables:**
- Shift models
- ShiftService
- Clock-in/out handler
- Attendance calculator

**Acceptance Criteria:**
- [x] Models created
- [x] Service manages shifts
- [x] Clock-in/out validated
- [x] Attendance accurate

---

#### Task 5.1.3: Shift API & Controllers
```
ID: P5-T1-003
Status: completed
Priority: High
Agent: @typescript-expert
Effort: 8 hours
```

**Description:**
- Design shift API endpoints
- Create shift controllers
- Implement clock-in/out endpoints
- Add attendance query endpoints

**Dependencies:** P5-T1-002

**Deliverables:**
- Shift API spec
- ShiftController
- Clock-in/out endpoints
- Attendance queries

**Acceptance Criteria:**
- [x] API documented
- [x] Shift CRUD works
- [x] Clock-in/out validated
- [x] Queries return correctly

---

### 5.2 Reporting Engine

#### Task 5.2.1: Report Architecture
```
ID: P5-T2-001
Status: completed
Priority: High
Agent: @backend-architect
Effort: 8 hours
```

**Description:**
- Design report generation architecture
- Define report types (site, guard, patrol)
- Plan export formats (Excel, CSV, PDF)
- Design scheduling system

**Dependencies:** P5-T1-003

**Deliverables:**
- Report architecture doc
- Report type specs
- Export format specs
- Schedule design

**Acceptance Criteria:**
- [x] Architecture extensible
- [x] Reports defined
- [x] Exports specified
- [x] Scheduling planned

---

#### Task 5.2.2: Report Generation Service
```
ID: P5-T2-002
Status: completed
Priority: High
Agent: @typescript-expert
Effort: 14 hours
```

**Description:**
- Implement report generators
- Add Excel export
- Add CSV export
- Create report caching

**Dependencies:** P5-T2-001

**Deliverables:**
- Report generators
- Excel exporter
- CSV exporter
- Cache manager

**Acceptance Criteria:**
- [x] Reports generate
- [x] Excel exports
- [x] CSV exports
- [x] Cache improves performance

---

#### Task 5.2.3: Cron Scheduling
```
ID: P5-T2-003
Status: completed
Priority: Medium
Agent: @typescript-expert
Effort: 6 hours
```

**Description:**
- Setup node-cron for scheduled reports
- Implement daily/weekly reports
- Add email delivery
- Create report history

**Dependencies:** P5-T2-002

**Deliverables:**
- Cron configuration
- Scheduled jobs
- Email sender
- Report history

**Acceptance Criteria:**
- [x] Cron runs jobs
- [x] Reports scheduled
- [x] Email delivers
- [x] History tracked

---

### 5.3 Admin Reporting UI

#### Task 5.3.1: Report Generation UI
```
ID: P5-T3-001
Status: completed
Priority: High
Agent: @ui-ux-designer
Effort: 12 hours
```

**Description:**
- Design report generation interface
- Add parameter selection
- Create format selection
- Implement download functionality

**Dependencies:** P5-T2-002

**Deliverables:**
- Report generation screen
- Parameter controls
- Format selector
- Download handler

**Acceptance Criteria:**
- [x] Interface intuitive
- [x] Parameters selectable
- [x] Formats selectable
- [x] Download works

---

#### Task 5.3.2: Scheduled Reports UI
```
ID: P5-T3-002
Status: completed
Priority: Medium
Agent: @ui-ux-designer
Effort: 8 hours
```

**Description:**
- Design scheduled reports list
- Add schedule configuration
- Create report history viewer
- Implement schedule management

**Dependencies:** P5-T2-003

**Deliverables:**
- Scheduled reports list
- Schedule config UI
- History viewer
- Management controls

**Acceptance Criteria:**
- [x] Schedules listed
- [x] Configurable
- [x] History accessible
- [x] Management works

---

### 5.4 Mobile Shift Features

#### Task 5.4.1: Shift Dashboard
```
ID: P5-T4-001
Status: completed
Priority: High
Agent: @mobile-developer
Effort: 10 hours
```

**Description:**
- Design shift dashboard screen
- Display upcoming shifts
- Show clock-in/out buttons
- Add shift status indicator

**Dependencies:** P5-T1-003

**Deliverables:**
- Shift dashboard screen
- Shift list
- Clock-in/out buttons
- Status indicator

**Acceptance Criteria:**
- [x] Dashboard displays
- [x] Upcoming shown
- [x] Buttons functional
- [x] Status accurate

---

#### Task 5.4.2: Geofenced Clock-in/out
```
ID: P5-T4-002
Status: completed
Priority: High
Agent: @mobile-developer
Effort: 12 hours
```

**Description:**
- Implement geofence checking
- Add clock-in validation
- Create clock-out validation
- Handle edge cases

**Dependencies:** P5-T4-001, P2-T2-002

**Deliverables:**
- Geofence checker
- Clock-in validator
- Clock-out validator
- Edge case handler

**Acceptance Criteria:**
- [x] Geofence checked
- [x] Clock-in restricted
- [x] Clock-out validated
- [x] Edge cases handled

---

#### Task 5.4.3: Sync Status UI
```
ID: P5-T4-003
Status: completed
Priority: Medium
Agent: @mobile-developer
Effort: 6 hours
```

**Description:**
- Create sync status indicator
- Show pending items count
- Add manual sync button
- Display last sync time

**Dependencies:** P2-T4-005

**Deliverables:**
- Sync status UI
- Pending counter
- Manual sync button
- Last sync display

**Acceptance Criteria:**
- [x] Status visible
- [x] Count accurate
- [x] Manual sync works
- [x] Time shown

---

### 5.5 Performance & Optimization

#### Task 5.5.1: Database Optimization
```
ID: P5-T5-001
Status: completed
Priority: High
Agent: @database-optimizer
Effort: 10 hours
```

**Description:**
- Analyze query performance
- Add missing indexes
- Optimize slow queries
- Review connection pooling

**Dependencies:** Phase 4 complete

**Deliverables:**
- Query analysis report
- Index additions
- Optimized queries
- Pool tuning

**Acceptance Criteria:**
- [x] Queries optimized
- [x] Indexes added
- [x] Performance improved
- [x] Pool tuned

---

#### Task 5.5.2: Mobile Battery Optimization
```
ID: P5-T5-002
Status: completed
Priority: High
Agent: @mobile-developer
Effort: 12 hours
```

**Description:**
- Analyze battery usage
- Optimize location updates
- Reduce unnecessary wakeups
- Implement Doze mode handling

**Dependencies:** P2-T5-001

**Deliverables:**
- Battery analysis
- Optimized location code
- Wakeup reduction
- Doze mode handler

**Acceptance Criteria:**
- [x] Battery reduced
- [x] Location optimized
- [x] Wakeups minimal
- [x] Doze handled

---

#### Task 5.5.3: Frontend Performance
```
ID: P5-T5-003
Status: completed
Priority: Medium
Agent: @tailwind-css-expert
Effort: 8 hours
```

**Description:**
- Optimize asset loading
- Add caching headers
- Minimize JavaScript
- Optimize Tailwind build

**Dependencies:** P5-T3-002

**Deliverables:**
- Optimized assets
- Cache configuration
- Minified JS
- Optimized CSS

**Acceptance Criteria:**
- [x] Assets cached
- [x] JS minified
- [x] CSS optimized
- [x] Load time improved

---

### 5.6 Phase 5 Testing

#### Task 5.6.1: Shift Flow Tests
```
ID: P5-T6-001
Status: completed
Priority: High
Agent: @test-automator
Effort: 8 hours
```

**Description:**
- Test shift creation
- Test clock-in/out validation
- Test geofence enforcement
- Test attendance calculation

**Dependencies:** P5-T1-003

**Deliverables:**
- Shift tests
- Clock-in/out tests
- Geofence tests
- Attendance tests

**Acceptance Criteria:**
- [x] Shifts create
- [x] Validation works
- [x] Geofence enforced
- [x] Attendance accurate

---

#### Task 5.6.2: Report Generation Tests
```
ID: P5-T6-002
Status: completed
Priority: High
Agent: @test-automator
Effort: 10 hours
```

**Description:**
- Test report generation
- Verify export formats
- Test scheduled reports
- Validate data accuracy

**Dependencies:** P5-T2-003

**Deliverables:**
- Generation tests
- Format tests
- Schedule tests
- Accuracy tests

**Acceptance Criteria:**
- [x] Reports generate
- [x] Exports valid
- [x] Schedules run
- [x] Data accurate

---

#### Task 5.6.3: Performance Tests
```
ID: P5-T6-003
Status: completed
Priority: High
Agent: @test-automator
Effort: 12 hours
```

**Description:**
- Stress test Socket.io
- Load test database
- Test concurrent operations
- Measure mobile battery impact

**Dependencies:** P5-T5-001, P5-T5-002

**Deliverables:**
- Socket.io stress test
- Database load test
- Concurrency test
- Battery impact report

**Acceptance Criteria:**
- [x] Socket.io handles 100+ concurrent
- [x] Database handles load
- [x] Concurrency stable
- [x] Battery acceptable

---

#### Task 5.6.4: Final Security Audit
```
ID: P5-T6-004
Status: completed
Priority: Critical
Agent: @security-auditor
Effort: 10 hours
```

**Description:**
- Full security audit
- Penetration testing
- Dependency vulnerability scan
- Data privacy review

**Dependencies:** All phases complete

**Deliverables:**
- Full security report
- Penetration test results
- Vulnerability scan
- Privacy assessment

**Acceptance Criteria:**
- [x] No critical vulnerabilities
- [x] Penetration test passed
- [x] Dependencies clean
- [x] Privacy compliant

---

## Production Deployment

### 6.1 Infrastructure Setup

#### Task 6.1.1: Cloud Architecture
```
ID: P6-T1-001
Status: completed
Priority: Critical
Agent: @cloud-architect
Effort: 12 hours
```

**Description:**
- Design cloud infrastructure (AWS/GCP/Azure)
- Plan auto-scaling configuration
- Design multi-environment setup
- Plan disaster recovery

**Dependencies:** All development complete

**Deliverables:**
- Cloud architecture diagram
- Auto-scaling configuration
- Environment design
- Disaster recovery plan

**Acceptance Criteria:**
- [x] Architecture documented
- [x] Scaling defined
- [x] Environments separated
- [x] Recovery planned

---

#### Task 6.1.2: CI/CD Pipeline
```
ID: P6-T1-002
Status: completed
Priority: Critical
Agent: @devops-engineer
Effort: 16 hours
```

**Description:**
- Setup GitHub Actions / GitLab CI
- Configure automated testing
- Implement automated deployment
- Add rollback capability

**Dependencies:** P6-T1-001

**Deliverables:**
- CI/CD pipeline
- Test automation
- Deployment scripts
- Rollback procedures

**Acceptance Criteria:**
- [x] Pipeline runs on push
- [x] Tests automated
- [x] Deployment zero-downtime
- [x] Rollback functional

---

#### Task 6.1.3: Docker Configuration
```
ID: P6-T1-003
Status: completed
Priority: High
Agent: @devops-engineer
Effort: 8 hours
```

**Description:**
- Create production Docker images
- Optimize image sizes
- Configure multi-stage builds
- Setup container registry

**Dependencies:** P6-T1-001

**Deliverables:**
- Production Dockerfiles
- Optimized images
- Build scripts
- Registry setup

**Acceptance Criteria:**
- [x] Images build
- [x] Sizes optimized
- [x] Stages correct
- [x] Registry accessible

---

#### Task 6.1.4: Database Replication
```
ID: P6-T1-004
Status: completed
Priority: High
Agent: @database-admin
Effort: 10 hours
```

**Description:**
- Setup read replicas
- Configure failover
- Implement backup strategy
- Setup monitoring

**Dependencies:** P6-T1-001

**Deliverables:**
- Replication setup
- Failover config
- Backup scripts
- Monitoring setup

**Acceptance Criteria:**
- [x] Replication works
- [x] Failover automatic
- [x] Backups scheduled
- [x] Monitoring active

---

### 6.2 Production Configuration

#### Task 6.2.1: Environment Configuration
```
ID: P6-T2-001
Status: completed
Priority: Critical
Agent: @devops-engineer
Effort: 6 hours
```

**Description:**
- Create production environment template
- Setup secrets management
- Configure feature flags
- Document all variables

**Dependencies:** P6-T1-002

**Deliverables:**
- Environment template
- Secrets config
- Feature flag system
- Variable documentation

**Acceptance Criteria:**
- [x] Template complete
- [x] Secrets secure
- [x] Flags functional
- [x] Variables documented

---

#### Task 6.2.2: Logging & Monitoring
```
ID: P6-T2-002
Status: completed
Priority: Critical
Agent: @devops-engineer
Effort: 10 hours
```

**Description:**
- Setup structured logging
- Configure log aggregation
- Implement metrics collection
- Create alerting rules

**Dependencies:** P6-T1-001

**Deliverables:**
- Logging configuration
- Log aggregation setup
- Metrics dashboard
- Alert rules

**Acceptance Criteria:**
- [x] Logs centralized
- [x] Metrics collected
- [x] Dashboard functional
- [x] Alerts configured

---

#### Task 6.2.3: PM2 Process Management
```
ID: P6-T2-003
Status: completed
Priority: High
Agent: @devops-engineer
Effort: 6 hours
```

**Description:**
- Configure PM2 ecosystem
- Setup cluster mode
- Configure auto-restart
- Add graceful shutdown

**Dependencies:** P6-T1-003

**Deliverables:**
- PM2 ecosystem file
- Cluster config
- Restart policy
- Shutdown handler

**Acceptance Criteria:**
- [x] PM2 manages processes
- [x] Cluster mode active
- [x] Auto-restart works
- [x] Shutdown graceful

---

### 6.3 Mobile Deployment

#### Task 6.3.1: Android Build Configuration
```
ID: P6-T3-001
Status: completed
Priority: High
Agent: @mobile-developer
Effort: 8 hours
```

**Description:**
- Configure release builds
- Setup code signing
- Create build variants
- Configure ProGuard

**Dependencies:** Phase 5 complete

**Deliverables:**
- Release build config
- Signing setup
- Build variants
- ProGuard rules

**Acceptance Criteria:**
- [x] Release builds
- [x] Signing configured
- [x] Variants create
- [x] Code obfuscated

---

#### Task 6.3.2: Play Store Deployment
```
ID: P6-T3-002
Status: completed
Priority: High
Agent: @mobile-developer
Effort: 6 hours
```

**Description:**
- Create Play Store listing
- Prepare screenshots and assets
- Configure app signing
- Setup release tracks

**Dependencies:** P6-T3-001

**Deliverables:**
- Store listing
- Screenshots
- Signing config
- Release tracks

**Acceptance Criteria:**
- [x] Listing complete
- [x] Assets prepared
- [x] Signing configured
- [x] Tracks defined

---

### 6.4 Production Testing

#### Task 6.4.1: Staging Environment Tests
```
ID: P6-T4-001
Status: completed
Priority: Critical
Agent: @test-automator
Effort: 12 hours
```

**Description:**
- Deploy to staging
- Run full test suite
- Perform smoke tests
- Test deployment process

**Dependencies:** P6-T1-002

**Deliverables:**
- Staging deployment
- Test results
- Smoke test report
- Deployment validation

**Acceptance Criteria:**
- [x] Staging deployed
- [x] Tests pass
- [x] Smoke tests pass
- [x] Deployment smooth

---

#### Task 6.4.2: Load Testing
```
ID: P6-T4-002
Status: completed
Priority: High
Agent: @test-automator
Effort: 14 hours
```

**Description:**
- Design load test scenarios
- Simulate concurrent users
- Test Socket.io scalability
- Verify auto-scaling

**Dependencies:** P6-T1-001

**Deliverables:**
- Load test scenarios
- Test results
- Scalability report
- Recommendations

**Acceptance Criteria:**
- [x] Scenarios realistic
- [x] System handles load
- [x] Socket.io scales
- [x] Auto-scaling works

---

#### Task 6.4.3: Security Penetration Test
```
ID: P6-T4-003
Status: completed
Priority: Critical
Agent: @security-auditor
Effort: 16 hours
```

**Description:**
- Conduct penetration testing
- Test for common vulnerabilities
- Attempt unauthorized access
- Test DDoS resilience

**Dependencies:** Staging deployed

**Deliverables:**
- Penetration test report
- Vulnerability findings
- Remediation steps
- Re-test results

**Acceptance Criteria:**
- [x] No critical vulnerabilities
- [x] Access attempts blocked
- [x] DDoS mitigated
- [x] All findings addressed

---

### 6.5 Production Launch

#### Task 6.5.1: Production Deployment
```
ID: P6-T5-001
Status: completed
Priority: Critical
Agent: @devops-engineer
Effort: 8 hours
```

**Description:**
- Execute production deployment
- Run database migrations
- Verify all services
- Monitor for issues

**Dependencies:** P6-T4-001, P6-T4-002, P6-T4-003

**Deliverables:**
- Production deployment
- Migration execution
- Verification report
- Initial monitoring data

**Acceptance Criteria:**
- [x] Deployment successful
- [x] Migrations clean
- [x] Services verified
- [x] No critical issues

---

#### Task 6.5.2: Post-Launch Monitoring
```
ID: P6-T5-002
Status: completed
Priority: Critical
Agent: @devops-engineer
Effort: Ongoing
```

**Description:**
- Monitor application health
- Track error rates
- Monitor performance metrics
- Respond to alerts

**Dependencies:** P6-T5-001

**Deliverables:**
- Health dashboard
- Error tracking
- Performance metrics
- Response procedures

**Acceptance Criteria:**
- [x] Health monitored
- [x] Errors tracked
- [x] Metrics visible
- [x] Response defined

---

#### Task 6.5-3: User Documentation
```
ID: P6-T5-003
Status: completed
Priority: High
Agent: @documentation-specialist
Effort: 12 hours
```

**Description:**
- Create admin user guide
- Create guard app guide
- Create troubleshooting guide
- Create FAQ

**Dependencies:** P6-T5-001

**Deliverables:**
- Admin guide
- Guard app guide
- Troubleshooting guide
- FAQ document

**Acceptance Criteria:**
- [x] Admin guide comprehensive
- [x] App guide clear
- [x] Troubleshooting covers common issues
- [x] FAQ helpful

---

## Task Summary

### Phase Breakdown

| Phase | Tasks | Total Effort | Key Agents |
|-------|-------|--------------|------------|
| Phase 1 | 16 | ~120 hours | @backend-architect, @typescript-expert, @ui-ux-designer |
| Phase 2 | 23 | ~240 hours | @database-optimizer, @mobile-developer, @typescript-expert |
| Phase 3 | 16 | ~160 hours | @typescript-expert, @ui-ux-designer, @mobile-developer |
| Phase 4 | 18 | ~180 hours | @typescript-expert, @mobile-developer, @ui-ux-designer |
| Phase 5 | 22 | ~180 hours | @typescript-expert, @database-optimizer, @devops-engineer |
| Production | 16 | ~160 hours | @devops-engineer, @cloud-architect, @security-auditor |

**Total Tasks:** 111
**Total Estimated Effort:** ~1,040 hours (~26 weeks with 1 developer)

### Critical Path Tasks

The following tasks must be completed in sequence and are on the critical path:

1. P1-T1-001: Repository Structure Setup
2. P1-T1-002: Database Schema Design
3. P1-T2-001: Express.js Server Setup
4. P1-T2-002: PostgreSQL & Docker Integration
5. P1-T2-003: Repository Implementation
6. P1-T2-004: Authentication Service
7. P2-T1-001: Patrol Domain Design
8. P2-T2-002: Geofencing Service
9. P2-T2-003: Patrol Execution Service
10. P3-T2-001: Socket.io Server Setup
11. P3-T2-002: Location Update Handler
12. P4-T1-001: Incident Domain Design
13. P4-T2-001: Incident Service
14. P5-T1-001: Shift Domain Design
15. P6-T1-001: Cloud Architecture
16. P6-T1-002: CI/CD Pipeline
17. P6-T5-001: Production Deployment

### Parallelization Opportunities

The following task groups can be executed in parallel:

**Phase 1:**
- P1-T3-001, P1-T3-002, P1-T3-003 (Admin UI) can run parallel to backend tasks after P1-T2-001
- P1-T4-001, P1-T4-002, P1-T4-003 (Testing) can run parallel after P1-T2-006

**Phase 2:**
- P2-T3-001, P2-T3-002, P2-T3-003 (Admin UI) can run parallel to backend tasks
- P2-T4-001, P2-T4-002, P2-T4-003, P2-T4-004 (Mobile Setup) can run parallel to web backend tasks

**Phase 3:**
- P3-T3-001, P3-T3-002, P3-T3-003 (Dashboard UI) can run parallel to backend
- P3-T4-001, P3-T4-002, P3-T4-003, P3-T4-004 (Mobile Real-time) can run parallel

**Phase 4:**
- P4-T4-001, P4-T4-002 (Admin Incident UI) parallel to backend
- P4-T5-001, P4-T5-002, P4-T5-003 (Mobile Incident) parallel to PTT backend

**Phase 5:**
- P5-T3-001, P5-T3-002 (Reporting UI) parallel to report generation
- P5-T4-001, P5-T4-002, P5-T4-003 (Mobile Shift) parallel to shift backend

**Production:**
- P6-T1-003 (Docker), P6-T2-001 (Environment), P6-T2-003 (PM2) can run parallel
- P6-T3-001, P6-T3-002 (Mobile Deployment) parallel to infrastructure

---

## Notes

1. **Native Android Adaptation Required**: The `@mobile-developer` agent specializes in cross-platform frameworks (React Native/Flutter). For this project's native Android/Kotlin requirements, the agent's prompts must be adapted or an additional native Android specialist configuration may be needed.

2. **Dependencies**: Each task lists explicit dependencies. These must be respected during execution.

3. **Agent Model Preferences**:
   - **opus**: Complex planning, architecture, security audits
   - **sonnet**: Development, implementation, testing
   - **haiku**: Quick documentation, small fixes

4. **Quality Gates**: Each phase includes security audits, code reviews, and testing tasks that must pass before proceeding.

5. **Context Management**: For this large multi-agent operation, `@context-manager` should be engaged after every 5-6 tasks to maintain state across agent handoffs.

---

**Document End**
