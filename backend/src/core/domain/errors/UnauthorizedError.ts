/**
 * Unauthorized Error
 *
 * Thrown when authentication is required but missing or invalid.
 * Use this when the user needs to log in.
 *
 * @module core/domain/errors
 */

import { AppError } from './AppError.js';

/**
 * Unauthorized error class
 * Used when authentication is required but not provided
 */
export class UnauthorizedError extends AppError {
  constructor(
    message: string = 'Authentication required',
    context?: Record<string, unknown>
  ) {
    super(message, 401, 'UNAUTHORIZED', true, context);
    this.name = 'UnauthorizedError';
  }

  /**
   * Create error for missing authentication
   */
  static missing(): UnauthorizedError {
    return new UnauthorizedError('Authentication required');
  }

  /**
   * Create error for invalid token
   */
  static invalidToken(): UnauthorizedError {
    return new UnauthorizedError('Invalid or expired authentication token');
  }

  /**
   * Create error for missing token
   */
  static missingToken(): UnauthorizedError {
    return new UnauthorizedError('Authentication token not provided');
  }

  /**
   * Create error for session expired
   */
  static sessionExpired(): UnauthorizedError {
    return new UnauthorizedError('Session has expired. Please log in again.');
  }
}
