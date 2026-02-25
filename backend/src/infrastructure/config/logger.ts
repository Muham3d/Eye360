/**
 * Winston Logger Configuration
 *
 * Provides structured logging with console and file transports.
 * Includes request ID middleware for tracing requests through the system.
 *
 * @module infrastructure/config/logger
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from './env.js';

/**
 * Custom log levels with priority
 */
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

/**
 * Log level colors for console output
 */
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Tell winston about the colors
winston.addColors(colors);

/**
 * Determine current log level based on environment
 */
function getLevel(): string {
  const env = config.server.env;
  const isDevelopment = env === 'development';
  const isTest = env === 'test';

  if (isTest) {
    return 'error'; // Minimal logging in tests
  }

  return config.logging.level;
}

/**
 * Create log directory if it doesn't exist
 */
function ensureLogDirectory(): void {
  const logDir = path.resolve(config.logging.filePath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
}

/**
 * Custom format for console output with colors
 */
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, context, requestId, ...meta } = info as any;
      const contextStr = context ? `[${context}] ` : '';
      const requestIdStr = requestId ? `<${requestId}> ` : '';
      const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';

      return `${timestamp} ${level}: ${requestIdStr}${contextStr}${message}${metaStr ? '\n' + metaStr : ''}`;
    }
  )
);

/**
 * Custom format for file output (JSON)
 */
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

/**
 * Create transports array based on configuration
 */
function createTransports(): winston.transport[] {
  const transports: winston.transport[] = [];
  const level = getLevel();

  // Console transport (always enabled)
  transports.push(
    new winston.transports.Console({
      level,
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true,
    })
  );

  // File transports (disabled in test mode)
  if (config.logging.file) {
    ensureLogDirectory();

    const logDir = path.resolve(config.logging.filePath);

    // Combined log file (all levels)
    transports.push(
      new winston.transports.File({
        level,
        filename: path.join(logDir, 'combined.log'),
        format: fileFormat,
        maxsize: parseMaxSize(config.logging.maxSize),
        maxFiles: config.logging.maxFiles,
        handleExceptions: true,
        handleRejections: true,
      })
    );

    // Error log file (errors only)
    transports.push(
      new winston.transports.File({
        level: 'error',
        filename: path.join(logDir, 'error.log'),
        format: fileFormat,
        maxsize: parseMaxSize(config.logging.maxSize),
        maxFiles: config.logging.maxFiles,
        handleExceptions: true,
        handleRejections: true,
      })
    );
  }

  return transports;
}

/**
 * Parse max size string to bytes
 */
function parseMaxSize(sizeStr: string): number {
  const units: Record<string, number> = {
    b: 1,
    k: 1024,
    m: 1024 * 1024,
    g: 1024 * 1024 * 1024,
  };

  const match = sizeStr.toLowerCase().match(/^(\d+)([kmgb]?)$/);
  if (!match) {
    return 20 * 1024 * 1024; // Default 20MB
  }

  const value = parseInt(match[1], 10);
  const unit = match[2] || 'b';

  return value * (units[unit] || 1);
}

/**
 * Create Winston logger instance
 */
export const logger = winston.createLogger({
  levels,
  level: getLevel(),
  format: fileFormat,
  transports: createTransports(),
  exitOnError: false,
});

/**
 * Stream for Morgan HTTP logger
 */
export const stream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

/**
 * Request ID storage for async context
 */
interface RequestMetadata {
  requestId: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

const requestMetadata = new Map<string, RequestMetadata>();

/**
 * Generate unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Set request metadata for current context
 */
export function setRequestMetadata(id: string, metadata: Partial<RequestMetadata> = {}): void {
  requestMetadata.set(id, {
    requestId: id,
    ...metadata,
  });
}

/**
 * Get request metadata
 */
export function getRequestMetadata(id: string): RequestMetadata | undefined {
  return requestMetadata.get(id);
}

/**
 * Clear request metadata
 */
export function clearRequestMetadata(id: string): void {
  requestMetadata.delete(id);
}

/**
 * Create child logger with context
 */
export function createChildLogger(context: string, requestId?: string) {
  const childLogger = logger.child({ context });

  return {
    debug: (message: string, meta?: object) => {
      if (requestId) {
        childLogger.debug(message, { requestId, ...meta });
      } else {
        childLogger.debug(message, meta);
      }
    },
    info: (message: string, meta?: object) => {
      if (requestId) {
        childLogger.info(message, { requestId, ...meta });
      } else {
        childLogger.info(message, meta);
      }
    },
    warn: (message: string, meta?: object) => {
      if (requestId) {
        childLogger.warn(message, { requestId, ...meta });
      } else {
        childLogger.warn(message, meta);
      }
    },
    error: (message: string, meta?: object) => {
      if (requestId) {
        childLogger.error(message, { requestId, ...meta });
      } else {
        childLogger.error(message, meta);
      }
    },
  };
}

/**
 * Request ID middleware factory
 * Creates Express middleware that assigns a unique ID to each request
 */
export function requestIdMiddleware() {
  return (req: any, res: any, next: any) => {
    const requestId = req.headers['x-request-id'] as string || generateRequestId();

    // Attach request ID to request object
    req.requestId = requestId;
    req.logger = createChildLogger('http', requestId);

    // Set request metadata
    setRequestMetadata(requestId, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    // Expose request ID in response header
    res.setHeader('X-Request-ID', requestId);

    // Log request
    req.logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
    });

    // Clean up on response finish
    res.on('finish', () => {
      const duration = res.responseTime || Date.now() - req.startTime;
      req.logger.info(`${req.method} ${req.path} - ${res.statusCode}`, {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration: `${duration}ms`,
      });
      clearRequestMetadata(requestId);
    });

    next();
  };
}

/**
 * Graceful shutdown handler
 */
export function handleShutdownSignals(server: any): void {
  const shutdown = (signal: string) => {
    logger.info(`${signal} received. Starting graceful shutdown...`);

    // Stop accepting new connections
    server.close(() => {
      logger.info('Server closed successfully');
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Log unhandled errors
 */
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', {
    reason,
    promise: String(promise),
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

export default logger;
