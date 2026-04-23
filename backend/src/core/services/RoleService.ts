/**
 * Role Service
 *
 * Business logic for role management and role hierarchy operations.
 * This service is framework-agnostic and contains pure business logic.
 *
 * @module core/services/RoleService
 */

import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../domain/errors/index.js';
import type {
  IRole,
  IPermission,
  IUser,
  IPaginatedResult,
} from '../domain/repositories/IUserRepository.js';
import type { IUserRepository } from '../domain/repositories/IUserRepository.js';
import type { RoleName } from '../../infrastructure/database/models/Role.js';

/**
 * Role with permissions details
 */
export interface RoleDetails extends IRole {
  permissions: IPermission[];
  userCount: number;
  canManageRoleIds: number[];
}

/**
 * Role hierarchy info
 */
export interface RoleHierarchyInfo {
  role: IRole;
  higherRoles: IRole[];
  lowerRoles: IRole[];
  canManageRoles: IRole[];
  canBeManagedByRoles: IRole[];
}

/**
 * Role validation result
 */
export interface RoleValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Role comparison result
 */
export interface RoleComparisonResult {
  isHigher: boolean;
  isLower: boolean;
  isEqual: boolean;
  levelDifference: number;
}

/**
 * Role summary for UI display
 */
export interface RoleSummary {
  id: number;
  name: RoleName;
  level: number;
  description?: string;
  permissionCount: number;
  userCount: number;
  isSystemRole: boolean;
}

/**
 * Helper to get typed role names
 */
const validRoleNames = {
  Admin: 'Admin' as RoleName,
  Manager: 'Manager' as RoleName,
  Supervisor: 'Supervisor' as RoleName,
  Guard: 'Guard' as RoleName,
};

/**
 * Valid role names array for validation
 */
const VALID_ROLE_NAMES_ARRAY: RoleName[] = [
  validRoleNames.Admin,
  validRoleNames.Manager,
  validRoleNames.Supervisor,
  validRoleNames.Guard,
];

/**
 * Role Service Class
 *
 * Provides role-related business logic operations
 */
export class RoleService {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Get all roles in the system
   *
   * @param includeUserCounts - Include user count for each role
   * @returns List of all roles
   */
  async getAllRoles(includeUserCounts = false): Promise<IRole[]> {
    if (includeUserCounts) {
      const rolesWithCounts = await this.userRepository.getAllRolesWithCounts();
      return rolesWithCounts as IRole[];
    }

    return this.userRepository.getAllRoles();
  }

  /**
   * Get role summaries for UI display
   *
   * @returns List of role summaries
   */
  async getRoleSummaries(): Promise<RoleSummary[]> {
    const roles = await this.userRepository.getAllRolesWithCounts();

    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      level: role.level,
      description: role.description,
      permissionCount: role.permissions?.length || 0,
      userCount: role.userCount,
      isSystemRole: role.level <= 4, // System roles have levels 1-4
    }));
  }

  /**
   * Get a role by ID
   *
   * @param roleId - Role ID
   * @param includeDetails - Include permissions and user count
   * @returns Role or null if not found
   * @throws NotFoundError if role not found
   */
  async getRoleById(roleId: number, includeDetails = false): Promise<IRole | RoleDetails | null> {
    const role = await this.userRepository.getRoleById(roleId);

    if (!role) {
      throw new NotFoundError(`Role with ID ${roleId} not found`);
    }

    if (!includeDetails) {
      return role;
    }

    // Get additional details
    const [permissions, userCount, allRoles] = await Promise.all([
      this.userRepository.getPermissionsForRole(roleId),
      this.userRepository.countByRole(roleId),
      this.userRepository.getAllRoles(),
    ]);

    // Determine which roles this role can manage
    const canManageRoleIds = allRoles
      .filter((r) => r.level > role.level)
      .map((r) => r.id);

    return {
      ...role,
      permissions,
      userCount,
      canManageRoleIds,
    };
  }

  /**
   * Get a role by name
   *
   * @param roleName - Role name
   * @param includeDetails - Include permissions and user count
   * @returns Role or null if not found
   * @throws NotFoundError if role not found
   */
  async getRoleByName(
    roleName: RoleName,
    includeDetails = false
  ): Promise<IRole | RoleDetails | null> {
    const role = await this.userRepository.getRoleByName(roleName);

    if (!role) {
      throw new NotFoundError(`Role with name '${roleName}' not found`);
    }

    if (!includeDetails) {
      return role;
    }

    // Get additional details
    const [permissions, userCount, allRoles] = await Promise.all([
      this.userRepository.getPermissionsForRole(role.id),
      this.userRepository.countByRole(role.id),
      this.userRepository.getAllRoles(),
    ]);

    // Determine which roles this role can manage
    const canManageRoleIds = allRoles
      .filter((r) => r.level > role.level)
      .map((r) => r.id);

    return {
      ...role,
      permissions,
      userCount,
      canManageRoleIds,
    };
  }

  /**
   * Get all permissions for a role
   *
   * @param roleId - Role ID
   * @returns List of permissions
   * @throws NotFoundError if role not found
   */
  async getRolePermissions(roleId: number): Promise<IPermission[]> {
    const role = await this.userRepository.getRoleById(roleId);
    if (!role) {
      throw new NotFoundError(`Role with ID ${roleId} not found`);
    }

    return this.userRepository.getPermissionsForRole(roleId);
  }

  /**
   * Check if one role can manage another role based on hierarchy
   *
   * @param managerRoleId - Role ID of the manager
   * @param targetRoleId - Role ID of the target
   * @returns True if manager role can manage target role
   * @throws NotFoundError if either role not found
   */
  async canRoleManageRole(managerRoleId: number, targetRoleId: number): Promise<boolean> {
    // Get both roles
    const [managerRole, targetRole] = await Promise.all([
      this.userRepository.getRoleById(managerRoleId),
      this.userRepository.getRoleById(targetRoleId),
    ]);

    if (!managerRole) {
      throw new NotFoundError(`Manager role with ID ${managerRoleId} not found`);
    }

    if (!targetRole) {
      throw new NotFoundError(`Target role with ID ${targetRoleId} not found`);
    }

    // A role can manage roles with higher level numbers (lower privilege)
    return managerRole.level < targetRole.level;
  }

  /**
   * Get role hierarchy information
   *
   * @param roleId - Role ID
   * @returns Role hierarchy info
   * @throws NotFoundError if role not found
   */
  async getRoleHierarchy(roleId: number): Promise<RoleHierarchyInfo> {
    const role = await this.userRepository.getRoleById(roleId);
    if (!role) {
      throw new NotFoundError(`Role with ID ${roleId} not found`);
    }

    const allRoles = await this.userRepository.getAllRoles();

    const higherRoles = allRoles.filter((r) => r.level < role.level);
    const lowerRoles = allRoles.filter((r) => r.level > role.level);
    const canManageRoles = allRoles.filter((r) => r.level > role.level);
    const canBeManagedByRoles = allRoles.filter((r) => r.level < role.level);

    return {
      role,
      higherRoles,
      lowerRoles,
      canManageRoles,
      canBeManagedByRoles,
    };
  }

  /**
   * Compare two roles by hierarchy level
   *
   * @param role1Id - First role ID
   * @param role2Id - Second role ID
   * @returns Role comparison result
   * @throws NotFoundError if either role not found
   */
  async compareRoles(role1Id: number, role2Id: number): Promise<RoleComparisonResult> {
    const [role1, role2] = await Promise.all([
      this.userRepository.getRoleById(role1Id),
      this.userRepository.getRoleById(role2Id),
    ]);

    if (!role1) {
      throw new NotFoundError(`Role with ID ${role1Id} not found`);
    }

    if (!role2) {
      throw new NotFoundError(`Role with ID ${role2Id} not found`);
    }

    return {
      isHigher: role1.level < role2.level,
      isLower: role1.level > role2.level,
      isEqual: role1.level === role2.level,
      levelDifference: Math.abs(role1.level - role2.level),
    };
  }

  /**
   * Validate role data
   *
   * @param roleName - Role name to validate
   * @param level - Role level to validate
   * @returns Validation result
   */
  validateRoleData(roleName: string, level?: number): RoleValidationResult {
    const errors: string[] = [];

    // Validate role name
    if (!roleName || roleName.trim().length === 0) {
      errors.push('Role name is required');
    } else if (!VALID_ROLE_NAMES_ARRAY.includes(roleName as RoleName)) {
      errors.push(`Invalid role name. Must be one of: Admin, Manager, Supervisor, Guard`);
    }

    // Validate level
    if (level !== undefined) {
      if (level < 1) {
        errors.push('Role level must be at least 1');
      }
      if (level > 100) {
        errors.push('Role level cannot exceed 100');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Check if role is a system role
   *
   * System roles (Admin, Manager, Supervisor, Guard) cannot be deleted
   * and have restricted modification capabilities.
   *
   * @param roleId - Role ID
   * @returns True if system role
   */
  async isSystemRole(roleId: number): Promise<boolean> {
    const role = await this.userRepository.getRoleById(roleId);
    if (!role) {
      return false;
    }

    // System roles have levels 1-4
    return role.level <= 4;
  }

  /**
   * Get users with a specific role
   *
   * @param roleId - Role ID
   * @param options - Query options
   * @returns Paginated user list
   * @throws NotFoundError if role not found
   */
  async getRoleUsers(
    roleId: number,
    options: {
      status?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<IPaginatedResult<IUser>> {
    const role = await this.userRepository.getRoleById(roleId);
    if (!role) {
      throw new NotFoundError(`Role with ID ${roleId} not found`);
    }

    return this.userRepository.findAll({
      roleId,
      status: options.status as any,
      page: options.page,
      limit: options.limit,
    });
  }

  /**
   * Get the highest level role (Admin)
   *
   * @returns Admin role
   */
  async getAdminRole(): Promise<IRole> {
    const role = await this.userRepository.getRoleByName(validRoleNames.Admin);
    if (!role) {
      throw new NotFoundError('Admin role not found in system');
    }
    return role;
  }

  /**
   * Get the lowest level role (Guard)
   *
   * @returns Guard role
   */
  async getGuardRole(): Promise<IRole> {
    const role = await this.userRepository.getRoleByName(validRoleNames.Guard);
    if (!role) {
      throw new NotFoundError('Guard role not found in system');
    }
    return role;
  }

  /**
   * Validate role hierarchy constraints
   *
   * Ensures that a role can be assigned to a user based on the
   * requesting user's role level.
   *
   * @param requesterRoleId - Role ID of the user making the request
   * @param targetRoleId - Role ID to be assigned
   * @returns True if assignment is allowed
   * @throws ValidationError if hierarchy constraint violated
   * @throws NotFoundError if either role not found
   */
  async validateRoleAssignment(
    requesterRoleId: number,
    targetRoleId: number
  ): Promise<boolean> {
    // Get both roles
    const [requesterRole, targetRole] = await Promise.all([
      this.userRepository.getRoleById(requesterRoleId),
      this.userRepository.getRoleById(targetRoleId),
    ]);

    if (!requesterRole) {
      throw new NotFoundError(`Requester role with ID ${requesterRoleId} not found`);
    }

    if (!targetRole) {
      throw new NotFoundError(`Target role with ID ${targetRoleId} not found`);
    }

    // A role can only assign roles with equal or higher level numbers (lower privilege)
    // Admin (level 1) can assign any role
    // Manager (level 2) can assign Supervisor (3) and Guard (4), but not Admin (1)
    if (requesterRole.level >= targetRole.level) {
      throw new ValidationError(
        `Role '${requesterRole.name}' cannot assign role '${targetRole.name}' due to hierarchy constraints`
      );
    }

    return true;
  }

  /**
   * Check if a user has permission to perform an action on a role
   *
   * @param userId - User ID
   * @param roleId - Target role ID
   * @param action - Action to perform (read, update, assign, etc.)
   * @returns True if user has permission
   */
  async userCanPerformActionOnRole(
    userId: number,
    roleId: number,
    action: string
  ): Promise<boolean> {
    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return false;
    }

    // Get target role
    const targetRole = await this.userRepository.getRoleById(roleId);
    if (!targetRole) {
      return false;
    }

    // Get user's role
    const userRole = await this.userRepository.getRoleById(user.roleId);
    if (!userRole) {
      return false;
    }

    // For read action, users can always read
    if (action === 'read') {
      return true;
    }

    // For assign action, check hierarchy
    if (action === 'assign') {
      return userRole.level < targetRole.level;
    }

    // For update/delete actions, only Admin can modify system roles
    if (action === 'update' || action === 'delete') {
      if (targetRole.level <= 4) {
        return userRole.name === validRoleNames.Admin;
      }
      return userRole.level < targetRole.level;
    }

    return false;
  }

  /**
   * Get all system roles
   *
   * System roles are the predefined roles: Admin, Manager, Supervisor, Guard
   *
   * @returns List of system roles
   */
  async getSystemRoles(): Promise<IRole[]> {
    const allRoles = await this.userRepository.getAllRoles();
    return allRoles.filter((role) => role.level <= 4);
  }

  /**
   * Get all custom roles (non-system roles)
   *
   * Custom roles have level > 4
   *
   * @returns List of custom roles
   */
  async getCustomRoles(): Promise<IRole[]> {
    const allRoles = await this.userRepository.getAllRoles();
    return allRoles.filter((role) => role.level > 4);
  }

  /**
   * Check if a role name is valid
   *
   * @param roleName - Role name to check
   * @returns True if valid role name
   */
  isValidRoleName(roleName: string): boolean {
    return VALID_ROLE_NAMES_ARRAY.includes(roleName as RoleName);
  }

  /**
   * Get role level by role name
   *
   * @param roleName - Role name
   * @returns Role level or null if not found
   */
  async getRoleLevelByName(roleName: RoleName): Promise<number | null> {
    const role = await this.userRepository.getRoleByName(roleName);
    return role?.level ?? null;
  }

  /**
   * Get role by level
   *
   * @param level - Role level
   * @returns Role or null if not found
   */
  async getRoleByLevel(level: number): Promise<IRole | null> {
    const allRoles = await this.userRepository.getAllRoles();
    return allRoles.find((role) => role.level === level) ?? null;
  }
}

/**
 * Singleton instance management
 */
let roleServiceInstance: RoleService | null = null;

/**
 * Initialize role service
 *
 * @param userRepository - User repository instance
 * @returns Role service instance
 */
export function initializeRoleService(userRepository: IUserRepository): RoleService {
  roleServiceInstance = new RoleService(userRepository);
  return roleServiceInstance;
}

/**
 * Get the role service instance
 *
 * @throws Error if service not initialized
 * @returns Role service instance
 */
export function getRoleService(): RoleService {
  if (!roleServiceInstance) {
    throw new Error('RoleService not initialized. Call initializeRoleService first.');
  }

  return roleServiceInstance;
}

export default RoleService;
