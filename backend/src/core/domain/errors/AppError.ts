/**
 * Base Application Error
 *
 * Custom error class that serves as the base for all application errors.
 * Includes status code and operational flag for proper error handling.
 *
 * @module core/domain/errors
 */

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  /**
   * HTTP status code
   */
  public readonly statusCode: number;

  /**
   * Error type/code for client handling
   */
  public readonly type: string;

  /**
   * Whether this error is operational (expected) vs programming error
   */
  public readonly isOperational: boolean;

  /**
   * Additional error context
   */
  public readonly context?: Record<string, unknown>;

  /**
   * Original error that caused this error
   */
  public readonly originalError?: Error;

  constructor(
    message: string,
    statusCode: number = 500,
    type: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    context?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = isOperational;
    this.context = context;
    this.originalError = originalError;
  }

  /**
   * Convert error to JSON for API response
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      statusCode: this.statusCode,
      ...(this.context && { context: this.context }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: this.stack,
        originalError: this.originalError?.message,
      }),
    };
  }

  /**
   * Check if error is operational
   */
  isOperationalError(): boolean {
    return this.isOperational;
  }
}
