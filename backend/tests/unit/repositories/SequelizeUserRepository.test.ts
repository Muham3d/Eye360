/**
 * SequelizeUserRepository Unit Tests
 *
 * Tests for the Sequelize-based user repository implementation.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SequelizeUserRepository } from '../../../src/infrastructure/database/repositories/SequelizeUserRepository.js';
import { UserStatus, RoleName } from '../../../src/infrastructure/database/models/index.js';
import type {
  IUser,
  ICreateUserDTO,
  IUpdateUserDTO,
  ICreateSessionDTO,
  IUserSession,
  IRole,
  IPermission,
} from '../../../src/core/domain/repositories/IUserRepository.js';
import {
  createUserFactory,
  createUserDTOFactory,
  createRoleFactory,
  createPermissionFactory,
  createSessionFactory,
  createSessionDTOFactory,
} from '../../utils/test-factories.js';

// Mock the models
const mockModels = {
  User: {
    scope: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    count: jest.fn(),
  },
  Role: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
  },
  Permission: {
    findAll: jest.fn(),
  },
  UserSession: {
    create: jest.fn(),
    findOne: jest.fn(),
    scope: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
};

// Mock the models index
jest.mock('../../../src/infrastructure/database/models/index.js', () => ({
  default: mockModels,
  User: mockModels.User,
  Role: mockModels.Role,
  Permission: mockModels.Permission,
  UserSession: mockModels.UserSession,
}));

describe('SequelizeUserRepository', () => {
  let repository: SequelizeUserRepository;

  // Helper to create mock user model
  const createMockUserModel = (overrides: any = {}) => ({
    id: 1,
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+1234567890',
    status: 'active',
    role_id: 1,
    password_hash: 'hashedpassword',
    last_login_at: new Date(),
    created_at: new Date(),
    updated_at: new Date(),
    deleted_at: null,
    failed_login_attempts: 0,
    account_locked_until: null,
    password_changed_at: null,
    dataValues: {},
    get: jest.fn(function(this: any, key: string) {
      return this[key];
    }),
    set: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    changed: jest.fn(),
    getDataValue: jest.fn(function(this: any, key: string) {
      return this[key];
    }),
    ...overrides,
  });

  // Helper to create mock role model
  const createMockRoleModel = (overrides: any = {}) => ({
    id: 1,
    name: 'Admin',
    level: 1,
    description: 'System administrator',
    is_system_role: true,
    created_at: new Date(),
    updated_at: new Date(),
    dataValues: {},
    ...overrides,
  });

  // Helper to create mock permission model
  const createMockPermissionModel = (overrides: any = {}) => ({
    id: 1,
    name: 'users.manage',
    description: 'Manage users',
    resource: 'users',
    action: 'manage',
    ...overrides,
  });

  // Helper to create mock session model
  const createMockSessionModel = (overrides: any = {}) => ({
    id: 1,
    user_id: 1,
    session_token: 'test-token',
    refresh_token: null,
    expires_at: new Date(Date.now() + 3600000),
    ip_address: '127.0.0.1',
    user_agent: 'Test Agent',
    device_info: null,
    status: 'active',
    last_activity_at: new Date(),
    created_at: new Date(),
    terminated_at: null,
    terminated_by: null,
    isExpired: jest.fn(() => false),
    ...overrides,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    // Reset all mocks
    Object.values(mockModels).forEach((model: any) => {
      if (model.scope) model.scope.mockReturnThis();
      if (model.findByPk) model.findByPk.mockReset();
      if (model.findOne) model.findOne.mockReset();
      if (model.findAll) model.findAll.mockReset();
      if (model.create) model.create.mockReset();
      if (model.update) model.update.mockReset();
      if (model.destroy) model.destroy.mockReset();
      if (model.count) model.count.mockReset();
    });

    repository = new SequelizeUserRepository();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const mockUser = createMockUserModel();
      mockUser.role = createMockRoleModel();
      mockModels.User.findByPk.mockResolvedValue(mockUser);

      const user = await repository.findById(1);

      expect(user).toBeDefined();
      expect(user?.id).toBe(1);
      expect(user?.email).toBe('test@example.com');
      expect(mockModels.User.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
    });

    it('should return null when user not found', async () => {
      mockModels.User.findByPk.mockResolvedValue(null);

      const user = await repository.findById(999);

      expect(user).toBeNull();
    });

    it('should include deleted users when specified', async () => {
      const mockUser = createMockUserModel();
      mockUser.role = createMockRoleModel();
      mockModels.User.findByPk.mockResolvedValue(mockUser);

      await repository.findById(1, { includeDeleted: true });

      expect(mockModels.User.findByPk).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ paranoid: false })
      );
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const mockUser = createMockUserModel();
      mockUser.role = createMockRoleModel();
      mockModels.User.scope.mockReturnThis();
      mockModels.User.findOne.mockResolvedValue(mockUser);

      const user = await repository.findByEmail('test@example.com');

      expect(user).toBeDefined();
      expect(user?.email).toBe('test@example.com');
      expect(mockModels.User.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        })
      );
    });

    it('should lowercase email before querying', async () => {
      const mockUser = createMockUserModel();
      mockUser.role = createMockRoleModel();
      mockModels.User.scope.mockReturnThis();
      mockModels.User.findOne.mockResolvedValue(mockUser);

      await repository.findByEmail('TEST@EXAMPLE.COM');

      expect(mockModels.User.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        })
      );
    });
  });

  describe('findByEmailWithPassword', () => {
    it('should find user with password hash', async () => {
      const mockUser = createMockUserModel();
      mockUser.role = createMockRoleModel();
      mockModels.User.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(mockUser),
      });

      const user = await repository.findByEmailWithPassword('test@example.com');

      expect(user).toBeDefined();
      expect(user?.passwordHash).toBeDefined();
    });

    it('should return null when user not found', async () => {
      mockModels.User.scope.mockReturnValue({
        findOne: jest.fn().mockResolvedValue(null),
      });

      const user = await repository.findByEmailWithPassword('notfound@example.com');

      expect(user).toBeNull();
    });
  });

  describe('create', () => {
    const createData: ICreateUserDTO = {
      email: 'newuser@example.com',
      password: 'hashedpassword',
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '+9876543210',
      roleId: 2,
      status: 'active' as UserStatus,
    };

    it('should create a new user', async () => {
      const mockUser = createMockUserModel({
        id: 2,
        email: 'newuser@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
      });
      mockModels.Role.findByPk.mockResolvedValue(createMockRoleModel({ id: 2 }));
      mockModels.User.create.mockResolvedValue(mockUser);
      mockModels.User.findByPk.mockResolvedValue({
        ...mockUser,
        role: createMockRoleModel({ id: 2 }),
      });

      const user = await repository.create(createData);

      expect(user).toBeDefined();
      expect(user.email).toBe('newuser@example.com');
      expect(mockModels.User.create).toHaveBeenCalled();
    });

    it('should throw error when role does not exist', async () => {
      mockModels.Role.findByPk.mockResolvedValue(null);

      await expect(repository.create(createData)).rejects.toThrow('Role with ID 2 does not exist');
    });

    it('should lowercase email before creating', async () => {
      const mockUser = createMockUserModel();
      mockModels.Role.findByPk.mockResolvedValue(createMockRoleModel());
      mockModels.User.create.mockResolvedValue(mockUser);
      mockModels.User.findByPk.mockResolvedValue({
        ...mockUser,
        role: createMockRoleModel(),
      });

      await repository.create({ ...createData, email: 'NEWUSER@EXAMPLE.COM' });

      expect(mockModels.User.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'newuser@example.com',
        })
      );
    });
  });

  describe('update', () => {
    it('should update an existing user', async () => {
      const existingUser = createMockUserModel();
      const updatedUser = { ...existingUser, first_name: 'Updated' };
      existingUser.role = createMockRoleModel();

      mockModels.User.update.mockResolvedValue([1, [updatedUser]]);
      mockModels.User.findByPk.mockResolvedValueOnce(existingUser).mockResolvedValue({
        ...updatedUser,
        role: createMockRoleModel(),
      });

      const user = await repository.update(1, { firstName: 'Updated' });

      expect(user).toBeDefined();
      expect(user?.firstName).toBe('Updated');
    });

    it('should return null when user not found', async () => {
      mockModels.User.update.mockResolvedValue([0, null]);

      const user = await repository.update(999, { firstName: 'Updated' });

      expect(user).toBeNull();
    });

    it('should validate role exists when updating roleId', async () => {
      const existingUser = createMockUserModel();
      existingUser.role = createMockRoleModel();

      mockModels.Role.findByPk.mockResolvedValue(null);
      mockModels.User.findByPk.mockResolvedValue(existingUser);

      await expect(repository.update(1, { roleId: 999 })).rejects.toThrow('Role with ID 999 does not exist');
    });
  });

  describe('delete', () => {
    it('should soft delete a user', async () => {
      mockModels.User.destroy.mockResolvedValue(1);

      const result = await repository.delete(1);

      expect(result).toBe(true);
      expect(mockModels.User.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          individualHooks: true,
        })
      );
    });

    it('should return false when user not found', async () => {
      mockModels.User.destroy.mockResolvedValue(0);

      const result = await repository.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete a user', async () => {
      mockModels.User.destroy.mockResolvedValue(1);

      const result = await repository.hardDelete(1);

      expect(result).toBe(true);
      expect(mockModels.User.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          force: true,
        })
      );
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted user', async () => {
      const mockUser = createMockUserModel();
      mockUser.role = createMockRoleModel();

      mockModels.User.restore.mockResolvedValue();
      mockModels.User.findByPk.mockResolvedValue({ ...mockUser, role: createMockRoleModel() });

      const user = await repository.restore(1);

      expect(user).toBeDefined();
      expect(user.id).toBe(1);
    });

    it('should return null when user cannot be restored', async () => {
      mockModels.User.restore.mockResolvedValue();
      mockModels.User.findByPk.mockResolvedValue(null);

      const user = await repository.restore(999);

      expect(user).toBeNull();
    });
  });

  describe('emailExists', () => {
    it('should return true when email exists', async () => {
      mockModels.User.count.mockResolvedValue(1);

      const result = await repository.emailExists('test@example.com');

      expect(result).toBe(true);
    });

    it('should return false when email does not exist', async () => {
      mockModels.User.count.mockResolvedValue(0);

      const result = await repository.emailExists('notfound@example.com');

      expect(result).toBe(false);
    });

    it('should exclude user ID when checking for updates', async () => {
      mockModels.User.count.mockResolvedValue(0);

      await repository.emailExists('test@example.com', 1);

      expect(mockModels.User.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: { [expect.any(String)]: 1 },
          }),
        })
      );
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockModels.User.update.mockResolvedValue([1]);

      const result = await repository.updateLastLogin(1);

      expect(result).toBe(true);
      expect(mockModels.User.update).toHaveBeenCalledWith(
        { last_login_at: expect.any(Date) },
        { where: { id: 1 } }
      );
    });
  });

  describe('incrementFailedLoginAttempts', () => {
    it('should increment failed login attempts', async () => {
      const mockUser = createMockUserModel({ failed_login_attempts: 0 });
      mockModels.User.findByPk.mockResolvedValue(mockUser);
      mockUser.update.mockResolvedValue(mockUser);

      const result = await repository.incrementFailedLoginAttempts(1);

      expect(result).toBe(1);
      expect(mockUser.update).toHaveBeenCalledWith({ failed_login_attempts: 1 });
    });

    it('should throw error when user not found', async () => {
      mockModels.User.findByPk.mockResolvedValue(null);

      await expect(repository.incrementFailedLoginAttempts(999)).rejects.toThrow('User with ID 999 not found');
    });
  });

  describe('resetFailedLoginAttempts', () => {
    it('should reset failed login attempts', async () => {
      mockModels.User.update.mockResolvedValue([1]);

      const result = await repository.resetFailedLoginAttempts(1);

      expect(result).toBe(true);
      expect(mockModels.User.update).toHaveBeenCalledWith(
        {
          failed_login_attempts: 0,
          account_locked_until: null,
        },
        { where: { id: 1 } }
      );
    });
  });

  describe('lockAccount', () => {
    it('should lock user account for specified duration', async () => {
      mockModels.User.update.mockResolvedValue([1]);

      const result = await repository.lockAccount(1, 30);

      expect(result).toBe(true);
      expect(mockModels.User.update).toHaveBeenCalledWith(
        { account_locked_until: expect.any(Date) },
        { where: { id: 1 } }
      );
    });
  });

  describe('unlockAccount', () => {
    it('should unlock user account', async () => {
      mockModels.User.update.mockResolvedValue([1]);

      const result = await repository.unlockAccount(1);

      expect(result).toBe(true);
      expect(mockModels.User.update).toHaveBeenCalledWith(
        {
          account_locked_until: null,
          failed_login_attempts: 0,
        },
        { where: { id: 1 } }
      );
    });
  });

  describe('changePassword', () => {
    it('should change user password', async () => {
      mockModels.User.update.mockResolvedValue([1]);

      const result = await repository.changePassword(1, 'new-hash');

      expect(result).toBe(true);
      expect(mockModels.User.update).toHaveBeenCalledWith(
        { password_hash: 'new-hash' },
        { where: { id: 1 } }
      );
    });
  });

  describe('countByStatus', () => {
    it('should count users by status', async () => {
      mockModels.User.count.mockResolvedValue(50);

      const count = await repository.countByStatus('active');

      expect(count).toBe(50);
    });

    it('should count all users when no status specified', async () => {
      mockModels.User.count.mockResolvedValue(100);

      const count = await repository.countByStatus();

      expect(count).toBe(100);
    });
  });

  describe('countByRole', () => {
    it('should count users by role', async () => {
      mockModels.User.count.mockResolvedValue(25);

      const count = await repository.countByRole(2);

      expect(count).toBe(25);
      expect(mockModels.User.count).toHaveBeenCalledWith({
        where: { role_id: 2 },
      });
    });
  });

  describe('getAllRoles', () => {
    it('should return all roles with permissions', async () => {
      const mockRoles = [
        createMockRoleModel({ id: 1, name: 'Admin' }),
        createMockRoleModel({ id: 2, name: 'Manager' }),
      ];
      const mockPermissions = [createMockPermissionModel()];

      mockModels.Role.findAll.mockResolvedValue(mockRoles);
      (mockRoles[0] as any).permissions = [mockPermissions[0]];
      (mockRoles[1] as any).permissions = [];

      const roles = await repository.getAllRoles();

      expect(roles).toHaveLength(2);
      expect(roles[0].name).toBe('Admin');
    });
  });

  describe('getRoleById', () => {
    it('should return role by ID', async () => {
      const mockRole = createMockRoleModel();
      mockModels.Role.findByPk.mockResolvedValue({
        ...mockRole,
        permissions: [],
      });

      const role = await repository.getRoleById(1);

      expect(role).toBeDefined();
      expect(role?.id).toBe(1);
    });

    it('should return null when role not found', async () => {
      mockModels.Role.findByPk.mockResolvedValue(null);

      const role = await repository.getRoleById(999);

      expect(role).toBeNull();
    });
  });

  describe('getRoleByName', () => {
    it('should return role by name', async () => {
      const mockRole = createMockRoleModel({ name: 'Admin' });
      mockModels.Role.findOne.mockResolvedValue({
        ...mockRole,
        permissions: [],
      });

      const role = await repository.getRoleByName('Admin' as RoleName);

      expect(role).toBeDefined();
      expect(role?.name).toBe('Admin');
    });

    it('should return null when role name not found', async () => {
      mockModels.Role.findOne.mockResolvedValue(null);

      const role = await repository.getRoleByName('NonExistent' as RoleName);

      expect(role).toBeNull();
    });
  });

  describe('getAllPermissions', () => {
    it('should return all permissions', async () => {
      const mockPermissions = [
        createMockPermissionModel({ id: 1, name: 'users.read' }),
        createMockPermissionModel({ id: 2, name: 'users.manage' }),
      ];
      mockModels.Permission.findAll.mockResolvedValue(mockPermissions);

      const permissions = await repository.getAllPermissions();

      expect(permissions).toHaveLength(2);
      expect(permissions[0].name).toBe('users.read');
    });
  });

  describe('getPermissionsForRole', () => {
    it('should return permissions for a role', async () => {
      const mockRole = createMockRoleModel();
      const mockPermissions = [
        createMockPermissionModel({ resource: 'users', action: 'read' }),
      ];

      mockModels.Role.findByPk.mockResolvedValue({
        ...mockRole,
        permissions: mockPermissions,
      });

      const permissions = await repository.getPermissionsForRole(1);

      expect(permissions).toHaveLength(1);
      expect(permissions[0].resource).toBe('users');
    });

    it('should return empty array when role not found', async () => {
      mockModels.Role.findByPk.mockResolvedValue(null);

      const permissions = await repository.getPermissionsForRole(999);

      expect(permissions).toEqual([]);
    });
  });

  describe('userHasPermission', () => {
    it('should return true when user has permission', async () => {
      const mockUser = createMockUserModel();
      const mockRole = createMockRoleModel();
      const mockPermissions = [
        createMockPermissionModel({ resource: 'users', action: 'manage' }),
      ];

      mockModels.User.findByPk.mockResolvedValue({
        ...mockUser,
        role: {
          ...mockRole,
          permissions: mockPermissions,
        },
      });

      const hasPermission = await repository.userHasPermission(1, 'users', 'manage');

      expect(hasPermission).toBe(true);
    });

    it('should return false when user does not have permission', async () => {
      const mockUser = createMockUserModel();
      const mockRole = createMockRoleModel();

      mockModels.User.findByPk.mockResolvedValue({
        ...mockUser,
        role: {
          ...mockRole,
          permissions: [],
        },
      });

      const hasPermission = await repository.userHasPermission(1, 'users', 'manage');

      expect(hasPermission).toBe(false);
    });

    it('should return false when user not found', async () => {
      mockModels.User.findByPk.mockResolvedValue(null);

      const hasPermission = await repository.userHasPermission(999, 'users', 'manage');

      expect(hasPermission).toBe(false);
    });
  });

  describe('canManageRole', () => {
    it('should return true when user role can manage target role', async () => {
      const mockUser = createMockUserModel();
      const mockUserRole = createMockRoleModel({ level: 1 }); // Admin
      const targetRole = createMockRoleModel({ level: 3 }); // Supervisor

      mockModels.User.findByPk.mockResolvedValue({
        ...mockUser,
        role: mockUserRole,
      });
      mockModels.Role.findByPk.mockResolvedValue(targetRole);

      const canManage = await repository.canManageRole(1, 3);

      expect(canManage).toBe(true);
    });

    it('should return false when user role cannot manage target role', async () => {
      const mockUser = createMockUserModel();
      const mockUserRole = createMockRoleModel({ level: 3 }); // Supervisor
      const targetRole = createMockRoleModel({ level: 1 }); // Admin

      mockModels.User.findByPk.mockResolvedValue({
        ...mockUser,
        role: mockUserRole,
      });
      mockModels.Role.findByPk.mockResolvedValue(targetRole);

      const canManage = await repository.canManageRole(1, 1);

      expect(canManage).toBe(false);
    });
  });

  describe('createSession', () => {
    const sessionData: ICreateSessionDTO = {
      userId: 1,
      sessionToken: 'test-token',
      expiresAt: new Date(Date.now() + 3600000),
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
    };

    it('should create a new session', async () => {
      const mockSession = createMockSessionModel();
      mockModels.UserSession.create.mockResolvedValue(mockSession);

      const session = await repository.createSession(sessionData);

      expect(session).toBeDefined();
      expect(session.sessionToken).toBe('test-token');
      expect(mockModels.UserSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 1,
          session_token: 'test-token',
        })
      );
    });
  });

  describe('findSessionByToken', () => {
    it('should find session by token', async () => {
      const mockSession = createMockSessionModel();
      const mockUser = createMockUserModel();

      mockModels.UserSession.findOne.mockResolvedValue({
        ...mockSession,
        user: mockUser,
      });

      const session = await repository.findSessionByToken('test-token');

      expect(session).toBeDefined();
      expect(session?.sessionToken).toBe('test-token');
    });

    it('should return null when session not found', async () => {
      mockModels.UserSession.findOne.mockResolvedValue(null);

      const session = await repository.findSessionByToken('invalid-token');

      expect(session).toBeNull();
    });
  });

  describe('findActiveSessionsForUser', () => {
    it('should return active sessions for user', async () => {
      const mockSessions = [
        createMockSessionModel({ id: 1 }),
        createMockSessionModel({ id: 2 }),
      ];

      const scopedFindAll = jest.fn().mockResolvedValue(mockSessions);
      mockModels.UserSession.scope.mockReturnValue({ findAll: scopedFindAll });

      const sessions = await repository.findActiveSessionsForUser(1);

      expect(sessions).toHaveLength(2);
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session', async () => {
      mockModels.UserSession.update.mockResolvedValue([1]);

      const result = await repository.revokeSession(1, 2);

      expect(result).toBe(true);
      expect(mockModels.UserSession.update).toHaveBeenCalledWith(
        {
          status: 'revoked',
          terminated_at: expect.any(Date),
          terminated_by: 2,
        },
        { where: { id: 1 } }
      );
    });

    it('should revoke without terminated_by when not specified', async () => {
      mockModels.UserSession.update.mockResolvedValue([1]);

      await repository.revokeSession(1);

      expect(mockModels.UserSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          terminated_by: null,
        }),
        expect.any(Object)
      );
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all sessions for user', async () => {
      mockModels.UserSession.update.mockResolvedValue([3]);

      const count = await repository.revokeAllUserSessions(1);

      expect(count).toBe(3);
    });

    it('should exclude specified session', async () => {
      mockModels.UserSession.update.mockResolvedValue([2]);

      const count = await repository.revokeAllUserSessions(1, 5);

      expect(count).toBe(2);
      expect(mockModels.UserSession.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'revoked',
        }),
        expect.objectContaining({
          where: expect.objectContaining({
            id: { [expect.any(String)]: 5 },
          }),
        })
      );
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', async () => {
      mockModels.UserSession.update.mockResolvedValue([5]);

      const count = await repository.cleanupExpiredSessions();

      expect(count).toBe(5);
      expect(mockModels.UserSession.update).toHaveBeenCalledWith(
        { status: 'expired', terminated_at: expect.any(Date) },
        expect.objectContaining({
          where: expect.objectContaining({
            expires_at: { [expect.any(String)]: expect.any(Date) },
          }),
        })
      );
    });
  });

  describe('deleteSession', () => {
    it('should delete a session', async () => {
      mockModels.UserSession.destroy.mockResolvedValue(1);

      const result = await repository.deleteSession(1);

      expect(result).toBe(true);
    });

    it('should return false when session not found', async () => {
      mockModels.UserSession.destroy.mockResolvedValue(0);

      const result = await repository.deleteSession(999);

      expect(result).toBe(false);
    });
  });
});
