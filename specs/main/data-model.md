# Data Model: PatrolManager

This document outlines the core entities and their relationships within the PatrolManager ecosystem.

## Core Entities

### 1. Tenant
- **Fields**:
  - `id`: UUID (Primary Key)
  - `name`: String (Required)
  - `domain`: String (Unique)
  - `status`: Enum (active, suspended, inactive)
- **Relationships**:
  - Has many Users
  - Has many Sites

### 2. User
- **Fields**:
  - `id`: Integer (Primary Key)
  - `tenant_id`: UUID (Foreign Key)
  - `email`: String (Unique, Lowercase)
  - `passwordHash`: String (Required)
  - `firstName`: String
  - `lastName`: String
  - `roleId`: Integer (Foreign Key)
  - `status`: Enum (active, inactive, suspended, pending)
  - `accountLockedUntil`: DateTime (Optional)
  - `failedLoginAttempts`: Integer (Default: 0)
- **Relationships**:
  - Belongs to Role
  - Belongs to Tenant
  - Has many Shifts

### 3. Role
- **Fields**:
  - `id`: Integer (Primary Key)
  - `name`: Enum (Admin, Manager, Supervisor, Guard)
  - `permissions`: JSON (List of permission strings)

### 4. Site
- **Fields**:
  - `id`: Integer (Primary Key)
  - `tenant_id`: UUID (Foreign Key)
  - `name`: String (Required)
  - `address`: String
  - `geofence`: JSON (Polygon or Circle coordinates + radius)
- **Relationships**:
  - Belongs to Tenant
  - Has many Checkpoints
  - Has many PatrolTemplates

### 5. Checkpoint
- **Fields**:
  - `id`: Integer (Primary Key)
  - `site_id`: Integer (Foreign Key)
  - `name`: String
  - `type`: Enum (NFC, QR, GPS)
  - `identifier`: String (NFC Tag ID or QR Code String)
  - `location`: Geometry(Point) (Latitude, Longitude)
  - `order`: Integer (Default sequence)
- **Relationships**:
  - Belongs to Site

### 6. PatrolTemplate
- **Fields**:
  - `id`: Integer (Primary Key)
  - `site_id`: Integer (Foreign Key)
  - `name`: String
  - `checkpoints`: JSON (Ordered list of checkpoint IDs)
- **Relationships**:
  - Belongs to Site

### 7. PatrolRun
- **Fields**:
  - `id`: Integer (Primary Key)
  - `template_id`: Integer (Foreign Key)
  - `guard_id`: Integer (Foreign Key)
  - `startTime`: DateTime
  - `endTime`: DateTime (Nullable)
  - `verifications`: JSON (Array of {checkpointId, timestamp, location, status})
- **Relationships**:
  - Belongs to PatrolTemplate
  - Belongs to User (Guard)

### 8. Incident
- **Fields**:
  - `id`: Integer (Primary Key)
  - `tenant_id`: UUID (Foreign Key)
  - `reporter_id`: Integer (Foreign Key)
  - `site_id`: Integer (Foreign Key)
  - `title`: String
  - `description`: Text
  - `severity`: Enum (low, medium, high, critical)
  - `status`: Enum (new, investigating, resolved, closed)
  - `photoUrl`: String (Nullable)
  - `location`: Geometry(Point)
- **Relationships**:
  - Belongs to User (Reporter)
  - Belongs to Site

### 9. AuditLog
- **Fields**:
  - `id`: BigInt (Primary Key)
  - `tenant_id`: UUID (Foreign Key)
  - `userId`: Integer (Foreign Key)
  - `action`: String (e.g., "USER_LOGIN", "SOS_TRIGGERED")
  - `resourceType`: String
  - `resourceId`: String
  - `payload`: JSONB (Metadata about the action)
  - `timestamp`: DateTime (Default: now)
- **Relationships**:
  - Belongs to User
  - Belongs to Tenant
