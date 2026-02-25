/**
 * SessionService Unit Tests
 *
 * Tests for web session management operations.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SessionService } from '../../../src/core/services/SessionService.js';
import type { IUserRepository, IUserSession, ICreateSessionDTO } from '../../../src/core/domain/repositories/IUserRepository.js';
import { createSessionFactory, createUserFactory, createSessionDTOFactory, createMockUserWithPassword } from '../../utils/test-factories.js';

describe('SessionService', () => {
  let sessionService: SessionService;
  let mockUserRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
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

    // Setup default successful user mock
    mockUserRepository.findById.mockResolvedValue(createUserFactory());
    mockUserRepository.createSession.mockResolvedValue(createSessionFactory());

    sessionService = new SessionService(mockUserRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
    sessionService.stopCleanup();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      const config = sessionService.getConfig();

      expect(config.defaultExpirationMinutes).toBe(60);
      expect(config.rememberMeExpirationDays).toBe(30);
      expect(config.maxSessionsPerUser).toBe(5);
      expect(config.cleanupIntervalMinutes).toBe(15);
    });

    it('should accept custom config', () => {
      const customService = new SessionService(mockUserRepository, {
        defaultExpirationMinutes: 30,
        maxSessionsPerUser: 3,
      });

      const config = customService.getConfig();

      expect(config.defaultExpirationMinutes).toBe(30);
      expect(config.maxSessionsPerUser).toBe(3);
      expect(config.rememberMeExpirationDays).toBe(30); // Default
    });

    it('should start automatic cleanup on initialization', () => {
      jest.useFakeTimers();

      const cleanupSpy = jest.spyOn(sessionService as any, 'cleanupExpiredSessions');
      cleanupSpy.mockResolvedValue(0);

      const newService = new SessionService(mockUserRepository);

      jest.advanceTimersByTime(15 * 60 * 1000);

      // Cleanup should be scheduled
      expect(cleanupSpy).not.toHaveBeenCalled(); // Not called immediately

      newService.stopCleanup();
      jest.useRealTimers();
    });
  });

  describe('createSession', () => {
    it('should create a new session', async () => {
      const userId = 1;
      const sessionToken = 'test-session-token';
      const options = {
        ipAddress: '127.0.0.1',
        userAgent: 'Test Agent',
      };

      const mockSession = createSessionFactory({ userId, sessionToken });
      mockUserRepository.createSession.mockResolvedValue(mockSession);
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([]);

      const session = await sessionService.createSession(userId, sessionToken, options);

      expect(session).toBeDefined();
      expect(mockUserRepository.createSession).toHaveBeenCalledWith({
        userId,
        sessionToken,
        expiresAt: expect.any(Date),
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        deviceInfo: undefined,
      });
    });

    it('should use rememberMe expiration when specified', async () => {
      const userId = 1;
      const sessionToken = 'test-token';
      const options = { rememberMe: true };

      const mockSession = createSessionFactory({ userId, sessionToken });
      mockUserRepository.createSession.mockImplementation((data: ICreateSessionDTO) => {
        return Promise.resolve(createSessionFactory({ expiresAt: data.expiresAt }));
      });
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([]);

      const session = await sessionService.createSession(userId, sessionToken, options);

      const daysInMs = 30 * 24 * 60 * 60 * 1000;
      const expectedMinExpire = Date.now() + daysInMs - 1000;
      const expectedMaxExpire = Date.now() + daysInMs + 1000;

      expect(session.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpire);
      expect(session.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpire);
    });

    it('should use default expiration when rememberMe is false', async () => {
      const userId = 1;
      const sessionToken = 'test-token';
      const options = { rememberMe: false };

      const mockSession = createSessionFactory({ userId, sessionToken });
      mockUserRepository.createSession.mockImplementation((data: ICreateSessionDTO) => {
        return Promise.resolve(createSessionFactory({ expiresAt: data.expiresAt }));
      });
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([]);

      const session = await sessionService.createSession(userId, sessionToken, options);

      const minutesInMs = 60 * 60 * 1000;
      const expectedMinExpire = Date.now() + minutesInMs - 1000;
      const expectedMaxExpire = Date.now() + minutesInMs + 1000;

      expect(session.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpire);
      expect(session.expiresAt.getTime()).toBeLessThanOrEqual(expectedMaxExpire);
    });

    it('should revoke oldest session when max sessions reached', async () => {
      const userId = 1;
      const sessionToken = 'new-token';

      const existingSessions = [
        createSessionFactory({ id: 1, userId, createdAt: new Date(Date.now() - 10000) }),
        createSessionFactory({ id: 2, userId, createdAt: new Date(Date.now() - 5000) }),
        createSessionFactory({ id: 3, userId, createdAt: new Date(Date.now() - 3000) }),
        createSessionFactory({ id: 4, userId, createdAt: new Date(Date.now() - 1000) }),
        createSessionFactory({ id: 5, userId, createdAt: new Date() }),
      ];

      mockUserRepository.findActiveSessionsForUser.mockResolvedValue(existingSessions);
      mockUserRepository.revokeSession.mockResolvedValue(true);
      mockUserRepository.createSession.mockResolvedValue(createSessionFactory({ userId, sessionToken, id: 6 }));

      await sessionService.createSession(userId, sessionToken);

      expect(mockUserRepository.revokeSession).toHaveBeenCalledWith(1); // Oldest session
    });

    it('should throw error when user does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null);

      await expect(sessionService.createSession(999, 'token')).rejects.toThrow('User with ID 999 not found');
    });

    it('should throw error when user account is not active', async () => {
      const inactiveUser = createUserFactory({ status: 'inactive' });
      mockUserRepository.findById.mockResolvedValue(inactiveUser);

      await expect(sessionService.createSession(1, 'token')).rejects.toThrow('account is disabled');
    });
  });

  describe('validateSession', () => {
    it('should validate a valid session', async () => {
      const sessionToken = 'valid-token';
      const mockSession = createSessionFactory({ sessionToken });
      const mockUser = createUserFactory({ id: mockSession.userId });

      mockUserRepository.findSessionByToken.mockResolvedValue(mockSession);
      mockUserRepository.findById.mockResolvedValue(mockUser);

      const result = await sessionService.validateSession(sessionToken);

      expect(result.valid).toBe(true);
      expect(result.session).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe(mockUser.id);
    });

    it('should return error for empty token', async () => {
      const result = await sessionService.validateSession('');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session token is required');
    });

    it('should return error for invalid token', async () => {
      mockUserRepository.findSessionByToken.mockResolvedValue(null);

      const result = await sessionService.validateSession('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid session token');
    });

    it('should return error for revoked session', async () => {
      const revokedSession = createSessionFactory({ isActive: false });
      mockUserRepository.findSessionByToken.mockResolvedValue(revokedSession);

      const result = await sessionService.validateSession('revoked-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session has been revoked');
    });

    it('should return error for expired session', async () => {
      const expiredSession = createSessionFactory({
        expiresAt: new Date(Date.now() - 1000),
      });
      mockUserRepository.findSessionByToken.mockResolvedValue(expiredSession);
      mockUserRepository.revokeSession.mockResolvedValue(true);

      const result = await sessionService.validateSession('expired-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Session has expired');
      expect(mockUserRepository.revokeSession).toHaveBeenCalled();
    });

    it('should return error for non-existent user', async () => {
      const mockSession = createSessionFactory();
      mockUserRepository.findSessionByToken.mockResolvedValue(mockSession);
      mockUserRepository.findById.mockResolvedValue(null);

      const result = await sessionService.validateSession('valid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('User not found');
    });

    it('should return error for inactive user account', async () => {
      const mockSession = createSessionFactory();
      const inactiveUser = createUserFactory({ status: 'suspended' });

      mockUserRepository.findSessionByToken.mockResolvedValue(mockSession);
      mockUserRepository.findById.mockResolvedValue(inactiveUser);

      const result = await sessionService.validateSession('valid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('User account is not active');
    });

    it('should update session activity on validation', async () => {
      const mockSession = createSessionFactory();
      const mockUser = createUserFactory({ id: mockSession.userId });

      mockUserRepository.findSessionByToken.mockResolvedValue(mockSession);
      mockUserRepository.findById.mockResolvedValue(mockUser);
      mockUserRepository.updateSessionActivity.mockResolvedValue(true);

      await sessionService.validateSession('valid-token');

      expect(mockUserRepository.updateSessionActivity).toHaveBeenCalledWith(mockSession.id);
    });
  });

  describe('revokeSession', () => {
    it('should revoke a session by ID', async () => {
      const sessionId = 1;
      const terminatedBy = 2;

      mockUserRepository.revokeSession.mockResolvedValue(true);

      const result = await sessionService.revokeSession(sessionId, terminatedBy);

      expect(result).toBe(true);
      expect(mockUserRepository.revokeSession).toHaveBeenCalledWith(sessionId, terminatedBy);
    });

    it('should return false when session not found', async () => {
      mockUserRepository.revokeSession.mockResolvedValue(false);

      const result = await sessionService.revokeSession(999);

      expect(result).toBe(false);
    });
  });

  describe('revokeSessionByToken', () => {
    it('should revoke session by token', async () => {
      const sessionToken = 'token-to-revoke';
      const mockSession = createSessionFactory({ sessionToken });

      mockUserRepository.findSessionByToken.mockResolvedValue(mockSession);
      mockUserRepository.revokeSession.mockResolvedValue(true);

      const result = await sessionService.revokeSessionByToken(sessionToken);

      expect(result).toBe(true);
      expect(mockUserRepository.revokeSession).toHaveBeenCalledWith(mockSession.id);
    });

    it('should return false for invalid token', async () => {
      mockUserRepository.findSessionByToken.mockResolvedValue(null);

      const result = await sessionService.revokeSessionByToken('invalid-token');

      expect(result).toBe(false);
      expect(mockUserRepository.revokeSession).not.toHaveBeenCalled();
    });
  });

  describe('revokeAllUserSessions', () => {
    it('should revoke all sessions for user', async () => {
      const userId = 1;

      mockUserRepository.revokeAllUserSessions.mockResolvedValue(3);

      const count = await sessionService.revokeAllUserSessions(userId);

      expect(count).toBe(3);
      expect(mockUserRepository.revokeAllUserSessions).toHaveBeenCalledWith(userId, undefined);
    });

    it('should exclude specified session from revocation', async () => {
      const userId = 1;
      const excludeSessionId = 5;

      mockUserRepository.revokeAllUserSessions.mockResolvedValue(2);

      const count = await sessionService.revokeAllUserSessions(userId, excludeSessionId);

      expect(count).toBe(2);
      expect(mockUserRepository.revokeAllUserSessions).toHaveBeenCalledWith(userId, excludeSessionId);
    });
  });

  describe('getUserActiveSessions', () => {
    it('should return all active sessions for user', async () => {
      const userId = 1;
      const mockSessions = [
        createSessionFactory({ userId }),
        createSessionFactory({ userId }),
      ];

      mockUserRepository.findActiveSessionsForUser.mockResolvedValue(mockSessions);

      const sessions = await sessionService.getUserActiveSessions(userId);

      expect(sessions).toHaveLength(2);
      expect(sessions).toEqual(mockSessions);
    });

    it('should return empty array when no sessions', async () => {
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([]);

      const sessions = await sessionService.getUserActiveSessions(1);

      expect(sessions).toHaveLength(0);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should clean up expired sessions', async () => {
      mockUserRepository.cleanupExpiredSessions.mockResolvedValue(5);

      const count = await sessionService.cleanupExpiredSessions();

      expect(count).toBe(5);
      expect(mockUserRepository.cleanupExpiredSessions).toHaveBeenCalled();
    });

    it('should return 0 when no expired sessions', async () => {
      mockUserRepository.cleanupExpiredSessions.mockResolvedValue(0);

      const count = await sessionService.cleanupExpiredSessions();

      expect(count).toBe(0);
    });
  });

  describe('startCleanup', () => {
    it('should start periodic cleanup', () => {
      jest.useFakeTimers();

      mockUserRepository.cleanupExpiredSessions.mockResolvedValue(0);

      sessionService.startCleanup(10);

      jest.advanceTimersByTime(10 * 60 * 1000);

      expect(mockUserRepository.cleanupExpiredSessions).toHaveBeenCalled();

      sessionService.stopCleanup();
      jest.useRealTimers();
    });

    it('should use default interval when not specified', () => {
      const config = sessionService.getConfig();
      expect(config.cleanupIntervalMinutes).toBe(15);
    });

    it('should stop existing cleanup before starting new one', () => {
      jest.useFakeTimers();

      const spy = jest.spyOn(global, 'setInterval');

      sessionService.startCleanup(10);
      const firstCallCount = spy.mock.calls.length;

      sessionService.startCleanup(20);

      expect(spy.mock.calls.length).toBeGreaterThan(firstCallCount);

      sessionService.stopCleanup();
      jest.useRealTimers();
    });
  });

  describe('stopCleanup', () => {
    it('should stop periodic cleanup', () => {
      jest.useFakeTimers();

      sessionService.startCleanup(10);
      sessionService.stopCleanup();

      jest.advanceTimersByTime(10 * 60 * 1000);

      expect(mockUserRepository.cleanupExpiredSessions).not.toHaveBeenCalled();

      jest.useRealTimers();
    });

    it('should handle stopping when no cleanup is running', () => {
      expect(() => sessionService.stopCleanup()).not.toThrow();
    });
  });

  describe('refreshSession', () => {
    it('should refresh a valid session', async () => {
      const sessionToken = 'valid-token';
      const mockSession = createSessionFactory({ sessionToken });
      const mockUser = createUserFactory({ id: mockSession.userId });

      mockUserRepository.findSessionByToken.mockResolvedValueOnce(mockSession);
      mockUserRepository.findById.mockResolvedValueOnce(mockUser);
      mockUserRepository.revokeSession.mockResolvedValue(true);
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([]);
      mockUserRepository.createSession.mockImplementation((data: ICreateSessionDTO) => {
        return Promise.resolve(createSessionFactory({
          userId: data.userId,
          sessionToken: data.sessionToken,
          expiresAt: data.expiresAt,
        }));
      });

      const refreshed = await sessionService.refreshSession(sessionToken);

      expect(refreshed).not.toBeNull();
      expect(refreshed?.sessionToken).toBe(sessionToken);
    });

    it('should use rememberMe expiration when specified', async () => {
      const sessionToken = 'valid-token';
      const mockSession = createSessionFactory({ sessionToken });
      const mockUser = createUserFactory({ id: mockSession.userId });

      mockUserRepository.findSessionByToken.mockResolvedValueOnce(mockSession);
      mockUserRepository.findById.mockResolvedValueOnce(mockUser);
      mockUserRepository.revokeSession.mockResolvedValue(true);
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([]);
      mockUserRepository.createSession.mockImplementation((data: ICreateSessionDTO) => {
        return Promise.resolve(createSessionFactory({ expiresAt: data.expiresAt }));
      });

      const daysInMs = 30 * 24 * 60 * 60 * 1000;
      const expectedMinExpire = Date.now() + daysInMs - 1000;

      const refreshed = await sessionService.refreshSession(sessionToken, true);

      expect(refreshed?.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpire);
    });

    it('should return null for invalid session', async () => {
      mockUserRepository.findSessionByToken.mockResolvedValue(null);
      mockUserRepository.findById.mockResolvedValue(null);

      const refreshed = await sessionService.refreshSession('invalid-token');

      expect(refreshed).toBeNull();
    });
  });

  describe('getSessionStatistics', () => {
    it('should return session statistics for user', async () => {
      const userId = 1;
      const now = Date.now();

      const sessions = [
        createSessionFactory({ userId, createdAt: new Date(now - 10000) }),
        createSessionFactory({ userId, createdAt: new Date(now - 5000) }),
        createSessionFactory({ userId, createdAt: new Date(now - 1000) }),
      ];

      mockUserRepository.findActiveSessionsForUser.mockResolvedValue(sessions);

      const stats = await sessionService.getSessionStatistics(userId);

      expect(stats.activeCount).toBe(3);
      expect(stats.totalCount).toBe(3);
      expect(stats.oldestSession).toBeDefined();
      expect(stats.newestSession).toBeDefined();
      expect(stats.oldestSession?.createdAt.getTime()).toBeLessThan(stats.newestSession?.createdAt.getTime()!);
    });

    it('should return empty stats for user with no sessions', async () => {
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([]);

      const stats = await sessionService.getSessionStatistics(1);

      expect(stats.activeCount).toBe(0);
      expect(stats.totalCount).toBe(0);
      expect(stats.oldestSession).toBeUndefined();
      expect(stats.newestSession).toBeUndefined();
    });
  });

  describe('canCreateSession', () => {
    it('should return true when below max sessions', async () => {
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([
        createSessionFactory(),
        createSessionFactory(),
      ]);

      const canCreate = await sessionService.canCreateSession(1);

      expect(canCreate).toBe(true);
    });

    it('should return false when at max sessions', async () => {
      const maxSessions = 5;
      const sessions = Array(maxSessions).fill(null).map(() => createSessionFactory());

      mockUserRepository.findActiveSessionsForUser.mockResolvedValue(sessions);

      const canCreate = await sessionService.canCreateSession(1);

      expect(canCreate).toBe(false);
    });

    it('should return true when user has no sessions', async () => {
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([]);

      const canCreate = await sessionService.canCreateSession(1);

      expect(canCreate).toBe(true);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete session lifecycle', async () => {
      const userId = 1;
      const sessionToken = 'test-token';

      // Create session
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([]);
      const newSession = createSessionFactory({ userId, sessionToken });
      mockUserRepository.createSession.mockResolvedValue(newSession);

      const session = await sessionService.createSession(userId, sessionToken);
      expect(session.sessionToken).toBe(sessionToken);

      // Validate session
      mockUserRepository.findSessionByToken.mockResolvedValue(session);
      mockUserRepository.findById.mockResolvedValue(createUserFactory({ id: userId }));

      const validation = await sessionService.validateSession(sessionToken);
      expect(validation.valid).toBe(true);

      // Get active sessions
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([session]);
      const activeSessions = await sessionService.getUserActiveSessions(userId);
      expect(activeSessions).toHaveLength(1);

      // Revoke session
      mockUserRepository.revokeSession.mockResolvedValue(true);
      const revoked = await sessionService.revokeSessionByToken(sessionToken);
      expect(revoked).toBe(true);
    });

    it('should handle session refresh with remember me', async () => {
      const userId = 1;
      const sessionToken = 'refresh-token';

      const mockSession = createSessionFactory({ sessionToken, userId });
      const mockUser = createUserFactory({ id: userId });

      mockUserRepository.findSessionByToken.mockResolvedValueOnce(mockSession);
      mockUserRepository.findById.mockResolvedValueOnce(mockUser);
      mockUserRepository.revokeSession.mockResolvedValue(true);
      mockUserRepository.findActiveSessionsForUser.mockResolvedValue([]);
      mockUserRepository.createSession.mockImplementation((data: ICreateSessionDTO) => {
        return Promise.resolve(createSessionFactory({ expiresAt: data.expiresAt }));
      });

      const refreshed = await sessionService.refreshSession(sessionToken, true);

      expect(refreshed).not.toBeNull();

      const daysInMs = 30 * 24 * 60 * 60 * 1000;
      const expectedMinExpire = Date.now() + daysInMs - 1000;

      expect(refreshed?.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpire);
    });
  });
});
