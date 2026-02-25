/**
 * Conflict Error
 *
 * Thrown when the request conflicts with the current state of the server.
 * Commonly used for duplicate resources or concurrent modification issues.
 *
 * @module core/domain/errors
 */

import { AppError } from './AppError.js';

/**
 * Conflict error class
 * Used when request conflicts with current state
 */
export class ConflictError extends AppError {
  /**
   * The field or resource that has the conflict
   */
  public readonly field?: string;

  /**
   * The conflicting value
   */
  public readonly value?: string;

  constructor(
    message: string,
    field?: string,
    value?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      409,
      'CONFLICT',
      true,
      { ...context, field, value }
    );

    this.field = field;
    this.value = value;
    this.name = 'ConflictError';
  }

  /**
   * Create error for duplicate resource
   */
  static duplicate(field: string, value: string): ConflictError {
    return new ConflictError(
      `A resource with this ${field} already exists`,
      field,
      value
    );
  }

  /**
   * Create error for duplicate email
   */
  static duplicateEmail(email: string): ConflictError {
    return ConflictError.duplicate('email', email);
  }

  /**
   * Create error for duplicate username
   */
  static duplicateUsername(username: string): ConflictError {
    return ConflictError.duplicate('username', username);
  }

  /**
   * Create error for concurrent modification
   */
  static concurrentModification(): ConflictError {
    return new ConflictError(
      'This resource was modified by another user. Please refresh and try again.'
    );
  }

  /**
   * Create error for invalid state transition
   */
  static invalidStateTransition(
    currentState: string,
    requestedState: string
  ): ConflictError {
    return new ConflictError(
      `Cannot transition from ${currentState} to ${requestedState}`,
      undefined,
      undefined,
      { currentState, requestedState }
    );
  }
}
