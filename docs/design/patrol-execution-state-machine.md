# Patrol Execution State Machine Design

## Overview
The `PatrolExecutionService` manages the lifecycle of a `PatrolRun`. This document defines the states, allowed transitions, and business rules for each phase of a patrol.

## 1. Patrol Run States

| State | Description |
| :--- | :--- |
| **SCHEDULED** | Initial state when a patrol is planned but not yet started. |
| **IN_PROGRESS** | The guard has explicitly started the patrol via the mobile app. |
| **PAUSED** | The patrol is temporarily suspended (e.g., for a break or emergency). |
| **COMPLETED** | All mandatory checkpoints have been verified, and the patrol is finished. |
| **ABANDONED** | The patrol was manually stopped by the guard or supervisor before completion. |
| **FAILED** | The patrol was automatically terminated due to a critical breach or time limit expiry. |
| **SKIPPED** | A scheduled patrol that was never started within its allowed window. |

## 2. State Transition Matrix

| From \ To | SCHEDULED | IN_PROGRESS | PAUSED | COMPLETED | ABANDONED | FAILED | SKIPPED |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **SCHEDULED** | - | Yes (1) | No | No | Yes (2) | No | Yes (3) |
| **IN_PROGRESS** | No | - | Yes (4) | Yes (5) | Yes (6) | Yes (7) | No |
| **PAUSED** | No | Yes (8) | - | No | Yes (9) | Yes (10) | No |
| **COMPLETED** | No | No | No | - | No | No | No |
| **ABANDONED** | No | No | No | No | - | No | No |
| **FAILED** | No | No | No | No | No | - | No |
| **SKIPPED** | No | No | No | No | No | No | - |

### Transition Rules:
1. **Start Patrol**: Only if site is active, guard is assigned, and within the `allowed_start_time` window. Sets `actual_start`.
2. **Pre-emptive Abandon**: Supervisor cancels a scheduled patrol.
3. **Auto-Skip**: System marks as skipped if current time > `scheduled_start` + grace period.
4. **Pause**: Guard indicates a temporary stop.
5. **Complete**: Only if `checkpoints_completed` >= `mandatory_checkpoints_total`. Sets `actual_end`.
6. **Abandon**: Guard or Supervisor stops an active patrol. Requires `abandonment_reason`.
7. **System Fail**: Triggered by critical geofence breach or max duration exceeded.
8. **Resume**: Guard returns to active status.
9. **Pause-to-Abandon**: Patrol abandoned while in paused state.
10. **Pause-to-Fail**: Automatic failure while paused (e.g., total duration exceeded).

## 3. Checkpoint Verification Logic

Within the **IN_PROGRESS** state, checkpoints are verified:

### Verification Methods:
- **GPS Proximity**: Guard within `allowed_distance_meters` of checkpoint coordinates.
- **NFC Scan**: Valid `nfc_tag_id` provided.
- **QR Scan**: Valid `qr_code_data` provided.

### Sequence Enforcement:
- **Strict Sequence**: If `PatrolTemplate.is_sequential` (to be confirmed/implemented) is true, checkpoint `N` can only be verified if `N-1` is complete.
- **Loose Sequence**: Checkpoints can be verified in any order, but total progress is tracked.

### Data Requirements per Checkpoint:
- Timestamp of verification.
- GPS coordinates at time of verification.
- Optional/Required photo evidence.
- Optional/Required notes.

## 4. Completion Logic
A patrol is eligible for the **COMPLETED** state when:
- All `is_mandatory` checkpoints in the `PatrolTemplate` have at least one valid log entry in `PatrolCheckpointLog`.
- `actual_end` is recorded.
- Final `completion_percentage` is calculated.

## 5. Failure & Alert Conditions
- **Geofence Breach**: If the guard's location is outside the `Site` geofence for > `X` minutes.
- **Missed Checkpoint**: If a mandatory checkpoint is not verified within its `time_limit_seconds` (if defined).
- **Time Limit**: If `actual_start` + `estimated_duration_minutes` * 1.5 is exceeded.

## 6. Real-time Synchronization
- Every checkpoint verification and state change must be queued in the mobile app's `SyncQueue` if offline.
- Server-side validation must be re-performed upon synchronization to ensure integrity.
