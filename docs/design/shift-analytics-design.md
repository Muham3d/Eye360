# Shift Management & Analytics Design Specification

## 1. Shift Domain Model

### Shift Entity
- `id`: Primary Key
- `site_id`: Reference to Site
- `guard_id`: Reference to User
- `status`: `SCHEDULED`, `CLOCKED_IN`, `CLOCKED_OUT`, `MISSED`, `CANCELLED`
- `scheduled_start`: Date/Time
- `scheduled_end`: Date/Time
- `actual_start`: Date/Time
- `actual_end`: Date/Time
- `clock_in_location`: GeoJSON Point
- `clock_out_location`: GeoJSON Point
- `notes`: Text

### Attendance Model
- Calculated based on actual vs scheduled hours.
- Tracks late clock-ins and early clock-outs.

## 2. Reporting Engine Architecture

### Components
- **ReportGenerator**: Core service to aggregate data from PatrolRuns, Incidents, and Shifts.
- **ExportService**: Converts aggregated data to `CSV`, `Excel`, or `PDF`.
- **Scheduler**: Uses `node-cron` to trigger periodic reports (Daily/Weekly).

### Report Types
- `Site Performance`: Completion rates, incident counts, patrol frequency.
- `Guard Activity`: Hours worked, checkpoints verified, trust scores.
- `Incident Summary`: Volume by type/priority, resolution times.

## 3. Performance Optimization Strategy

### Backend
- **Database**: Review and add composite indexes for common analytics queries (e.g., `site_id` + `created_at`).
- **Caching**: Use Redis (or in-memory) for dashboard statistics.

### Mobile
- **Battery**: Use `WorkManager` for non-urgent sync tasks. Adjust GPS frequency based on activity.
- **Data**: Delta-sync for checkpoints and sites.
