/**
 * AuthService Unit Tests
 *
 * Tests for authentication operations including login, logout,
 * registration, and password management.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AuthService } from '../../../src/core/services/AuthService.js';
import { JWTService } from '../../../src/core/services/JWTService.js';
import { PasswordService } from '../../../src/core/services/PasswordService.js';
import { SessionService } from '../../../src/core/services/SessionService.js';
import type { IUserRepository, IUser } from '../../../src/core/domain/repositories/IUserRepository.js';
import {
  createUserFactory,
  createUserWithPasswordFactory,
  createLoginCredentialsFactory,
  createRegisterDataFactory,
  createRoleFactory,
} from '../../utils/test-factories.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockJWTService: jest.Mocked<JWTService>;
  let mockPasswordService: jest.Mocked<PasswordService>;
  let mockSessionService: jest.Mocked<SessionService>;

  const mockConfig = {
    secret: 'test-secret-key-min-32-characters-for-testing',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
    issuer: 'patrolmanager-test',
    audience: 'patrolmanager-api-test',
  };

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

    // Mock JWT service
    mockJWTService = {
      generateTokenPair: jest.fn(),
      verifyToken: jest.fn(),
      blacklistToken: jest.fn(),
      getUserIdFromToken: jest.fn(),
    } as any;

    // Mock password service
    mockPasswordService = {
      validatePassword: jest.fn(),
      comparePassword: jest.fn(),
      hashPassword: jest.fn(),
      isNewPasswordDifferent: jest.fn(),
      generateUrlSafeToken: jest.fn(),
      generatePasswordResetToken: jest.fn(),
    } as any;

    // Mock session service
    mockSessionService = {
      createSession: jest.fn(),
      revokeSessionByToken: jest.fn(),
      validateSession: jest.fn(),
    } as any;

    // Setup default mocks
    mockPasswordService.validatePassword.mockReturnValue({ valid: true, errors: [], strength: 'medium' });
    mockPasswordService.hashPassword.mockResolvedValue('hashedPassword123');
    mockPasswordService.comparePassword.mockResolvedValue(true);
    mockPasswordService.isNewPasswordDifferent.mockResolvedValue(true);
    mockPasswordService.generateUrlSafeToken.mockReturnValue('random-session-token');
    mockPasswordService.generatePasswordResetToken.mockReturnValue('reset-token-abc123');

    mockJWTService.generateTokenPair.mockReturnValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      expiresIn: 900,
      refreshExpiresIn: 604800,
    });

    mockJWTService.verifyToken.mockReturnValue({
      valid: true,
      payload: {
        sub: 1,
        email: 'test@example.com',
        roleId: 1,
        roleName: 'Admin',
        type: 'refresh',
      },
    });

    mockJWTService.getUserIdFromToken.mockReturnValue(1);

    authService = new AuthService(
      mockUserRepository,
      mockJWTService,
      mockPasswordService,
      mockSessionService,
      {}
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      const config = authService.getConfig();

      expect(config.maxFailedAttempts).toBe(5);
      expect(config.lockDurationMinutes).toBe(15);
      expect(config.rateLimitWindowMinutes).toBe(15);
      expect(config.passwordResetExpirationHours).toBe(24);
    });

    it('should accept custom config', () => {
      const customService = new AuthService(
        mockUserRepository,
        mockJWTService,
        mockPasswordService,
        mockSessionService,
        {
          maxFailedAttempts: 3,
          lockDurationMinutes: 30,
        }
      );

      const config = customService.getConfig();

      expect(config.maxFailedAttempts).toBe(3);
      expect(config.lockDurationMinutes).toBe(30);
    });
  });

  describe('registerUser', () => {
    const registerData = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      firstName: 'John',
      lastName: 'Doe',
      phone: '+1234567890',
      roleId: 3,
    };

    it('should register a new user successfully', async () => {
      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.findById.mockResolvedValue(createUserFactory({ id: 1 }));
      mockUserRepository.getRoleById.mockResolvedValue(createRoleFactory({ id: 3 }));
      mockUserRepository.create.mockResolvedValue(createUserFactory({ id: 1, ...registerData }));

      const user = await authService.registerUser(registerData, 1);

      expect(user).toBeDefined();
      expect(user.email).toBe(registerData.email.toLowerCase());
      expect(mockUserRepository.create).toHaveBeenCalledWith({
        email: registerData.email.toLowerCase(),
        password: 'hashedPassword123',
        firstName: registerData.firstName.trim(),
        lastName: registerData.lastName.trim(),
        phone: registerData.phone?.trim(),
        roleId: registerData.roleId,
        status: 'active',
      });
    });

    it('should throw error for weak password', async () => {
      mockPasswordService.validatePassword.mockReturnValue({
        valid: false,
        errors: ['Password too short'],
        strength: 'weak',
      });

      await expect(authService.registerUser({ ...registerData, password: 'weak' }, 1))
        .rejects.toThrow('Password validation failed');
    });

    it('should throw error when email already exists', async () => {
      mockUserRepository.emailExists.mockResolvedValue(true);

      await expect(authService.registerUser(registerData, 1))
        .rejects.toThrow('A user with this email already exists');
    });

    it('should throw error when creator not found', async () => {
      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(authService.registerUser(registerData, 999))
        .rejects.toThrow('Creator user not found');
    });

    it('should validate role exists before creating user', async () => {
      mockUserRepository.emailExists.mockResolvedValue(false);
      mockUserRepository.findById.mockResolvedValue(createUserFactory());
      mockUserRepository.getRoleById.mockResolvedValue(null);

      await expect(authService.registerUser({ ...registerData, roleId: 999 }, 1))
        .rejects.toThrow('Invalid role specified');
    });
  });

  describe('loginMobile', () => {
    const credentials = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login successfully with valid credentials', async () => {
      const userWithPassword = createUserWithPasswordFactory({
        email: credentials.email,
      });

      mockUserRepository.findByEmailWithPassword.mockResolvedValue(userWithPassword);
      mockUserRepository.resetFailedLoginAttempts.mockResolvedValue(true);
      mockUserRepository.updateLastLogin.mockResolvedValue(true);

      const result = await authService.loginMobile(credentials);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.tokens).toBeDefined();
      expect(mockPasswordService.comparePassword).toHaveBeenCalledWith(
        credentials.password,
        userWithPassword.passwordHash
      );
    });

    it('should return error for invalid email', async () => {
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(null);

      const result = await authService.loginMobile(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.remainingAttempts).toBe(5);
    });

    it('should return error for invalid password', async () => {
      const userWithPassword = createUserWithPasswordFactory();

      mockUserRepository.findByEmailWithPassword.mockResolvedValue(userWithPassword);
      mockPasswordService.comparePassword.mockResolvedValue(false);
      mockUserRepository.incrementFailedLoginAttempts.mockResolvedValue(1);

      const result = await authService.loginMobile(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.remainingAttempts).toBe(4);
    });

    it('should lock account after max failed attempts', async () => {
      const userWithPassword = createUserWithPasswordFactory();

      mockUserRepository.findByEmailWithPassword.mockResolvedValue(userWithPassword);
      mockPasswordService.comparePassword.mockResolvedValue(false);
      mockUserRepository.incrementFailedLoginAttempts.mockResolvedValue(5);
      mockUserRepository.lockAccount.mockResolvedValue(true);

      const result = await authService.loginMobile(credentials);

      expect(result.success).toBe(false);
      expect(result.accountLocked).toBe(true);
      expect(result.accountLockedUntil).toBeDefined();
      expect(mockUserRepository.lockAccount).toHaveBeenCalledWith(userWithPassword.id, 15);
    });

    it('should return error for locked account', async () => {
      const lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
      const userWithPassword = createUserWithPasswordFactory({ accountLockedUntil: lockedUntil });

      mockUserRepository.findByEmailWithPassword.mockResolvedValue(userWithPassword);

      const result = await authService.loginMobile(credentials);

      expect(result.success).toBe(false);
      expect(result.accountLocked).toBe(true);
      expect(result.error).toBe('Account is temporarily locked');
    });

    it('should return error for inactive user', async () => {
      const userWithPassword = createUserWithPasswordFactory({ status: 'suspended' });

      mockUserRepository.findByEmailWithPassword.mockResolvedValue(userWithPassword);

      const result = await authService.loginMobile(credentials);

      expect(result.success).toBe(false);
      expect(result.error).toContain('suspended');
    });

    it('should return error for rate limited account', async () => {
      // First, create some failed attempts
      await authService.loginMobile({ email: 'ratelimit@example.com', password: 'wrong' });
      await authService.loginMobile({ email: 'ratelimit@example.com', password: 'wrong' });
      await authService.loginMobile({ email: 'ratelimit@example.com', password: 'wrong' });
      await authService.loginMobile({ email: 'ratelimit@example.com', password: 'wrong' });
      await authService.loginMobile({ email: 'ratelimit@example.com', password: 'wrong' });

      mockUserRepository.findByEmailWithPassword.mockResolvedValue(null);

      const result = await authService.loginMobile({ email: 'ratelimit@example.com', password: 'wrong' });

      expect(result.success).toBe(false);
      expect(result.accountLocked).toBe(true);
    });

    it('should generate JWT tokens on successful login', async () => {
      const userWithPassword = createUserWithPasswordFactory();

      mockUserRepository.findByEmailWithPassword.mockResolvedValue(userWithPassword);
      mockUserRepository.resetFailedLoginAttempts.mockResolvedValue(true);
      mockUserRepository.updateLastLogin.mockResolvedValue(true);

      await authService.loginMobile(credentials);

      expect(mockJWTService.generateTokenPair).toHaveBeenCalledWith(
        userWithPassword.id,
        userWithPassword.email,
        userWithPassword.roleId,
        userWithPassword.roleName
      );
    });
  });

  describe('loginWeb', () => {
    const credentials = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    it('should login successfully for web', async () => {
      const userWithPassword = createUserWithPasswordFactory({
        email: credentials.email,
      });

      mockUserRepository.findByEmailWithPassword.mockResolvedValue(userWithPassword);
      mockUserRepository.resetFailedLoginAttempts.mockResolvedValue(true);
      mockUserRepository.updateLastLogin.mockResolvedValue(true);
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([]);
      mockSessionService.createSession.mockResolvedValue({
        id: 1,
        sessionToken: 'session-token',
        expiresAt: new Date(),
        userId: userWithPassword.id,
        isActive: true,
        lastActivityAt: new Date(),
        createdAt: new Date(),
      });
      mockPasswordService.generateUrlSafeToken.mockReturnValue('session-token');

      const result = await authService.loginWeb(credentials);

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.sessionToken).toBe('session-token');
      expect(mockSessionService.createSession).toHaveBeenCalled();
    });

    it('should use rememberMe option when specified', async () => {
      const userWithPassword = createUserWithPasswordFactory();

      mockUserRepository.findByEmailWithPassword.mockResolvedValue(userWithPassword);
      mockUserRepository.resetFailedLoginAttempts.mockResolvedValue(true);
      mockUserRepository.updateLastLogin.mockResolvedValue(true);
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([]);
      mockSessionService.createSession.mockResolvedValue({
        id: 1,
        sessionToken: 'session-token',
        expiresAt: new Date(),
        userId: userWithPassword.id,
        isActive: true,
        lastActivityAt: new Date(),
        createdAt: new Date(),
      });
      mockPasswordService.generateUrlSafeToken.mockReturnValue('session-token');

      await authService.loginWeb(credentials, { rememberMe: true });

      expect(mockSessionService.createSession).toHaveBeenCalledWith(
        userWithPassword.id,
        'session-token',
        expect.objectContaining({ rememberMe: true })
      );
    });
  });

  describe('logoutMobile', () => {
    it('should logout successfully with tokens', async () => {
      mockJWTService.getUserIdFromToken.mockReturnValue(1);

      const result = await authService.logoutMobile('access-token', 'refresh-token');

      expect(result).toBe(true);
      expect(mockJWTService.blacklistToken).toHaveBeenCalledWith('access-token', 1);
      expect(mockJWTService.blacklistToken).toHaveBeenCalledWith('refresh-token', 1);
    });

    it('should logout without refresh token', async () => {
      mockJWTService.getUserIdFromToken.mockReturnValue(1);

      const result = await authService.logoutMobile('access-token');

      expect(result).toBe(true);
      expect(mockJWTService.blacklistToken).toHaveBeenCalledTimes(1);
    });

    it('should return false for invalid token', async () => {
      mockJWTService.getUserIdFromToken.mockReturnValue(null);

      const result = await authService.logoutMobile('invalid-token');

      expect(result).toBe(false);
    });
  });

  describe('logoutWeb', () => {
    it('should logout web session successfully', async () => {
      mockSessionService.revokeSessionByToken.mockResolvedValue(true);

      const result = await authService.logoutWeb('session-token');

      expect(result).toBe(true);
      expect(mockSessionService.revokeSessionByToken).toHaveBeenCalledWith('session-token');
    });

    it('should return false for invalid session', async () => {
      mockSessionService.revokeSessionByToken.mockResolvedValue(false);

      const result = await authService.logoutWeb('invalid-session');

      expect(result).toBe(false);
    });
  });

  describe('logoutAll', () => {
    it('should logout all sessions except current', async () => {
      const currentSessionToken = 'current-session';
      const currentSession = { id: 5 };

      mockUserRepository.findSessionByToken.mockResolvedValue(currentSession);
      mockUserRepository.revokeAllUserSessions.mockResolvedValue(4);

      const count = await authService.logoutAll(1, currentSessionToken);

      expect(count).toBe(4);
      expect(mockUserRepository.revokeAllUserSessions).toHaveBeenCalledWith(1, 5);
    });

    it('should logout all sessions when no current session specified', async () => {
      mockUserRepository.findSessionByToken.mockResolvedValue(null);
      mockUserRepository.revokeAllUserSessions.mockResolvedValue(5);

      const count = await authService.logoutAll(1);

      expect(count).toBe(5);
      expect(mockUserRepository.revokeAllUserSessions).toHaveBeenCalledWith(1, undefined);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'valid-refresh-token';

      mockJWTService.verifyToken.mockReturnValue({
        valid: true,
        payload: {
          sub: 1,
          email: 'test@example.com',
          roleId: 1,
          roleName: 'Admin',
          type: 'refresh',
        },
      });

      mockUserRepository.findById.mockResolvedValue(createUserFactory());
      mockJWTService.generateTokenPair.mockReturnValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
        refreshExpiresIn: 604800,
      });

      const result = await authService.refreshTokens(refreshToken);

      expect(result.success).toBe(true);
      expect(result.tokens).toBeDefined();
      expect(result.tokens?.accessToken).toBe('new-access-token');
    });

    it('should return error for invalid refresh token', async () => {
      mockJWTService.verifyToken.mockReturnValue({
        valid: false,
        error: 'Invalid token',
      });

      const result = await authService.refreshTokens('invalid-token');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid refresh token');
    });

    it('should return error for inactive user', async () => {
      mockJWTService.verifyToken.mockReturnValue({
        valid: true,
        payload: {
          sub: 1,
          email: 'test@example.com',
          roleId: 1,
          roleName: 'Admin',
          type: 'refresh',
        },
      });

      mockUserRepository.findById.mockResolvedValue(createUserFactory({ status: 'inactive' }));

      const result = await authService.refreshTokens('valid-token');

      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found or inactive');
    });

    it('should blacklist old refresh token', async () => {
      mockJWTService.verifyToken.mockReturnValue({
        valid: true,
        payload: {
          sub: 1,
          email: 'test@example.com',
          roleId: 1,
          roleName: 'Admin',
          type: 'refresh',
        },
      });

      mockUserRepository.findById.mockResolvedValue(createUserFactory());

      await authService.refreshTokens('old-refresh-token');

      expect(mockJWTService.blacklistToken).toHaveBeenCalledWith('old-refresh-token', 1);
    });
  });

  describe('forgotPassword', () => {
    it('should always return success for security (email enumeration prevention)', async () => {
      mockUserRepository.findByEmail.mockResolvedValue(null);

      const result = await authService.forgotPassword('nonexistent@example.com');

      expect(result.success).toBe(true);
      expect(result.resetToken).toBeUndefined();
    });

    it('should generate reset token for existing user', async () => {
      const user = createUserFactory({ email: 'test@example.com' });

      mockUserRepository.findByEmail.mockResolvedValue(user);

      const result = await authService.forgotPassword('test@example.com');

      expect(result.success).toBe(true);
      expect(result.resetToken).toBeDefined();
      expect(result.expiresAt).toBeDefined();
    });

    it('should not generate token for inactive user', async () => {
      const inactiveUser = createUserFactory({ status: 'suspended' });

      mockUserRepository.findByEmail.mockResolvedValue(inactiveUser);

      const result = await authService.forgotPassword('suspended@example.com');

      expect(result.success).toBe(true);
      expect(result.resetToken).toBeUndefined();
    });
  });

  describe('resetPassword', () => {
    it('should validate new password strength', async () => {
      mockPasswordService.validatePassword.mockReturnValue({
        valid: false,
        errors: ['Password too short'],
        strength: 'weak',
      });

      const result = await authService.resetPassword('reset-token', 'short');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Password validation failed');
    });

    it('should return not implemented error (placeholder)', async () => {
      mockPasswordService.validatePassword.mockReturnValue({
        valid: true,
        errors: [],
        strength: 'medium',
      });

      const result = await authService.resetPassword('reset-token', 'NewPassword123!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not fully implemented');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const user = createUserFactory({ email: 'test@example.com' });
      const userWithPassword = createUserWithPasswordFactory({ email: 'test@example.com' });

      mockPasswordService.validatePassword.mockReturnValue({ valid: true, errors: [], strength: 'medium' });
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(userWithPassword);
      mockPasswordService.comparePassword.mockResolvedValue(true);
      mockPasswordService.isNewPasswordDifferent.mockResolvedValue(true);
      mockUserRepository.changePassword.mockResolvedValue(true);

      const result = await authService.changePassword(1, 'OldPassword123!', 'NewPassword123!');

      expect(result).toBe(true);
      expect(mockUserRepository.changePassword).toHaveBeenCalledWith(1, 'hashedPassword123');
    });

    it('should throw error for weak new password', async () => {
      mockPasswordService.validatePassword.mockReturnValue({
        valid: false,
        errors: ['Password too weak'],
        strength: 'weak',
      });

      await expect(authService.changePassword(1, 'OldPassword123!', 'weak'))
        .rejects.toThrow('Password validation failed');
    });

    it('should throw error for incorrect current password', async () => {
      const user = createUserFactory();
      const userWithPassword = createUserWithPasswordFactory();

      mockPasswordService.validatePassword.mockReturnValue({ valid: true, errors: [], strength: 'medium' });
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(userWithPassword);
      mockPasswordService.comparePassword.mockResolvedValue(false);

      await expect(authService.changePassword(1, 'WrongPassword123!', 'NewPassword123!'))
        .rejects.toThrow('Current password is incorrect');
    });

    it('should throw error when new password same as current', async () => {
      const user = createUserFactory();
      const userWithPassword = createUserWithPasswordFactory();

      mockPasswordService.validatePassword.mockReturnValue({ valid: true, errors: [], strength: 'medium' });
      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(userWithPassword);
      mockPasswordService.comparePassword.mockResolvedValue(true);
      mockPasswordService.isNewPasswordDifferent.mockResolvedValue(false);

      await expect(authService.changePassword(1, 'SamePassword123!', 'SamePassword123!'))
        .rejects.toThrow('New password must be different from current password');
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile with role and permissions', async () => {
      const user = createUserFactory();
      const role = createRoleFactory();
      const permissions = [
        { id: 1, name: 'users.read', resource: 'users', action: 'read' },
        { id: 2, name: 'users.manage', resource: 'users', action: 'manage' },
      ];

      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.getRoleById.mockResolvedValue(role);
      mockUserRepository.getPermissionsForRole.mockResolvedValue(permissions);

      const profile = await authService.getUserProfile(1);

      expect(profile.user).toBeDefined();
      expect(profile.role).toBeDefined();
      expect(profile.permissions).toEqual(['users.read', 'users.manage']);
    });

    it('should return error for non-existent user', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      const profile = await authService.getUserProfile(999);

      expect(profile.error).toBe('User not found');
    });

    it('should return profile without permissions when role not found', async () => {
      const user = createUserFactory();

      mockUserRepository.findById.mockResolvedValue(user);
      mockUserRepository.getRoleById.mockResolvedValue(null);

      const profile = await authService.getUserProfile(1);

      expect(profile.user).toBeDefined();
      expect(profile.role).toBeUndefined();
      expect(profile.permissions).toEqual([]);
    });
  });

  describe('verifyAccessToken', () => {
    it('should return user for valid token', async () => {
      const user = createUserFactory();

      mockJWTService.verifyToken.mockReturnValue({
        valid: true,
        payload: {
          sub: 1,
          email: 'test@example.com',
          roleId: 1,
          roleName: 'Admin',
          type: 'access',
        },
      });

      mockUserRepository.findById.mockResolvedValue(user);

      const result = await authService.verifyAccessToken('valid-token');

      expect(result).toBeDefined();
      expect(result?.id).toBe(1);
    });

    it('should return null for invalid token', async () => {
      mockJWTService.verifyToken.mockReturnValue({
        valid: false,
        error: 'Invalid token',
      });

      const result = await authService.verifyAccessToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null for inactive user', async () => {
      mockJWTService.verifyToken.mockReturnValue({
        valid: true,
        payload: {
          sub: 1,
          email: 'test@example.com',
          roleId: 1,
          roleName: 'Admin',
          type: 'access',
        },
      });

      mockUserRepository.findById.mockResolvedValue(createUserFactory({ status: 'inactive' }));

      const result = await authService.verifyAccessToken('valid-token');

      expect(result).toBeNull();
    });
  });

  describe('verifyWebSession', () => {
    it('should return user for valid session', async () => {
      const user = createUserFactory();

      mockSessionService.validateSession.mockResolvedValue({
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roleId: user.roleId,
          roleName: user.roleName,
        },
      });

      mockUserRepository.findById.mockResolvedValue(user);

      const result = await authService.verifyWebSession('valid-session-token');

      expect(result).toBeDefined();
      expect(result?.id).toBe(user.id);
    });

    it('should return null for invalid session', async () => {
      mockSessionService.validateSession.mockResolvedValue({
        valid: false,
        error: 'Invalid session',
      });

      const result = await authService.verifyWebSession('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete mobile auth flow', async () => {
      const credentials = createLoginCredentialsFactory();
      const userWithPassword = createUserWithPasswordFactory({
        email: credentials.email,
      });

      // Login
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(userWithPassword);
      mockUserRepository.resetFailedLoginAttempts.mockResolvedValue(true);
      mockUserRepository.updateLastLogin.mockResolvedValue(true);

      const loginResult = await authService.loginMobile(credentials);

      expect(loginResult.success).toBe(true);
      expect(loginResult.tokens).toBeDefined();

      // Verify access token
      mockJWTService.verifyToken.mockReturnValue({
        valid: true,
        payload: {
          sub: 1,
          email: credentials.email,
          roleId: 1,
          roleName: 'Admin',
          type: 'access',
        },
      });

      mockUserRepository.findById.mockResolvedValue(createUserFactory());

      const user = await authService.verifyAccessToken(loginResult.tokens!.accessToken);
      expect(user).toBeDefined();

      // Logout
      mockJWTService.getUserIdFromToken.mockReturnValue(1);
      const logoutResult = await authService.logoutMobile(loginResult.tokens!.accessToken);
      expect(logoutResult).toBe(true);
    });

    it('should handle complete web auth flow', async () => {
      const credentials = createLoginCredentialsFactory();
      const userWithPassword = createUserWithPasswordFactory({
        email: credentials.email,
      });

      // Login
      mockUserRepository.findByEmailWithPassword.mockResolvedValue(userWithPassword);
      mockUserRepository.resetFailedLoginAttempts.mockResolvedValue(true);
      mockUserRepository.updateLastLogin.mockResolvedValue(true);
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([]);
      mockPasswordService.generateUrlSafeToken.mockReturnValue('session-token');
      mockSessionService.createSession.mockResolvedValue({
        id: 1,
        sessionToken: 'session-token',
        expiresAt: new Date(),
        userId: userWithPassword.id,
        isActive: true,
        lastActivityAt: new Date(),
        createdAt: new Date(),
      });

      const loginResult = await authService.loginWeb(credentials);

      expect(loginResult.success).toBe(true);
      expect(loginResult.sessionToken).toBeDefined();

      // Verify session
      const user = createUserFactory();
      mockSessionService.validateSession.mockResolvedValue({
        valid: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          roleId: user.roleId,
          roleName: user.roleName,
        },
      });

      mockUserRepository.findById.mockResolvedValue(user);

      const verifiedUser = await authService.verifyWebSession(loginResult.sessionToken!);
      expect(verifiedUser).toBeDefined();

      // Logout
      mockSessionService.revokeSessionByToken.mockResolvedValue(true);
      const logoutResult = await authService.logoutWeb(loginResult.sessionToken!);
      expect(logoutResult).toBe(true);
    });
  });
});
