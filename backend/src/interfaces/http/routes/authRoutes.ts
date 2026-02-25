/**
 * Authentication Routes
 *
 * Routes for authentication and user session management.
 *
 * @module interfaces/http/routes
 */

import { Router } from 'express';
import { authController } from '../controllers/index';
import { validateRequest } from '../middleware/validationMiddleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  logoutSchema,
} from '../validators/index';
import { authMiddleware, optionalAuthMiddleware, requireRole } from '../middleware/authMiddleware';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user (Admin only)
 */
router.post(
  '/register',
  authMiddleware,
  requireRole('Admin'),
  validateRequest(registerSchema),
  authController.register
);

/**
 * POST /api/auth/login
 * Login endpoint
 * Supports both mobile (JWT) and web (session) authentication
 */
router.post(
  '/login',
  validateRequest(loginSchema),
  authController.login
);

/**
 * POST /api/auth/logout
 * Logout endpoint
 */
router.post(
  '/logout',
  optionalAuthMiddleware,
  validateRequest(logoutSchema),
  authController.logout
);

/**
 * POST /api/auth/refresh
 * Refresh JWT access token
 */
router.post(
  '/refresh',
  validateRequest(refreshTokenSchema),
  authController.refresh
);

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post(
  '/forgot-password',
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post(
  '/reset-password',
  validateRequest(resetPasswordSchema),
  authController.resetPassword
);

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authMiddleware,
  authController.getProfile
);

/**
 * POST /api/auth/change-password
 * Change authenticated user password
 */
router.post(
  '/change-password',
  authMiddleware,
  validateRequest(changePasswordSchema),
  authController.changePassword
);

/**
 * POST /api/auth/logout-all
 * Logout from all devices
 */
router.post(
  '/logout-all',
  authMiddleware,
  authController.logoutAll
);

export default router;
