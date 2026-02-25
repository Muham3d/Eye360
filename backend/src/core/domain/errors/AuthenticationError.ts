/**
 * Authentication Error
 *
 * Thrown specifically when authentication credentials are invalid.
 * Distinct from UnauthorizedError which is for missing authentication.
 *
 * @module core/domain/errors
 */

import { AppError } from './AppError.js';

/**
 * Authentication error class
 * Used when provided credentials are invalid
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string = 'Invalid credentials',
    context?: Record<string, unknown>
  ) {
    super(message, 401, 'AUTHENTICATION_FAILED', true, context);
    this.name = 'AuthenticationError';
  }

  /**
   * Create error for invalid login credentials
   */
  static invalidCredentials(): AuthenticationError {
    return new AuthenticationError('Invalid email or password');
  }

  /**
   * Create error for invalid token
   */
  static invalidToken(): AuthenticationError {
    return new AuthenticationError('Invalid authentication token');
  }

  /**
   * Create error for expired token
   */
  static expiredToken(): AuthenticationError {
    return new AuthenticationError('Authentication token has expired');
  }

  /**
   * Create error for account locked
   */
  static accountLocked(): AuthenticationError {
    return new AuthenticationError(
      'Account has been locked due to too many failed attempts'
    );
  }

  /**
   * Create error for account disabled
   */
  static accountDisabled(): AuthenticationError {
    return new AuthenticationError(
      'Account has been disabled. Please contact an administrator.'
    );
  }
}
