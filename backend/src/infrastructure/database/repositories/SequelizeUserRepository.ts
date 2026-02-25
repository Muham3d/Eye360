/**
 * Sequelize User Repository
 *
 * Implementation of IUserRepository using Sequelize ORM.
 * Handles all user-related data access operations.
 *
 * @module infrastructure/database/repositories
 */

import { Op, Transaction } from 'sequelize';
import BaseRepository, { PaginatedResult, RepositoryError, RepositoryErrorCode } from './BaseRepository.js';
import models from '../models/index.js';
import User from '../models/User.js';
import Role from '../models/Role.js';
import Permission from '../models/Permission.js';
import UserSession from '../models/UserSession.js';
import {
  IUserRepository,
  IUser,
  ICreateUserDTO,
  IUpdateUserDTO,
  IUserQueryOptions,
  IPaginatedResult,
  ICreateSessionDTO,
  IUserSession,
  IRole,
  IPermission,
  UserRepositoryError,
  UserRepositoryErrorCode,
} from '../../../core/domain/repositories/IUserRepository.js';

/**
 * User Model DTO Mapper
 * Converts Sequelize model instances to domain DTOs
 */
class UserDTOMapper {
  /**
   * Convert User model to IUser DTO
   */
  static toDTO(user: User): IUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone ?? undefined,
      status: user.status as any,
      roleId: user.role_id,
      roleName: (user as any).role?.name || null,
      lastLoginAt: user.last_login_at ?? undefined,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  /**
   * Convert User model with password to IUser DTO with password
   */
  static toDTOWithPassword(user: User): IUser & { passwordHash: string } {
    return {
      ...this.toDTO(user),
      passwordHash: user.password_hash,
    };
  }

  /**
   * Convert Role model to IRole DTO
   */
  static roleToDTO(role: Role): IRole {
    return {
      id: role.id,
      name: role.name as any,
      level: role.level,
      description: role.description ?? undefined,
      permissions: (role as any).permissions?.map((p: Permission) => this.permissionToDTO(p)),
    };
  }

  /**
   * Convert Permission model to IPermission DTO
   */
  static permissionToDTO(permission: Permission): IPermission {
    return {
      id: permission.id,
      name: permission.name,
      description: permission.description ?? undefined,
      resource: permission.resource,
      action: permission.action,
    };
  }

  /**
   * Convert UserSession model to IUserSession DTO
   */
  static sessionToDTO(session: UserSession): IUserSession {
    return {
      id: session.id,
      userId: session.user_id,
      sessionToken: session.session_token,
      expiresAt: session.expires_at,
      ipAddress: session.ip_address ?? undefined,
      userAgent: session.userAgent ?? undefined,
      lastActivityAt: session.last_activity_at,
      createdAt: session.created_at,
      isActive: session.status === 'active' && !session.isExpired(),
    };
  }

  /**
   * Convert array of User models to IUser DTOs
   */
  static toDTOArray(users: User[]): IUser[] {
    return users.map((user) => this.toDTO(user));
  }

  /**
   * Convert paginated result to IPaginatedResult
   */
  static toPaginatedResult(result: PaginatedResult<User>): IPaginatedResult<IUser> {
    return {
      data: this.toDTOArray(result.data),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}

/**
 * Sequelize User Repository
 *
 * Implements IUserRepository using Sequelize User model.
 * Extends BaseRepository for common CRUD operations.
 */
export class SequelizeUserRepository extends BaseRepository<User, any, any> implements IUserRepository {
  /**
   * Get the User model
   */
  protected getModel(): typeof User {
    return models.User;
  }

  /**
   * Get the primary key field name
   */
  protected getPrimaryKeyField(): string {
    return 'id';
  }

  /**
   * Find a user by their unique ID
   */
  async findById(id: number, options?: Partial<IUserQueryOptions>): Promise<IUser | null> {
    try {
      const include = this.buildInclude(options);
      const user = await super.findById(id, { include, paranoid: !options?.includeDeleted });

      if (!user) {
        return null;
      }

      return UserDTOMapper.toDTO(user);
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Find a user by email address
   */
  async findByEmail(email: string, options?: Partial<IUserQueryOptions>): Promise<IUser | null> {
    try {
      const user = await models.User.scope('withPassword').findOne({
        where: { email: email.toLowerCase() },
        include: this.buildInclude(options),
        paranoid: !options?.includeDeleted,
      });

      if (!user) {
        return null;
      }

      return UserDTOMapper.toDTO(user);
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Find a user with password hash (for authentication)
   */
  async findByEmailWithPassword(email: string): Promise<(IUser & { passwordHash: string }) | null> {
    try {
      const user = await models.User.scope('withPassword').findOne({
        where: { email: email.toLowerCase() },
        include: [
          {
            model: models.Role,
            as: 'role',
            attributes: ['id', 'name', 'level', 'description'],
          },
        ],
      });

      if (!user) {
        return null;
      }

      return UserDTOMapper.toDTOWithPassword(user);
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Get all users with filtering and pagination
   */
  async findAll(options?: IUserQueryOptions): Promise<IPaginatedResult<IUser>> {
    try {
      const where = this.buildWhereClause(options);
      const include = this.buildInclude(options);

      const result = await super.findAll({
        where,
        include,
        page: options?.page,
        limit: options?.limit,
        sortBy: options?.sortBy || 'createdAt',
        sortOrder: options?.sortOrder || 'DESC',
      });

      return UserDTOMapper.toPaginatedResult(result);
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Create a new user
   */
  async create(userData: ICreateUserDTO): Promise<IUser> {
    try {
      // Validate role exists
      const role = await models.Role.findByPk(userData.roleId);
      if (!role) {
        throw new UserRepositoryError(
          UserRepositoryErrorCode.INVALID_ROLE,
          `Role with ID ${userData.roleId} does not exist`
        );
      }

      // Create user with hashed password (password should already be hashed by service)
      const user = await super.create({
        email: userData.email.toLowerCase(),
        password_hash: userData.password,
        first_name: userData.firstName,
        last_name: userData.lastName,
        phone: userData.phone ?? null,
        role_id: userData.roleId,
        status: userData.status || 'pending',
      });

      // Fetch user with role
      const userWithRole = await models.User.findByPk(user.id, {
        include: [{ model: models.Role, as: 'role' }],
      });

      if (!userWithRole) {
        throw new UserRepositoryError(
          UserRepositoryErrorCode.USER_NOT_FOUND,
          'Created user not found'
        );
      }

      return UserDTOMapper.toDTO(userWithRole);
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Update an existing user
   */
  async update(id: number, userData: IUpdateUserDTO): Promise<IUser | null> {
    try {
      const updateData: any = {};

      if (userData.email !== undefined) {
        updateData.email = userData.email.toLowerCase();
      }
      if (userData.password !== undefined) {
        updateData.password_hash = userData.password;
      }
      if (userData.firstName !== undefined) {
        updateData.first_name = userData.firstName;
      }
      if (userData.lastName !== undefined) {
        updateData.last_name = userData.lastName;
      }
      if (userData.phone !== undefined) {
        updateData.phone = userData.phone;
      }
      if (userData.status !== undefined) {
        updateData.status = userData.status;
      }
      if (userData.roleId !== undefined) {
        // Validate role exists
        const role = await models.Role.findByPk(userData.roleId);
        if (!role) {
          throw new UserRepositoryError(
            UserRepositoryErrorCode.INVALID_ROLE,
            `Role with ID ${userData.roleId} does not exist`
          );
        }
        updateData.role_id = userData.roleId;
      }

      const updated = await super.update(id, updateData);

      if (!updated) {
        return null;
      }

      // Fetch updated user with role
      const userWithRole = await models.User.findByPk(id, {
        include: [{ model: models.Role, as: 'role' }],
      });

      return userWithRole ? UserDTOMapper.toDTO(userWithRole) : null;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Soft delete a user
   */
  async delete(id: number): Promise<boolean> {
    try {
      return await super.delete(id);
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Permanently delete a user
   */
  async hardDelete(id: number): Promise<boolean> {
    try {
      return await super.hardDelete(id);
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Restore a soft-deleted user
   */
  async restore(id: number): Promise<IUser | null> {
    try {
      const user = await super.restore(id);

      if (!user) {
        return null;
      }

      // Fetch with role
      const userWithRole = await models.User.findByPk(id, {
        include: [{ model: models.Role, as: 'role' }],
      });

      return userWithRole ? UserDTOMapper.toDTO(userWithRole) : null;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Check if an email is already taken
   */
  async emailExists(email: string, excludeUserId?: number): Promise<boolean> {
    try {
      const where: any = {
        email: email.toLowerCase(),
      };

      if (excludeUserId) {
        where.id = { [Op.ne]: excludeUserId };
      }

      const count = await models.User.count({ where });
      return count > 0;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(id: number): Promise<boolean> {
    try {
      const [affectedCount] = await models.User.update(
        { last_login_at: new Date() },
        { where: { id } }
      );

      return affectedCount > 0;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedLoginAttempts(id: number): Promise<number> {
    try {
      const user = await models.User.findByPk(id);

      if (!user) {
        throw new UserRepositoryError(
          UserRepositoryErrorCode.USER_NOT_FOUND,
          `User with ID ${id} not found`
        );
      }

      const newCount = user.failed_login_attempts + 1;
      await user.update({ failed_login_attempts: newCount });

      return newCount;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedLoginAttempts(id: number): Promise<boolean> {
    try {
      const [affectedCount] = await models.User.update(
        {
          failed_login_attempts: 0,
          account_locked_until: null,
        },
        { where: { id } }
      );

      return affectedCount > 0;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Lock user account
   */
  async lockAccount(id: number, durationMinutes: number): Promise<boolean> {
    try {
      const lockUntil = new Date(Date.now() + durationMinutes * 60 * 1000);

      const [affectedCount] = await models.User.update(
        { account_locked_until: lockUntil },
        { where: { id } }
      );

      return affectedCount > 0;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Unlock user account
   */
  async unlockAccount(id: number): Promise<boolean> {
    try {
      const [affectedCount] = await models.User.update(
        {
          account_locked_until: null,
          failed_login_attempts: 0,
        },
        { where: { id } }
      );

      return affectedCount > 0;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Change user password
   */
  async changePassword(id: number, newPasswordHash: string): Promise<boolean> {
    try {
      const [affectedCount] = await models.User.update(
        { password_hash: newPasswordHash },
        { where: { id } }
      );

      return affectedCount > 0;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Get user count by status
   */
  async countByStatus(status?: string): Promise<number> {
    try {
      const where: any = {};
      if (status) {
        where.status = status;
      }

      return await models.User.count({ where });
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Get user count by role
   */
  async countByRole(roleId: number): Promise<number> {
    try {
      return await models.User.count({ where: { role_id: roleId } });
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Get all roles
   */
  async getAllRoles(): Promise<IRole[]> {
    try {
      const roles = await models.Role.findAll({
        include: [
          {
            model: models.Permission,
            as: 'permissions',
            through: { attributes: [] },
          },
        ],
        order: [['level', 'ASC']],
      });

      return roles.map((role) => UserDTOMapper.roleToDTO(role));
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Get role by ID
   */
  async getRoleById(id: number): Promise<IRole | null> {
    try {
      const role = await models.Role.findByPk(id, {
        include: [
          {
            model: models.Permission,
            as: 'permissions',
            through: { attributes: [] },
          },
        ],
      });

      return role ? UserDTOMapper.roleToDTO(role) : null;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: any): Promise<IRole | null> {
    try {
      const role = await models.Role.findOne({
        where: { name },
        include: [
          {
            model: models.Permission,
            as: 'permissions',
            through: { attributes: [] },
          },
        ],
      });

      return role ? UserDTOMapper.roleToDTO(role) : null;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Get all permissions
   */
  async getAllPermissions(): Promise<IPermission[]> {
    try {
      const permissions = await models.Permission.findAll({
        order: [['resource', 'ASC'], ['action', 'ASC']],
      });

      return permissions.map((p) => UserDTOMapper.permissionToDTO(p));
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Get permissions for a role
   */
  async getPermissionsForRole(roleId: number): Promise<IPermission[]> {
    try {
      const role = await models.Role.findByPk(roleId, {
        include: [
          {
            model: models.Permission,
            as: 'permissions',
            through: { attributes: [] },
          },
        ],
      });

      if (!role) {
        return [];
      }

      return (role as any).permissions?.map((p: Permission) => UserDTOMapper.permissionToDTO(p)) || [];
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Check if user has a specific permission
   */
  async userHasPermission(userId: number, resource: string, action: string): Promise<boolean> {
    try {
      const user = await models.User.findByPk(userId, {
        include: [
          {
            model: models.Role,
            as: 'role',
            include: [
              {
                model: models.Permission,
                as: 'permissions',
                through: { attributes: [] },
              },
            ],
          },
        ],
      });

      if (!user || !user.role) {
        return false;
      }

      const permissions = (user.role as any).permissions || [];
      return permissions.some(
        (p: Permission) => p.resource === resource && p.action === action
      );
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Check if user's role can manage another role
   */
  async canManageRole(userId: number, targetRoleId: number): Promise<boolean> {
    try {
      const user = await models.User.findByPk(userId, {
        include: [{ model: models.Role, as: 'role' }],
      });

      if (!user || !user.role) {
        return false;
      }

      const targetRole = await models.Role.findByPk(targetRoleId);

      if (!targetRole) {
        return false;
      }

      return user.role.level < targetRole.level;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Create a new session
   */
  async createSession(sessionData: ICreateSessionDTO): Promise<IUserSession> {
    try {
      const session = await models.UserSession.create({
        user_id: sessionData.userId,
        session_token: sessionData.sessionToken,
        refresh_token: sessionData.refreshToken ?? null,
        expires_at: sessionData.expiresAt,
        ip_address: sessionData.ipAddress ?? null,
        user_agent: sessionData.userAgent ?? null,
        device_info: sessionData.deviceInfo ?? null,
      });

      return UserDTOMapper.sessionToDTO(session);
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Find a session by token
   */
  async findSessionByToken(token: string): Promise<IUserSession | null> {
    try {
      const session = await models.UserSession.findOne({
        where: { session_token: token },
        include: [{ model: models.User, as: 'user', attributes: ['id', 'email', 'status'] }],
      });

      return session ? UserDTOMapper.sessionToDTO(session) : null;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Find active sessions for a user
   */
  async findActiveSessionsForUser(userId: number): Promise<IUserSession[]> {
    try {
      const sessions = await models.UserSession.scope('active').findAll({
        where: { user_id: userId },
        order: [['last_activity_at', 'DESC']],
      });

      return sessions.map((s) => UserDTOMapper.sessionToDTO(s));
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Update session last activity
   */
  async updateSessionActivity(sessionId: number): Promise<boolean> {
    try {
      const [affectedCount] = await models.UserSession.update(
        { last_activity_at: new Date() },
        { where: { id: sessionId } }
      );

      return affectedCount > 0;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: number, terminatedBy?: number): Promise<boolean> {
    try {
      const [affectedCount] = await models.UserSession.update(
        {
          status: 'revoked',
          terminated_at: new Date(),
          terminated_by: terminatedBy ?? null,
        },
        { where: { id: sessionId } }
      );

      return affectedCount > 0;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Revoke all sessions for a user
   */
  async revokeAllUserSessions(userId: number, excludeSessionId?: number): Promise<number> {
    try {
      const where: any = {
        user_id: userId,
        status: 'active',
      };

      if (excludeSessionId) {
        where.id = { [Op.ne]: excludeSessionId };
      }

      const [affectedCount] = await models.UserSession.update(
        {
          status: 'revoked',
          terminated_at: new Date(),
        },
        { where }
      );

      return affectedCount;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const now = new Date();

      const [affectedCount] = await models.UserSession.update(
        { status: 'expired', terminated_at: now },
        {
          where: {
            status: 'active',
            expires_at: { [Op.lt]: now },
          },
        }
      );

      return affectedCount;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionId: number): Promise<boolean> {
    try {
      const deletedCount = await models.UserSession.destroy({
        where: { id: sessionId },
      });

      return deletedCount > 0;
    } catch (error) {
      throw this.handleUserError(error);
    }
  }

  /**
   * Build include clause for queries
   */
  private buildInclude(options?: Partial<IUserQueryOptions>): any[] {
    const include: any[] = [];

    // Always include role
    include.push({
      model: models.Role,
      as: 'role',
      attributes: ['id', 'name', 'level', 'description'],
    });

    return include;
  }

  /**
   * Build WHERE clause from query options
   */
  private buildWhereClause(options?: IUserQueryOptions): any {
    const where: any = {};

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.roleId) {
      where.role_id = options.roleId;
    }

    if (options?.roleName) {
      // Need to use role.name - will be handled by include
      // This is a simplified version - in production you'd use Sequelize's $or with nested includes
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      where[Op.or] = [
        { email: { [Op.iLike]: searchTerm } },
        { first_name: { [Op.iLike]: searchTerm } },
        { last_name: { [Op.iLike]: searchTerm } },
      ];
    }

    return where;
  }

  /**
   * Handle user-specific errors
   */
  private handleUserError(error: unknown): unknown {
    if (error instanceof UserRepositoryError) {
      return error;
    }

    if (error instanceof RepositoryError) {
      // Map RepositoryError to UserRepositoryError
      const errorMap: Record<RepositoryErrorCode, UserRepositoryErrorCode> = {
        [RepositoryErrorCode.RECORD_NOT_FOUND]: UserRepositoryErrorCode.USER_NOT_FOUND,
        [RepositoryErrorCode.VALIDATION_ERROR]: UserRepositoryErrorCode.INVALID_ROLE,
        [RepositoryErrorCode.DATABASE_ERROR]: UserRepositoryErrorCode.USER_NOT_FOUND,
        [RepositoryErrorCode.TRANSACTION_ERROR]: UserRepositoryErrorCode.SESSION_NOT_FOUND,
        [RepositoryErrorCode.DUPLICATE_ENTRY]: UserRepositoryErrorCode.EMAIL_ALREADY_EXISTS,
        [RepositoryErrorCode.FOREIGN_KEY_CONSTRAINT]: UserRepositoryErrorCode.INVALID_ROLE,
      };

      return new UserRepositoryError(
        errorMap[error.code] || UserRepositoryErrorCode.USER_NOT_FOUND,
        error.message,
        error.details
      );
    }

    // Handle Sequelize validation errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('duplicate entry') && message.includes('email')) {
        return new UserRepositoryError(
          UserRepositoryErrorCode.EMAIL_ALREADY_EXISTS,
          'A user with this email already exists'
        );
      }

      if (message.includes('foreign key constraint') && message.includes('role')) {
        return new UserRepositoryError(
          UserRepositoryErrorCode.INVALID_ROLE,
          'The specified role does not exist'
        );
      }
    }

    return error;
  }
}

// Export a singleton instance
export default new SequelizeUserRepository();
