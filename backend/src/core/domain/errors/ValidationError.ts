/**
 * Validation Error
 *
 * Thrown when input validation fails.
 * Contains details about which fields failed validation.
 *
 * @module core/domain/errors
 */

import { AppError } from './AppError.js';

/**
 * Validation error details for individual fields
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: unknown;
  constraint?: string;
}

/**
 * Validation error class
 * Used for request validation failures
 */
export class ValidationError extends AppError {
  /**
   * Details about validation failures
   */
  public readonly details: ValidationErrorDetail[];

  constructor(
    message: string = 'Validation failed',
    details: ValidationErrorDetail[] = [],
    context?: Record<string, unknown>
  ) {
    super(
      message,
      400,
      'VALIDATION_ERROR',
      true,
      { ...context, validationDetails: details }
    );

    this.details = details;
    this.name = 'ValidationError';
  }

  /**
   * Create validation error from an array of field errors
   */
  static fromFields(fields: Record<string, string>): ValidationError {
    const details: ValidationErrorDetail[] = Object.entries(fields).map(
      ([field, message]) => ({
        field,
        message,
      })
    );

    return new ValidationError('Validation failed', details);
  }

  /**
   * Add a validation error detail
   */
  addDetail(field: string, message: string, value?: unknown, constraint?: string): void {
    this.details.push({ field, message, value, constraint });
    this.context = {
      ...this.context,
      validationDetails: this.details,
    };
  }

  /**
   * Check if a specific field has validation errors
   */
  hasFieldError(field: string): boolean {
    return this.details.some((detail) => detail.field === field);
  }

  /**
   * Get error details for a specific field
   */
  getFieldErrors(field: string): ValidationErrorDetail[] {
    return this.details.filter((detail) => detail.field === field);
  }

  /**
   * Get all field names that have errors
   */
  getInvalidFields(): string[] {
    return [...new Set(this.details.map((detail) => detail.field))];
  }
}
