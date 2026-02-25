# Checkpoint Verification Security & Anti-Cheat Specification

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-02-24
**Agent:** @security-auditor

---

## 1. Overview
The integrity of the PatrolManager system relies on the physical presence of guards at designated checkpoints. This document defines the security controls and anti-cheat mechanisms to prevent spoofing, automated scans, and other forms of verification fraud.

## 2. Threat Model: Verification Spoofing

| Threat | Method | Mitigation |
| :--- | :--- | :--- |
| **GPS Spoofing** | Using "Fake GPS" apps to simulate location. | Accuracy filtering, velocity checks, and mandatory NFC/QR secondary verification. |
| **QR Photocopying** | Scanning a photo or printout of a QR code from a different location. | Mandatory GPS proximity check (within 50m) for all QR scans. |
| **NFC Replay/Clone** | Using a cloned NFC tag or replaying a captured UID. | Cryptographic nonces or signed payloads (if hardware supports) + GPS proximity. |
| **Manual Override** | Supervisor/Guard manually marking a checkpoint as "verified" without being there. | Audit logging of all manual overrides with mandatory reason codes. |
| **Automated Verification** | Using scripts or modified apps to send verification API calls. | Rate limiting, HMAC-signed request payloads, and temporal validation. |

---

## 3. Core Security Controls

### 3.1 Unified Proximity Enforcement
Regardless of the primary verification method (NFC/QR), the system **MUST** perform a GPS proximity check.
- **Rule**: A verification is rejected if the guard's current GPS location is > `allowed_distance_meters` (default 50m) from the checkpoint coordinates.
- **Grace**: Allow for GPS accuracy (e.g., `effective_distance = actual_distance - gps_accuracy`).

### 3.2 Temporal Validation
To prevent "offline log injection" or delayed syncing of fraudulent data.
- **Max Sync Delay**: Verification data older than `X` minutes (default 30 min) from the current server time will be flagged for "Late Sync Review".
- **Timestamp Integrity**: The server records both the `client_timestamp` and `server_received_timestamp`. Large discrepancies trigger an alert.

### 3.3 Dynamic QR Codes (Future Phase)
To eliminate static QR photocopying:
- Generate time-based QR codes that expire every 60 seconds.
- Requires E-ink displays or tablets at checkpoints (higher infrastructure cost).

---

## 4. Anti-Cheat Algorithms

### 4.1 Velocity Check (Teleportation Detection)
Calculate the speed of travel between two consecutive checkpoint verifications.
- **Formula**: `speed = distance_between(cp1, cp2) / (timestamp2 - timestamp1)`
- **Threshold**: If `speed > 15 m/s` (approx. 54 km/h) for interior patrols, flag as "Suspicious Velocity."
- **Action**: Alert supervisor; do not block (to avoid false positives in vehicles), but require review.

### 4.2 Pattern Analysis (Automation Detection)
Detect robotic behavior in patrols.
- **Check**: Exactly identical intervals between checkpoints (e.g., exactly 120.00s between every scan).
- **Check**: Identical GPS accuracy for every point (often seen in basic spoofers).

### 4.3 Sequence Integrity
If a `PatrolTemplate` is marked as **Strictly Sequential**:
- Verification of Checkpoint `N` is **REJECTED** if Checkpoint `N-1` is not verified.
- Prevents guards from "jumping ahead" or skipping difficult areas.

---

## 5. Secure Payload Structure

To prevent replay attacks on the API, the mobile app should sign the verification payload.

```json
{
  "patrolRunId": 123,
  "checkpointId": 456,
  "verificationType": "nfc",
  "payload": "encrypted_or_signed_tag_data",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194,
    "accuracy": 5.2
  },
  "timestamp": "2026-02-24T14:30:00Z",
  "nonce": "random_string_per_request",
  "signature": "hmac_sha256_of_payload"
}
```

---

## 6. Audit & Alerting

### 6.1 Flagging System
Verifications are assigned a `trust_score` (0-100). Low scores result in "Flagged" status:
- `GPS_ACCURACY_LOW` (-20 points)
- `NEAR_BOUNDARY` (-10 points)
- `VELOCITY_HIGH` (-50 points)
- `MANUAL_OVERRIDE` (-100 points - always requires review)

### 6.2 Supervisor Dashboard Alerts
- **Real-time Alert**: Triggered for `VELOCITY_HIGH` or `GEOFENCE_BREACH`.
- **Review Queue**: All patrols with a total `trust_score < 80` must be reviewed by a manager before being marked as "Legitimate."

---

## 7. Mobile App Hardening
- **Root/Jailbreak Detection**: The app should refuse to run or disable verification on compromised devices.
- **Mock Location Detection**: Use Android/iOS APIs to detect if the location provider is a "Mock Provider."
