/**
 * Session Service
 *
 * Handles web session management for admin panel authentication.
 * This service is framework-agnostic and contains pure business logic.
 *
 * @module core/services/SessionService
 */

import {
  IUserRepository,
  IUserSession,
  ICreateSessionDTO,
} from '../domain/repositories/IUserRepository.js';
import { ValidationError } from '../domain/errors/ValidationError.js';
import { AuthenticationError } from '../domain/errors/AuthenticationError.js';
import { NotFoundError } from '../domain/errors/NotFoundError.js';

/**
 * Session validation result
 */
export interface SessionValidationResult {
  valid: boolean;
  session?: IUserSession;
  user?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    roleId: number;
    roleName: string;
  };
  error?: string;
}

/**
 * Session creation options
 */
export interface SessionCreationOptions {
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
  rememberMe?: boolean;
}

/**
 * Session service configuration
 */
interface SessionServiceConfig {
  defaultExpirationMinutes: number;
  rememberMeExpirationDays: number;
  maxSessionsPerUser: number;
  cleanupIntervalMinutes: number;
}

/**
 * Default session configuration
 */
const DEFAULT_CONFIG: SessionServiceConfig = {
  defaultExpirationMinutes: 60, // 1 hour
  rememberMeExpirationDays: 30, // 30 days
  maxSessionsPerUser: 5,
  cleanupIntervalMinutes: 15,
};

/**
 * Session Service Class
 *
 * Provides session-related operations for web authentication
 */
export class SessionService {
  private readonly userRepository: IUserRepository;
  private readonly config: SessionServiceConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(userRepository: IUserRepository, config: Partial<SessionServiceConfig> = {}) {
    this.userRepository = userRepository;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Create a new web session for a user
   *
   * @param userId - User ID
   * @param sessionToken - Unique session token
   * @param options - Session creation options
   * @returns Created session
   * @throws ValidationError if validation fails
   * @throws AuthenticationError if max sessions exceeded
   */
  async createSession(
    userId: number,
    sessionToken: string,
    options: SessionCreationOptions = {}
  ): Promise<IUserSession> {
    const { ipAddress, userAgent, deviceInfo, rememberMe } = options;

    // Verify user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId.toString());
    }

    // Check if user is active
    if (user.status !== 'active') {
      throw new AuthenticationError.accountDisabled();
    }

    // Check session limit
    const activeSessions = await this.userRepository.findActiveSessionsForUser(userId);
    if (activeSessions.length >= this.config.maxSessionsPerUser) {
      // Revoke oldest session
      const oldestSession = activeSessions.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )[0];

      await this.userRepository.revokeSession(oldestSession.id);
    }

    // Calculate expiration time
    const expirationMs = rememberMe
      ? this.config.rememberMeExpirationDays * 24 * 60 * 60 * 1000
      : this.config.defaultExpirationMinutes * 60 * 1000;

    const expiresAt = new Date(Date.now() + expirationMs);

    // Create session
    const sessionData: ICreateSessionDTO = {
      userId,
      sessionToken,
      expiresAt,
      ipAddress,
      userAgent,
      deviceInfo,
    };

    return this.userRepository.createSession(sessionData);
  }

  /**
   * Validate a session token
   *
   * @param sessionToken - Session token to validate
   * @returns Session validation result
   */
  async validateSession(sessionToken: string): Promise<SessionValidationResult> {
    if (!sessionToken) {
      return {
        valid: false,
        error: 'Session token is required',
      };
    }

    // Find session by token
    const session = await this.userRepository.findSessionByToken(sessionToken);

    if (!session) {
      return {
        valid: false,
        error: 'Invalid session token',
      };
    }

    // Check if session is active
    if (session.isActive === false) {
      return {
        valid: false,
        error: 'Session has been revoked',
      };
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      // Mark as expired
      await this.userRepository.revokeSession(session.id);

      return {
        valid: false,
        error: 'Session has expired',
      };
    }

    // Get user information
    const user = await this.userRepository.findById(session.userId);
    if (!user) {
      return {
        valid: false,
        error: 'User not found',
      };
    }

    // Check if user account is still active
    if (user.status !== 'active') {
      return {
        valid: false,
        error: 'User account is not active',
      };
    }

    // Update session activity
    await this.userRepository.updateSessionActivity(session.id);

    return {
      valid: true,
      session,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        roleName: user.roleName,
      },
    };
  }

  /**
   * Revoke a specific session
   *
   * @param sessionId - Session ID to revoke
   * @param terminatedBy - User ID who terminated the session (optional)
   * @returns True if session was revoked
   */
  async revokeSession(sessionId: number, terminatedBy?: number): Promise<boolean> {
    return this.userRepository.revokeSession(sessionId, terminatedBy);
  }

  /**
   * Revoke a session by token
   *
   * @param sessionToken - Session token to revoke
   * @returns True if session was revoked
   */
  async revokeSessionByToken(sessionToken: string): Promise<boolean> {
    const session = await this.userRepository.findSessionByToken(sessionToken);

    if (!session) {
      return false;
    }

    return this.userRepository.revokeSession(session.id);
  }

  /**
   * Revoke all sessions for a user
   *
   * @param userId - User ID
   * @param excludeSessionId - Session ID to exclude (optional)
   * @returns Number of sessions revoked
   */
  async revokeAllUserSessions(
    userId: number,
    excludeSessionId?: number
  ): Promise<number> {
    return this.userRepository.revokeAllUserSessions(userId, excludeSessionId);
  }

  /**
   * Get all active sessions for a user
   *
   * @param userId - User ID
   * @returns List of active sessions
   */
  async getUserActiveSessions(userId: number): Promise<IUserSession[]> {
    return this.userRepository.findActiveSessionsForUser(userId);
  }

  /**
   * Clean up expired sessions
   *
   * @returns Number of sessions cleaned up
   */
  async cleanupExpiredSessions(): Promise<number> {
    return this.userRepository.cleanupExpiredSessions();
  }

  /**
   * Start automatic cleanup of expired sessions
   *
   * @param intervalMinutes - Cleanup interval in minutes
   */
  startCleanup(intervalMinutes?: number): void {
    // Stop existing cleanup if any
    this.stopCleanup();

    const interval = intervalMinutes
      ? intervalMinutes * 60 * 1000
      : this.config.cleanupIntervalMinutes * 60 * 1000;

    this.cleanupTimer = setInterval(async () => {
      try {
        await this.cleanupExpiredSessions();
      } catch (error) {
        // Log error but continue cleanup
        console.error('Error during session cleanup:', error);
      }
    }, interval);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Refresh a session (extend expiration time)
   *
   * @param sessionToken - Session token to refresh
   * @param rememberMe - Whether to use extended expiration
   * @returns Updated session or null
   */
  async refreshSession(
    sessionToken: string,
    rememberMe: boolean = false
  ): Promise<IUserSession | null> {
    const validation = await this.validateSession(sessionToken);

    if (!validation.valid || !validation.session) {
      return null;
    }

    const session = validation.session;

    // Calculate new expiration time
    const expirationMs = rememberMe
      ? this.config.rememberMeExpirationDays * 24 * 60 * 60 * 1000
      : this.config.defaultExpirationMinutes * 60 * 1000;

    const expiresAt = new Date(Date.now() + expirationMs);

    // Update session expiration (requires repository method)
    // For now, we'll create a new session
    await this.userRepository.revokeSession(session.id);

    return this.createSession(session.userId, sessionToken, {
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      deviceInfo: session.deviceInfo || undefined,
      rememberMe,
    });
  }

  /**
   * Get session statistics for a user
   *
   * @param userId - User ID
   * @returns Session statistics
   */
  async getSessionStatistics(userId: number): Promise<{
    activeCount: number;
    totalCount: number;
    oldestSession?: IUserSession;
    newestSession?: IUserSession;
  }> {
    const activeSessions = await this.userRepository.findActiveSessionsForUser(userId);

    const sortedSessions = [...activeSessions].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return {
      activeCount: activeSessions.length,
      totalCount: activeSessions.length,
      oldestSession: sortedSessions[0],
      newestSession: sortedSessions[sortedSessions.length - 1],
    };
  }

  /**
   * Validate session limit for a user
   *
   * @param userId - User ID
   * @returns True if user can create more sessions
   */
  async canCreateSession(userId: number): Promise<boolean> {
    const activeSessions = await this.userRepository.findActiveSessionsForUser(userId);
    return activeSessions.length < this.config.maxSessionsPerUser;
  }

  /**
   * Get the current configuration
   */
  getConfig(): SessionServiceConfig {
    return { ...this.config };
  }
}

/**
 * Create a singleton instance
 */
let sessionServiceInstance: SessionService | null = null;

/**
 * Initialize session service with dependencies
 *
 * @param userRepository - User repository instance
 * @param config - Partial configuration (uses defaults for unspecified)
 * @returns Session service instance
 */
export function initializeSessionService(
  userRepository: IUserRepository,
  config?: Partial<SessionServiceConfig>
): SessionService {
  sessionServiceInstance = new SessionService(userRepository, config);

  // Start automatic cleanup
  sessionServiceInstance.startCleanup();

  return sessionServiceInstance;
}

/**
 * Get the session service instance
 *
 * @throws Error if service not initialized
 * @returns Session service instance
 */
export function getSessionService(): SessionService {
  if (!sessionServiceInstance) {
    throw new Error('SessionService not initialized. Call initializeSessionService first.');
  }

  return sessionServiceInstance;
}

/**
 * Export the session service class for dependency injection
 */
export default SessionService;
