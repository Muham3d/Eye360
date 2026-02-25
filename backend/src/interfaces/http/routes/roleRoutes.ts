/**
 * Role Routes
 *
 * Routes for role and permission management.
 *
 * @module interfaces/http/routes
 */

import { Router } from 'express';
import { roleController } from '../controllers/index';
import { validateRequest } from '../middleware/validationMiddleware';
import { roleIdParamSchema } from '../validators/index';
import { authMiddleware, requireRole } from '../middleware/authMiddleware';

const router = Router();

/**
 * Apply authentication middleware to all routes
 */
router.use(authMiddleware);

/**
 * GET /api/roles
 * List all roles
 * Access: All authenticated users
 */
router.get(
  '/',
  roleController.listRoles
);

/**
 * GET /api/roles/summaries
 * Get role summaries for UI display
 * Access: All authenticated users
 */
router.get(
  '/summaries',
  roleController.getRoleSummaries
);

/**
 * GET /api/roles/system
 * Get all system roles
 * Access: All authenticated users
 */
router.get(
  '/system',
  roleController.getSystemRoles
);

/**
 * GET /api/roles/custom
 * Get all custom roles
 * Access: All authenticated users
 */
router.get(
  '/custom',
  roleController.getCustomRoles
);

/**
 * GET /api/roles/compare
 * Compare two roles by hierarchy level
 * Access: All authenticated users
 */
router.get(
  '/compare',
  roleController.compareRoles
);

/**
 * GET /api/roles/:id
 * Get role by ID
 * Access: All authenticated users
 */
router.get(
  '/:id',
  validateRequest(roleIdParamSchema),
  roleController.getRoleById
);

/**
 * GET /api/roles/:id/permissions
 * Get permissions for a role
 * Access: All authenticated users
 */
router.get(
  '/:id/permissions',
  validateRequest(roleIdParamSchema),
  roleController.getRolePermissions
);

/**
 * GET /api/roles/:id/hierarchy
 * Get role hierarchy information
 * Access: All authenticated users
 */
router.get(
  '/:id/hierarchy',
  validateRequest(roleIdParamSchema),
  roleController.getRoleHierarchy
);

/**
 * GET /api/roles/:id/users
 * Get users with a specific role
 * Access: Admin, Manager, Supervisor
 */
router.get(
  '/:id/users',
  requireRole('Admin', 'Manager', 'Supervisor'),
  validateRequest(roleIdParamSchema),
  roleController.getRoleUsers
);

/**
 * GET /api/permissions
 * List all permissions
 * Access: All authenticated users
 */
router.get(
  '/permissions',
  roleController.listPermissions
);

/**
 * GET /api/permissions/check
 * Check if a user has a specific permission
 * Access: All authenticated users
 */
router.get(
  '/permissions/check',
  roleController.checkPermission
);

export default router;
