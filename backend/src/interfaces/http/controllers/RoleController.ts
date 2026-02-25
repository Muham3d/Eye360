/**
 * Role Controller
 *
 * Thin controller for role management endpoints.
 * Handles HTTP requests/responses and delegates to RoleService.
 *
 * @module interfaces/http/controllers
 */

import { Request, Response } from 'express';
import { getRoleService, getPermissionService } from '@core/services/index.js';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Standard API response format
 */
interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Role Controller Class
 */
export class RoleController {
  /**
   * GET /api/roles
   * List all roles
   */
  listRoles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const roleService = getRoleService();
    const includeUserCounts = req.query.includeUserCounts === 'true';

    const roles = await roleService.getAllRoles(includeUserCounts);

    const response: ApiResponse = {
      success: true,
      data: { roles },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/roles/summaries
   * Get role summaries for UI display
   */
  getRoleSummaries = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const roleService = getRoleService();

    const summaries = await roleService.getRoleSummaries();

    const response: ApiResponse = {
      success: true,
      data: { summaries },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/roles/:id
   * Get role by ID with optional details
   */
  getRoleById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const roleService = getRoleService();
    const { id } = req.params;
    const includeDetails = req.query.includeDetails === 'true';

    const role = await roleService.getRoleById(Number(id), includeDetails);

    const response: ApiResponse = {
      success: true,
      data: { role },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/roles/name/:name
   * Get role by name
   */
  getRoleByName = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const roleService = getRoleService();
    const { name } = req.params;
    const includeDetails = req.query.includeDetails === 'true';

    const role = await roleService.getRoleByName(name as any, includeDetails);

    const response: ApiResponse = {
      success: true,
      data: { role },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/roles/:id/permissions
   * Get permissions for a role
   */
  getRolePermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const roleService = getRoleService();
    const { id } = req.params;

    const permissions = await roleService.getRolePermissions(Number(id));

    const response: ApiResponse = {
      success: true,
      data: { permissions },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/roles/:id/hierarchy
   * Get role hierarchy information
   */
  getRoleHierarchy = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const roleService = getRoleService();
    const { id } = req.params;

    const hierarchy = await roleService.getRoleHierarchy(Number(id));

    const response: ApiResponse = {
      success: true,
      data: { hierarchy },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/roles/:id/users
   * Get users with a specific role
   */
  getRoleUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const roleService = getRoleService();
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    const result = await roleService.getRoleUsers(Number(id), {
      status: status as any,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    const response = {
      success: true,
      data: result.data,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/permissions
   * List all permissions
   */
  listPermissions = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const permissionService = getPermissionService();

    const permissions = await permissionService.getAllPermissions();

    const response: ApiResponse = {
      success: true,
      data: { permissions },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/permissions/check
   * Check if a user has a specific permission
   */
  checkPermission = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const permissionService = getPermissionService();
    const { userId, resource, action } = req.query;

    if (!userId || !resource || !action) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VAL_001',
          message: 'userId, resource, and action query parameters are required',
        },
      });
      return;
    }

    const result = await permissionService.userHasPermission(
      Number(userId),
      resource as string,
      action as string
    );

    const response: ApiResponse = {
      success: true,
      data: {
        granted: result.granted,
        reason: result.reason,
        resource: result.resource,
        action: result.action,
      },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/roles/system
   * Get all system roles
   */
  getSystemRoles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const roleService = getRoleService();

    const roles = await roleService.getSystemRoles();

    const response: ApiResponse = {
      success: true,
      data: { roles },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/roles/custom
   * Get all custom roles
   */
  getCustomRoles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const roleService = getRoleService();

    const roles = await roleService.getCustomRoles();

    const response: ApiResponse = {
      success: true,
      data: { roles },
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/roles/compare
   * Compare two roles by hierarchy level
   */
  compareRoles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const roleService = getRoleService();
    const { role1Id, role2Id } = req.query;

    if (!role1Id || !role2Id) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VAL_001',
          message: 'role1Id and role2Id query parameters are required',
        },
      });
      return;
    }

    const result = await roleService.compareRoles(
      Number(role1Id),
      Number(role2Id)
    );

    const response: ApiResponse = {
      success: true,
      data: { comparison: result },
    };

    res.status(200).json(response);
  });
}

export default new RoleController();
