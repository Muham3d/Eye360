# API Contract: PatrolManager

This document defines the primary API endpoints for the PatrolManager system, divided into Admin Web and Mobile categories.

## 1. Authentication (Shared)

### POST /api/auth/login (Mobile)
- **Request**: `{ email, password }`
- **Response**: `200 OK { token, user: { id, firstName, role, tenantId } }`
- **Error**: `401 Unauthorized` (Invalid credentials), `423 Locked` (Account locked)

### POST /api/auth/web/login (Web)
- **Request**: `{ email, password }`
- **Response**: Sets `express-session` cookie; `302 Redirect` to Dashboard.

## 2. Mobile Guard Operations

### GET /api/mobile/assignments
- **Description**: Returns today's assigned sites and patrol templates.
- **Auth**: JWT (Guard role only)
- **Response**: `200 OK { sites: [...] }`

### POST /api/mobile/patrols/sync
- **Description**: Synchronizes offline patrol runs.
- **Payload**: Array of `PatrolRun` objects.
- **Conflict Handling**: Server-side validation with "Last-Write-Wins" + conflict flagging.

### POST /api/mobile/incidents
- **Payload**: `Multipart/form-data` { title, description, photo (file), severity, location }
- **Processing**: Stripe EXIF, resize image, store in S3/Local.

### POST /api/mobile/sos
- **Payload**: `{ location: { lat, lng }, timestamp }`
- **Action**: Broadcast via Socket.io to supervisors and nearby guards.

## 3. Admin & Supervisor Management

### GET /api/admin/sites
- **Auth**: Session (Admin/Manager/Supervisor)
- **Description**: List all sites for the active tenant.

### POST /api/admin/sites
- **Payload**: `{ name, address, geofence: { type: 'circle', center, radius } }`

### GET /api/admin/reports/patrol-completion
- **Payload**: `{ siteId, startDate, endDate }`
- **Response**: `.xlsx` file download or JSON data.

## 4. Real-time (Socket.io)

### Namespace: /tracking
- **Event: `location_update` (Client → Server)**
  - Payload: `{ guardId, location: { lat, lng }, status }`
- **Event: `sos_alert` (Server → Client)**
  - Payload: `{ guardId, guardName, location, timestamp }`
- **Event: `ptt_stream` (Duplex)**
  - Payload: Opus audio binary chunks.
