/**
 * User Service
 *
 * Business logic for user CRUD operations and user management.
 * This service is framework-agnostic and contains pure business logic.
 *
 * @module core/services/UserService
 */

import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../domain/errors/index.js';
import type {
  IUser,
  ICreateUserDTO,
  IUpdateUserDTO,
  IUserQueryOptions,
  IPaginatedResult,
  IRole,
} from '../domain/repositories/IUserRepository.js';
import type { IUserRepository } from '../domain/repositories/IUserRepository.js';
import type { UserStatus } from '../../infrastructure/database/models/User.js';
import type { RoleName } from '../../infrastructure/database/models/Role.js';

/**
 * User statistics result
 */
export interface UserStatistics {
  total: number;
  active: number;
  inactive: number;
  suspended: number;
  pending: number;
  byRole: Record<string, number>;
}

/**
 * User creation options
 */
export interface CreateUserOptions {
  skipPasswordValidation?: boolean;
  sendWelcomeEmail?: boolean;
  createdBy?: number;
}

/**
 * User update options
 */
export interface UpdateUserOptions {
  updatedBy?: number;
  skipEmailValidation?: boolean;
}

/**
 * User list options with additional filters
 */
export interface UserListOptions extends IUserQueryOptions {
  excludeIds?: number[];
  includePermissions?: boolean;
}

/**
 * Role change result
 */
export interface RoleChangeResult {
  user: IUser;
  previousRole: IRole;
  newRole: IRole;
  changedBy: number;
}

/**
 * Status change result
 */
export interface StatusChangeResult {
  user: IUser;
  previousStatus: UserStatus;
  newStatus: UserStatus;
  changedBy: number;
}

/**
 * Email validation pattern
 */
const EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Phone validation pattern - supports international formats
 */
const PHONE_PATTERN = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;

/**
 * Helper for typed user status values
 */
const userStatus = {
  ACTIVE: 'active' as UserStatus,
  INACTIVE: 'inactive' as UserStatus,
  SUSPENDED: 'suspended' as UserStatus,
  PENDING: 'pending' as UserStatus,
};

/**
 * Valid user statuses
 */
const VALID_STATUSES: UserStatus[] = [
  userStatus.ACTIVE,
  userStatus.INACTIVE,
  userStatus.SUSPENDED,
  userStatus.PENDING,
];

/**
 * User Service Class
 *
 * Provides user-related business logic operations
 */
export class UserService {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  /**
   * Create a new user with validation
   *
   * @param userData - User creation data
   * @param passwordHash - Hashed password
   * @param options - Creation options
   * @returns Created user
   * @throws ValidationError if validation fails
   * @throws ConflictError if email already exists
   */
  async createUser(
    userData: ICreateUserDTO,
    passwordHash: string,
    options: CreateUserOptions = {}
  ): Promise<IUser> {
    const { createdBy } = options;

    // Validate email format
    if (!this.isValidEmail(userData.email)) {
      throw new ValidationError('Invalid email format');
    }

    // Validate email length
    if (userData.email.length > 255) {
      throw new ValidationError('Email address is too long (max 255 characters)');
    }

    // Validate phone format if provided
    if (userData.phone && !this.isValidPhone(userData.phone)) {
      throw new ValidationError('Invalid phone number format');
    }

    // Validate names
    if (!userData.firstName || userData.firstName.trim().length === 0) {
      throw new ValidationError('First name is required');
    }

    if (!userData.lastName || userData.lastName.trim().length === 0) {
      throw new ValidationError('Last name is required');
    }

    if (userData.firstName.length > 100) {
      throw new ValidationError('First name is too long (max 100 characters)');
    }

    if (userData.lastName.length > 100) {
      throw new ValidationError('Last name is too long (max 100 characters)');
    }

    // Validate password hash is provided
    if (!passwordHash || passwordHash.length === 0) {
      throw new ValidationError('Password hash is required');
    }

    // Validate status if provided
    if (userData.status && !this.isValidStatus(userData.status)) {
      throw new ValidationError(`Invalid status. Must be one of: active, inactive, suspended, pending`);
    }

    // Check if email already exists
    const emailExists = await this.userRepository.emailExists(userData.email);
    if (emailExists) {
      throw new ConflictError('A user with this email already exists');
    }

    // Check if role exists
    const role = await this.userRepository.getRoleById(userData.roleId);
    if (!role) {
      throw new ValidationError('Invalid role specified');
    }

    // Create user with password hash
    const createData: ICreateUserDTO = {
      email: userData.email.trim().toLowerCase(),
      password: passwordHash,
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      phone: userData.phone?.trim(),
      roleId: userData.roleId,
      status: userData.status || userStatus.PENDING,
    };

    return this.userRepository.create(createData);
  }

  /**
   * Update an existing user
   *
   * @param userId - User ID to update
   * @param userData - User update data
   * @param options - Update options
   * @returns Updated user
   * @throws ValidationError if validation fails
   * @throws NotFoundError if user not found
   * @throws ConflictError if email conflict
   */
  async updateUser(
    userId: number,
    userData: IUpdateUserDTO,
    options: UpdateUserOptions = {}
  ): Promise<IUser> {
    const { updatedBy, skipEmailValidation } = options;

    // Check if user exists
    const existingUser = await this.userRepository.findById(userId);
    if (!existingUser) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    // Validate email format if provided
    if (userData.email !== undefined) {
      if (!skipEmailValidation && !this.isValidEmail(userData.email)) {
        throw new ValidationError('Invalid email format');
      }
      if (userData.email.length > 255) {
        throw new ValidationError('Email address is too long (max 255 characters)');
      }
    }

    // Validate phone format if provided
    if (userData.phone !== undefined && userData.phone !== null && userData.phone.length > 0) {
      if (!this.isValidPhone(userData.phone)) {
        throw new ValidationError('Invalid phone number format');
      }
    }

    // Validate names if provided
    if (userData.firstName !== undefined) {
      if (userData.firstName.trim().length === 0) {
        throw new ValidationError('First name cannot be empty');
      }
      if (userData.firstName.length > 100) {
        throw new ValidationError('First name is too long (max 100 characters)');
      }
    }

    if (userData.lastName !== undefined) {
      if (userData.lastName.trim().length === 0) {
        throw new ValidationError('Last name cannot be empty');
      }
      if (userData.lastName.length > 100) {
        throw new ValidationError('Last name is too long (max 100 characters)');
      }
    }

    // Validate status if provided
    if (userData.status !== undefined && !this.isValidStatus(userData.status)) {
      throw new ValidationError(`Invalid status. Must be one of: active, inactive, suspended, pending`);
    }

    // Validate role if provided
    if (userData.roleId !== undefined) {
      const role = await this.userRepository.getRoleById(userData.roleId);
      if (!role) {
        throw new ValidationError('Invalid role specified');
      }
    }

    // Check email uniqueness if changing email
    if (userData.email && userData.email !== existingUser.email) {
      const emailExists = await this.userRepository.emailExists(userData.email, userId);
      if (emailExists) {
        throw new ConflictError('A user with this email already exists');
      }
    }

    // Prepare update data
    const updateData: IUpdateUserDTO = {};

    if (userData.email !== undefined) {
      updateData.email = userData.email.trim().toLowerCase();
    }
    if (userData.firstName !== undefined) {
      updateData.firstName = userData.firstName.trim();
    }
    if (userData.lastName !== undefined) {
      updateData.lastName = userData.lastName.trim();
    }
    if (userData.phone !== undefined) {
      updateData.phone = userData.phone?.trim() || null;
    }
    if (userData.status !== undefined) {
      updateData.status = userData.status;
    }
    if (userData.roleId !== undefined) {
      updateData.roleId = userData.roleId;
    }
    if (userData.password !== undefined) {
      updateData.password = userData.password;
    }

    const updatedUser = await this.userRepository.update(userId, updateData);
    if (!updatedUser) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    return updatedUser;
  }

  /**
   * Soft delete a user
   *
   * @param userId - User ID to delete
   * @param deletedBy - User ID performing the deletion
   * @returns True if deleted
   * @throws NotFoundError if user not found
   * @throws ForbiddenError if trying to delete self
   */
  async deleteUser(userId: number, deletedBy?: number): Promise<boolean> {
    // Check if user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    // Prevent users from deleting themselves
    if (deletedBy && deletedBy === userId) {
      throw new ForbiddenError('Users cannot delete themselves');
    }

    return this.userRepository.delete(userId);
  }

  /**
   * Get a user by ID
   *
   * @param userId - User ID
   * @param includeDeleted - Include soft-deleted users
   * @returns User or null if not found
   */
  async getUserById(userId: number, includeDeleted = false): Promise<IUser | null> {
    return this.userRepository.findById(userId, { includeDeleted });
  }

  /**
   * Get a user by email
   *
   * @param email - User email
   * @param includeDeleted - Include soft-deleted users
   * @returns User or null if not found
   */
  async getUserByEmail(email: string, includeDeleted = false): Promise<IUser | null> {
    return this.userRepository.findByEmail(email, { includeDeleted });
  }

  /**
   * List users with filtering and pagination
   *
   * @param options - Query options
   * @returns Paginated user list
   */
  async listUsers(options: UserListOptions = {}): Promise<IPaginatedResult<IUser>> {
    const queryOptions: IUserQueryOptions = {};

    if (options.status) queryOptions.status = options.status;
    if (options.roleId) queryOptions.roleId = options.roleId;
    if (options.roleName) queryOptions.roleName = options.roleName;
    if (options.search) queryOptions.search = options.search;
    if (options.includeDeleted) queryOptions.includeDeleted = options.includeDeleted;
    if (options.page) queryOptions.page = options.page;
    if (options.limit) queryOptions.limit = options.limit;
    if (options.sortBy) queryOptions.sortBy = options.sortBy;
    if (options.sortOrder) queryOptions.sortOrder = options.sortOrder;

    return this.userRepository.findAll(queryOptions);
  }

  /**
   * Change a user's role (Admin only)
   *
   * @param userId - User ID
   * @param newRoleId - New role ID
   * @param changedBy - User ID making the change
   * @returns Role change result
   * @throws NotFoundError if user or role not found
   * @throws ValidationError if invalid role
   * @throws ForbiddenError if insufficient permissions
   */
  async changeUserRole(
    userId: number,
    newRoleId: number,
    changedBy: number
  ): Promise<RoleChangeResult> {
    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    // Get new role
    const newRole = await this.userRepository.getRoleById(newRoleId);
    if (!newRole) {
      throw new NotFoundError(`Role with ID ${newRoleId} not found`);
    }

    // Get current role
    const currentRole = await this.userRepository.getRoleById(user.roleId);
    if (!currentRole) {
      throw new NotFoundError(`Current role not found`);
    }

    // Check if role is actually changing
    if (user.roleId === newRoleId) {
      throw new ValidationError('User already has this role');
    }

    // Update user role
    const updatedUser = await this.userRepository.update(userId, { roleId: newRoleId });
    if (!updatedUser) {
      throw new NotFoundError(`Failed to update user role`);
    }

    return {
      user: updatedUser,
      previousRole: currentRole,
      newRole,
      changedBy,
    };
  }

  /**
   * Change a user's status (Admin/Manager)
   *
   * @param userId - User ID
   * @param newStatus - New status
   * @param changedBy - User ID making the change
   * @returns Status change result
   * @throws NotFoundError if user not found
   * @throws ValidationError if invalid status
   */
  async changeUserStatus(
    userId: number,
    newStatus: UserStatus,
    changedBy: number
  ): Promise<StatusChangeResult> {
    // Get user
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    // Validate status
    if (!this.isValidStatus(newStatus)) {
      throw new ValidationError(`Invalid status. Must be one of: active, inactive, suspended, pending`);
    }

    // Check if status is actually changing
    if (user.status === newStatus) {
      throw new ValidationError('User already has this status');
    }

    // Update user status
    const updatedUser = await this.userRepository.update(userId, { status: newStatus });
    if (!updatedUser) {
      throw new NotFoundError(`Failed to update user status`);
    }

    return {
      user: updatedUser,
      previousStatus: user.status,
      newStatus,
      changedBy,
    };
  }

  /**
   * Get users by role
   *
   * @param roleId - Role ID
   * @param options - Query options
   * @returns Paginated user list for role
   */
  async getUsersByRole(
    roleId: number,
    options: Partial<IUserQueryOptions> = {}
  ): Promise<IPaginatedResult<IUser>> {
    // Check if role exists
    const role = await this.userRepository.getRoleById(roleId);
    if (!role) {
      throw new NotFoundError(`Role with ID ${roleId} not found`);
    }

    return this.userRepository.findAll({
      ...options,
      roleId,
    });
  }

  /**
   * Get users by role name
   *
   * @param roleName - Role name
   * @param options - Query options
   * @returns Paginated user list for role
   */
  async getUsersByRoleName(
    roleName: RoleName,
    options: Partial<IUserQueryOptions> = {}
  ): Promise<IPaginatedResult<IUser>> {
    return this.userRepository.findAll({
      ...options,
      roleName,
    });
  }

  /**
   * Get user statistics
   *
   * @param filters - Optional filters for statistics
   * @returns User statistics
   */
  async getUserStatistics(filters?: Partial<IUserQueryOptions>): Promise<UserStatistics> {
    const baseOptions = filters || {};

    // Get counts by status
    const [total, active, inactive, suspended, pending] = await Promise.all([
      this.userRepository.countByStatus(),
      this.userRepository.countByStatus(userStatus.ACTIVE),
      this.userRepository.countByStatus(userStatus.INACTIVE),
      this.userRepository.countByStatus(userStatus.SUSPENDED),
      this.userRepository.countByStatus(userStatus.PENDING),
    ]);

    // Get all roles and count users per role
    const roles = await this.userRepository.getAllRoles();
    const byRole: Record<string, number> = {};

    await Promise.all(
      roles.map(async (role) => {
        byRole[role.name] = await this.userRepository.countByRole(role.id);
      })
    );

    return {
      total,
      active,
      inactive,
      suspended,
      pending,
      byRole,
    };
  }

  /**
   * Validate email format
   *
   * @param email - Email to validate
   * @returns True if valid
   */
  private isValidEmail(email: string): boolean {
    if (!email || email.length === 0) {
      return false;
    }
    return EMAIL_PATTERN.test(email);
  }

  /**
   * Validate phone format
   *
   * @param phone - Phone number to validate
   * @returns True if valid
   */
  private isValidPhone(phone: string): boolean {
    if (!phone || phone.length === 0) {
      return true; // Phone is optional
    }
    return PHONE_PATTERN.test(phone);
  }

  /**
   * Validate user status
   *
   * @param status - Status to validate
   * @returns True if valid
   */
  private isValidStatus(status: UserStatus): boolean {
    return VALID_STATUSES.includes(status);
  }

  /**
   * Search users by name or email
   *
   * @param searchTerm - Search term
   * @param options - Query options
   * @returns Paginated user list
   */
  async searchUsers(
    searchTerm: string,
    options: Partial<IUserQueryOptions> = {}
  ): Promise<IPaginatedResult<IUser>> {
    if (!searchTerm || searchTerm.trim().length === 0) {
      throw new ValidationError('Search term is required');
    }

    return this.userRepository.findAll({
      ...options,
      search: searchTerm.trim(),
    });
  }

  /**
   * Reactivate a suspended or inactive user
   *
   * @param userId - User ID
   * @param reactivatedBy - User ID performing reactivation
   * @returns Updated user
   */
  async reactivateUser(userId: number, reactivatedBy: number): Promise<IUser> {
    return this.changeUserStatus(userId, userStatus.ACTIVE, reactivatedBy).then((result) => result.user);
  }

  /**
   * Suspend a user
   *
   * @param userId - User ID
   * @param suspendedBy - User ID performing suspension
   * @returns Updated user
   */
  async suspendUser(userId: number, suspendedBy: number): Promise<IUser> {
    return this.changeUserStatus(userId, userStatus.SUSPENDED, suspendedBy).then((result) => result.user);
  }

  /**
   * Deactivate a user
   *
   * @param userId - User ID
   * @param deactivatedBy - User ID performing deactivation
   * @returns Updated user
   */
  async deactivateUser(userId: number, deactivatedBy: number): Promise<IUser> {
    return this.changeUserStatus(userId, userStatus.INACTIVE, deactivatedBy).then((result) => result.user);
  }

  /**
   * Restore a soft-deleted user
   *
   * @param userId - User ID
   * @returns Restored user
   * @throws NotFoundError if user not found
   */
  async restoreUser(userId: number): Promise<IUser> {
    const user = await this.userRepository.restore(userId);
    if (!user) {
      throw new NotFoundError(`User with ID ${userId} not found or cannot be restored`);
    }
    return user;
  }

  /**
   * Permanently delete a user
   *
   * WARNING: This cannot be undone
   *
   * @param userId - User ID
   * @param deletedBy - User ID performing deletion
   * @returns True if deleted
   * @throws NotFoundError if user not found
   * @throws ForbiddenError if trying to delete self
   */
  async permanentDeleteUser(userId: number, deletedBy: number): Promise<boolean> {
    // Prevent users from deleting themselves
    if (deletedBy === userId) {
      throw new ForbiddenError('Users cannot delete themselves');
    }

    const deleted = await this.userRepository.hardDelete(userId);
    if (!deleted) {
      throw new NotFoundError(`User with ID ${userId} not found`);
    }

    return deleted;
  }
}

/**
 * Singleton instance management
 */
let userServiceInstance: UserService | null = null;

/**
 * Initialize user service
 *
 * @param userRepository - User repository instance
 * @returns User service instance
 */
export function initializeUserService(userRepository: IUserRepository): UserService {
  userServiceInstance = new UserService(userRepository);
  return userServiceInstance;
}

/**
 * Get the user service instance
 *
 * @throws Error if service not initialized
 * @returns User service instance
 */
export function getUserService(): UserService {
  if (!userServiceInstance) {
    throw new Error('UserService not initialized. Call initializeUserService first.');
  }

  return userServiceInstance;
}

export default UserService;
