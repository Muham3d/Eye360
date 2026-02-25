/**
 * User Controller
 *
 * Thin controller for user management endpoints.
 * Handles HTTP requests/responses and delegates to UserService.
 *
 * @module interfaces/http/controllers
 */

import { Request, Response } from 'express';
import { getUserService, getPasswordService } from '@core/services/index.js';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * Standard API response format
 */
interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Paginated API response format
 */
interface PaginatedApiResponse<T = unknown> {
  success: true;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * User Controller Class
 */
export class UserController {
  /**
   * GET /api/users
   * List users with pagination and filtering
   */
  listUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userService = getUserService();

    const {
      page = 1,
      limit = 20,
      status,
      roleId,
      roleName,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      includeDeleted = false,
    } = req.query;

    const result = await userService.listUsers({
      status: status as any,
      roleId: roleId ? Number(roleId) : undefined,
      roleName: roleName as any,
      search: search as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      sortBy: sortBy as any,
      sortOrder: sortOrder as any,
      includeDeleted: includeDeleted === 'true' || includeDeleted === true,
    });

    const response: PaginatedApiResponse = {
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
   * GET /api/users/stats
   * Get user statistics
   */
  getUserStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userService = getUserService();

    const stats = await userService.getUserStatistics();

    const response: ApiResponse = {
      success: true,
      data: stats,
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/users/:id
   * Get user by ID
   */
  getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userService = getUserService();
    const { id } = req.params;
    const includeDeleted = req.query.includeDeleted === 'true';

    const user = await userService.getUserById(Number(id), includeDeleted);

    if (!user) {
      res.status(404).json({
        success: false,
        error: {
          code: 'USER_001',
          message: `User with ID ${id} not found`,
        },
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: { user },
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/users
   * Create a new user (Admin only)
   */
  createUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userService = getUserService();
    const passwordService = getPasswordService();
    const createdBy = (req as AuthenticatedRequest).user?.id;

    if (!createdBy) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authentication required',
        },
      });
      return;
    }

    const passwordHash = await passwordService.hashPassword(req.body.password);

    const user = await userService.createUser(
      {
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        roleId: req.body.roleId,
        status: req.body.status,
      },
      passwordHash,
      { createdBy }
    );

    const response: ApiResponse = {
      success: true,
      data: { user },
      message: 'User created successfully',
    };

    res.status(201).json(response);
  });

  /**
   * PUT /api/users/:id
   * Update user
   */
  updateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userService = getUserService();
    const { id } = req.params;
    const updatedBy = (req as AuthenticatedRequest).user?.id;

    const user = await userService.updateUser(
      Number(id),
      {
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        status: req.body.status,
        roleId: req.body.roleId,
      },
      { updatedBy }
    );

    const response: ApiResponse = {
      success: true,
      data: { user },
      message: 'User updated successfully',
    };

    res.status(200).json(response);
  });

  /**
   * DELETE /api/users/:id
   * Soft delete user (Admin only)
   */
  deleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userService = getUserService();
    const { id } = req.params;
    const deletedBy = (req as AuthenticatedRequest).user?.id;

    await userService.deleteUser(Number(id), deletedBy);

    res.status(200).json({
      success: true,
      data: null,
      message: 'User deleted successfully',
    });
  });

  /**
   * PUT /api/users/:id/role
   * Change user role (Admin only)
   */
  changeUserRole = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userService = getUserService();
    const { id } = req.params;
    const { roleId } = req.body;
    const changedBy = (req as AuthenticatedRequest).user?.id;

    if (!changedBy) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authentication required',
        },
      });
      return;
    }

    const result = await userService.changeUserRole(Number(id), Number(roleId), changedBy);

    const response: ApiResponse = {
      success: true,
      data: {
        user: result.user,
        previousRole: result.previousRole,
        newRole: result.newRole,
      },
      message: 'User role changed successfully',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/users/:id/status
   * Change user status (Admin/Manager)
   */
  changeUserStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userService = getUserService();
    const { id } = req.params;
    const { status } = req.body;
    const changedBy = (req as AuthenticatedRequest).user?.id;

    if (!changedBy) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authentication required',
        },
      });
      return;
    }

    const result = await userService.changeUserStatus(Number(id), status, changedBy);

    const response: ApiResponse = {
      success: true,
      data: {
        user: result.user,
        previousStatus: result.previousStatus,
        newStatus: result.newStatus,
      },
      message: 'User status changed successfully',
    };

    res.status(200).json(response);
  });

  /**
   * GET /api/users/search
   * Search users by name or email
   */
  searchUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userService = getUserService();
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || typeof q !== 'string') {
      res.status(400).json({
        success: false,
        error: {
          code: 'VAL_001',
          message: 'Search query parameter "q" is required',
        },
      });
      return;
    }

    const result = await userService.searchUsers(q, {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });

    const response: PaginatedApiResponse = {
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
   * PUT /api/users/:id/reactivate
   * Reactivate a suspended or inactive user
   */
  reactivateUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userService = getUserService();
    const { id } = req.params;
    const reactivatedBy = (req as AuthenticatedRequest).user?.id;

    if (!reactivatedBy) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authentication required',
        },
      });
      return;
    }

    const user = await userService.reactivateUser(Number(id), reactivatedBy);

    const response: ApiResponse = {
      success: true,
      data: { user },
      message: 'User reactivated successfully',
    };

    res.status(200).json(response);
  });

  /**
   * PUT /api/users/:id/suspend
   * Suspend a user
   */
  suspendUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const userService = getUserService();
    const { id } = req.params;
    const suspendedBy = (req as AuthenticatedRequest).user?.id;

    if (!suspendedBy) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authentication required',
        },
      });
      return;
    }

    const user = await userService.suspendUser(Number(id), suspendedBy);

    const response: ApiResponse = {
      success: true,
      data: { user },
      message: 'User suspended successfully',
    };

    res.status(200).json(response);
  });
}

export default new UserController();
