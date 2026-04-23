/**
 * IUserRepository Interface
 *
 * Domain-level repository interface for User operations.
 * This interface defines the contract for user data access without
 * depending on any specific database implementation (Sequelize, TypeORM, etc.).
 *
 * Following the Repository Pattern and Dependency Inversion Principle,
 * this interface belongs to the domain layer and is implemented by the
 * infrastructure layer.
 */

import { UserStatus, UserType } from '../../../infrastructure/database/models/User.js';
import { RoleName } from '../../../infrastructure/database/models/Role.js';

/**
 * User Domain Entity
 * Pure domain entity without database-specific annotations
 */
export interface IUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: UserStatus;
  roleId: number;
  roleName: RoleName;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Creation DTO
 * Data required to create a new user
 */
export interface ICreateUserDTO {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: number;
  status?: UserStatus;
}

/**
 * User Update DTO
 * Data that can be updated on a user
 */
export interface IUpdateUserDTO {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  status?: UserStatus;
  roleId?: number;
}

/**
 * User Query Options
 * Filters and pagination options for user queries
 */
export interface IUserQueryOptions {
  status?: UserStatus;
  roleId?: number;
  roleName?: RoleName;
  search?: string; // Search by email, first name, or last name
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'id' | 'email' | 'firstName' | 'lastName' | 'createdAt' | 'lastLoginAt';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Paginated Result
 * Generic paginated result wrapper
 */
export interface IPaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Authentication Result
 * Result of user authentication attempt
 */
export interface IAuthResult {
  success: boolean;
  user?: IUser;
  requiresPasswordChange?: boolean;
  accountLocked?: boolean;
  accountLockedUntil?: Date;
  remainingAttempts?: number;
}

/**
 * Session Domain Entity
 */
export interface IUserSession {
  id: number;
  userId: number;
  sessionToken: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  lastActivityAt: Date;
  createdAt: Date;
  isActive: boolean;
}

/**
 * Session Creation DTO
 */
export interface ICreateSessionDTO {
  userId: number;
  sessionToken: string;
  refreshToken?: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

/**
 * Permission Domain Entity
 */
export interface IPermission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

/**
 * Role Domain Entity
 */
export interface IRole {
  id: number;
  name: RoleName;
  level: number;
  description?: string;
  permissions?: IPermission[];
}

/**
 * IUserRepository Interface
 * Defines all user-related data operations
 */
export interface IUserRepository {
  /**
   * Find a user by their unique ID
   * @param id - User ID
   * @param options - Query options (include deleted, etc.)
   * @returns User or null if not found
   */
  findById(id: number, options?: Partial<IUserQueryOptions>): Promise<IUser | null>;

  /**
   * Find a user by email address
   * @param email - User email
   * @param options - Query options
   * @returns User or null if not found
   */
  findByEmail(email: string, options?: Partial<IUserQueryOptions>): Promise<IUser | null>;

  /**
   * Find a user with password hash (for authentication)
   * @param email - User email
   * @returns User with password hash or null
   */
  findByEmailWithPassword(email: string): Promise<(IUser & { passwordHash: string }) | null>;

  /**
   * Get all users with filtering and pagination
   * @param options - Query options (filters, pagination, sorting)
   * @returns Paginated list of users
   */
  findAll(options?: IUserQueryOptions): Promise<IPaginatedResult<IUser>>;

  /**
   * Create a new user
   * @param userData - User creation data
   * @returns Created user
   */
  create(userData: ICreateUserDTO): Promise<IUser>;

  /**
   * Update an existing user
   * @param id - User ID
   * @param userData - User update data
   * @returns Updated user or null if not found
   */
  update(id: number, userData: IUpdateUserDTO): Promise<IUser | null>;

  /**
   * Soft delete a user
   * @param id - User ID
   * @returns True if deleted, false if not found
   */
  delete(id: number): Promise<boolean>;

  /**
   * Permanently delete a user
   * @param id - User ID
   * @returns True if permanently deleted
   */
  hardDelete(id: number): Promise<boolean>;

  /**
   * Restore a soft-deleted user
   * @param id - User ID
   * @returns Restored user or null
   */
  restore(id: number): Promise<IUser | null>;

  /**
   * Check if an email is already taken
   * @param email - Email to check
   * @param excludeUserId - User ID to exclude (for updates)
   * @returns True if email exists
   */
  emailExists(email: string, excludeUserId?: number): Promise<boolean>;

  /**
   * Update user's last login timestamp
   * @param id - User ID
   * @returns True if updated
   */
  updateLastLogin(id: number): Promise<boolean>;

  /**
   * Increment failed login attempts
   * @param id - User ID
   * @returns Updated failed attempts count
   */
  incrementFailedLoginAttempts(id: number): Promise<number>;

  /**
   * Reset failed login attempts
   * @param id - User ID
   * @returns True if reset
   */
  resetFailedLoginAttempts(id: number): Promise<boolean>;

  /**
   * Lock user account
   * @param id - User ID
   * @param durationMinutes - Lock duration in minutes
   * @returns True if locked
   */
  lockAccount(id: number, durationMinutes: number): Promise<boolean>;

  /**
   * Unlock user account
   * @param id - User ID
   * @returns True if unlocked
   */
  unlockAccount(id: number): Promise<boolean>;

  /**
   * Change user password
   * @param id - User ID
   * @param newPasswordHash - New password hash
   * @returns True if changed
   */
  changePassword(id: number, newPasswordHash: string): Promise<boolean>;

  /**
   * Get user count by status
   * @param status - User status filter
   * @returns Count of users
   */
  countByStatus(status?: UserStatus): Promise<number>;

  /**
   * Get user count by role
   * @param roleId - Role ID
   * @returns Count of users with role
   */
  countByRole(roleId: number): Promise<number>;

  /**
   * Get all roles
   * @returns List of all roles
   */
  getAllRoles(): Promise<IRole[]>;

  /**
   * Get all roles with user counts
   * @returns List of roles with user counts
   */
  getAllRolesWithCounts(): Promise<(IRole & { userCount: number })[]>;

  /**
   * Get role by ID
   * @param id - Role ID
   * @returns Role or null
   */
  getRoleById(id: number): Promise<IRole | null>;

  /**
   * Get role by name
   * @param name - Role name
   * @returns Role or null
   */
  getRoleByName(name: RoleName): Promise<IRole | null>;

  /**
   * Get all permissions
   * @returns List of all permissions
   */
  getAllPermissions(): Promise<IPermission[]>;

  /**
   * Get permissions for a role
   * @param roleId - Role ID
   * @returns List of permissions
   */
  getPermissionsForRole(roleId: number): Promise<IPermission[]>;

  /**
   * Check if user has a specific permission
   * @param userId - User ID
   * @param resource - Resource name
   * @param action - Action name
   * @returns True if user has permission
   */
  userHasPermission(userId: number, resource: string, action: string): Promise<boolean>;

  /**
   * Check if user's role can manage another role
   * @param userId - User ID
   * @param targetRoleId - Target role ID
   * @returns True if can manage
   */
  canManageRole(userId: number, targetRoleId: number): Promise<boolean>;

  /**
   * Create a new session
   * @param sessionData - Session creation data
   * @returns Created session
   */
  createSession(sessionData: ICreateSessionDTO): Promise<IUserSession>;

  /**
   * Find a session by token
   * @param token - Session token
   * @returns Session or null
   */
  findSessionByToken(token: string): Promise<IUserSession | null>;

  /**
   * Find active sessions for a user
   * @param userId - User ID
   * @returns List of active sessions
   */
  findActiveSessionsForUser(userId: number): Promise<IUserSession[]>;

  /**
   * Update session last activity
   * @param sessionId - Session ID
   * @returns True if updated
   */
  updateSessionActivity(sessionId: number): Promise<boolean>;

  /**
   * Revoke a session
   * @param sessionId - Session ID
   * @param terminatedBy - User ID who terminated (optional)
   * @returns True if revoked
   */
  revokeSession(sessionId: number, terminatedBy?: number): Promise<boolean>;

  /**
   * Revoke all sessions for a user
   * @param userId - User ID
   * @param excludeSessionId - Session ID to exclude (optional)
   * @returns Number of sessions revoked
   */
  revokeAllUserSessions(userId: number, excludeSessionId?: number): Promise<number>;

  /**
   * Clean up expired sessions
   * @returns Number of sessions cleaned up
   */
  cleanupExpiredSessions(): Promise<number>;

  /**
   * Delete a session
   * @param sessionId - Session ID
   * @returns True if deleted
   */
  deleteSession(sessionId: number): Promise<boolean>;
}

/**
 * IUserRepositoryErrorCode
 * Error codes for repository operations
 */
export enum UserRepositoryErrorCode {
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  INVALID_ROLE = 'INVALID_ROLE',
  CANNOT_DELETE_SYSTEM_ROLE = 'CANNOT_DELETE_SYSTEM_ROLE',
  CANNOT_MODIFY_SYSTEM_ROLE = 'CANNOT_MODIFY_SYSTEM_ROLE',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
}

/**
 * UserRepositoryError
 * Custom error class for repository operations
 */
export class UserRepositoryError extends Error {
  public readonly code: UserRepositoryErrorCode;
  public readonly details?: unknown;

  constructor(code: UserRepositoryErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'UserRepositoryError';
    this.code = code;
    this.details = details;
  }
}
