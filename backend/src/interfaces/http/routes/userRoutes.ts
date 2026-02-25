/**
 * User Routes
 *
 * Routes for user management.
 *
 * @module interfaces/http/routes
 */

import { Router } from 'express';
import { userController } from '../controllers/index';
import { validateRequest } from '../middleware/validationMiddleware';
import {
  createUserSchema,
  updateUserSchema,
  listUsersSchema,
  changeUserRoleSchema,
  changeUserStatusSchema,
  userIdParamSchema,
} from '../validators/index';
import { authMiddleware, requireRole } from '../middleware/authMiddleware';

const router = Router();

/**
 * Apply authentication middleware to all routes
 */
router.use(authMiddleware);

/**
 * GET /api/users
 * List users with pagination and filtering
 * Access: Admin, Manager, Supervisor
 */
router.get(
  '/',
  requireRole('Admin', 'Manager', 'Supervisor'),
  validateRequest(listUsersSchema),
  userController.listUsers
);

/**
 * GET /api/users/stats
 * Get user statistics
 * Access: Admin, Manager
 */
router.get(
  '/stats',
  requireRole('Admin', 'Manager'),
  userController.getUserStats
);

/**
 * GET /api/users/search
 * Search users by name or email
 * Access: Admin, Manager, Supervisor
 */
router.get(
  '/search',
  requireRole('Admin', 'Manager', 'Supervisor'),
  userController.searchUsers
);

/**
 * POST /api/users
 * Create a new user
 * Access: Admin only
 */
router.post(
  '/',
  requireRole('Admin'),
  validateRequest(createUserSchema),
  userController.createUser
);

/**
 * GET /api/users/:id
 * Get user by ID
 * Access: Admin, Manager, Supervisor
 */
router.get(
  '/:id',
  requireRole('Admin', 'Manager', 'Supervisor'),
  validateRequest(userIdParamSchema),
  userController.getUserById
);

/**
 * PUT /api/users/:id
 * Update user
 * Access: Admin, Manager (own users)
 */
router.put(
  '/:id',
  requireRole('Admin', 'Manager'),
  validateRequest(updateUserSchema),
  userController.updateUser
);

/**
 * DELETE /api/users/:id
 * Soft delete user
 * Access: Admin only
 */
router.delete(
  '/:id',
  requireRole('Admin'),
  validateRequest(userIdParamSchema),
  userController.deleteUser
);

/**
 * PUT /api/users/:id/role
 * Change user role
 * Access: Admin only
 */
router.put(
  '/:id/role',
  requireRole('Admin'),
  validateRequest(changeUserRoleSchema),
  userController.changeUserRole
);

/**
 * PUT /api/users/:id/status
 * Change user status
 * Access: Admin, Manager
 */
router.put(
  '/:id/status',
  requireRole('Admin', 'Manager'),
  validateRequest(changeUserStatusSchema),
  userController.changeUserStatus
);

/**
 * PUT /api/users/:id/reactivate
 * Reactivate a suspended or inactive user
 * Access: Admin, Manager
 */
router.put(
  '/:id/reactivate',
  requireRole('Admin', 'Manager'),
  validateRequest(userIdParamSchema),
  userController.reactivateUser
);

/**
 * PUT /api/users/:id/suspend
 * Suspend a user
 * Access: Admin, Manager
 */
router.put(
  '/:id/suspend',
  requireRole('Admin', 'Manager'),
  validateRequest(userIdParamSchema),
  userController.suspendUser
);

export default router;
