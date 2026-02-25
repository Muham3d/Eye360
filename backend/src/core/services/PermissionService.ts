/**
 * Permission Service
 *
 * Business logic for permission checking and role-based access control.
 * This service is framework-agnostic and contains pure business logic.
 *
 * @module core/services/PermissionService
 */

import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
} from '../domain/errors/index.js';
import type {
  IUser,
  IPermission,
  IRole,
} from '../domain/repositories/IUserRepository.js';
import type { IUserRepository } from '../domain/repositories/IUserRepository.js';
import type { RoleName } from '../../infrastructure/database/models/Role.js';

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  granted: boolean;
  reason?: string;
  resource: string;
  action: string;
}

/**
 * User permissions summary
 */
export interface UserPermissionsSummary {
  userId: number;
  role: IRole;
  permissions: IPermission[];
  permissionNames: string[];
  canManageUsers: boolean;
  canManageSites: boolean;
  canManagePatrols: boolean;
  canManageIncidents: boolean;
  canViewReports: boolean;
}

/**
 * Permission matrix entry
 */
export interface PermissionMatrixEntry {
  resource: string;
  actions: Record<string, Set<string>>;
}

/**
 * Permission cache entry
 */
interface PermissionCacheEntry {
  permissions: IPermission[];
  timestamp: number;
}

/**
 * Permission cache TTL (5 minutes)
 */
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Role hierarchy levels
 * Lower number = higher privilege
 */
const ROLE_HIERARCHY: Record<string, number> = {
  Admin: 1,
  Manager: 2,
  Supervisor: 3,
  Guard: 4,
};

/**
 * Helper to create RoleName array with proper typing
 */
const roleNames = {
  Admin: 'Admin' as RoleName,
  Manager: 'Manager' as RoleName,
  Supervisor: 'Supervisor' as RoleName,
  Guard: 'Guard' as RoleName,
};

/**
 * Default permission matrix for system roles
 * This defines the base permissions each role has
 */
const DEFAULT_PERMISSION_MATRIX: Record<string, Record<string, RoleName[]>> = {
  users: {
    create: [roleNames.Admin, roleNames.Manager],
    read: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor],
    update: [roleNames.Admin, roleNames.Manager],
    delete: [roleNames.Admin],
    manage: [roleNames.Admin, roleNames.Manager],
  },
  sites: {
    create: [roleNames.Admin, roleNames.Manager],
    read: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor, roleNames.Guard],
    update: [roleNames.Admin, roleNames.Manager],
    delete: [roleNames.Admin],
    manage: [roleNames.Admin, roleNames.Manager],
  },
  checkpoints: {
    create: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor],
    read: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor, roleNames.Guard],
    update: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor],
    delete: [roleNames.Admin, roleNames.Manager],
    manage: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor],
  },
  patrols: {
    create: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor],
    read: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor, roleNames.Guard],
    update: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor],
    delete: [roleNames.Admin, roleNames.Manager],
    manage: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor],
    assign: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor],
  },
  incidents: {
    create: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor, roleNames.Guard],
    read: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor, roleNames.Guard],
    update: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor],
    delete: [roleNames.Admin],
    manage: [roleNames.Admin, roleNames.Manager],
    approve: [roleNames.Admin, roleNames.Manager],
  },
  reports: {
    read: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor],
    export: [roleNames.Admin, roleNames.Manager],
  },
  settings: {
    read: [roleNames.Admin, roleNames.Manager],
    update: [roleNames.Admin],
    manage: [roleNames.Admin],
  },
  notifications: {
    create: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor],
    read: [roleNames.Admin, roleNames.Manager, roleNames.Supervisor, roleNames.Guard],
    delete: [roleNames.Admin],
  },
};

/**
 * Permission Service Class
 *
 * Provides permission-related business logic operations
 */
export class PermissionService {
  private permissionCache: Map<number, PermissionCacheEntry> = new Map();

  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Check if a user has a specific permission
   *
   * @param userId - User ID
   * @param resource - Resource name (e.g., 'users', 'sites')
   * @param action - Action name (e.g., 'create', 'read', 'update', 'delete')
   * @returns Permission check result
   */
  async userHasPermission(
    userId: number,
    resource: string,
    action: string
  ): Promise<PermissionCheckResult> {
    // Validate inputs
    if (!resource || resource.trim().length === 0) {
      return {
        granted: false,
        reason: 'Resource is required',
        resource: '',
        action,
      };
    }

    if (!action || action.trim().length === 0) {
      return {
        granted: false,
        reason: 'Action is required',
        resource,
        action: '',
      };
    }

    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      return {
        granted: false,
        reason: 'User not found',
        resource,
        action,
      };
    }

    // Check if user account is active
    if (user.status !== 'active') {
      return {
        granted: false,
        reason: 'User account is not active',
        resource,
        action,
      };
    }

    // Check permission via repository
    const hasPermission = await this.userRepository.userHasPermission(userId, resource, action);

    if (hasPermission) {
      return {
        granted: true,
        resource,
        action,
      };
    }

    // Fallback to default permission matrix for system roles
    const defaultGranted = this.checkDefaultPermission(user.roleName as string, resource, action);
    return {
      granted: defaultGranted,
      reason: defaultGranted ? undefined : 'Permission not granted for this action',
      resource,
      action,
    };
  }

  /**
   * Check if a user can manage another user based on role hierarchy
   *
   * @param userId - User ID of the manager
   * @param targetUserId - User ID to be managed
   * @returns True if user can manage target user
   */
  async canManageUser(userId: number, targetUserId: number): Promise<boolean> {
    // Users can always manage themselves for certain operations
    if (userId === targetUserId) {
      return true;
    }

    // Get both users
    const [user, targetUser] = await Promise.all([
      this.userRepository.findById(userId),
      this.userRepository.findById(targetUserId),
    ]);

    if (!user || !targetUser) {
      return false;
    }

    // Both users must be active
    if (user.status !== 'active' || targetUser.status !== 'active') {
      return false;
    }

    // Use repository method for role hierarchy check
    return this.userRepository.canManageRole(userId, targetUser.roleId);
  }

  /**
   * Get all permissions for a specific role
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
   * Get all permissions for a specific user
   *
   * @param userId - User ID
   * @returns User permissions summary
   * @throws NotFoundError if user not found
   */
  async getUserPermissions(userId: number): Promise<UserPermissionsSummary> {
    // Check cache first
    const cached = this.permissionCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return this.buildPermissionsSummary(userId, cached.permissions);
    }

    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    // Get user's role
    const role = await this.userRepository.getRoleById(user.roleId);
    if (!role) {
      throw new NotFoundError(`Role with ID ${user.roleId} not found`);
    }

    // Get role permissions
    const permissions = await this.userRepository.getPermissionsForRole(user.roleId);

    // Cache the result
    this.permissionCache.set(userId, {
      permissions,
      timestamp: Date.now(),
    });

    return this.buildPermissionsSummary(userId, permissions, role);
  }

  /**
   * Get all permissions available in the system
   *
   * @returns List of all permissions
   */
  async getAllPermissions(): Promise<IPermission[]> {
    return this.userRepository.getAllPermissions();
  }

  /**
   * Check if a role can manage another role based on hierarchy
   *
   * @param managerRoleId - Role ID of the manager
   * @param targetRoleId - Role ID to be managed
   * @returns True if manager role can manage target role
   */
  async canRoleManageRole(managerRoleId: number, targetRoleId: number): Promise<boolean> {
    // Get both roles
    const [managerRole, targetRole] = await Promise.all([
      this.userRepository.getRoleById(managerRoleId),
      this.userRepository.getRoleById(targetRoleId),
    ]);

    if (!managerRole || !targetRole) {
      return false;
    }

    // Use role level for hierarchy check
    return managerRole.level < targetRole.level;
  }

  /**
   * Get hierarchical permissions (includes inherited permissions)
   *
   * @param userId - User ID
   * @returns List of all effective permissions
   */
  async getHierarchicalPermissions(userId: number): Promise<IPermission[]> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    // Get direct permissions
    const directPermissions = await this.userRepository.getPermissionsForRole(user.roleId);

    // For Admin role, they have all permissions
    if (user.roleName === 'Admin') {
      const allPermissions = await this.userRepository.getAllPermissions();
      return allPermissions;
    }

    return directPermissions;
  }

  /**
   * Check multiple permissions at once
   *
   * @param userId - User ID
   * @param permissions - Array of {resource, action} to check
   * @returns Array of permission check results
   */
  async checkMultiplePermissions(
    userId: number,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<PermissionCheckResult[]> {
    return Promise.all(
      permissions.map(({ resource, action }) =>
        this.userHasPermission(userId, resource, action)
      )
    );
  }

  /**
   * Check if user has ALL specified permissions
   *
   * @param userId - User ID
   * @param permissions - Array of {resource, action} to check
   * @returns True if user has all permissions
   */
  async hasAllPermissions(
    userId: number,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<boolean> {
    const results = await this.checkMultiplePermissions(userId, permissions);
    return results.every((result) => result.granted);
  }

  /**
   * Check if user has ANY of the specified permissions
   *
   * @param userId - User ID
   * @param permissions - Array of {resource, action} to check
   * @returns True if user has at least one permission
   */
  async hasAnyPermission(
    userId: number,
    permissions: Array<{ resource: string; action: string }>
  ): Promise<boolean> {
    const results = await this.checkMultiplePermissions(userId, permissions);
    return results.some((result) => result.granted);
  }

  /**
   * Get the permission matrix for a role
   *
   * @param roleName - Role name
   * @returns Permission matrix for the role
   */
  getRolePermissionMatrix(roleName: RoleName): Record<string, string[]> {
    const matrix: Record<string, string[]> = {};

    for (const [resource, actions] of Object.entries(DEFAULT_PERMISSION_MATRIX)) {
      const roleActions: string[] = [];
      for (const [action, roles] of Object.entries(actions)) {
        if (roles.includes(roleName)) {
          roleActions.push(action);
        }
      }
      if (roleActions.length > 0) {
        matrix[resource] = roleActions;
      }
    }

    return matrix;
  }

  /**
   * Clear permission cache for a specific user
   *
   * @param userId - User ID
   */
  clearUserPermissionCache(userId: number): void {
    this.permissionCache.delete(userId);
  }

  /**
   * Clear all permission caches
   */
  clearAllPermissionCaches(): void {
    this.permissionCache.clear();
  }

  /**
   * Validate a permission resource string
   *
   * @param resource - Resource to validate
   * @returns True if valid
   */
  isValidResource(resource: string): boolean {
    const validResources = Object.keys(DEFAULT_PERMISSION_MATRIX);
    return validResources.includes(resource);
  }

  /**
   * Validate a permission action string
   *
   * @param action - Action to validate
   * @returns True if valid
   */
  isValidAction(action: string): boolean {
    const validActions = new Set<string>();
    for (const actions of Object.values(DEFAULT_PERMISSION_MATRIX)) {
      Object.keys(actions).forEach((a) => validActions.add(a));
    }
    return validActions.has(action);
  }

  /**
   * Check permission against default permission matrix
   *
   * @param roleName - Role name
   * @param resource - Resource
   * @param action - Action
   * @returns True if role has permission
   */
  private checkDefaultPermission(
    roleName: string,
    resource: string,
    action: string
  ): boolean {
    const resourcePermissions = DEFAULT_PERMISSION_MATRIX[resource];
    if (!resourcePermissions) {
      return false;
    }

    const actionRoles = resourcePermissions[action];
    if (!actionRoles) {
      return false;
    }

    return actionRoles.includes(roleName as RoleName);
  }

  /**
   * Build permissions summary object
   *
   * @param userId - User ID
   * @param permissions - List of permissions
   * @param role - User role (optional, will be fetched if not provided)
   * @returns User permissions summary
   */
  private async buildPermissionsSummary(
    userId: number,
    permissions: IPermission[],
    role?: IRole
  ): Promise<UserPermissionsSummary> {
    // Fetch role if not provided
    if (!role) {
      const user = await this.userRepository.findById(userId);
      if (!user) {
        throw new NotFoundError(`User with ID ${userId} not found`);
      }
      role = await this.userRepository.getRoleById(user.roleId);
      if (!role) {
        throw new NotFoundError(`Role not found for user`);
      }
    }

    const permissionNames = permissions.map((p) => p.name);

    // Build boolean flags for common permissions
    const permissionMap = new Map(
      permissions.map((p) => [`${p.resource}.${p.action}`, true])
    );

    return {
      userId,
      role,
      permissions,
      permissionNames,
      canManageUsers: permissionMap.has('users.manage') || role.name === 'Admin',
      canManageSites: permissionMap.has('sites.manage') || role.name === 'Admin',
      canManagePatrols: permissionMap.has('patrols.manage') || role.name === 'Admin',
      canManageIncidents: permissionMap.has('incidents.manage') || role.name === 'Admin',
      canViewReports: permissionMap.has('reports.read') || role.name === 'Admin',
    };
  }

  /**
   * Get role hierarchy level
   *
   * @param roleName - Role name
   * @returns Hierarchy level (1 = highest)
   */
  getRoleLevel(roleName: RoleName): number {
    return ROLE_HIERARCHY[roleName] ?? 999;
  }

  /**
   * Compare two roles by hierarchy
   *
   * @param role1Name - First role name
   * @param role2Name - Second role name
   * @returns -1 if role1 < role2 (higher), 0 if equal, 1 if role1 > role2 (lower)
   */
  compareRoles(role1Name: RoleName, role2Name: RoleName): number {
    const level1 = this.getRoleLevel(role1Name);
    const level2 = this.getRoleLevel(role2Name);

    if (level1 < level2) return -1;
    if (level1 > level2) return 1;
    return 0;
  }

  /**
   * Check if role is higher in hierarchy than another
   *
   * @param role1Name - First role name
   * @param role2Name - Second role name
   * @returns True if role1 is higher than role2
   */
  isRoleHigher(role1Name: RoleName, role2Name: RoleName): boolean {
    return this.getRoleLevel(role1Name) < this.getRoleLevel(role2Name);
  }
}

/**
 * Singleton instance management
 */
let permissionServiceInstance: PermissionService | null = null;

/**
 * Initialize permission service
 *
 * @param userRepository - User repository instance
 * @returns Permission service instance
 */
export function initializePermissionService(userRepository: IUserRepository): PermissionService {
  permissionServiceInstance = new PermissionService(userRepository);
  return permissionServiceInstance;
}

/**
 * Get the permission service instance
 *
 * @throws Error if service not initialized
 * @returns Permission service instance
 */
export function getPermissionService(): PermissionService {
  if (!permissionServiceInstance) {
    throw new Error('PermissionService not initialized. Call initializePermissionService first.');
  }

  return permissionServiceInstance;
}

export default PermissionService;
