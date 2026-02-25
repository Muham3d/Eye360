/**
 * Rate Limit Error
 *
 * Thrown when a request rate limit is exceeded.
 *
 * @module core/domain/errors
 */

import { AppError } from './AppError.js';

/**
 * Rate limit error class
 * Used when rate limit is exceeded
 */
export class RateLimitError extends AppError {
  /**
   * The rate limit window in milliseconds
   */
  public readonly retryAfter?: number;

  /**
   * The maximum number of requests allowed
   */
  public readonly limit?: number;

  /**
   * The time when the limit resets
   */
  public readonly resetAt?: Date;

  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    limit?: number,
    resetAt?: Date,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      429,
      'RATE_LIMIT_EXCEEDED',
      true,
      { ...context, retryAfter, limit, resetAt: resetAt?.toISOString() }
    );

    this.retryAfter = retryAfter;
    this.limit = limit;
    this.resetAt = resetAt;
    this.name = 'RateLimitError';
  }

  /**
   * Create error with retry after duration
   */
  static retryAfter(seconds: number, limit?: number): RateLimitError {
    const resetAt = new Date(Date.now() + seconds * 1000);
    return new RateLimitError(
      `Rate limit exceeded. Try again in ${seconds} seconds.`,
      seconds,
      limit,
      resetAt
    );
  }
}
