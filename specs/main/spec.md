# Feature Specification: PatrolManager — Security Guard Management Platform

**Feature Branch**: `main`  
**Created**: 2026-02-25  
**Status**: Draft  
**Input**: User description: "Create a specification from README.md — Full-stack security guard management system with real-time tracking, incident reporting, and patrol coordination."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Admin User & Role Management (Priority: P1)

An **Administrator** logs into the Admin Web Panel, creates new user accounts for guards, supervisors, and managers, assigns them roles (Admin, Manager, Supervisor, Guard), and manages their profiles. The system enforces Role-Based Access Control (RBAC) so that each user sees only the features and data appropriate to their role.

**Why this priority**: Authentication and RBAC form the foundational layer upon which all other features depend. No patrol, incident, or real-time feature can work without user identity and authorization.

**Independent Test**: Can be fully tested by creating users with each of the 4 roles, logging in with each, and verifying that unauthorized actions are rejected with HTTP 403.

**Acceptance Scenarios**:

1. **Given** an Admin is logged into the Web Panel, **When** they create a new Guard user with valid details, **Then** the user is persisted in the database and can log in with their credentials.
2. **Given** a Guard is logged in, **When** they attempt to access admin-only endpoints (e.g., user management), **Then** the system returns HTTP 403 Forbidden.
3. **Given** an Admin assigns the "Supervisor" role to an existing Guard, **When** the Guard's next session begins, **Then** they see Supervisor-level features.
4. **Given** a user provides invalid credentials, **When** they attempt login, **Then** the system rejects with HTTP 401 Unauthorized and does not leak user existence info.

---

### User Story 2 — Mobile Guard Authentication (Priority: P1)

A **Guard** opens the mobile Android app, logs in with their credentials, and receives a JWT token. The app stores credentials securely and supports offline access to cached data when connectivity is poor. On logout, tokens are invalidated.

**Why this priority**: Mobile authentication is a prerequisite for every mobile feature — patrol execution, incident reporting, GPS tracking, and SOS.

**Independent Test**: Can be tested by logging into the mobile app, verifying JWT issuance, closing and reopening the app to verify token persistence, and verifying offline data access.

**Acceptance Scenarios**:

1. **Given** a Guard opens the mobile app, **When** they enter valid credentials, **Then** the system issues a JWT token and navigates to the dashboard.
2. **Given** a Guard has logged in previously and the device is offline, **When** they open the app, **Then** cached profile and assignment data is available.
3. **Given** a Guard is logged in, **When** they tap logout, **Then** the JWT is invalidated and the app returns to the login screen.

---

### User Story 3 — Site & Checkpoint Management (Priority: P2)

A **Manager** creates and manages security sites in the Admin Web Panel, defining geofence boundaries (GPS coordinates + radius) for each site. Within each site, they create checkpoints (NFC tags, QR codes, or GPS waypoints) that guards must visit during patrols.

**Why this priority**: Sites and checkpoints are the core domain objects required before any patrol can be defined or executed.

**Independent Test**: Can be tested by creating a site with a geofence polygon, adding 3 checkpoints of different types, and verifying persistence and retrieval via the API.

**Acceptance Scenarios**:

1. **Given** a Manager is in the Admin Panel, **When** they create a new site with name, address, and geofence coordinates, **Then** the site is saved and appears in the site list.
2. **Given** a site exists, **When** a Manager adds an NFC-type checkpoint with a tag ID, **Then** the checkpoint is associated with the site and visible on the site detail page.
3. **Given** a site has a geofence defined, **When** a guard's GPS coordinates are within the geofence, **Then** the system recognizes them as "on-site."

---

### User Story 4 — Patrol Route Definition & Execution (Priority: P2)

A **Supervisor** creates patrol templates — ordered sequences of checkpoints that define a patrol route. A **Guard** on the mobile app receives their assigned patrol, navigates to each checkpoint in order, and verifies arrival (via NFC tap, QR scan, or GPS proximity). The system records the patrol run with timestamps, GPS coordinates, and verification status for each checkpoint.

**Why this priority**: Patrol execution is the core operational workflow of the system; it directly delivers the primary business value of verifiable security rounds.

**Independent Test**: Can be tested by assigning a patrol template to a guard, executing the patrol in the mobile app (simulating NFC/QR/GPS), and verifying the patrol run record shows all checkpoints completed with timestamps.

**Acceptance Scenarios**:

1. **Given** a Supervisor creates a patrol template with 5 checkpoints in order, **When** a Guard opens their assigned patrol, **Then** the checkpoints appear in the correct sequence with verification type labels.
2. **Given** a Guard is executing a patrol, **When** they scan an NFC tag at checkpoint #2, **Then** the system records the verification with timestamp and GPS coordinates and advances to checkpoint #3.
3. **Given** a Guard skips a checkpoint, **When** the patrol run is reviewed by a Supervisor, **Then** the skipped checkpoint is flagged as "missed" with the gap duration highlighted.
4. **Given** a Guard is offline during a patrol, **When** they scan checkpoints, **Then** verifications are queued locally and synced when connectivity is restored.

---

### User Story 5 — Real-time Guard Tracking & Live Dashboard (Priority: P3)

A **Supervisor/Manager** opens the Command Center Live Dashboard in the Admin Web Panel and sees all on-duty guards' positions on a real-time map. Guard positions update every 5 seconds via Socket.io. The dashboard shows guard status (on-patrol, idle, SOS), and clicking a guard shows their current patrol progress.

**Why this priority**: Real-time tracking provides situational awareness, enables responsive dispatch, and is a key differentiator for the platform.

**Independent Test**: Can be tested by running the backend with Socket.io, connecting a guard mobile app emitting GPS coordinates, and verifying the dashboard map updates in real-time.

**Acceptance Scenarios**:

1. **Given** a Guard is on duty with the mobile app active, **When** 5 seconds elapse, **Then** the guard's updated GPS position is visible on the Command Center Dashboard map.
2. **Given** multiple guards are on duty, **When** a Supervisor opens the dashboard, **Then** all active guards are displayed on the map with status indicators.
3. **Given** a Guard stops sending location updates for more than 30 seconds, **When** viewing the dashboard, **Then** the guard's marker shows a "stale" or "disconnected" indicator.

---

### User Story 6 — SOS / Panic Alert (Priority: P3)

A **Guard** in danger presses the SOS (Panic) button on the mobile app. The system immediately broadcasts an alert to all nearby guards and supervisors via Socket.io, including the guard's current GPS coordinates. The Command Center Dashboard highlights the SOS with an audible alarm and visual indicator. The nearest available guards are identified for dispatch.

**Why this priority**: SOS is a critical safety feature with life-or-death implications; it must work with minimal latency and maximum reliability.

**Independent Test**: Can be tested by triggering SOS from a guard mobile app, verifying dispatch notifications arrive at other connected clients within 2 seconds, and confirming the dashboard shows the alert.

**Acceptance Scenarios**:

1. **Given** a Guard presses the SOS button, **When** the device has connectivity, **Then** an SOS event is broadcast to all connected supervisors and nearby guards within 2 seconds.
2. **Given** an SOS alert is received, **When** the Command Center Dashboard is open, **Then** the alert is shown with the guard's name, location, and timestamp, plus an audible alarm.
3. **Given** the SOS-triggering device is offline, **When** connectivity is restored, **Then** the queued SOS alert is immediately transmitted.

---

### User Story 7 — Incident Reporting (Priority: P4)

A **Guard** encounters a security incident (trespassing, damage, etc.) and creates an incident report on the mobile app. The report includes a description, severity level, photo evidence (from device camera), and GPS location. Incidents follow a workflow: **New → Investigating → Resolved → Closed**. Supervisors and Managers review, update, and close incidents via the Admin Panel.

**Why this priority**: Incident reporting is a core record-keeping function that provides audit trails and accountability.

**Independent Test**: Can be tested by creating an incident report from the mobile app with a photo attachment, verifying it appears in the Admin Panel, then advancing it through all workflow states.

**Acceptance Scenarios**:

1. **Given** a Guard is on the mobile app, **When** they create an incident report with description, severity, and a photo, **Then** the incident is saved with status "New" and visible to supervisors.
2. **Given** an incident is in "New" status, **When** a Supervisor changes it to "Investigating," **Then** the status update is recorded with timestamp and the guard is notified.
3. **Given** an incident has a photo attachment, **When** a Manager views the incident detail, **Then** the photo is displayed inline with EXIF metadata stripped for privacy.

---

### User Story 8 — Push-to-Talk Communication (Priority: P4)

A **Supervisor** initiates a Push-to-Talk (PTT) audio session with a specific Guard or broadcast to all guards at a site. Audio is streamed in real-time via WebSockets. Guards can respond when the channel is free (half-duplex).

**Why this priority**: PTT replaces the need for external radio hardware, centralizing communication within the platform.

**Independent Test**: Can be tested by initiating a PTT session between two connected clients, verifying audio data packets are transmitted and received in near real-time.

**Acceptance Scenarios**:

1. **Given** a Supervisor presses the PTT button targeting a Guard, **When** they speak, **Then** the audio is streamed to the Guard's device in near real-time.
2. **Given** a Guard is receiving a PTT transmission, **When** the Supervisor releases the button, **Then** the Guard can press their PTT button to respond.

---

### User Story 9 — Shift Management & Geofenced Clock-In/Out (Priority: P5)

A **Guard** clocks in at the start of their shift from the mobile app. The system validates their GPS position against the assigned site's geofence — clock-in is only allowed when the guard is physically within the site boundary. Clock-out follows the same geofence validation. Shift data (start time, end time, breaks, location history) is recorded for attendance reporting.

**Why this priority**: Shift management automates attendance and provides payroll data — important for HR but not blocking core security operations.

**Independent Test**: Can be tested by attempting clock-in inside and outside a geofence, verifying acceptance and rejection respectively.

**Acceptance Scenarios**:

1. **Given** a Guard is within their assigned site's geofence, **When** they tap "Clock In," **Then** the shift starts and the timestamp plus GPS coordinates are recorded.
2. **Given** a Guard is outside their assigned site's geofence, **When** they tap "Clock In," **Then** the system rejects the attempt with a "Not within site boundary" error.
3. **Given** a Guard has clocked in, **When** they clock out, **Then** the shift duration is calculated and stored for reporting.

---

### User Story 10 — Reporting & Analytics Engine (Priority: P5)

A **Manager** or **Admin** accesses the Reporting section of the Admin Panel to generate site performance reports, guard attendance summaries, incident statistics, and patrol completion rates. Reports can be exported as Excel (`.xlsx`) or CSV files. Automated daily/weekly reports can be scheduled via cron jobs.

**Why this priority**: Reporting provides business intelligence and operational analytics — valuable but dependent on all preceding data being captured.

**Independent Test**: Can be tested by generating a patrol completion report for a specific site and date range, verifying the data accuracy against known patrol runs, and downloading the Excel export.

**Acceptance Scenarios**:

1. **Given** a Manager navigates to the Reporting section, **When** they select "Patrol Completion Report" for site X and date range Y, **Then** the system displays a table of patrol runs with completion percentages.
2. **Given** a report is displayed, **When** the Manager clicks "Export to Excel," **Then** the browser downloads an `.xlsx` file with the same data.
3. **Given** automated reporting is configured, **When** the scheduled cron time is reached, **Then** the system generates and stores the report (e.g., emailed or available in the Admin Panel).

---

### Edge Cases

- What happens when a guard's mobile device battery dies mid-patrol? → The system marks the patrol as "incomplete" based on last-known checkpoint; the guard can resume on recharge if within the shift window.
- How does the system handle concurrent SOS alerts from multiple guards? → Each SOS is treated as an independent event; the dashboard shows all active SOS alerts simultaneously with individual dispatch recommendations.
- What happens when a guard scans a checkpoint that belongs to a different patrol route? → The system rejects the scan with a clear error message indicating checkpoint/route mismatch.
- How does offline sync handle conflicting data (e.g., incident edited on both server and device)? → Server-side data takes authority; conflicting mobile edits are flagged for manual review with both versions preserved.
- What happens when the geofence GPS accuracy is low (e.g., indoor environments)? → The system applies a configurable accuracy threshold; if GPS accuracy exceeds the threshold, the geofence check is deferred with a warning.
- What happens if a module dependency fails to load (e.g., "sites" depends on "users-auth" which is disabled)? → The module loader aborts loading the dependent module and logs an explicit error; the system continues operating with loaded modules.

---

## Requirements *(mandatory)*

### Functional Requirements

**Authentication & Authorization**
- **FR-001**: System MUST support hybrid authentication — JWT tokens for the mobile API and Express-session for the Admin Web Panel.
- **FR-002**: System MUST implement Role-Based Access Control (RBAC) with four roles: Admin, Manager, Supervisor, Guard.
- **FR-003**: System MUST enforce authorization checks on every API endpoint and web route based on the user's role.
- **FR-004**: System MUST support secure password storage using bcrypt hashing.
- **FR-005**: System MUST invalidate JWT tokens on logout.

**User Management**
- **FR-006**: Admin users MUST be able to create, read, update, and delete (CRUD) user accounts via the Admin Web Panel.
- **FR-007**: System MUST assign one and only one role to each user.
- **FR-008**: System MUST prevent deletion of the last remaining Admin account.

**Site & Checkpoint Management**
- **FR-009**: System MUST allow Managers and Admins to create, edit, and delete security sites with name, address, and geofence boundaries (GPS polygon/circle).
- **FR-010**: System MUST support three checkpoint verification types: NFC, QR Code, and GPS proximity.
- **FR-011**: System MUST associate checkpoints with exactly one site.

**Patrol Management**
- **FR-012**: System MUST allow Supervisors to create patrol templates as ordered sequences of checkpoints.
- **FR-013**: System MUST record patrol runs with per-checkpoint timestamps, GPS coordinates, and verification status.
- **FR-014**: System MUST flag missed checkpoints in patrol runs for supervisor review.
- **FR-015**: System MUST support offline patrol execution with local queuing (SyncQueue) and automatic sync on reconnect.

**Real-time Tracking**
- **FR-016**: System MUST broadcast guard GPS positions via Socket.io with updates every 5 seconds.
- **FR-017**: System MUST display all active guards on a real-time map in the Command Center Dashboard.
- **FR-018**: System MUST indicate guard status on the map: on-patrol, idle, SOS, disconnected.

**SOS / Panic Alert**
- **FR-019**: System MUST provide a one-tap SOS button on the mobile app that broadcasts the guard's location to all connected supervisors and nearby guards.
- **FR-020**: System MUST deliver SOS alerts to the Command Center Dashboard with visual and audible notification within 2 seconds of trigger.
- **FR-021**: System MUST identify and suggest the nearest available guards for dispatch during an SOS event.

**Incident Reporting**
- **FR-022**: System MUST allow guards to create incident reports with description, severity, photo evidence, and GPS location.
- **FR-023**: System MUST enforce incident workflow states: New → Investigating → Resolved → Closed.
- **FR-024**: System MUST support photo attachments with evidence processing (Base64 encoding) and EXIF stripping.

**Push-to-Talk**
- **FR-025**: System MUST support real-time half-duplex audio streaming between supervisors and guards via WebSockets.

**Shift Management**
- **FR-026**: System MUST validate guard clock-in/clock-out GPS position against the assigned site's geofence.
- **FR-027**: System MUST record shift start time, end time, breaks, and location history.

**Reporting**
- **FR-028**: System MUST generate patrol completion, attendance, and incident reports with date-range filtering.
- **FR-029**: System MUST support Excel (.xlsx) and CSV export formats for all reports.
- **FR-030**: System MUST support automated daily/weekly report generation via scheduled cron jobs.

**Architecture & Modularity (Future — Post-Phase 5)**
- **FR-031**: System SHOULD implement a plugin-based module system where features are self-contained modules loadable without modifying existing code. *(Deferred: current 4-layer architecture achieves separation of concerns; plugin system planned for post-Phase 5 polish.)*
- **FR-032**: System SHOULD support runtime module enable/disable via configuration (restart required, no hot-reload). *(Deferred: depends on FR-031 plugin system.)*
- **FR-033**: Modules SHOULD communicate via an Event Bus for cross-module notifications — no direct imports between modules. *(Deferred: services may call each other directly until FR-031 is implemented.)*

**Offline & Sync**
- **FR-034**: Mobile app MUST provide offline-first capability using Room database with a SyncQueue for deferred synchronization.
- **FR-035**: System MUST handle sync conflicts with server-side authority and flagging of conflicting mobile edits.
- **FR-036**: System MUST implement centralized logging and a dedicated `audit_logs` table for tracking security-sensitive actions (SOS, role changes, etc.) for at least 90 days.

## Clarifications

### Session 2026-02-25
- Q: Observability & Audit Tracing: How should system-wide security actions be tracked? → A: Implement centralized logging and dedicated audit_logs table.
- Q: Media Storage: How should incident photos and media be stored? → A: Local filesystem (dev) / S3-compatible storage (prod).
- Q: Geofencing Validation: Where should geofence checks be performed? → A: Both client and server (Server-side authoritative).
- Q: Real-time State Management: How should real-time guard positions be stored? → A: Redis-backed state (for persistence and scaling).
- Q: Multi-Tenancy Strategy: Should the system support multiple independent organizations? → A: Logical isolation (Shared DB with tenant_id).

- **FR-040**: System MUST support logical multi-tenancy by including a `tenant_id` on all core entities to isolate data between different client organizations.

- **FR-039**: System MUST use a Redis-backed state for Socket.io to ensure real-time guard positions persist across restarts and support horizontal scaling.

- **FR-038**: System MUST perform geofence validation on both the mobile client (for UX) and the server (authoritative check) to prevent spoofing.

- **FR-037**: System MUST support a dual-provider storage strategy for media: local filesystem for development/testing and S3-compatible object storage for production.

> **Scope Note — Mobile Development**: The tasks in `tasks.md` primarily cover backend API development. Mobile Android app implementation (Kotlin/Jetpack Compose, Room database, SyncQueue, Foreground GPS service) is tracked in a dedicated mobile tasks phase (Phase 14) appended to `tasks.md`. Backend tasks include offline-sync API endpoints (e.g., T066) that the mobile app will consume.

### Key Entities

- **User**: A person with a role (Admin, Manager, Supervisor, Guard). Key attributes: name, email, password hash, role, assigned sites, status (active/inactive).
- **Role**: Authorization level. One of: Admin, Manager, Supervisor, Guard. Each role has a defined set of permissions.
- **Site**: A physical security location. Key attributes: name, address, geofence boundary (GPS coordinates), assigned guards, associated checkpoints.
- **Checkpoint**: A verification point within a site. Key attributes: site reference, type (NFC / QR / GPS), tag/code identifier, GPS coordinates, display order.
- **PatrolTemplate**: An ordered sequence of checkpoints defining a patrol route. Key attributes: name, site reference, checkpoint order, estimated duration, assigned frequency.
- **PatrolRun**: An executed instance of a patrol template. Key attributes: template reference, guard reference, start/end time, per-checkpoint verification records (timestamp, GPS, status).
- **Incident**: A reported security event. Key attributes: reporter (guard), site, description, severity, photo evidence, GPS location, workflow state (New / Investigating / Resolved / Closed), timestamps.
- **Shift**: A guard's work period. Key attributes: guard reference, site reference, clock-in/out timestamps + GPS, scheduled vs actual hours, break records.
- **SOS Alert**: An emergency dispatch event. Key attributes: triggering guard, GPS coordinates, timestamp, status (active / responding / resolved), assigned responders.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Guards can complete a full patrol (5+ checkpoints) with NFC/QR/GPS verification in the mobile app within 30 minutes for a standard route.
- **SC-002**: SOS alerts are received by the Command Center Dashboard within 2 seconds of the guard pressing the panic button (under normal network conditions).
- **SC-003**: Real-time guard position updates appear on the Command Center map with no more than 5-second latency per GPS update cycle.
- **SC-004**: System supports 100+ concurrent WebSocket connections for guard tracking without degradation below 95% message delivery rate.
- **SC-005**: Offline patrol checkpoint scans sync to the server within 10 seconds of connectivity restoration.
- **SC-006**: Admin Panel pages load in under 2 seconds at 25 Mbps down / 5 Mbps up (FCC broadband definition) with <100ms latency.
- **SC-007**: 80%+ backend code coverage with Jest unit and integration tests.
- **SC-008**: All RBAC-protected endpoints return HTTP 403 for unauthorized users with 100% correctness.
- **SC-009**: Report generation (Excel/CSV export) for up to 10,000 patrol runs completes within 10 seconds.
- **SC-010**: Geofenced clock-in correctly accepts positions within the site boundary and rejects positions outside with 95%+ accuracy (accounting for GPS drift up to 50m configurable tolerance).
