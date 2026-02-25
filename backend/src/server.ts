/**
 * Server Entry Point
 *
 * Main entry point for the PatrolManager backend server.
 * Initializes the Express app and starts the HTTP server.
 *
 * @module server
 */

import http from 'http';
import { createApp } from './app.js';
import { config } from './infrastructure/config/env.js';
import logger, { handleShutdownSignals } from './infrastructure/config/logger.js';
import { initializeWebSocket, setIoInstance } from './infrastructure/websocket/WebSocketServer.js';
import {
  initializeGeofenceService,
  initializeRealTimeService,
  initializeShiftService,
  initializeReportService,
  initializeAuthService,
  initializeJWTService,
  initializePasswordService,
  initializeSessionService,
  getGeofenceService,
  getRealTimeService
} from './core/services/index.js';
import { initializeSessionMiddleware } from './infrastructure/config/session.js';
import {
  SequelizeSOSAlertRepository,
  SequelizeLocationHistoryRepository,
  SequelizeShiftRepository,
  SequelizeSiteRepository,
  SequelizePatrolRunRepository,
  SequelizeIncidentRepository,
  SequelizeUserRepository
} from './infrastructure/database/repositories/index.js';
import {
  initializeScheduledJobs,
  startScheduledJobs,
  stopScheduledJobs
} from './infrastructure/scheduling/ScheduledJobsService.js';

/**
 * Global server reference
 */
let server: http.Server;

/**
 * Normalize port to number, string, or false
 */
function normalizePort(value: string): number | string | boolean {
  const port = parseInt(value, 10);

  if (isNaN(port)) {
    // Named pipe
    return value;
  }

  if (port >= 0) {
    // Port number
    return port;
  }

  return false;
}

/**
 * Get port from environment or use default
 */
function getPort(): number | string | boolean {
  return normalizePort(String(config.server.port));
}

/**
 * Event listener for HTTP server "error" event
 */
function onError(error: NodeJS.ErrnoException): void {
  if (error.syscall !== 'listen') {
    throw error;
  }

  const port = getPort();
  const bind = typeof port === 'string'
    ? `Pipe ${port}`
    : `Port ${port}`;

  // Handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      logger.error(`${bind} requires elevated privileges`);
      process.exit(1);
      break;
    case 'EADDRINUSE':
      logger.error(`${bind} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event
 */
function onListening(): void {
  const addr = server.address();
  const bind = typeof addr === 'string'
    ? `pipe ${addr}`
    : `port ${addr?.port}`;

  logger.info(`PatrolManager server listening on ${bind}`);
  logger.info(`Environment: ${config.server.env}`);
  logger.info(`API URL: ${config.server.apiUrl}`);
  logger.info(`Health check: http://localhost:${addr?.port}/health`);
}

/**
 * Start the HTTP server
 */
async function startServer(): Promise<http.Server> {
  const port = getPort();

  if (port === false) {
    logger.error('Invalid port configuration');
    process.exit(1);
  }

  // Create Express app
  const app = createApp();

  // Create HTTP server
  server = http.createServer(app);

  // Initialize Real-time Components
  initializeGeofenceService();
  const geofenceService = getGeofenceService();

  // Initialize Auth Services
  const jwtService = initializeJWTService({
    secret: config.jwt.secret,
    accessExpiresIn: config.jwt.expiresIn,
    refreshExpiresIn: config.jwt.refreshExpiresIn,
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
  const passwordService = initializePasswordService();
  const userRepository = new SequelizeUserRepository();
  const sessionService = initializeSessionService(userRepository);
  initializeAuthService(userRepository, jwtService, passwordService, sessionService);

  // Initialize Session Middleware (for web login)
  await initializeSessionMiddleware();

  // Initialize repositories for real-time features (Phase 3)
  const sosAlertRepository = new SequelizeSOSAlertRepository();
  const locationHistoryRepository = new SequelizeLocationHistoryRepository();

  // Initialize RealTimeService with dependencies
  initializeRealTimeService(
    geofenceService,
    sosAlertRepository,
    locationHistoryRepository
  );

  // Initialize repositories for Phase 5 features
  const shiftRepository = new SequelizeShiftRepository();
  const siteRepository = new SequelizeSiteRepository();
  const patrolRunRepository = new SequelizePatrolRunRepository();
  const incidentRepository = new SequelizeIncidentRepository();

  // Initialize ShiftService with dependencies
  initializeShiftService(
    shiftRepository,
    siteRepository,
    geofenceService
  );

  // Initialize ReportService with dependencies
  initializeReportService(
    patrolRunRepository,
    incidentRepository,
    shiftRepository,
    siteRepository
  );

  // Initialize Scheduled Jobs Service
  initializeScheduledJobs();

  // Initialize WebSocket server
  const io = initializeWebSocket(server);
  setIoInstance(io);

  // Start scheduled jobs
  startScheduledJobs();

  // Handle server errors
  server.on('error', onError);

  // Handle server listening
  server.on('listening', onListening);

  // Start listening
  server.listen(port);

  // Setup graceful shutdown handlers
  handleShutdownSignals(server);

  // Log startup information
  logger.info('Starting PatrolManager backend server...');
  logger.info('Configuration loaded', {
    env: config.server.env,
    port: port,
    database: {
      host: config.database.host,
      port: config.database.port,
      name: config.database.name,
    },
  });

  return server;
}

/**
 * Get the active server instance
 */
function getServer(): http.Server | undefined {
  return server;
}

/**
 * Stop the server (useful for testing)
 */
function stopServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    // Stop scheduled jobs first
    try {
      stopScheduledJobs();
    } catch (error) {
      logger.warn('Error stopping scheduled jobs', { error });
    }

    server.close((err) => {
      if (err) {
        reject(err);
      } else {
        logger.info('Server stopped');
        resolve();
      }
    });
  });
}

// Start the server if this file is run directly
// Note: With tsx/esm loader, we use a simpler check
startServer().catch((error) => {
  logger.error('Failed to start server', { error: error.message });
  process.exit(1);
});

export { startServer, stopServer, getServer };
export default startServer;
