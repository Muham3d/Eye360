# Checkpoint Verification Service Design

## Overview
The `CheckpointVerificationService` is a specialized service responsible for validating that a guard has physically reached a checkpoint using various methods (GPS, NFC, QR). It integrates security controls and anti-cheat algorithms to ensure data integrity.

## 1. Unified Verification Interface

The service provides a single entry point for all verification types.

### `verify(data: ICheckpointVerificationData): Promise<IVerificationResult>`

#### Input Data (`ICheckpointVerificationData`):
- `patrolRunId`: Context of the active patrol.
- `checkpointId`: The checkpoint being verified.
- `verificationType`: `GPS`, `NFC`, or `QR`.
- `payload`: The scanned data (for NFC/QR).
- `location`: Current GPS coordinates and accuracy.
- `timestamp`: Time of the scan.
- `nonce`: For replay protection.

#### Output Data (`IVerificationResult`):
- `isValid`: Boolean status.
- `trustScore`: 0-100 score based on anti-cheat rules.
- `errors`: List of validation errors.
- `warnings`: List of non-fatal warnings (e.g., degraded accuracy).
- `distanceToTarget`: Calculated distance in meters.

---

## 2. Verification Strategies

The service employs a strategy-based approach (internal or via separate modules) for different methods.

### 2.1 GPS Verification (Proximity)
- **Logic**: Compares guard's current location with the checkpoint's stored coordinates.
- **Rule**: `distance <= checkpoint.allowed_distance_meters + location.accuracy`.
- **Primary Use**: Passive verification or as a backup.

### 2.2 NFC Verification (Tag Matching + Proximity)
- **Logic**: 
    1. Validate `payload` (NFC UID or data) against `checkpoint.nfc_tag_id`.
    2. **Mandatory**: Perform GPS proximity check (within 50m).
- **Secondary Use**: High-security physical presence check.

### 2.3 QR Verification (Code Matching + Proximity)
- **Logic**:
    1. Validate `payload` (scanned QR data) against `checkpoint.qr_code_data`.
    2. **Mandatory**: Perform GPS proximity check (within 50m).
- **Secondary Use**: Cost-effective physical presence check.

---

## 3. Anti-Cheat Integration

The service wraps all verifications with the following security checks:

### 3.1 Proximity Gatekeeper
No verification (NFC/QR/GPS) is valid if the guard is outside the site's geofence or too far from the checkpoint.

### 3.2 Velocity Gatekeeper
Compare the current verification with the previous one (`PatrolCheckpointLog`) to detect impossible travel speeds.

### 3.3 Replay Protection
Uses the `nonce` and `timestamp` to ensure the same verification event isn't sent twice.

---

## 4. Trust Score Calculation

The `trustScore` is derived from:
- **Base**: 100 points.
- **Deductions**:
    - Degraded GPS accuracy (>10m): -10 points.
    - Near boundary (>80% of allowed distance): -5 points.
    - Minor velocity anomaly: -30 points.
- **Hard Rejection (isValid = false)**:
    - GPS accuracy > `maxAccuracyMeters` (20m).
    - Distance > `allowed_distance_meters`.
    - NFC/QR mismatch.
    - Impossible velocity (>15m/s interior).

---

## 5. Integration Workflow

1. `PatrolExecutionService` receives a verification request from the Mobile API.
2. It delegates the check to `CheckpointVerificationService`.
3. `CheckpointVerificationService` returns a result with a `trustScore`.
4. If `isValid`, `PatrolExecutionService` creates a `PatrolCheckpointLog` entry.
5. If `trustScore < 80`, an alert is flagged in the system for supervisor review.
