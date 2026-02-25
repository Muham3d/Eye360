/**
 * Forbidden Error
 *
 * Thrown when the user is authenticated but lacks permission
 * to perform the requested action.
 *
 * @module core/domain/errors
 */

import { AppError } from './AppError.js';

/**
 * Forbidden error class
 * Used when user is authenticated but lacks permission
 */
export class ForbiddenError extends AppError {
  /**
   * The required permission that was missing
   */
  public readonly requiredPermission?: string;

  /**
   * The user's role that lacked the permission
   */
  public readonly userRole?: string;

  constructor(
    message: string = 'Access forbidden',
    requiredPermission?: string,
    userRole?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      403,
      'FORBIDDEN',
      true,
      { ...context, requiredPermission, userRole }
    );

    this.requiredPermission = requiredPermission;
    this.userRole = userRole;
    this.name = 'ForbiddenError';
  }

  /**
   * Create error for missing permission
   */
  static missingPermission(permission: string, userRole?: string): ForbiddenError {
    return new ForbiddenError(
      `You do not have permission to perform this action`,
      permission,
      userRole
    );
  }

  /**
   * Create error for insufficient role level
   */
  static insufficientRole(requiredRole: string, currentRole: string): ForbiddenError {
    return new ForbiddenError(
      `This action requires ${requiredRole} role or higher`,
      requiredRole,
      currentRole
    );
  }

  /**
   * Create error for resource ownership
   */
  static notOwner(): ForbiddenError {
    return new ForbiddenError(
      'You do not have permission to access this resource'
    );
  }

  /**
   * Create error for action not allowed in current state
   */
  static invalidState(state: string, action: string): ForbiddenError {
    return new ForbiddenError(
      `Cannot ${action} in current state: ${state}`
    );
  }
}
