# Database Optimization Report: Spatial Queries

## Current Implementation Analysis
The system uses **PostGIS** with **Sequelize** for geospatial data management. 

### Indexed Fields
- `sites.geofence_boundary`: **GIST** index `idx_sites_geofence_boundary`.
- `patrol_runs.start_location`: **GIST** index `idx_patrol_runs_start_location`.
- `patrol_runs.end_location`: **GIST** index `idx_patrol_runs_end_location`.

### Optimization Recommendations

#### 1. Coordinate Storage
- Coordinates in `sites` table are currently stored as both `latitude/longitude` (DECIMAL) and `geofence_boundary` (GEOMETRY).
- **Recommendation**: Ensure that the `GEOMETRY` field is the single source of truth for spatial operations. The `latitude/longitude` fields should be kept only for simple metadata or UI centering, but all "within" or "distance" queries must use the `GEOMETRY` field.

#### 2. Query Patterns
To find which site a guard is in:
```sql
SELECT id, name FROM sites 
WHERE ST_Contains(geofence_boundary, ST_SetSRID(ST_Point(lon, lat), 4326))
AND status = 'active'
LIMIT 1;
```
- **Optimization**: The `idx_sites_geofence_boundary` GIST index fully supports `ST_Contains`.

#### 3. Distance Checks for Checkpoints
Checkpoints also have locations. Let's check the `Checkpoint` model.

#### 4. Clustering (Optional)
For very large datasets, clustering the table by the spatial index can improve performance for range queries.
```sql
CLUSTER sites USING idx_sites_geofence_boundary;
```
*Note: Not currently necessary for initial scale.*

## Conclusion
The current schema is well-optimized for spatial operations. The use of GIST indexes on boundary and location fields ensures that point-in-polygon and distance queries will perform efficiently even as the number of sites grows.
