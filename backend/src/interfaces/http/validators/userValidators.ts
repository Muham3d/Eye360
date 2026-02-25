/**
 * User Request Validators
 *
 * Joi validation schemas for user management endpoints.
 *
 * @module interfaces/http/validators
 */

import Joi from 'joi';

/**
 * Password validation schema (optional for updates)
 */
const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .optional()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base':
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  });

/**
 * Email validation schema
 */
const emailSchema = Joi.string()
  .email()
  .lowercase()
  .trim()
  .max(255)
  .required()
  .messages({
    'string.email': 'Must be a valid email address',
    'string.max': 'Email address is too long (max 255 characters)',
    'any.required': 'Email is required',
  });

/**
 * Name validation schema
 */
const nameSchema = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .required()
  .messages({
    'string.min': 'Name cannot be empty',
    'string.max': 'Name is too long (max 100 characters)',
    'any.required': 'Name is required',
  });

/**
 * Phone validation schema (optional)
 */
const phoneSchema = Joi.string()
  .trim()
  .pattern(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
  .optional()
  .allow('', null)
  .messages({
    'string.pattern.base': 'Invalid phone number format',
  });

/**
 * Valid user statuses
 */
const validStatuses = ['active', 'inactive', 'suspended', 'pending'];

/**
 * ID parameter validation schema
 */
export const userIdParamSchema = {
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

/**
 * Create user request validation schema
 */
export const createUserSchema = {
  body: Joi.object({
    email: emailSchema,
    password: passwordSchema.required(),
    firstName: nameSchema,
    lastName: nameSchema,
    phone: phoneSchema,
    roleId: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'Role ID must be a number',
        'number.positive': 'Role ID must be a positive number',
        'any.required': 'Role ID is required',
      }),
    status: Joi.string()
      .valid(...validStatuses)
      .optional()
      .messages({
        'any.only': `Status must be one of: ${validStatuses.join(', ')}`,
      }),
  }),
};

/**
 * Update user request validation schema
 */
export const updateUserSchema = {
  ...userIdParamSchema,
  body: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .trim()
      .max(255)
      .optional()
      .messages({
        'string.email': 'Must be a valid email address',
        'string.max': 'Email address is too long (max 255 characters)',
      }),
    firstName: nameSchema.optional(),
    lastName: nameSchema.optional(),
    phone: phoneSchema,
    status: Joi.string()
      .valid(...validStatuses)
      .optional()
      .messages({
        'any.only': `Status must be one of: ${validStatuses.join(', ')}`,
      }),
    roleId: Joi.number()
      .integer()
      .positive()
      .optional()
      .messages({
        'number.base': 'Role ID must be a number',
        'number.positive': 'Role ID must be a positive number',
      }),
  })
    .min(1)
    .messages({
      'object.min': 'At least one field must be provided for update',
    }),
};

/**
 * List users query validation schema
 */
export const listUsersSchema = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).optional(),
    limit: Joi.number().integer().min(1).max(100).default(20).optional(),
    status: Joi.string()
      .valid(...validStatuses)
      .optional()
      .messages({
        'any.only': `Status must be one of: ${validStatuses.join(', ')}`,
      }),
    roleId: Joi.number().integer().positive().optional(),
    roleName: Joi.string()
      .valid('Admin', 'Manager', 'Supervisor', 'Guard')
      .optional(),
    search: Joi.string().max(255).optional(),
    sortBy: Joi.string()
      .valid('id', 'email', 'firstName', 'lastName', 'createdAt', 'lastLoginAt')
      .default('createdAt')
      .optional(),
    sortOrder: Joi.string()
      .valid('ASC', 'DESC')
      .default('DESC')
      .optional(),
    includeDeleted: Joi.boolean().default(false).optional(),
  }),
};

/**
 * Change user role request validation schema
 */
export const changeUserRoleSchema = {
  ...userIdParamSchema,
  body: Joi.object({
    roleId: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        'number.base': 'Role ID must be a number',
        'number.positive': 'Role ID must be a positive number',
        'any.required': 'Role ID is required',
      }),
  }),
};

/**
 * Change user status request validation schema
 */
export const changeUserStatusSchema = {
  ...userIdParamSchema,
  body: Joi.object({
    status: Joi.string()
      .valid(...validStatuses)
      .required()
      .messages({
        'any.only': `Status must be one of: ${validStatuses.join(', ')}`,
        'any.required': 'Status is required',
      }),
  }),
};
