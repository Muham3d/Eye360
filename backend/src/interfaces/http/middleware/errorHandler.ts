/**
 * Error Handler Middleware
 *
 * Global error handling middleware for Express.
 * Converts errors to appropriate HTTP responses.
 *
 * @module interfaces/http/middleware
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '@infrastructure/config/env.js';
import { AppError } from '@core/domain/errors/index.js';
import logger from '@infrastructure/config/logger.js';

/**
 * Error response structure
 */
interface ErrorResponse {
  success: false;
  error: {
    name: string;
    type: string;
    message: string;
    statusCode: number;
    context?: Record<string, unknown>;
    stack?: string;
    requestId?: string;
  };
}

/**
 * Check if error is an operational AppError
 */
function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Format error for response
 */
function formatError(error: Error, req: Request): ErrorResponse {
  const isDevelopment = config.server.isDevelopment;
  const requestId = (req as any).requestId;

  if (error instanceof AppError) {
    const response: ErrorResponse = {
      success: false,
      error: {
        name: error.name,
        type: error.type,
        message: error.message,
        statusCode: error.statusCode,
        ...(error.context && { context: error.context }),
        ...(requestId && { requestId }),
      },
    };

    // Include stack trace in development
    if (isDevelopment) {
      response.error.stack = error.stack;
    }

    return response;
  }

  // For non-AppError errors
  const response: ErrorResponse = {
    success: false,
    error: {
      name: 'InternalServerError',
      type: 'INTERNAL_ERROR',
      message: isDevelopment ? error.message : 'An unexpected error occurred',
      statusCode: 500,
      ...(requestId && { requestId }),
    },
  };

  // Include stack trace in development
  if (isDevelopment && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
}

/**
 * Log error appropriately based on type
 */
function logError(error: Error, req: Request): void {
  const isDevelopment = config.server.isDevelopment;

  if (error instanceof AppError) {
    // Operational errors are expected, log at warning level
    if (error.isOperational) {
      logger.warn(`${error.type}: ${error.message}`, {
        error: error.name,
        statusCode: error.statusCode,
        context: error.context,
        path: req.path,
        method: req.method,
        requestId: (req as any).requestId,
      });
    } else {
      // Non-operational AppError is a programming error
      logger.error(`${error.type}: ${error.message}`, {
        error: error.name,
        statusCode: error.statusCode,
        context: error.context,
        stack: error.stack,
        path: req.path,
        method: req.method,
        requestId: (req as any).requestId,
      });
    }
  } else {
    // Unknown errors are always logged at error level
    logger.error(`Unhandled error: ${error.message}`, {
      error: error.name,
      stack: error.stack,
      path: req.path,
      method: req.method,
      requestId: (req as any).requestId,
    });
  }
}

/**
 * Check if request is an API request (expects JSON response)
 */
function isApiRequest(req: Request): boolean {
  return req.path.startsWith('/api/') ||
    req.xhr ||
    (req.headers.accept && req.headers.accept.includes('application/json'));
}

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log the error
  logError(error, req);

  const statusCode = error instanceof AppError ? error.statusCode : 500;

  // For API requests, return JSON error response
  if (isApiRequest(req)) {
    const errorResponse = formatError(error, req);
    res.status(statusCode).json(errorResponse);
    return;
  }

  // For web/static file requests, return appropriate error page or status
  if (statusCode === 404) {
    res.status(404).render('errors/404', {
      title: 'Not Found',
      message: 'The page you are looking for does not exist.',
    });
    return;
  }

  if (statusCode === 403) {
    res.status(403).render('errors/403', {
      title: 'Access Denied',
      message: 'You do not have permission to access this resource.',
    });
    return;
  }

  // For 500 and other errors on web requests, render error page
  res.status(statusCode).render('errors/500', {
    title: 'Server Error',
    message: config.server.isDevelopment ? error.message : 'An unexpected error occurred. Please try again later.',
  });
}

/**
 * Handle 404 Not Found errors
 * This should be added after all routes
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new Error(`Route not found: ${req.method} ${req.path}`);
  (error as any).statusCode = 404;
  (error as any).type = 'NOT_FOUND';
  (error as any).isOperational = true;

  next(error);
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors and pass to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * TODO: Add error tracking integration (Sentry, etc.)
 * TODO: Implement error rate monitoring
 * TODO: Add user notification for critical errors
 */
