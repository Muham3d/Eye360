/**
 * Winston CloudWatch Transport Configuration
 *
 * Provides centralized logging to AWS CloudWatch Logs with:
 * - Structured JSON logging
 * - Request ID correlation
 * - Batch submission for cost optimization
 * - Graceful fallback if CloudWatch is unavailable
 */

import winston from 'winston';
import { CloudWatchTransport } from './cloudwatch-transport.js';

// Custom log format with request correlation
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'ISO8601' }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.json()
);

// Console format for local development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

/**
 * Create CloudWatch transport if enabled
 */
function createCloudWatchTransport(): winston.transport | null {
  if (process.env.LOG_CLOUDWATCH_ENABLED !== 'true') {
    return null;
  }

  try {
    return new CloudWatchTransport({
      logGroupName: process.env.LOG_CLOUDWATCH_GROUP || '/aws/ecs/patrolmanager',
      logStreamName: process.env.LOG_CLOUDWATCH_STREAM || process.env.NODE_ENV || 'development',
      awsRegion: process.env.AWS_REGION || 'us-east-1',
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
      awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY,
      submitInterval: 2000, // Batch every 2 seconds
      submitSize: 20, // Or every 20 logs
      batchSize: 25, // CloudWatch batch limit
      messageFormatter: (log: winston.LogEntry) => {
        return JSON.stringify({
          timestamp: log.timestamp,
          level: log.level,
          message: log.message,
          ...log.metadata,
          requestId: log.metadata?.requestId || 'N/A',
          environment: process.env.NODE_ENV,
          service: 'patrolmanager-api'
        });
      }
    });
  } catch (error) {
    console.error('Failed to create CloudWatch transport:', error);
    return null;
  }
}

/**
 * Create Winston logger with all transports
 */
export function createLogger(): winston.Logger {
  const transports: winston.transport[] = [
    // Console transport (always enabled)
    new winston.transports.Console({
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.NODE_ENV === 'production' ? customFormat : consoleFormat
    })
  ];

  // File transport (local development)
  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.File({
        filename: process.env.LOG_FILE_PATH ? `${process.env.LOG_FILE_PATH}/error.log` : './logs/error.log',
        level: 'error',
        format: customFormat,
        maxsize: parseInt(process.env.LOG_MAX_SIZE || '20971520'), // 20MB default
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '14')
      }),
      new winston.transports.File({
        filename: process.env.LOG_FILE_PATH ? `${process.env.LOG_FILE_PATH}/combined.log` : './logs/combined.log',
        format: customFormat,
        maxsize: parseInt(process.env.LOG_MAX_SIZE || '20971520'),
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '14')
      })
    );
  }

  // CloudWatch transport (production/staging)
  const cloudWatchTransport = createCloudWatchTransport();
  if (cloudWatchTransport) {
    transports.push(cloudWatchTransport);
  }

  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    transports,
    exitOnError: false,
    // Handle exceptions and rejections
    exceptionHandlers: [
      new winston.transports.Console({ format: consoleFormat }),
      ...(process.env.NODE_ENV !== 'production'
        ? [new winston.transports.File({ filename: './logs/exceptions.log' })]
        : [])
    ],
    rejectionHandlers: [
      new winston.transports.Console({ format: consoleFormat }),
      ...(process.env.NODE_ENV !== 'production'
        ? [new winston.transports.File({ filename: './logs/rejections.log' })]
        : [])
    ]
  });
}

/**
 * Export singleton logger instance
 */
export const logger = createLogger();

/**
 * Create child logger with request-specific metadata
 */
export function createChildLogger(requestId: string, additionalMetadata: Record<string, any> = {}): winston.Logger {
  return logger.child({
    requestId,
    ...additionalMetadata
  });
}

/**
 * Log request middleware - adds request ID to logger
 */
export function requestLoggerMiddleware(req: any, res: any, next: any) {
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  req.logger = createChildLogger(requestId, {
    method: req.method,
    path: req.path,
    ip: req.ip
  });

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    req.logger.info('HTTP Request', {
      statusCode: res.statusCode,
      duration,
      contentLength: res.getHeader('content-length')
    });
  });

  next();
}
