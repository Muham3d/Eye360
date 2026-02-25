/**
 * Passport Session Strategy
 *
 * Passport.js strategy for session-based authentication used by the web admin panel.
 * This strategy validates user sessions and attaches the authenticated user to the request object.
 *
 * @module interfaces/http/middleware/strategies/SessionStrategy
 */

import { Strategy as LocalStrategy } from 'passport-local';
// Note: Anonymous strategy removed - use optionalAuthenticateSession for public routes instead
import { Request } from 'express';
import { PassportStatic } from 'passport';
import { SessionService, getSessionService } from '../../../../core/services/SessionService.js';
import { IUserRepository } from '../../../../core/domain/repositories/IUserRepository.js';
import { PasswordService, getPasswordService } from '../../../../core/services/PasswordService.js';
import { AuthenticationError } from '../../../../core/domain/errors/AuthenticationError.js';
import { UnauthorizedError } from '../../../../core/domain/errors/UnauthorizedError.js';
import { NotFoundError } from '../../../../core/domain/errors/NotFoundError.js';
import { ValidationError } from '../../../../core/domain/errors/ValidationError.js';

/**
 * Authenticated user attached to request (web session)
 */
export interface SessionUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  roleId: number;
  roleName: string;
  sessionId: number;
  sessionToken: string;
}

/**
 * Extended Express Request with authenticated user (session-based)
 */
export interface SessionAuthenticatedRequest extends Request {
  user?: SessionUser;
  sessionID?: string;
}

/**
 * Local login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Session strategy configuration options
 */
export interface SessionStrategyOptions {
  usernameField?: string;
  passwordField?: string;
  session?: boolean;
  passReqToCallback?: boolean;
}

/**
 * Default session strategy configuration
 */
const DEFAULT_OPTIONS: SessionStrategyOptions = {
  usernameField: 'email',
  passwordField: 'password',
  session: true,
  passReqToCallback: true,
};

/**
 * Configure Local Strategy for username/password login
 *
 * @param passport - Passport instance
 * @param userRepository - User repository for fetching user data
 * @param passwordService - Password service for verifying passwords (optional)
 * @param options - Strategy configuration options (optional)
 */
export function configureLocalStrategy(
  passport: PassportStatic,
  userRepository: IUserRepository,
  passwordService?: PasswordService,
  options: SessionStrategyOptions = {}
): void {
  const pwdService = passwordService || getPasswordService();

  // Merge options with defaults
  const strategyOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  // Create the local strategy
  const localStrategy = new LocalStrategy(
    strategyOptions,
    async (
      req: Request,
      username: string,
      password: string,
      done: (error: Error | null, user?: Express.User | false, options?: any) => void
    ) => {
      try {
        // Normalize email
        const email = username.toLowerCase().trim();

        // Find user with password hash
        const userWithPassword = await userRepository.findByEmailWithPassword(email);

        if (!userWithPassword) {
          return done(null, false, {
            message: 'Invalid email or password',
          });
        }

        // Check if account is locked
        if (userWithPassword.account_locked_until && userWithPassword.account_locked_until > new Date()) {
          return done(null, false, {
            message: 'Account is temporarily locked due to too many failed login attempts',
            lockUntil: userWithPassword.account_locked_until,
          });
        }

        // Check user status
        if (userWithPassword.status !== 'active') {
          return done(null, false, {
            message: getStatusErrorMessage(userWithPassword.status),
          });
        }

        // Verify password
        const isPasswordValid = await pwdService.comparePassword(
          password,
          userWithPassword.passwordHash
        );

        if (!isPasswordValid) {
          // Increment failed login attempts
          const attempts = await userRepository.incrementFailedLoginAttempts(userWithPassword.id);

          // Lock account if max attempts reached
          if (attempts >= 5) {
            await userRepository.lockAccount(userWithPassword.id, 15);

            return done(null, false, {
              message: 'Account locked due to too many failed login attempts',
              accountLocked: true,
            });
          }

          return done(null, false, {
            message: 'Invalid email or password',
            remainingAttempts: 5 - attempts,
          });
        }

        // Reset failed attempts on successful login
        await userRepository.resetFailedLoginAttempts(userWithPassword.id);

        // Update last login timestamp
        await userRepository.updateLastLogin(userWithPassword.id);

        // Remove password hash from user object
        const { passwordHash: _, ...user } = userWithPassword;

        return done(null, user);
      } catch (error) {
        return done(error instanceof Error ? error : new Error(String(error)));
      }
    }
  );

  // Register the strategy
  passport.use('local', localStrategy);
}

/**
 * Note: Anonymous strategy removed - use optionalAuthenticateSession for public routes instead
 */

/**
 * Configure session serialization and deserialization
 *
 * @param passport - Passport instance
 * @param userRepository - User repository for fetching user data
 * @param sessionService - Session service for validating sessions (optional)
 */
export function configureSessionSerialization(
  passport: PassportStatic,
  userRepository: IUserRepository,
  sessionService?: SessionService
): void {
  const sessService = sessionService || getSessionService();

  // Serialize user into session
  passport.serializeUser((user: Express.User, done) => {
    // Store minimal data in session
    done(null, {
      id: (user as any).id,
      email: (user as any).email,
    });
  });

  // Deserialize user from session
  passport.deserializeUser(async (sessionUser: any, done) => {
    try {
      // Fetch full user data from database
      const user = await userRepository.findById(sessionUser.id);

      if (!user) {
        return done(null, false);
      }

      // Check if user is still active
      if (user.status !== 'active') {
        return done(null, false);
      }

      // Attach session info to user
      const sessionUserFull: SessionUser = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        status: user.status,
        roleId: user.roleId,
        roleName: user.roleName,
        sessionId: 0, // Will be populated by session middleware
        sessionToken: '',
      };

      done(null, sessionUserFull);
    } catch (error) {
      done(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * Authentication middleware factory using local strategy
 *
 * @param passport - Passport instance
 * @returns Express middleware function
 */
export function authenticateLocal(passport: PassportStatic) {
  return passport.authenticate('local', {
    failureRedirect: '/login',
    failureFlash: true,
    badRequestMessage: 'Missing email or password',
  });
}

/**
 * API authentication middleware factory using local strategy (returns JSON)
 *
 * @param passport - Passport instance
 * @returns Express middleware function
 */
export function authenticateLocalAPI(passport: PassportStatic) {
  return passport.authenticate('local', {
    session: false,
    failWithError: true,
  });
}

/**
 * Session authentication middleware factory
 * Ensures user is authenticated via session
 *
 * @param passport - Passport instance
 * @returns Express middleware function
 */
export function authenticateSession(passport: PassportStatic) {
  return passport.authenticate('session', {
    failureRedirect: '/login',
  });
}

/**
 * API session authentication middleware factory (returns JSON)
 *
 * @param passport - Passport instance
 * @returns Express middleware function
 */
export function authenticateSessionAPI(passport: PassportStatic) {
  return (req: Request, res: any, next: any) => {
    passport.authenticate('session', { session: false }, (err: Error | null, user: Express.User | false) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized. Please login.',
        });
      }

      req.user = user;
      next();
    })(req, res, next);
  };
}

/**
 * Optional authentication middleware factory
 * Attaches user to request if session is valid, but doesn't reject if missing
 *
 * @param passport - Passport instance
 * @returns Express middleware function
 */
export function optionalAuthenticateSession(passport: PassportStatic) {
  return (req: Request, res: any, next: any) => {
    passport.authenticate('session', { session: false }, (err: Error | null, user: Express.User | false) => {
      if (err) {
        return next(err);
      }

      // Attach user if found, but continue anyway
      if (user) {
        req.user = user;
      }

      next();
    })(req, res, next);
  };
}

/**
 * Require specific role middleware factory (session-based)
 *
 * @param allowedRoles - Array of role names that are allowed
 * @returns Express middleware function
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: any, next: any) => {
    const user = req.user as SessionUser;

    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(user.roleName)) {
      return next(
        new UnauthorizedError(`Access denied. Required role: ${allowedRoles.join(' or ')}`)
      );
    }

    next();
  };
}

/**
 * Require permission middleware factory (session-based)
 *
 * @param resource - Resource name
 * @param action - Action name
 * @param userRepository - User repository for checking permissions
 * @returns Express middleware function
 */
export function requirePermission(resource: string, action: string, userRepository: IUserRepository) {
  return async (req: Request, res: any, next: any) => {
    const user = req.user as SessionUser;

    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Check if user has the required permission
    const hasPermission = await userRepository.userHasPermission(user.id, resource, action);

    if (!hasPermission) {
      return next(
        new UnauthorizedError(`Access denied. Required permission: ${resource}:${action}`)
      );
    }

    next();
  };
}

/**
 * Session validation middleware
 * Validates session using SessionService
 *
 * @param sessionService - Session service instance (optional)
 * @returns Express middleware function
 */
export function validateSession(sessionService?: SessionService) {
  const sessService = sessionService || getSessionService();

  return async (req: SessionAuthenticatedRequest, res: any, next: any) => {
    const sessionToken = req.sessionID || req.headers['x-session-token'] as string;

    if (!sessionToken) {
      return next(new UnauthorizedError('No session found'));
    }

    try {
      const validation = await sessService.validateSession(sessionToken);

      if (!validation.valid) {
        // Clear invalid session
        req.session?.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });

        return next(new UnauthorizedError(validation.error || 'Invalid session'));
      }

      // Attach validated user to request
      if (validation.user) {
        req.user = {
          ...validation.user,
          sessionId: validation.session?.id || 0,
          sessionToken,
        } as SessionUser;
      }

      next();
    } catch (error) {
      next(error instanceof Error ? error : new Error(String(error)));
    }
  };
}

/**
 * Get error message for user status
 */
function getStatusErrorMessage(status: string): string {
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
 * Export Session strategy utilities
 */
export default {
  configureLocalStrategy,
  configureAnonymousStrategy,
  configureSessionSerialization,
  authenticateLocal,
  authenticateLocalAPI,
  authenticateSession,
  authenticateSessionAPI,
  optionalAuthenticateSession,
  requireRole,
  requirePermission,
  validateSession,
};
