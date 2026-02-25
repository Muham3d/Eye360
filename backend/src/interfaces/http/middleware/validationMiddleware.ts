/**
 * Validation Middleware
 *
 * Request validation middleware using Joi schemas.
 *
 * @module interfaces/http/middleware
 */

import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '@core/domain/errors/index.js';

/**
 * Validation schema container
 */
interface ValidationSchemas {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}

/**
 * Validation result with errors
 */
interface ValidationResult {
  success: boolean;
  errors: Array<{
    field: string;
    message: string;
    value?: unknown;
  }>;
}

/**
 * Validate request data against Joi schema
 */
function validateSchema(
  data: Record<string, unknown>,
  schema: Joi.ObjectSchema,
  location: string
): ValidationResult {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (!error) {
    return { success: true, errors: [] };
  }

  const errors = error.details.map((detail) => ({
    field: detail.path.join('.'),
    message: detail.message,
    value: detail.context?.value,
  }));

  return { success: false, errors };
}

/**
 * Request validation middleware factory
 * Creates middleware that validates request data against provided schemas
 */
export function validateRequest(schemas: ValidationSchemas) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allErrors: Array<{ field: string; message: string; value?: unknown }> = [];

    // Validate body
    if (schemas.body) {
      const bodyResult = validateSchema(req.body, schemas.body, 'body');
      if (!bodyResult.success) {
        allErrors.push(...bodyResult.errors);
        // Update req.body with sanitized/converted values
        const { error, value } = schemas.body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });
        if (!error) {
          req.body = value;
        }
      } else {
        // Sanitize body even if valid
        const { value } = schemas.body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
          convert: true,
        });
        req.body = value;
      }
    }

    // Validate params
    if (schemas.params) {
      const paramsResult = validateSchema(req.params, schemas.params, 'params');
      if (!paramsResult.success) {
        allErrors.push(...paramsResult.errors);
      }
    }

    // Validate query
    if (schemas.query) {
      const queryResult = validateSchema(req.query, schemas.query, 'query');
      if (!queryResult.success) {
        allErrors.push(...queryResult.errors);
      }
    }

    // Validate headers
    if (schemas.headers) {
      const headersResult = validateSchema(req.headers, schemas.headers, 'headers');
      if (!headersResult.success) {
        allErrors.push(...headersResult.errors);
      }
    }

    // If there are validation errors, throw ValidationError
    if (allErrors.length > 0) {
      const details = allErrors.map((err) => ({
        field: err.field,
        message: err.message.replace(/"/g, ''),
        value: err.value,
      }));

      throw new ValidationError('Request validation failed', details);
    }

    next();
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // UUID/ID parameter validation
  idParam: Joi.object({
    id: Joi.string()
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        'string.pattern.base': 'ID must be a number',
        'any.required': 'ID parameter is required',
      }),
  }),

  // Pagination query validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sort: Joi.string().default('created_at'),
    order: Joi.string().valid('asc', 'desc').default('desc'),
  }),

  // Date range validation
  dateRange: Joi.object({
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')),
  }),

  // Email validation
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.email': 'Must be a valid email address',
      'any.required': 'Email is required',
    }),

  // Password validation
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required',
    }),
};

/**
 * TODO: Add file upload validation
 * TODO: Add custom validation rules for patrol-specific fields
 * TODO: Implement sanitization for XSS prevention
 */
