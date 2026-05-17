/**
 * Authentication Service
 *
 * Core authentication service handling user registration, login, logout,
 * password management, and both JWT (mobile) and session-based (web) authentication.
 * This service is framework-agnostic and contains pure business logic.
 *
 * @module core/services/AuthService
 */

import {
  IUserRepository,
  IUser,
  ICreateUserDTO,
  IRole,
} from '../domain/repositories/IUserRepository.js';
import { ValidationError } from '../domain/errors/ValidationError.js';
import { AuthenticationError } from '../domain/errors/AuthenticationError.js';
import { UnauthorizedError } from '../domain/errors/UnauthorizedError.js';
import { NotFoundError } from '../domain/errors/NotFoundError.js';
import { ConflictError } from '../domain/errors/ConflictError.js';
import { RateLimitError } from '../domain/errors/RateLimitError.js';

import { JWTService, TokenPair, JWTPayload } from './JWTService.js';
import { PasswordService, PasswordValidationResult } from './PasswordService.js';
import { SessionService, SessionCreationOptions } from './SessionService.js';

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Registration data
 */
export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  roleId: number;
}

/**
 * Login result for mobile (JWT-based)
 */
export interface MobileLoginResult {
  success: boolean;
  user?: IUser;
  tokens?: TokenPair;
  requiresPasswordChange?: boolean;
  accountLocked?: boolean;
  accountLockedUntil?: Date;
  remainingAttempts?: number;
  error?: string;
}

/**
 * Login result for web (session-based)
 */
export interface WebLoginResult {
  success: boolean;
  user?: IUser;
  sessionToken?: string;
  requiresPasswordChange?: boolean;
  accountLocked?: boolean;
  accountLockedUntil?: Date;
  remainingAttempts?: number;
  error?: string;
}

/**
 * Token refresh result
 */
export interface TokenRefreshResult {
  success: boolean;
  tokens?: TokenPair;
  error?: string;
}

/**
 * Password reset request result
 */
export interface PasswordResetRequestResult {
  success: boolean;
  resetToken?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Password reset result
 */
export interface PasswordResetResult {
  success: boolean;
  error?: string;
}

/**
 * User profile result
 */
export interface UserProfileResult {
  user?: IUser;
  role?: IRole;
  permissions?: string[];
  error?: string;
}

/**
 * Rate limit tracker for login attempts
 */
interface LoginRateLimitEntry {
  attempts: number;
  lastAttempt: Date;
  lockUntil?: Date;
}

/**
 * In-memory rate limit tracking (production should use Redis)
 */
const loginRateLimits = new Map<string, LoginRateLimitEntry>();

/**
 * Password reset token storage
 */
interface PasswordResetEntry {
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
}
const passwordResetTokens = new Map<string, PasswordResetEntry>();

/**
 * Authentication service configuration
 */
interface AuthServiceConfig {
  maxFailedAttempts: number;
  lockDurationMinutes: number;
  rateLimitWindowMinutes: number;
  passwordResetExpirationHours: number;
  allowAdminRegistration: boolean;
}

/**
 * Default authentication configuration
 */
const DEFAULT_CONFIG: AuthServiceConfig = {
  maxFailedAttempts: 5,
  lockDurationMinutes: 15,
  rateLimitWindowMinutes: 15,
  passwordResetExpirationHours: 24,
  allowAdminRegistration: true, // Admins can register users
};

/**
 * Authentication Service Class
 *
 * Provides all authentication-related operations
 */
export class AuthService {
  private readonly userRepository: IUserRepository;
  private readonly jwtService: JWTService;
  private readonly passwordService: PasswordService;
  private readonly sessionService: SessionService;
  private readonly config: AuthServiceConfig;

  constructor(
    userRepository: IUserRepository,
    jwtService: JWTService,
    passwordService: PasswordService,
    sessionService: SessionService,
    config: Partial<AuthServiceConfig> = {}
  ) {
    this.userRepository = userRepository;
    this.jwtService = jwtService;
    this.passwordService = passwordService;
    this.sessionService = sessionService;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Register a new user (Admin only)
   *
   * @param userData - User registration data
   * @param createdBy - User ID of the admin creating this user
   * @returns Created user
   * @throws ValidationError if validation fails
   * @throws ConflictError if email exists
   * @throws UnauthorizedError if not authorized
   */
  async registerUser(userData: RegisterData, createdBy: number): Promise<IUser> {
    // Validate password strength
    const passwordValidation = this.passwordService.validatePassword(userData.password);
    if (!passwordValidation.valid) {
      throw new ValidationError(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`
      );
    }

    // Check if email already exists
    const emailExists = await this.userRepository.emailExists(userData.email);
    if (emailExists) {
      throw new ConflictError('A user with this email already exists');
    }

    // Verify creator has permission (should be admin or manager)
    const creator = await this.userRepository.findById(createdBy);
    if (!creator) {
      throw new UnauthorizedError('Creator user not found');
    }

    // Hash password
    const passwordHash = await this.passwordService.hashPassword(userData.password);

    // Create user DTO
    const createUserDTO: ICreateUserDTO = {
      email: userData.email.toLowerCase().trim(),
      password: passwordHash,
      firstName: userData.firstName.trim(),
      lastName: userData.lastName.trim(),
      phone: userData.phone?.trim(),
      roleId: userData.roleId,
      status: 'active', // Default status
    };

    // Create user
    const newUser = await this.userRepository.create(createUserDTO);

    // Remove password from returned user
    const { password: _, ...userWithoutPassword } = newUser as any;
    return userWithoutPassword as IUser;
  }

  /**
   * Login for mobile app (JWT-based authentication)
   *
   * @param credentials - Login credentials
   * @returns Mobile login result with tokens
   */
  async loginMobile(credentials: LoginCredentials): Promise<MobileLoginResult> {
    const { email, password } = credentials;

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check rate limiting
    const rateLimitCheck = this.checkRateLimit(normalizedEmail);
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        accountLocked: true,
        accountLockedUntil: rateLimitCheck.lockUntil,
        error: `Account locked due to too many failed attempts. Try again after ${rateLimitCheck.lockUntil?.toLocaleTimeString()}`,
      };
    }

    // Find user with password
    const userWithPassword = await this.userRepository.findByEmailWithPassword(normalizedEmail);

    if (!userWithPassword) {
      this.recordFailedAttempt(normalizedEmail);
      const remainingAttempts = this.getRemainingAttempts(normalizedEmail);

      return {
        success: false,
        remainingAttempts,
        error: 'Invalid email or password',
      };
    }

    // Check if account is locked
    if (userWithPassword.accountLockedUntil && userWithPassword.accountLockedUntil > new Date()) {
      return {
        success: false,
        accountLocked: true,
        accountLockedUntil: userWithPassword.accountLockedUntil,
        error: 'Account is temporarily locked',
      };
    }

    // Check user status
    if (userWithPassword.status !== 'active') {
      return {
        success: false,
        error: this.getStatusErrorMessage(userWithPassword.status),
      };
    }

    // Verify password
    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      userWithPassword.passwordHash
    );

    if (!isPasswordValid) {
      this.recordFailedAttempt(normalizedEmail);
      const attempts = await this.userRepository.incrementFailedLoginAttempts(userWithPassword.id);

      // Lock account if max attempts reached
      if (attempts >= this.config.maxFailedAttempts) {
        await this.userRepository.lockAccount(userWithPassword.id, this.config.lockDurationMinutes);

        return {
          success: false,
          accountLocked: true,
          accountLockedUntil: new Date(Date.now() + this.config.lockDurationMinutes * 60 * 1000),
          error: `Account locked due to too many failed attempts`,
        };
      }

      const remainingAttempts = this.config.maxFailedAttempts - attempts;

      return {
        success: false,
        remainingAttempts,
        error: 'Invalid email or password',
      };
    }

    // Reset failed attempts on successful login
    await this.userRepository.resetFailedLoginAttempts(userWithPassword.id);
    this.clearRateLimit(normalizedEmail);

    // Update last login
    await this.userRepository.updateLastLogin(userWithPassword.id);

    // Generate JWT tokens
    const tokens = this.jwtService.generateTokenPair(
      userWithPassword.id,
      userWithPassword.email,
      userWithPassword.roleId,
      userWithPassword.roleName
    );

    // Remove password hash from user object
    const { passwordHash: _, ...user } = userWithPassword;

    return {
      success: true,
      user: user as IUser,
      tokens,
    };
  }

  /**
   * Login for web admin panel (session-based authentication)
   *
   * @param credentials - Login credentials
   * @param sessionOptions - Session creation options
   * @returns Web login result with session token
   */
  async loginWeb(
    credentials: LoginCredentials,
    sessionOptions?: SessionCreationOptions
  ): Promise<WebLoginResult> {
    const { email, password } = credentials;

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Check rate limiting
    const rateLimitCheck = this.checkRateLimit(normalizedEmail);
    if (!rateLimitCheck.allowed) {
      return {
        success: false,
        accountLocked: true,
        accountLockedUntil: rateLimitCheck.lockUntil,
        error: `Account locked due to too many failed attempts. Try again after ${rateLimitCheck.lockUntil?.toLocaleTimeString()}`,
      };
    }

    // Find user with password
    const userWithPassword = await this.userRepository.findByEmailWithPassword(normalizedEmail);

    if (!userWithPassword) {
      this.recordFailedAttempt(normalizedEmail);
      const remainingAttempts = this.getRemainingAttempts(normalizedEmail);

      return {
        success: false,
        remainingAttempts,
        error: 'Invalid email or password',
      };
    }

    // Check if account is locked
    if (userWithPassword.accountLockedUntil && userWithPassword.accountLockedUntil > new Date()) {
      return {
        success: false,
        accountLocked: true,
        accountLockedUntil: userWithPassword.accountLockedUntil,
        error: 'Account is temporarily locked',
      };
    }

    // Check user status
    if (userWithPassword.status !== 'active') {
      return {
        success: false,
        error: this.getStatusErrorMessage(userWithPassword.status),
      };
    }

    // Verify password
    const isPasswordValid = await this.passwordService.comparePassword(
      password,
      userWithPassword.passwordHash
    );

    if (!isPasswordValid) {
      this.recordFailedAttempt(normalizedEmail);
      const attempts = await this.userRepository.incrementFailedLoginAttempts(userWithPassword.id);

      // Lock account if max attempts reached
      if (attempts >= this.config.maxFailedAttempts) {
        await this.userRepository.lockAccount(userWithPassword.id, this.config.lockDurationMinutes);

        return {
          success: false,
          accountLocked: true,
          accountLockedUntil: new Date(Date.now() + this.config.lockDurationMinutes * 60 * 1000),
          error: `Account locked due to too many failed attempts`,
        };
      }

      const remainingAttempts = this.config.maxFailedAttempts - attempts;

      return {
        success: false,
        remainingAttempts,
        error: 'Invalid email or password',
      };
    }

    // Reset failed attempts on successful login
    await this.userRepository.resetFailedLoginAttempts(userWithPassword.id);
    this.clearRateLimit(normalizedEmail);

    // Update last login
    await this.userRepository.updateLastLogin(userWithPassword.id);

    // Generate session token
    const sessionToken = this.passwordService.generateUrlSafeToken(32);

    // Create session
    await this.sessionService.createSession(userWithPassword.id, sessionToken, sessionOptions);

    // Remove password hash from user object
    const { passwordHash: _, ...user } = userWithPassword;

    return {
      success: true,
      user: user as IUser,
      sessionToken,
    };
  }

  /**
   * Logout from mobile app (revoke JWT tokens)
   *
   * @param accessToken - JWT access token
   * @param refreshToken - JWT refresh token
   * @returns True if logout successful
   */
  async logoutMobile(accessToken: string, refreshToken?: string): Promise<boolean> {
    try {
      // Get user ID from token
      const userId = this.jwtService.getUserIdFromToken(accessToken);
      if (!userId) {
        return false;
      }

      // Blacklist access token
      this.jwtService.blacklistToken(accessToken, userId);

      // Blacklist refresh token if provided
      if (refreshToken) {
        this.jwtService.blacklistToken(refreshToken, userId);
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Logout from web admin panel (revoke session)
   *
   * @param sessionToken - Session token
   * @returns True if logout successful
   */
  async logoutWeb(sessionToken: string): Promise<boolean> {
    return this.sessionService.revokeSessionByToken(sessionToken);
  }

  /**
   * Logout from all devices/sessions
   *
   * @param userId - User ID
   * @param currentSessionToken - Current session to keep active (optional)
   * @returns Number of sessions revoked
   */
  async logoutAll(userId: number, currentSessionToken?: string): Promise<number> {
    let excludeSessionId: number | undefined;

    if (currentSessionToken) {
      const session = await this.userRepository.findSessionByToken(currentSessionToken);
      excludeSessionId = session?.id;
    }

    return this.userRepository.revokeAllUserSessions(userId, excludeSessionId);
  }

  /**
   * Refresh JWT tokens
   *
   * @param refreshToken - Refresh token
   * @returns Token refresh result
   */
  async refreshTokens(refreshToken: string): Promise<TokenRefreshResult> {
    // Verify refresh token
    const verification = this.jwtService.verifyToken(refreshToken, 'refresh');

    if (!verification.valid || !verification.payload) {
      return {
        success: false,
        error: verification.error || 'Invalid refresh token',
      };
    }

    const { sub: userId, email, roleId, roleName } = verification.payload;

    // Verify user still exists and is active
    const user = await this.userRepository.findById(userId);
    if (!user || user.status !== 'active') {
      return {
        success: false,
        error: 'User not found or inactive',
      };
    }

    // Generate new token pair
    const tokens = this.jwtService.generateTokenPair(userId, email, roleId, roleName);

    // Blacklist old refresh token
    this.jwtService.blacklistToken(refreshToken, userId);

    return {
      success: true,
      tokens,
    };
  }

  /**
   * Request password reset
   *
   * @param email - User email
   * @returns Password reset request result
   */
  async forgotPassword(email: string): Promise<PasswordResetRequestResult> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user || user.status !== 'active') {
      return { success: true };
    }

    // Invalidate any existing reset tokens for this user
    for (const [key, entry] of passwordResetTokens.entries()) {
      if (entry.userId === user.id && !entry.used) {
        entry.used = true;
      }
    }

    const resetToken = this.passwordService.generateUrlSafeToken(48);
    const tokenHash = await this.passwordService.hashToken(resetToken);
    const expiresAt = new Date(
      Date.now() + this.config.passwordResetExpirationHours * 60 * 60 * 1000
    );

    passwordResetTokens.set(resetToken, {
      userId: user.id,
      tokenHash,
      expiresAt,
      used: false,
    });

    // TODO: Send reset email via email service in production
    // For now, return the token so the caller can deliver it
    return {
      success: true,
      resetToken,
      expiresAt,
    };
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<PasswordResetResult> {
    const passwordValidation = this.passwordService.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      return {
        success: false,
        error: `Password validation failed: ${passwordValidation.errors.join(', ')}`,
      };
    }

    const entry = passwordResetTokens.get(resetToken);
    if (!entry) {
      return { success: false, error: 'Invalid or expired reset token' };
    }

    if (entry.used) {
      return { success: false, error: 'Reset token has already been used' };
    }

    if (entry.expiresAt < new Date()) {
      entry.used = true;
      return { success: false, error: 'Reset token has expired' };
    }

    const isValid = await this.passwordService.verifyToken(resetToken, entry.tokenHash);
    if (!isValid) {
      return { success: false, error: 'Invalid reset token' };
    }

    const passwordHash = await this.passwordService.hashPassword(newPassword);
    const updated = await this.userRepository.changePassword(entry.userId, passwordHash);

    if (!updated) {
      return { success: false, error: 'Failed to update password' };
    }

    entry.used = true;
    await this.userRepository.revokeAllUserSessions(entry.userId);
    await this.userRepository.resetFailedLoginAttempts(entry.userId);

    return { success: true };
  }

  /**
   * Change password for authenticated user
   *
   * @param userId - User ID
   * @param currentPassword - Current password
   * @param newPassword - New password
   * @returns True if password changed successfully
   */
  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string
  ): Promise<boolean> {
    // Validate new password
    const passwordValidation = this.passwordService.validatePassword(newPassword);
    if (!passwordValidation.valid) {
      throw new ValidationError(
        `Password validation failed: ${passwordValidation.errors.join(', ')}`
      );
    }

    // Get user with password
    const userWithPassword = await this.userRepository.findByEmailWithPassword(
      (await this.userRepository.findById(userId))!.email
    );

    if (!userWithPassword) {
      throw new NotFoundError('User', userId.toString());
    }

    // Verify current password
    const isCurrentPasswordValid = await this.passwordService.comparePassword(
      currentPassword,
      userWithPassword.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new AuthenticationError('Current password is incorrect');
    }

    // Check new password is different
    const isNewDifferent = await this.passwordService.isNewPasswordDifferent(
      newPassword,
      userWithPassword.passwordHash
    );

    if (!isNewDifferent) {
      throw new ValidationError('New password must be different from current password');
    }

    // Hash new password
    const newPasswordHash = await this.passwordService.hashPassword(newPassword);

    // Update password
    return this.userRepository.changePassword(userId, newPasswordHash);
  }

  /**
   * Get current user profile
   *
   * @param userId - User ID
   * @returns User profile with role and permissions
   */
  async getUserProfile(userId: number): Promise<UserProfileResult> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      return {
        error: 'User not found',
      };
    }

    // Get role
    const role = await this.userRepository.getRoleById(user.roleId);

    // Get permissions
    const permissions = role
      ? await this.userRepository.getPermissionsForRole(role.id)
      : [];

    return {
      user,
      role: role || undefined,
      permissions: permissions.map((p) => `${p.resource}:${p.action}`),
    };
  }

  /**
   * Verify JWT access token and get user
   *
   * @param token - JWT access token
   * @returns User if token is valid
   */
  async verifyAccessToken(token: string): Promise<IUser | null> {
    const verification = this.jwtService.verifyToken(token, 'access');

    if (!verification.valid || !verification.payload) {
      return null;
    }

    const { sub: userId } = verification.payload;

    const user = await this.userRepository.findById(userId);

    // Check if user is still active
    if (!user || user.status !== 'active') {
      return null;
    }

    return user;
  }

  /**
   * Verify web session and get user
   *
   * @param sessionToken - Session token
   * @returns User if session is valid
   */
  async verifyWebSession(sessionToken: string): Promise<IUser | null> {
    const validation = await this.sessionService.validateSession(sessionToken);

    if (!validation.valid || !validation.user) {
      return null;
    }

    const user = await this.userRepository.findById(validation.user.id);

    return user;
  }

  /**
   * Check rate limit for login attempts
   */
  private checkRateLimit(email: string): { allowed: boolean; lockUntil?: Date } {
    const entry = loginRateLimits.get(email);

    if (!entry) {
      return { allowed: true };
    }

    // Check if currently locked
    if (entry.lockUntil && entry.lockUntil > new Date()) {
      return { allowed: false, lockUntil: entry.lockUntil };
    }

    // Clear expired lock
    if (entry.lockUntil && entry.lockUntil <= new Date()) {
      entry.attempts = 0;
      entry.lockUntil = undefined;
    }

    return { allowed: true };
  }

  /**
   * Record failed login attempt
   */
  private recordFailedAttempt(email: string): void {
    const entry = loginRateLimits.get(email) || {
      attempts: 0,
      lastAttempt: new Date(),
    };

    entry.attempts++;
    entry.lastAttempt = new Date();

    // Lock if max attempts reached
    if (entry.attempts >= this.config.maxFailedAttempts) {
      entry.lockUntil = new Date(Date.now() + this.config.lockDurationMinutes * 60 * 1000);
    }

    loginRateLimits.set(email, entry);
  }

  /**
   * Get remaining attempts before lock
   */
  private getRemainingAttempts(email: string): number {
    const entry = loginRateLimits.get(email);
    if (!entry) {
      return this.config.maxFailedAttempts;
    }

    return Math.max(0, this.config.maxFailedAttempts - entry.attempts);
  }

  /**
   * Clear rate limit entry (on successful login)
   */
  private clearRateLimit(email: string): void {
    loginRateLimits.delete(email);
  }

  /**
   * Get error message for user status
   */
  private getStatusErrorMessage(status: string): string {
    switch (status) {
      case 'inactive':
        return 'Your account is inactive. Please contact an administrator.';
      case 'suspended':
        return 'Your account has been suspended. Please contact an administrator.';
      case 'pending':
        return 'Your account is pending activation.';
      default:
        return 'Your account is not active.';
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): AuthServiceConfig {
    return { ...this.config };
  }
}

/**
 * Create a singleton instance
 */
let authServiceInstance: AuthService | null = null;

/**
 * Initialize authentication service with dependencies
 *
 * @param userRepository - User repository instance
 * @param jwtService - JWT service instance
 * @param passwordService - Password service instance
 * @param sessionService - Session service instance
 * @param config - Partial configuration (uses defaults for unspecified)
 * @returns Authentication service instance
 */
export function initializeAuthService(
  userRepository: IUserRepository,
  jwtService: JWTService,
  passwordService: PasswordService,
  sessionService: SessionService,
  config?: Partial<AuthServiceConfig>
): AuthService {
  authServiceInstance = new AuthService(
    userRepository,
    jwtService,
    passwordService,
    sessionService,
    config
  );

  return authServiceInstance;
}

/**
 * Get the authentication service instance
 *
 * @throws Error if service not initialized
 * @returns Authentication service instance
 */
export function getAuthService(): AuthService {
  if (!authServiceInstance) {
    throw new Error('AuthService not initialized. Call initializeAuthService first.');
  }

  return authServiceInstance;
}

/**
 * Export the authentication service class for dependency injection
 */
export default AuthService;
