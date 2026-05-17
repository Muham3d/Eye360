import { Request, Response, NextFunction } from 'express';
import { getPermissionService } from '../../../core/services/PermissionService.js';
import { ForbiddenError } from '../../../core/domain/errors/ForbiddenError.js';
import { asyncHandler } from './errorHandler.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    sessionId?: string;
  };
}

/**
 * Middleware factory: checks if the authenticated user has the specified permission.
 * Must be used AFTER authMiddleware.
 *
 * @param resource - Resource name (e.g., 'users', 'sites', 'incidents')
 * @param action - Action name (e.g., 'read', 'create', 'update', 'delete')
 */
export function requirePermission(resource: string, action: string) {
  return asyncHandler(async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    const user = req.user;
    if (!user) {
      throw ForbiddenError.insufficientRole('authenticated user', 'none');
    }

    // Admin always passes
    if (user.role === 'admin') {
      next();
      return;
    }

    const permissionService = getPermissionService();
    const result = await permissionService.checkPermission(user.id, resource, action);

    if (!result.granted) {
      throw new ForbiddenError(
        `Permission denied: ${result.reason || `${resource}:${action} requires elevated privileges`}`
      );
    }

    next();
  });
}

/**
 * Role hierarchy check — ensures the acting user can manage the target user.
 * Admin can manage anyone, Manager can manage Supervisor/Guard, etc.
 */
export function requireRoleAbove(targetRole: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      throw ForbiddenError.insufficientRole('authenticated user', 'none');
    }

    const HIERARCHY: Record<string, number> = {
      admin: 1,
      manager: 2,
      supervisor: 3,
      guard: 4,
    };

    const userLevel = HIERARCHY[user.role.toLowerCase()] ?? 99;
    const targetLevel = HIERARCHY[targetRole.toLowerCase()] ?? 99;

    if (userLevel >= targetLevel) {
      throw new ForbiddenError(
        `Your role (${user.role}) cannot manage users with role ${targetRole}`
      );
    }

    next();
  };
}
