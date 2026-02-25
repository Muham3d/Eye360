/**
 * Prometheus Metrics Configuration
 *
 * Provides metrics collection for:
 * - HTTP request duration and count
 * - WebSocket connections
 * - Database query performance
 * - Business metrics (SOS alerts, patrols)
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// Create custom registry
export const prometheusRegistry = new Registry();

// Collect default metrics (CPU, memory, etc.)
collectDefaultMetrics({ register: prometheusRegistry, prefix: 'patrolmanager_' });

// =============================================================================
// HTTP Metrics
// =============================================================================

export const httpRequestDuration = new Histogram({
  name: 'patrolmanager_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [prometheusRegistry]
});

export const httpRequestCount = new Counter({
  name: 'patrolmanager_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [prometheusRegistry]
});

export const httpActiveConnections = new Gauge({
  name: 'patrolmanager_http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [prometheusRegistry]
});

// =============================================================================
// WebSocket Metrics
// =============================================================================

export const websocketActiveConnections = new Gauge({
  name: 'patrolmanager_websocket_active_connections',
  help: 'Number of active WebSocket connections',
  labelNames: ['user_role'], // admin, supervisor, guard
  registers: [prometheusRegistry]
});

export const websocketMessagesReceived = new Counter({
  name: 'patrolmanager_websocket_messages_received_total',
  help: 'Total number of WebSocket messages received',
  labelNames: ['event_type'],
  registers: [prometheusRegistry]
});

export const websocketMessagesSent = new Counter({
  name: 'patrolmanager_websocket_messages_sent_total',
  help: 'Total number of WebSocket messages sent',
  labelNames: ['event_type'],
  registers: [prometheusRegistry]
});

export const websocketPttActiveCount = new Gauge({
  name: 'patrolmanager_websocket_ptt_active_count',
  help: 'Number of active Push-to-Talk sessions',
  registers: [prometheusRegistry]
});

// =============================================================================
// Database Metrics
// =============================================================================

export const dbQueryDuration = new Histogram({
  name: 'patrolmanager_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [prometheusRegistry]
});

export const dbConnectionPoolSize = new Gauge({
  name: 'patrolmanager_db_connection_pool_size',
  help: 'Database connection pool size',
  labelNames: ['type'], // total, active, idle
  registers: [prometheusRegistry]
});

export const dbQueryErrors = new Counter({
  name: 'patrolmanager_db_query_errors_total',
  help: 'Total number of database query errors',
  labelNames: ['operation', 'table', 'error_type'],
  registers: [prometheusRegistry]
});

// =============================================================================
// Business Metrics
// =============================================================================

export const businessSosAlertsTriggered = new Counter({
  name: 'patrolmanager_business_sos_alerts_total',
  help: 'Total number of SOS alerts triggered',
  labelNames: ['site_id'],
  registers: [prometheusRegistry]
});

export const businessSosAlertsResolved = new Counter({
  name: 'patrolmanager_business_sos_resolved_total',
  help: 'Total number of SOS alerts resolved',
  labelNames: ['site_id', 'resolution_time_seconds'],
  registers: [prometheusRegistry]
});

export const businessPatrolRunsCompleted = new Counter({
  name: 'patrolmanager_business_patrol_runs_completed_total',
  help: 'Total number of patrol runs completed',
  labelNames: ['site_id', 'template_id', 'status'],
  registers: [prometheusRegistry]
});

export const businessIncidentsCreated = new Counter({
  name: 'patrolmanager_business_incidents_created_total',
  help: 'Total number of incidents created',
  labelNames: ['site_id', 'severity', 'category'],
  registers: [prometheusRegistry]
});

export const businessCheckpointsVerified = new Counter({
  name: 'patrolmanager_business_checkpoints_verified_total',
  help: 'Total number of checkpoints verified',
  labelNames: ['verification_type', 'site_id'], // nfc, qr, gps
  registers: [prometheusRegistry]
});

export const businessActiveShifts = new Gauge({
  name: 'patrolmanager_business_active_shifts',
  help: 'Number of currently active shifts',
  labelNames: ['site_id'],
  registers: [prometheusRegistry]
});

// =============================================================================
// Middleware for HTTP Metrics
// =============================================================================

export function prometheusMiddleware(req: any, res: any, next: any) {
  const start = Date.now();

  httpActiveConnections.inc();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path || 'unknown';

    httpRequestDuration.labels(req.method, route, res.statusCode).observe(duration);
    httpRequestCount.labels(req.method, route, res.statusCode).inc();
    httpActiveConnections.dec();
  });

  next();
}

// =============================================================================
// Metrics Endpoint
// =============================================================================

export async function getMetrics(): Promise<string> {
  return await prometheusRegistry.metrics();
}

// =============================================================================
// Sequelize Query Hook
// =============================================================================

export function setupSequelizeMetrics(sequelize: any) {
  sequelize.addHook('beforeQuery', (options: any) => {
    options.__prometheusStartTime = Date.now();
  });

  sequelize.addHook('afterQuery', (options: any) => {
    if (options.__prometheusStartTime) {
      const duration = (Date.now() - options.__prometheusStartTime) / 1000;
      const table = options.model?.name || 'unknown';
      const operation = options.type || 'query';

      dbQueryDuration.labels(operation, table).observe(duration);
    }
  });

  sequelize.addHook('queryFailed', (error: any, options: any) => {
    const table = options.model?.name || 'unknown';
    const operation = options.type || 'query';
    const errorType = error.name || 'unknown';

    dbQueryErrors.labels(operation, table, errorType).inc();
  });

  // Monitor connection pool
  setInterval(() => {
    const pool = sequelize.connectionManager.pool;
    if (pool) {
      dbConnectionPoolSize.labels('total').set(pool.max || 0);
      dbConnectionPoolSize.labels('active').set(pool.used || 0);
      dbConnectionPoolSize.labels('idle').set(pool.pending || 0);
    }
  }, 30000); // Every 30 seconds
}
