/**
 * Service Unavailable Error
 *
 * Thrown when a required service is unavailable or the server
 * is undergoing maintenance.
 *
 * @module core/domain/errors
 */

import { AppError } from './AppError.js';

/**
 * Service unavailable error class
 * Used when external services are down
 */
export class ServiceUnavailableError extends AppError {
  /**
   * The service that is unavailable
   */
  public readonly service?: string;

  /**
   * Estimated time when service will be available
   */
  public readonly retryAfter?: Date;

  constructor(
    message: string = 'Service temporarily unavailable',
    service?: string,
    retryAfter?: Date,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      503,
      'SERVICE_UNAVAILABLE',
      true,
      { ...context, service, retryAfter: retryAfter?.toISOString() }
    );

    this.service = service;
    this.retryAfter = retryAfter;
    this.name = 'ServiceUnavailableError';
  }

  /**
   * Create error for specific service
   */
  static forService(serviceName: string, retryAfter?: Date): ServiceUnavailableError {
    return new ServiceUnavailableError(
      `${serviceName} is currently unavailable. Please try again later.`,
      serviceName,
      retryAfter
    );
  }

  /**
   * Create error for database connection
   */
  static database(): ServiceUnavailableError {
    return new ServiceUnavailableError(
      'Database connection failed. Please try again later.',
      'database'
    );
  }

  /**
   * Create error for maintenance mode
   */
  static maintenance(): ServiceUnavailableError {
    return new ServiceUnavailableError(
      'System is currently under maintenance. Please try again later.'
    );
  }
}
