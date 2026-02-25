# Geofence Service Technical Design

## Overview
The `GeofenceService` is a core component of the PatrolManager system responsible for spatial validation, GPS data integrity, and real-time monitoring of guard positions relative to site boundaries.

## Core Requirements
1. **GPS Data Validation**: Filter incoming GPS points based on accuracy metrics.
2. **Point-in-Polygon (PiP)**: Determine if a guard is within the defined boundaries of a site.
3. **Breach Detection**: Identify when a guard enters or exits a geofenced area.
4. **Buffer Zone Management**: Provide a "grace" area around geofences to account for GPS jitter.
5. **Distance Calculations**: Calculate distances between guards and checkpoints using geodetic formulas.

## Architecture

### Value Objects
- **GPSLocation**: Encapsulates latitude, longitude, and accuracy. Includes basic validation logic.
- **GeofenceBoundary**: Encapsulates a GeoJSON Polygon and a buffer distance. Immutable and self-validating.

### Algorithms

#### 1. Point-in-Polygon (Ray Casting)
For runtime validation (outside the database), the service uses the **Ray Casting algorithm**:
- For each ring (exterior and holes):
  - Cast a ray from the point to infinity.
  - Count intersections with polygon edges.
  - An odd number of intersections means the point is inside.
- A point is "inside" if it is in the exterior ring AND NOT in any hole.

#### 2. GPS Accuracy Filtering
To prevent "location jumping" due to poor satellite signal:
- Every GPS point has an `accuracy` property (horizontal accuracy in meters).
- Points with `accuracy > CONFIG.maxAccuracyMeters` (default 20m) are rejected.
- Points with `accuracy > CONFIG.warningAccuracyMeters` (default 10m) are flagged with warnings.

#### 3. Breach Detection (State Tracking)
- The service maintains a lightweight in-memory cache of the last known position for each active guard.
- When a new valid point arrives:
  1. Check previous state (`wasInside`).
  2. Check current state (`isInside`).
  3. If `wasInside` is false and `isInside` is true → **Entry Event**.
  4. If `wasInside` is true and `isInside` is false → **Exit Event**.

#### 4. Buffer Zone (Buffer Tolerance)
To handle boundary jitter:
- A `bufferToleranceMeters` (default 5m) is added to the geofence check.
- Validation results include `isInBufferZone` which is true if `distanceToBoundary <= bufferToleranceMeters`.

#### 5. Distance (Haversine Formula)
For spherical distance calculations between two points:
```
a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)
c = 2 ⋅ atan2( √a, √(1−a) )
d = R ⋅ c
```
Where R = 6,371km.

## Database Integration (PostGIS)
While the `GeofenceService` handles logic in the application layer, the database layer utilizes PostGIS for optimized spatial queries:
- **Sites Table**: Uses `GEOMETRY(POLYGON, 4326)` for `geofence_boundary`.
- **Indexing**: A `GIST` index is used on the boundary field to speed up `ST_Contains` and `ST_Distance` queries.
- **SRID**: All spatial data uses **SRID 4326** (WGS 84).

## Success Criteria
- [x] Accurate PiP validation for complex polygons with holes.
- [x] Efficient distance calculations using Haversine.
- [x] Robust GPS filtering based on accuracy.
- [x] Reliable state-based breach detection.
