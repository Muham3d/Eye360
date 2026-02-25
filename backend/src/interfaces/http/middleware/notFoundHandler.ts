/**
 * 404 Not Found Handler
 *
 * Handles requests to undefined routes.
 *
 * @module interfaces/http/middleware
 */

import { Request, Response, NextFunction } from 'express';
import NotFoundError from '@core/domain/errors/NotFoundError.js';

/**
 * 404 handler middleware
 * Creates a NotFoundError when no route matches
 */
export function notFoundHandler(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const error = new NotFoundError(
    `Route not found: ${req.method} ${req.path}`,
    'Route',
    undefined,
    { method: req.method, path: req.path, ip: req.ip }
  );

  next(error);
}
