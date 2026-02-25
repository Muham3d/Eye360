/**
 * Auth Request Validators
 *
 * Joi validation schemas for authentication endpoints.
 *
 * @module interfaces/http/validators
 */

import Joi from 'joi';

/**
 * Password validation schema
 * - Minimum 8 characters
 * - Maximum 128 characters
 * - At least one lowercase letter
 * - At least one uppercase letter
 * - At least one number
 */
const passwordSchema = Joi.string()
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
 * Register request validation schema
 */
export const registerSchema = {
  body: Joi.object({
    email: emailSchema,
    password: passwordSchema,
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
  }),
};

/**
 * Login request validation schema
 */
export const loginSchema = {
  body: Joi.object({
    email: emailSchema,
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required',
      }),
  }),
};

/**
 * Refresh token request validation schema
 */
export const refreshTokenSchema = {
  body: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token is required',
      }),
  }),
};

/**
 * Forgot password request validation schema
 */
export const forgotPasswordSchema = {
  body: Joi.object({
    email: emailSchema,
  }),
};

/**
 * Reset password request validation schema
 */
export const resetPasswordSchema = {
  body: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Reset token is required',
      }),
    password: passwordSchema,
  }),
};

/**
 * Change password request validation schema
 */
export const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required',
      }),
    newPassword: passwordSchema,
  }),
};

/**
 * Logout request validation schema
 */
export const logoutSchema = {
  body: Joi.object({
    refreshToken: Joi.string().optional(),
  }).optional(),
};
