/**
 * Role Request Validators
 *
 * Joi validation schemas for role management endpoints.
 *
 * @module interfaces/http/validators
 */

import Joi from 'joi';

/**
 * Valid role names
 */
const validRoleNames = ['Admin', 'Manager', 'Supervisor', 'Guard'];

/**
 * ID parameter validation schema
 */
export const roleIdParamSchema = {
  params: Joi.object({
    id: Joi.string()
      .pattern(/^[0-9]+$/)
      .required()
      .messages({
        'string.pattern.base': 'ID must be a number',
        'any.required': 'ID parameter is required',
      }),
  }),
};
