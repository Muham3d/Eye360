# Database Monitoring Queries

## Overview

Collection of PostgreSQL queries for monitoring database health, performance, and replication status in the PatrolManager production environment.

---

## Replication Status

### Check Replication Lag

```sql
-- Run on PRIMARY to see replica lag
SELECT
  client_addr AS replica_ip,
  state AS connection_state,
  sync_state AS replication_mode,
  replay_lag / 1000 AS lag_seconds,
  flush_lag / 1000 AS flush_lag_seconds
FROM pg_stat_replication
ORDER BY replay_lag DESC;
```

**Output:**
| replica_ip | connection_state | replication_mode | lag_seconds |
|------------|------------------|------------------|-------------|
| 10.0.1.45  | streaming        | sync             | 0.5         |

---

### Check Replica Status

```sql
-- Run on REPLICA to check replication status
SELECT
  now() - pg_last_xact_replay_timestamp() AS replication_lag,
  pg_is_in_recovery() AS is_replica,
  pg_last_xact_replay_timestamp() AS last_replay_time,
  pg_last_recv_receive_timestamp() AS last_receive_time;
```

---

### Replication Throughput

```sql
-- Bytes sent to replicas
SELECT
  client_addr,
  pg_size_pretty(pg_stat_wal.sent_lsn * 8192) AS sent_size,
  pg_stat_wal.write_lsn,
  pg_stat_wal.flush_lsn
FROM pg_stat_wal
CROSS JOIN pg_stat_replication;
```

---

## Connection Status

### Active Connections by Role

```sql
SELECT
  usename AS username,
  application_name,
  client_addr,
  state,
  COUNT(*) AS connection_count,
  MAX(state_change) AS longest_running_state
FROM pg_stat_activity
WHERE state IS NOT NULL
GROUP BY usename, application_name, client_addr, state
ORDER BY connection_count DESC;
```

---

### Connection Pool Status (Sequelize)

```sql
-- Check active Sequelize connections
SELECT
  COUNT(*) FILTER (WHERE state = 'active') AS active_connections,
  COUNT(*) FILTER (WHERE state = 'idle') AS idle_connections,
  COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
  COUNT(*) AS total_connections
FROM pg_stat_activity
WHERE application_name LIKE '%patrolmanager%';
```

---

### Long-Running Queries

```sql
-- Queries running longer than 5 minutes
SELECT
  pid,
  now() - query_start AS duration,
  state,
  usename,
  application_name,
  LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '5 minutes'
ORDER BY duration DESC;
```

---

### Idle in Transaction

```sql
-- Connections idle in transaction (potential locks)
SELECT
  pid,
  now() - xact_start AS idle_duration,
  usename,
  application_name,
  LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE state = 'idle in transaction'
  AND now() - xact_start > interval '1 minute'
ORDER BY idle_duration DESC;
```

---

## Query Performance

### Slowest Queries

```sql
-- Using pg_stat_statements extension
SELECT
  query,
  calls,
  total_exec_time / 1000 AS total_time_seconds,
  mean_exec_time / 1000 AS avg_time_seconds,
  max_exec_time / 1000 AS max_time_seconds,
  rows / calls AS avg_rows
FROM pg_stat_statements
WHERE calls > 10
ORDER BY mean_exec_time DESC
LIMIT 20;
```

---

### Query Performance by Table

```sql
-- Top tables by query time
SELECT
  schemaname,
  tablename,
  seq_scan,
  seq_tup_read,
  idx_scan,
  idx_tup_fetch,
  n_tup_ins,
  n_tup_upd,
  n_tup_del
FROM pg_stat_user_tables
ORDER BY seq_tup_read + idx_tup_fetch DESC
LIMIT 20;
```

---

### Index Usage

```sql
-- Unused or inefficient indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE idx_scan < 50
  AND schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY idx_scan ASC;
```

---

### Missing Indexes

```sql
-- Potential missing indexes based on sequential scans
SELECT
  schemaname || '.' || tablename AS table,
  seq_scan,
  seq_tup_read,
  idx_scan,
  CASE
    WHEN seq_scan > 1000 AND seq_tup_read > 10000
    THEN 'Consider adding index'
    ELSE 'OK'
  END AS recommendation
FROM pg_stat_user_tables
ORDER BY seq_scan DESC
LIMIT 20;
```

---

## Table Statistics

### Table Size

```sql
-- Largest tables
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size,
  pg_total_relation_size(schemaname || '.' || tablename) AS size_bytes
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY size_bytes DESC
LIMIT 20;
```

---

### Table Row Count Estimate

```sql
-- Row counts for all tables
SELECT
  schemaname,
  tablename,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

---

### Bloat Check

```sql
-- Table and index bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS size,
  CASE
    WHEN n_dead_tup > n_live_tup * 0.1
    THEN 'High bloat - consider VACUUM'
    ELSE 'OK'
  END AS bloat_status
FROM pg_stat_user_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY (n_dead_tup::FLOAT / GREATEST(n_live_tup, 1)) DESC;
```

---

## Transaction Statistics

### Transaction Throughput

```sql
-- Transactions per second (last 5 minutes)
SELECT
  (xact_commit + xact_rollback) /
    EXTRACT(EPOCH FROM (now() - stats_reset)) AS tps_current,
  xact_commit,
  xact_rollback,
  blks_read,
  blks_hit,
  ROUND(100 * blks_hit / NULLIF(blks_read + blks_hit, 0), 2) AS cache_hit_ratio
FROM pg_stat_database
WHERE datname = current_database();
```

---

### Lock Status

```sql
-- Current locks
SELECT
  l.locktype,
  l.relation::regclass AS table_name,
  l.mode,
  l.granted,
  a.usename,
  a.query,
  a.query_start
FROM pg_locks l
JOIN pg_stat_activity a ON l.pid = a.pid
WHERE l.granted = FALSE
ORDER BY a.query_start;
```

---

### Blocking Queries

```sql
-- Queries blocking others
SELECT
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement,
  blocked_activity.application_name AS blocked_app
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks
  ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.DATABASE IS NOT DISTINCT FROM blocked_locks.DATABASE
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.GRANTED;
```

---

## PatrolManager Specific Queries

### Active Shifts Summary

```sql
-- Currently active shifts by site
SELECT
  s.id AS site_id,
  s.name AS site_name,
  COUNT(sh.id) AS active_shifts,
  COUNT(DISTINCT sh.guard_id) AS active_guards
FROM sites s
LEFT JOIN shifts sh ON sh.site_id = s.id
  AND sh.status = 'active'
  AND sh.start_time <= NOW()
  AND (sh.end_time IS NULL OR sh.end_time > NOW())
GROUP BY s.id, s.name
ORDER BY active_shifts DESC;
```

---

### Incident Status

```sql
-- Open incidents by severity
SELECT
  severity,
  COUNT(*) AS incident_count,
  MIN(created_at) AS oldest_incident,
  MAX(created_at) AS newest_incident
FROM incidents
WHERE status IN ('open', 'in_progress')
GROUP BY severity
ORDER BY
  CASE severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    ELSE 4
  END;
```

---

### Patrol Completion Rate

```sql
-- Patrol completion rate (last 7 days)
SELECT
  s.name AS site_name,
  COUNT(pr.id) AS total_patrols,
  COUNT(pr.id) FILTER (WHERE pr.status = 'completed') AS completed,
  ROUND(100 * COUNT(pr.id) FILTER (WHERE pr.status = 'completed')::NUMERIC / NULLIF(COUNT(pr.id), 0), 2) AS completion_rate,
  AVG(pr.duration_seconds) FILTER (WHERE pr.status = 'completed') AS avg_duration_seconds
FROM patrol_runs pr
JOIN sites s ON pr.site_id = s.id
WHERE pr.scheduled_start >= NOW() - INTERVAL '7 days'
GROUP BY s.id, s.name
ORDER BY completion_rate DESC;
```

---

### Checkpoint Verification Stats

```sql
-- Checkpoint verification statistics (last 30 days)
SELECT
  pc.type AS verification_type,
  COUNT(*) AS total_verifications,
  COUNT(*) FILTER (WHERE pc.verified = TRUE) AS successful,
  ROUND(100 * COUNT(*) FILTER (WHERE pc.verified = TRUE)::NUMERIC / COUNT(*), 2) AS success_rate,
  AVG(pc.verification_time_seconds) AS avg_verification_time
FROM patrol_checkpoints pc
WHERE pc.created_at >= NOW() - INTERVAL '30 days'
GROUP BY pc.type
ORDER BY success_rate DESC;
```

---

## Health Check Summary

### Overall Database Health

```sql
-- Comprehensive health check
WITH conn_stats AS (
  SELECT
    COUNT(*) FILTER (WHERE state = 'active') AS active,
    COUNT(*) FILTER (WHERE state = 'idle') AS idle,
    COUNT(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_trans
  FROM pg_stat_activity
  WHERE datname = current_database()
),
rep_lag AS (
  SELECT COALESCE(MAX(replay_lag), 0) / 1000 AS max_lag_seconds
  FROM pg_stat_replication
),
tx_stats AS (
  SELECT
    xact_commit + xact_rollback AS total_transactions,
    blks_read,
    blks_hit,
    ROUND(100 * blks_hit / NULLIF(blks_read + blks_hit, 0), 2) AS cache_hit_ratio
  FROM pg_stat_database
  WHERE datname = current_database()
)
SELECT
  'Connection Pool' AS metric,
  active AS active_connections,
  idle AS idle_connections,
  idle_in_trans AS idle_in_transaction
FROM conn_stats
UNION ALL
SELECT
  'Replication' AS metric,
  max_lag_seconds AS lag_seconds,
  CASE WHEN max_lag_seconds < 30 THEN 1 ELSE 0 END AS healthy,
  NULL::BIGINT AS idle_in_transaction
FROM rep_lag
UNION ALL
SELECT
  'Cache Hit Ratio' AS metric,
  cache_hit_ratio AS ratio,
  CASE WHEN cache_hit_ratio > 95 THEN 1 ELSE 0 END AS healthy,
  NULL::BIGINT AS idle_in_transaction
FROM tx_stats;
```

---

## CloudWatch Metrics Integration

### Export Custom Metrics

```bash
# Script to export custom metrics to CloudWatch
#!/bin/bash

# Replication Lag
LAG=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COALESCE(MAX(replay_lag), 0) / 1000 FROM pg_stat_replication")

aws cloudwatch put-metric-data \
  --namespace PatrolManager/Database \
  --metric-name ReplicationLag \
  --value $LAG \
  --unit Seconds

# Connection Count
CONN=$(psql -h $DB_HOST -U $DB_USER -d $DB_NAME -t -c \
  "SELECT COUNT(*) FROM pg_stat_activity WHERE datname = current_database()")

aws cloudwatch put-metric-data \
  --namespace PatrolManager/Database \
  --metric-name ActiveConnections \
  --value $CONN \
  --unit Count
```

---

## References

- [PostgreSQL Statistics Views](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [pg_stat_statements](https://www.postgresql.org/docs/current/pgstatstatements.html)
- [AWS RDS Monitoring](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Monitoring.html)
