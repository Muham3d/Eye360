# PatrolManager Project Implementation Plan

This document outlines the strategic roadmap, technical specifications, and development phases for the **PatrolManager** system.

---

## 1. Refined Technical Stack

### Backend (API & Admin)
*   **Framework:** Express.js 4.19+ (Stable)
*   **Database:** PostgreSQL (Development & Production via Docker)
*   **ORM:** Sequelize 6.x
*   **Auth:** Passport.js (JWT for Mobile, Session for Web)
*   **Real-time:** Socket.io 4.x (with Heartbeat/Keep-alive)
*   **Templating:** EJS + Tailwind CSS 3.4
*   **Documentation:** Swagger/OpenAPI 3.0

### Mobile (Guard App)
*   **Platform:** Native Android (Kotlin)
*   **UI:** Jetpack Compose (Modern, declarative UI)
*   **Architecture:** Clean Architecture + MVVM
*   **Dependency Injection:** Hilt
*   **Networking:** Retrofit 2 + OkHttp 3
*   **Local DB:** Room (Offline-first with SyncQueue)
*   **Services:** Foreground Services (GPS), WorkManager (Sync)

---

## 2. Implementation Roadmap

### Phase 1: Core Foundation & Identity
*   **Backend:**
    *   Setup Express.js boilerplate with PostgreSQL (Docker Compose).
    *   Implement RBAC (Roles: Admin, Manager, Supervisor, Guard).
    *   Hybrid Auth: JWT for Mobile, Express-Session for Admin Web.
    *   Basic Admin UI (EJS/Tailwind) for User/Role management.
*   **Mobile:**
    *   Setup Hilt, Retrofit, and Navigation Compose.
    *   Implement Login, Logout, and Profile screens.
    *   Initial Room DB schema for offline caching.

### Phase 2: Patrol Engine & Geofencing
*   **Backend:**
    *   Entities: Sites, Checkpoints (NFC/QR/GPS), PatrolTemplates.
    *   Patrol Run logic: Sequence validation and GPS integrity checks.
*   **Mobile:**
    *   Foreground Service for persistent GPS tracking during shifts.
    *   Patrol Run Execution: NFC/QR scanning and checkpoint verification.
    *   SyncQueue implementation for offline checkpoint scans.

### Phase 3: Real-time Command & SOS
*   **Backend:**
    *   Socket.io integration for live guard positioning.
    *   Geospatial dispatch logic for SOS (Panic Alert).
    *   Command Center Live Dashboard (Real-time map and alert feed).
*   **Mobile:**
    *   Socket.io client for real-time location batching (5s intervals).
    *   Panic Button (SOS) with instant broadcast.
    *   Notification handling for nearby guard alerts.

### Phase 4: Incidents & Communication
*   **Backend:**
    *   Incident reporting with evidence (Image/Base64) processing.
    *   Workflow: New -> Investigating -> Resolved -> Closed.
    *   Push-to-Talk (PTT) audio streaming via WebSockets.
*   **Mobile:**
    *   Incident creation with camera integration.
    *   PTT interface with real-time audio streaming.
    *   Incident history and status tracking.

### Phase 5: HR, Analytics & Final Polish
*   **Backend:**
    *   Geofenced Clock-in/out and Shift management.
    *   Reporting Engine: Excel/CSV exports for site performance.
    *   Automated daily/weekly Cron-based reporting.
*   **Mobile:**
    *   Attendance/Shift dashboard.
    *   Offline data synchronization status UI.
    *   Battery optimization and foreground service refinements.

---

## 3. Testing & Quality Assurance
*   **Backend:** Unit and Integration tests using Jest + Supertest.
*   **Mobile:** Unit tests for ViewModels/UseCases; Compose UI tests.
*   **E2E:** Manual validation of real-time SOS and Patrol flows.
*   **Performance:** Stress testing Socket.io with simulated high-frequency location updates.

---

## 4. Deployment Strategy
*   **Process Management:** PM2 for zero-downtime reloads.
*   **Environment:** Strict `.env` configuration for all secrets and endpoints.
*   **Migrations:** Sequelize-CLI for version-controlled database schema updates.
