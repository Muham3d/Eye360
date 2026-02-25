# Patrol Domain Design Specification

## Overview

This document describes the domain entities, relationships, and validation rules for the Patrol Management system with geofencing and GPS verification capabilities.

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                            PATROL DOMAIN ENTITY RELATIONSHIPS                           │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│    ┌──────────────┐         ┌──────────────┐         ┌──────────────┐                 │
│    │     Site     │ 1     N │  Checkpoint  │ N     N │PatrolTemplate│                 │
│    ├──────────────┤─────────├──────────────┤─────────├──────────────┤                 │
│    │ id           │         │ id           │         │ id           │                 │
│    │ name         │         │ site_id      │         │ site_id      │                 │
│    │ geofence_    │         │ location     │         │ name         │                 │
│    │   boundary   │         │ verification │         │ estimated_   │                 │
│    │ geofence_    │         │   _type      │         │   duration   │                 │
│    │   buffer     │         │ gps_tolerance│         │ max_         │                 │
│    │ timezone     │         │ nfc_code     │         │   completion │                 │
│    │ status       │         │ qr_code      │         │   _time      │                 │
│    └──────────────┘         │ order_index  │         │ required_    │                 │
│                             └──────────────┘         │   role       │                 │
│                                                       │ status       │                 │
│                             ┌──────────────┐         └──────┬───────┘                 │
│                             │PatrolCheckpt │                │                         │
│                             │  (join)      │ 1             │                         │
│                             ├──────────────┤ N             │                         │
│                             │ template_id  │◄──────────────┘                         │
│                             │ checkpoint_id│                                        │
│                             │ sequence_    │         ┌──────────────┐                │
│                             │   order      │         │  PatrolRun   │                │
│                             │ required_    │    N  1 ├──────────────┤                │
│                             │   photo      │─────────│ id           │                │
│                             │ time_window  │         │ template_id  │                │
│                             │ points_value │         │ guard_id     │                │
│                             └──────────────┘         │ start_time   │                │
│                                                      │ end_time     │                │
│                                                      │ status       │                │
│                                                      │ completion_% │                │
│                             ┌──────────────┐         │ total_score  │                │
│                             │PatrolCheckpt │ 1     N └──────┬───────┘                │
│                             │     Log      │◄───────────────┘                         │
│                             ├──────────────┤                │                         │
│                             │ id           │         ┌──────┴───────┐                 │
│                             │ patrol_run_  │         │    User     │                 │
│                             │   id         │    1  N ├────────────┤                 │
│                             │ checkpoint_  │─────────│ id          │                 │
│                             │   id         │         │ role_id     │                 │
│                             │ verified_at  │         └─────────────┘                 │
│                             │ location     │                                        │
│                             │ verification │                                        │
│                             │   _metadata  │                                        │
│                             │ status       │                                        │
│                             └──────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

## Domain Entities

### 1. Site

Represents a physical location where security patrols are conducted.

| Field | Type | Description |
|-------|------|-------------|
| id | number | Primary key |
| name | string | Unique site name |
| description | string | Optional description |
| address | string | Physical address |
| geofence_boundary | GeoJSONPolygon | GPS boundary polygon |
| geofence_buffer | number | Buffer zone in meters |
| timezone | string | Site timezone (IANA) |
| status | SiteStatus | active, inactive, under_maintenance, archived |
| created_by_id | number | FK to users table |
| created_at | Date | Creation timestamp |
| updated_at | Date | Last update timestamp |

### 2. Checkpoint

Represents a verification point within a site.

| Field | Type | Description |
|-------|------|-------------|
| id | number | Primary key |
| site_id | number | FK to sites table |
| name | string | Checkpoint name |
| description | string | Optional description |
| location | GeoJSONPoint | GPS coordinates |
| verification_type | VerificationType | nfc, qr, gps |
| nfc_code | string | NFC tag identifier |
| qr_code | string | QR code content |
| gps_tolerance | number | GPS tolerance in meters |
| order_index | number | Display order |
| status | CheckpointStatus | active, inactive, maintenance, removed |
| created_at | Date | Creation timestamp |
| updated_at | Date | Last update timestamp |

### 3. PatrolTemplate

Defines a reusable patrol route.

| Field | Type | Description |
|-------|------|-------------|
| id | number | Primary key |
| site_id | number | FK to sites table |
| name | string | Template name |
| description | string | Optional description |
| estimated_duration | number | Expected duration (minutes) |
| max_completion_time | number | Maximum allowed time (minutes) |
| required_role | RequiredRoleLevel | guard, supervisor, manager |
| status | PatrolTemplateStatus | active, inactive, archived |
| created_by_id | number | FK to users table |
| created_at | Date | Creation timestamp |
| updated_at | Date | Last update timestamp |

### 4. PatrolCheckpoint (Join Table)

Associates checkpoints with templates in sequence.

| Field | Type | Description |
|-------|------|-------------|
| id | number | Primary key |
| template_id | number | FK to patrol_templates |
| checkpoint_id | number | FK to checkpoints |
| sequence_order | number | Verification order |
| required_photo | boolean | Photo required |
| time_window_start | string | Optional HH:MM format |
| time_window_end | string | Optional HH:MM format |
| points_value | number | Score value |
| created_at | Date | Creation timestamp |
| updated_at | Date | Last update timestamp |

### 5. PatrolRun

Represents an execution of a patrol template.

| Field | Type | Description |
|-------|------|-------------|
| id | number | Primary key |
| template_id | number | FK to patrol_templates |
| guard_id | number | FK to users (guard) |
| start_time | Date | Patrol start time |
| end_time | Date | Patrol end time |
| scheduled_date | Date | Scheduled date |
| status | PatrolRunStatus | pending, in_progress, completed, missed, abandoned |
| completion_percentage | number | 0-100 |
| missed_checkpoints_count | number | Count of missed checkpoints |
| total_score | number | Accumulated score |
| start_location | GeoJSONPoint | GPS start location |
| end_location | GeoJSONPoint | GPS end location |
| notes | string | Optional notes |
| abandoned_reason | string | Reason if abandoned |
| created_at | Date | Creation timestamp |
| updated_at | Date | Last update timestamp |

### 6. PatrolCheckpointLog

Records each checkpoint verification.

| Field | Type | Description |
|-------|------|-------------|
| id | number | Primary key |
| patrol_run_id | number | FK to patrol_runs |
| checkpoint_id | number | FK to checkpoints |
| verified_at | Date | Verification timestamp |
| verification_type | VerificationType | nfc, qr, gps |
| location | GeoJSONPoint | GPS location of verification |
| gps_accuracy | number | GPS accuracy in meters |
| photo_evidence | string | URL to photo |
| notes | string | Optional notes |
| status | PatrolCheckpointLogStatus | verified, missed, skipped |
| verification_metadata | JSON | Additional metadata |
| skipped_reason | string | Reason if skipped |
| missed_reason | string | Reason if missed |
| created_at | Date | Creation timestamp |
| updated_at | Date | Last update timestamp |

## Geofence Validation Specification

### Geofence Boundary Requirements

1. **Minimum Area**: 100 square meters
2. **Maximum Area**: 10 square kilometers
3. **Minimum Coordinates**: 4 (closed ring)
4. **Maximum Coordinates**: 1000 (performance limit)
5. **Must be closed**: First coordinate equals last
6. **No self-intersections**: Exterior ring cannot cross itself
7. **Valid coordinate range**: Latitude [-90, 90], Longitude [-180, 180]

### Point-in-Polygon Validation

Uses ray casting algorithm:

1. Cast a horizontal ray from the point to infinity
2. Count intersections with polygon edges
3. Odd count = inside, Even count = outside
4. Check holes (inner rings) separately

### Buffer Zone Calculation

- Buffer is a distance in meters from the boundary
- Points within buffer are considered "near" the geofence
- Used for GPS tolerance and clock-in/out validation

## GPS Validation Rules

### Accuracy Filtering

| Rule | Value | Action |
|------|-------|--------|
| Max accuracy | 20 meters | Reject if exceeded |
| Min accuracy | 0 meters | Reject if negative |

### Speed Validation

| Rule | Value | Action |
|------|-------|--------|
| Max speed | 50 m/s (~180 km/h) | Reject if exceeded |
| Min speed | 0 m/s | Reject if negative |

### Timestamp Validation

| Rule | Value | Action |
|------|-------|--------|
| Max future | 5 seconds | Reject if exceeded |
| Max stale | 5 minutes | Warn if exceeded |

### Anti-Spoofing Metadata

Collect and validate:
- Device model and OS
- App version
- Satellite count
- Altitude and altitude accuracy
- Speed and heading

## Verification Type Specifications

### NFC Verification

1. Guard taps NFC tag at checkpoint
2. App reads tag ID
3. Server validates tag ID matches checkpoint
4. Optional: Verify GPS location is within tolerance

### QR Code Verification

1. Guard scans QR code at checkpoint
2. App decodes QR content
3. Server validates QR code matches checkpoint
4. Optional: Verify GPS location is within tolerance

### GPS Verification

1. Guard triggers GPS verification
2. App captures current location
3. Server validates location within tolerance
4. Must have GPS accuracy <= 20 meters
5. Must not be moving too fast (>50 m/s)

## Repository Interface Definitions

All repository interfaces follow these principles:

1. **Pure TypeScript** - No database-specific imports
2. **DTO pattern** - Separate creation/update DTOs
3. **Error codes** - Enum-based error handling
4. **Pagination** - Consistent paginated result type
5. **Query options** - Flexible filtering and sorting

See individual repository files for complete interface definitions:

- `ISiteRepository.ts` - Site and geofence operations
- `ICheckpointRepository.ts` - Checkpoint CRUD and verification
- `IPatrolTemplateRepository.ts` - Template management
- `IPatrolCheckpointRepository.ts` - Template-checkpoint associations
- `IPatrolRunRepository.ts` - Patrol execution tracking
- `IPatrolCheckpointLogRepository.ts` - Verification logging

## Value Objects

### GPSLocation

Immutable value object for GPS coordinates with validation:
- Coordinate validation (lat/lon ranges)
- Accuracy filtering
- Speed validation
- Timestamp validation
- Distance calculation (Haversine formula)
- Bearing calculation

### GeofenceBoundary

Immutable value object for geofence polygons:
- GeoJSON Polygon validation
- Area and perimeter calculation
- Point-in-polygon testing
- Distance to boundary calculation
- Self-intersection detection

## Enums Summary

| Enum | Values |
|------|--------|
| SiteStatus | active, inactive, under_maintenance, archived |
| VerificationType | nfc, qr, gps |
| CheckpointStatus | active, inactive, maintenance, removed |
| PatrolTemplateStatus | active, inactive, archived |
| RequiredRoleLevel | guard, supervisor, manager |
| PatrolRunStatus | pending, in_progress, completed, missed, abandoned |
| PatrolCheckpointLogStatus | verified, missed, skipped |
