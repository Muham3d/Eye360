/**
 * UserService Unit Tests
 *
 * Tests for user management operations including CRUD,
 * role changes, status changes, and user queries.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UserService } from '../../../src/core/services/UserService.js';
import type { IUserRepository, IUser, ICreateUserDTO, IUpdateUserDTO } from '../../../src/core/domain/repositories/IUserRepository.js';
import {
  createUserFactory,
  createUserDTOFactory,
  updateUserDTOFactory,
  createRoleFactory,
  createPaginatedResultFactory,
} from '../../utils/test-factories.js';

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    // Mock user repository
    mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByEmailWithPassword: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      hardDelete: jest.fn(),
      restore: jest.fn(),
      emailExists: jest.fn(),
      updateLastLogin: jest.fn(),
      incrementFailedLoginAttempts: jest.fn(),
      resetFailedLoginAttempts: jest.fn(),
      lockAccount: jest.fn(),
      unlockAccount: jest.fn(),
      changePassword: jest.fn(),
      countByStatus: jest.fn(),
      countByRole: jest.fn(),
      getAllRoles: jest.fn(),
      getRoleById: jest.fn(),
      getRoleByName: jest.fn(),
      getAllPermissions: jest.fn(),
      getPermissionsForRole: jest.fn(),
      userHasPermission: jest.fn(),
      canManageRole: jest.fn(),
      createSession: jest.fn(),
      findSessionByToken: jest.fn(),
      findActiveSessionsForUser: jest.fn(),
      updateSessionActivity: jest.fn(),
      revokeSession: jest.fn(),
      revokeAllUserSessions: jest.fn(),
      cleanupExpiredSessions: jest.fn(),
      deleteSession: jest.fn(),
      findSessionById: jest.fn(),
    } as any;

    // Setup default successful mocks
    mockUserRepository.emailExists.mockResolvedValue(false);
    mockUserRepository.getRoleById.mockResolvedValue(createRoleFactory());
    mockUserRepository.create.mockResolvedValue(createUserFactory());

    userService = new UserService(mockUserRepository);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('createUser', () => {
    const userData = {
      email: 'newuser@example.com',
      password: 'hashedPassword123',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      roleId: 2,
      status: 'active' as const,
    };

    it('should create a user with valid data', async () => {
      const expectedUser = createUserFactory(userData);
      mockUserRepository.create.mockResolvedValue(expectedUser);

      const user = await userService.createUser(userData, 'hashedPassword123');

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email.toLowerCase());
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: userData.email.toLowerCase(),
        password: 'hashedPassword123',
        firstName: userData.firstName.trim(),
        lastName: userData.lastName.trim(),
        phone: userData.phone?.trim(),
        roleId: userData.roleId,
        status: 'pending',
      });
    });

    it('should throw error for invalid email format', async () => {
      await expect(userService.createUser({ ...userData, email: 'invalid-email' }, 'hash'))
        .rejects.toThrow('Invalid email format');
    });

    it('should throw error for email too long', async () => {
      await expect(userService.createUser({ ...userData, email: 'a'.repeat(256) + '@example.com' }, 'hash'))
        .rejects.toThrow('Email address is too long');
    });

    it('should throw error for invalid phone format', async () => {
      await expect(userService.createUser({ ...userData, phone: 'invalid-phone' }, 'hash'))
        .rejects.toThrow('Invalid phone number format');
    });

    it('should throw error for empty first name', async () => {
      await expect(userService.createUser({ ...userData, firstName: '  ' }, 'hash'))
        .rejects.toThrow('First name is required');
    });

    it('should throw error for empty last name', async () => {
      await expect(userService.createUser({ ...userData, lastName: '' }, 'hash'))
        .rejects.toThrow('Last name is required');
    });

    it('should throw error for first name too long', async () => {
      await expect(userService.createUser({ ...userData, firstName: 'a'.repeat(101) }, 'hash'))
        .rejects.toThrow('First name is too long');
    });

    it('should throw error for last name too long', async () => {
      await expect(userService.createUser({ ...userData, lastName: 'a'.repeat(101) }, 'hash'))
        .rejects.toThrow('Last name is too long');
    });

    it('should throw error for missing password hash', async () => {
      await expect(userService.createUser(userData, ''))
        .rejects.toThrow('Password hash is required');
    });

    it('should throw error for invalid status', async () => {
      await expect(userService.createUser({ ...userData, status: 'invalid' as any }, 'hash'))
        .rejects.toThrow('Invalid status');
    });

    it('should throw error when email already exists', async () => {
      mockUserRepository.emailExists.mockResolvedValue(true);

      await expect(userService.createUser(userData, 'hash'))
        .rejects.toThrow('A user with this email already exists');
    });

    it('should throw error for invalid role', async () => {
      mockUserRepository.getRoleById.mockResolvedValue(null);

      await expect(userService.createUser(userData, 'hash'))
        .rejects.toThrow('Invalid role specified');
    });

    it('should trim and lowercase email', async () => {
      const userWithEmail = '  MixedCase@Example.COM  ';
      mockUserRepository.create.mockResolvedValue(createUserFactory());

      await userService.createUser({ ...userData, email: userWithEmail }, 'hash');

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'mixedcase@example.com',
        })
      );
    });

    it('should trim whitespace from names', async () => {
      mockUserRepository.create.mockResolvedValue(createUserFactory());

      await userService.createUser({
        ...userData,
        firstName: '  John  ',
        lastName: '  Doe  ',
      }, 'hash');

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          lastName: 'Doe',
        })
      );
    });

    it('should handle optional phone field', async () => {
      mockUserRepository.create.mockResolvedValue(createUserFactory());

      await userService.createUser({ ...userData, phone: undefined }, 'hash');

      expect(mockUserRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: undefined,
        })
      );
    });
  });

  describe('updateUser', () => {
    const existingUser = createUserFactory({ id: 1, email: 'existing@example.com' });
    const updateData = {
      email: 'updated@example.com',
      firstName: 'Updated',
      lastName: 'Name',
    };

    it('should update user successfully', async () => {
      const updatedUser = createUserFactory({ ...existingUser, ...updateData });
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const user = await userService.updateUser(1, updateData);

      expect(user).toBeDefined();
      expect(user.email).toBe(updateData.email.toLowerCase());
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.updateUser(999, updateData))
        .rejects.toThrow('User with ID 999 not found');
    });

    it('should throw error for invalid email format', async () => {
      mockUserRepository.findById.mockResolvedValue(existingUser);

      await expect(userService.updateUser(1, { email: 'invalid-email' }))
        .rejects.toThrow('Invalid email format');
    });

    it('should throw error for email conflict', async () => {
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.emailExists.mockResolvedValue(true);

      await expect(userService.updateUser(1, { email: 'another@example.com' }))
        .rejects.toThrow('A user with this email already exists');
    });

    it('should throw error for invalid status', async () => {
      mockUserRepository.findById.mockResolvedValue(existingUser);

      await expect(userService.updateUser(1, { status: 'invalid' as any }))
        .rejects.toThrow('Invalid status');
    });

    it('should throw error for invalid role', async () => {
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.getRoleById.mockResolvedValue(null);

      await expect(userService.updateUser(1, { roleId: 999 }))
        .rejects.toThrow('Invalid role specified');
    });

    it('should handle partial updates', async () => {
      const updatedUser = createUserFactory({ ...existingUser, firstName: 'NewFirst' });
      mockUserRepository.findById.mockResolvedValue(existingUser);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const user = await userService.updateUser(1, { firstName: 'NewFirst' });

      expect(user.firstName).toBe('NewFirst');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const user = createUserFactory({ id: 1 });
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.delete.mockResolvedValue(true);

      const result = await userService.deleteUser(1);

      expect(result).toBe(true);
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.deleteUser(999))
        .rejects.toThrow('User with ID 999 not found');
    });

    it('should prevent user from deleting themselves', async () => {
      const user = createUserFactory({ id: 1 });
      mockUserRepository.findById.mockResolvedValue(user);

      await expect(userService.deleteUser(1, 1))
        .rejects.toThrow('Users cannot delete themselves');
    });

    it('should allow deletion of different user', async () => {
      const user = createUserFactory({ id: 1 });
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.delete.mockResolvedValue(true);

      const result = await userService.deleteUser(1, 2);

      expect(result).toBe(true);
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const user = createUserFactory({ id: 1 });
      mockUserRepository.findById.mockResolvedValue(user);

      const result = await userService.getUserById(1);

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await userService.getUserById(999);

      expect(result).toBeNull();
    });

    it('should include deleted users when specified', async () => {
      const user = createUserFactory({ id: 1 });
      mockUserRepository.findById.mockResolvedValue(user);

      await userService.getUserById(1, true);

      expect(mockUserRepository.findById).toHaveBeenCalledWith(1, { includeDeleted: true });
    });
  });

  describe('getUserByEmail', () => {
    it('should return user by email', async () => {
      const user = createUserFactory({ email: 'test@example.com' });
      mockUserRepository.findByEmail.mockResolvedValue(user);

      const result = await userService.getUserByEmail('test@example.com');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@example.com');
    });

    it('should return null when email not found', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await userService.getUserByEmail('notfound@example.com');

      expect(result).toBeNull();
    });
  });

  describe('listUsers', () => {
    it('should return paginated user list', async () => {
      const users = [createUserFactory({ id: 1 }), createUserFactory({ id: 2 })];
      const paginatedResult = createPaginatedResultFactory(users);
      mockUserRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await userService.listUsers({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should apply filters', async () => {
      const users = [createUserFactory({ status: 'active' })];
      const paginatedResult = createPaginatedResultFactory(users);
      mockUserRepository.findAll.mockResolvedValue(paginatedResult);

      await userService.listUsers({ status: 'active', roleId: 2 });

      expect(mockUserRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          roleId: 2,
        })
      );
    });

    it('should handle search queries', async () => {
      const paginatedResult = createPaginatedResultFactory([]);
      mockUserRepository.findAll.mockResolvedValue(paginatedResult);

      await userService.listUsers({ search: 'john' });

      expect(mockUserRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'john',
        })
      );
    });
  });

  describe('changeUserRole', () => {
    it('should change user role successfully', async () => {
      const user = createUserFactory({ id: 1, roleId: 3, roleName: 'Guard' });
      const currentRole = createRoleFactory({ id: 3, name: 'Guard', level: 3 });
      const newRole = createRoleFactory({ id: 2, name: 'Manager', level: 2 });
      const updatedUser = createUserFactory({ id: 1, roleId: 2, roleName: 'Manager' });

      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.getRoleById.mockImplementation((id) => {
        if (id === 3) return Promise.resolve(currentRole);
        if (id === 2) return Promise.resolve(newRole);
        return Promise.resolve(null);
      });
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.changeUserRole(1, 2, 1);

      expect(result.user.roleId).toBe(2);
      expect(result.previousRole.id).toBe(3);
      expect(result.newRole.id).toBe(2);
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.changeUserRole(999, 2, 1))
        .rejects.toThrow('User with ID 999 not found');
    });

    it('should throw error when new role not found', async () => {
      const user = createUserFactory();
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.getRoleById.mockImplementation((id) => {
        if (id === user.roleId) return Promise.resolve(createRoleFactory({ id }));
        return Promise.resolve(null);
      });

      await expect(userService.changeUserRole(1, 999, 1))
        .rejects.toThrow('Role with ID 999 not found');
    });

    it('should throw error when role is same as current', async () => {
      const user = createUserFactory({ roleId: 2 });
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.getRoleById.mockResolvedValue(createRoleFactory({ id: 2 }));

      await expect(userService.changeUserRole(1, 2, 1))
        .rejects.toThrow('User already has this role');
    });
  });

  describe('changeUserStatus', () => {
    it('should change user status successfully', async () => {
      const user = createUserFactory({ id: 1, status: 'active' });
      const updatedUser = createUserFactory({ id: 1, status: 'suspended' });

      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.update.mockResolvedValue(updatedUser);

      const result = await userService.changeUserStatus(1, 'suspended', 1);

      expect(result.user.status).toBe('suspended');
      expect(result.previousStatus).toBe('active');
      expect(result.newStatus).toBe('suspended');
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(userService.changeUserStatus(999, 'inactive', 1))
        .rejects.toThrow('User with ID 999 not found');
    });

    it('should throw error for invalid status', async () => {
      const user = createUserFactory();
      mockUserRepository.findById.mockResolvedValue(user);

      await expect(userService.changeUserStatus(1, 'invalid' as any, 1))
        .rejects.toThrow('Invalid status');
    });

    it('should throw error when status is same as current', async () => {
      const user = createUserFactory({ status: 'active' });
      mockUserRepository.findById.mockResolvedValue(user);

      await expect(userService.changeUserStatus(1, 'active', 1))
        .rejects.toThrow('User already has this status');
    });
  });

  describe('getUsersByRole', () => {
    it('should return users for a role', async () => {
      const users = [createUserFactory({ roleId: 3 }), createUserFactory({ roleId: 3 })];
      const paginatedResult = createPaginatedResultFactory(users);
      mockUserRepository.getRoleById.mockResolvedValue(createRoleFactory({ id: 3 }));
      mockUserRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await userService.getUsersByRole(3);

      expect(result.data).toHaveLength(2);
    });

    it('should throw error when role not found', async () => {
      mockUserRepository.getRoleById.mockResolvedValue(null);

      await expect(userService.getUsersByRole(999))
        .rejects.toThrow('Role with ID 999 not found');
    });
  });

  describe('getUserStatistics', () => {
    it('should return user statistics', async () => {
      mockUserRepository.countByStatus.mockImplementation((status) => {
        if (!status) return Promise.resolve(100);
        if (status === 'active') return Promise.resolve(50);
        if (status === 'inactive') return Promise.resolve(20);
        if (status === 'suspended') return Promise.resolve(15);
        if (status === 'pending') return Promise.resolve(15);
        return Promise.resolve(0);
      });

      const roles = [
        createRoleFactory({ id: 1, name: 'Admin' }),
        createRoleFactory({ id: 2, name: 'Manager' }),
        createRoleFactory({ id: 3, name: 'Supervisor' }),
        createRoleFactory({ id: 4, name: 'Guard' }),
      ];
      mockUserRepository.getAllRoles.mockResolvedValue(roles);
      mockUserRepository.countByRole.mockImplementation((roleId) => {
        if (roleId === 1) return Promise.resolve(2);
        if (roleId === 2) return Promise.resolve(8);
        if (roleId === 3) return Promise.resolve(15);
        if (roleId === 4) return Promise.resolve(75);
        return Promise.resolve(0);
      });

      const stats = await userService.getUserStatistics();

      expect(stats.total).toBe(100);
      expect(stats.active).toBe(50);
      expect(stats.inactive).toBe(20);
      expect(stats.suspended).toBe(15);
      expect(stats.pending).toBe(15);
      expect(stats.byRole['Admin']).toBe(2);
      expect(stats.byRole['Guard']).toBe(75);
    });
  });

  describe('searchUsers', () => {
    it('should search users by term', async () => {
      const users = [createUserFactory({ firstName: 'John' })];
      const paginatedResult = createPaginatedResultFactory(users);
      mockUserRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await userService.searchUsers('john');

      expect(result.data).toHaveLength(1);
      expect(mockUserRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'john',
        })
      );
    });

    it('should throw error for empty search term', async () => {
      await expect(userService.searchUsers('  '))
        .rejects.toThrow('Search term is required');
    });
  });

  describe('reactivateUser', () => {
    it('should reactivate a suspended user', async () => {
      const suspendedUser = createUserFactory({ status: 'suspended' });
      const activeUser = createUserFactory({ id: 1, status: 'active' });

      mockUserRepository.findById.mockResolvedValueOnce(suspendedUser).mockResolvedValueOnce(activeUser);
      mockUserRepository.update.mockResolvedValue(activeUser);

      const result = await userService.reactivateUser(1, 1);

      expect(result.status).toBe('active');
    });
  });

  describe('suspendUser', () => {
    it('should suspend an active user', async () => {
      const activeUser = createUserFactory({ status: 'active' });
      const suspendedUser = createUserFactory({ id: 1, status: 'suspended' });

      mockUserRepository.findById.mockResolvedValueOnce(activeUser).mockResolvedValueOnce(suspendedUser);
      mockUserRepository.update.mockResolvedValue(suspendedUser);

      const result = await userService.suspendUser(1, 1);

      expect(result.status).toBe('suspended');
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate an active user', async () => {
      const activeUser = createUserFactory({ status: 'active' });
      const inactiveUser = createUserFactory({ id: 1, status: 'inactive' });

      mockUserRepository.findById.mockResolvedValueOnce(activeUser).mockResolvedValueOnce(inactiveUser);
      mockUserRepository.update.mockResolvedValue(inactiveUser);

      const result = await userService.deactivateUser(1, 1);

      expect(result.status).toBe('inactive');
    });
  });

  describe('restoreUser', () => {
    it('should restore a soft-deleted user', async () => {
      const restoredUser = createUserFactory({ id: 1 });
      mockUserRepository.restore.mockResolvedValue(restoredUser);

      const result = await userService.restoreUser(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should throw error when user cannot be restored', async () => {
      mockUserRepository.restore.mockResolvedValue(null);

      await expect(userService.restoreUser(999))
        .rejects.toThrow('User with ID 999 not found or cannot be restored');
    });
  });

  describe('permanentDeleteUser', () => {
    it('should permanently delete a user', async () => {
      mockUserRepository.hardDelete.mockResolvedValue(true);

      const result = await userService.permanentDeleteUser(1, 2);

      expect(result).toBe(true);
    });

    it('should throw error when user not found', async () => {
      mockUserRepository.hardDelete.mockResolvedValue(false);

      await expect(userService.permanentDeleteUser(999, 1))
        .rejects.toThrow('User with ID 999 not found');
    });

    it('should prevent user from deleting themselves', async () => {
      await expect(userService.permanentDeleteUser(1, 1))
        .rejects.toThrow('Users cannot delete themselves');
    });
  });
});
