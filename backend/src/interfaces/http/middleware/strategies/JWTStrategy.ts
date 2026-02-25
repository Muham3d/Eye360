/**
 * Passport JWT Strategy
 *
 * Passport.js strategy for JWT-based authentication used by the mobile API.
 * This strategy validates JWT tokens from the Authorization header and
 * attaches the authenticated user to the request object.
 *
 * @module interfaces/http/middleware/strategies/JWTStrategy
 */

import { Strategy as JwtStrategy, ExtractJwt, StrategyOptions } from 'passport-jwt';
import { Request } from 'express';
import { PassportStatic } from 'passport';
import { JWTService, getJWTService } from '../../../../core/services/JWTService.js';
import { IUserRepository } from '../../../../core/domain/repositories/IUserRepository.js';
import { AuthenticationError } from '../../../../core/domain/errors/AuthenticationError.js';
import { UnauthorizedError } from '../../../../core/domain/errors/UnauthorizedError.js';
import { NotFoundError } from '../../../../core/domain/errors/NotFoundError.js';

/**
 * Authenticated user attached to request
 */
export interface AuthenticatedUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  status: string;
  roleId: number;
  roleName: string;
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  tokenPayload?: {
    sub: number;
    email: string;
    roleId: number;
    roleName: string;
    type: 'access' | 'refresh';
  };
}

/**
 * JWT Strategy configuration options
 */
export interface JWTStrategyOptions {
  jwtFromRequest?: ((req: Request) => string | null) | string;
  secretOrKey?: string;
  secretOrKeyProvider?: (
    request: Request,
    rawJwtToken: string,
    done: (err: Error | null, secret?: string) => void
  ) => void;
  issuer?: string;
  audience?: string;
  algorithms?: string[];
  passReqToCallback?: boolean;
}

/**
 * Default JWT configuration
 */
const DEFAULT_OPTIONS: Partial<JWTStrategyOptions> = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  passReqToCallback: true,
};

/**
 * Custom JWT extraction function
 * Extracts JWT from Authorization header or query parameter
 */
export function customJwtExtractor(req: Request): string | null {
  // Try Authorization header first
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try query parameter (for websocket connections)
  if (req.query && typeof req.query.token === 'string') {
    return req.query.token;
  }

  return null;
}

/**
 * Configure and register JWT strategy with Passport
 *
 * @param passport - Passport instance
 * @param userRepository - User repository for fetching user data
 * @param jwtService - JWT service instance (optional, uses singleton if not provided)
 * @param options - Strategy configuration options (optional)
 */
export function configureJWTStrategy(
  passport: PassportStatic,
  userRepository: IUserRepository,
  jwtService?: JWTService,
  options: Partial<JWTStrategyOptions> = {}
): void {
  const service = jwtService || getJWTService();

  // Merge options with defaults
  const strategyOptions: StrategyOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
    jwtFromRequest:
      typeof options.jwtFromRequest === 'string'
        ? options.jwtFromRequest
        : options.jwtFromRequest || ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: options.secretOrKey || process.env.JWT_SECRET,
    issuer: options.issuer || process.env.JWT_ISSUER || 'patrolmanager',
    audience: options.audience || process.env.JWT_AUDIENCE || 'patrolmanager-api',
    algorithms: options.algorithms || ['HS256'],
    passReqToCallback: options.passReqToCallback !== false,
  };

  // Create the strategy
  const strategy = new JwtStrategy(
    strategyOptions,
    async (
      req: Request,
      payload: {
        sub: number;
        email: string;
        roleId: number;
        roleName: string;
        type: 'access' | 'refresh';
        iat: number;
        exp: number;
        iss: string;
        aud: string;
      },
      done: (error: Error | null, user?: Express.User | false, info?: any) => void
    ) => {
      try {
        // Verify token type (reject refresh tokens for API access)
        if (payload.type !== 'access') {
          return done(new AuthenticationError('Invalid token type. Access token required.'), false);
        }

        // Attach token payload to request for use in controllers
        (req as AuthenticatedRequest).tokenPayload = payload;

        // Fetch user from database
        const user = await userRepository.findById(payload.sub);

        if (!user) {
          return done(new NotFoundError('User', payload.sub.toString()), false);
        }

        // Check if user account is active
        if (user.status !== 'active') {
          return done(new AuthenticationError('User account is not active'), false);
        }

        // Check if account is locked
        const userWithLock = await userRepository.findById(payload.sub);
        if (userWithLock && (userWithLock as any).account_locked_until) {
          const lockedUntil = new Date((userWithLock as any).account_locked_until);
          if (lockedUntil > new Date()) {
            return done(new AuthenticationError('Account is temporarily locked'), false);
          }
        }

        // Attach authenticated user to request
        const authenticatedUser: AuthenticatedUser = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          status: user.status,
          roleId: user.roleId,
          roleName: user.roleName,
        };

        (req as AuthenticatedRequest).user = authenticatedUser;

        return done(null, authenticatedUser);
      } catch (error) {
        return done(error instanceof Error ? error : new Error(String(error)), false);
      }
    }
  );

  // Register the strategy
  passport.use('jwt', strategy);

  // Serialize user (for session support if needed)
  passport.serializeUser((user: Express.User, done) => {
    done(null, user);
  });

  // Deserialize user
  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });
}

/**
 * Authentication middleware factory using JWT strategy
 *
 * @param passport - Passport instance
 * @returns Express middleware function
 */
export function authenticateJWT(passport: PassportStatic) {
  return passport.authenticate('jwt', { session: false });
}

/**
 * Optional authentication middleware factory
 * Attaches user to request if token is valid, but doesn't reject if missing
 *
 * @param passport - Passport instance
 * @returns Express middleware function
 */
export function optionalAuthenticateJWT(passport: PassportStatic) {
  return (req: Request, res: any, next: any) => {
    passport.authenticate('jwt', { session: false }, (err: Error | null, user: Express.User | false) => {
      if (err) {
        return next(err);
      }

      // Attach user if found, but continue anyway
      if (user) {
        (req as AuthenticatedRequest).user = user as AuthenticatedUser;
      }

      next();
    })(req, res, next);
  };
}

/**
 * Require specific role middleware factory
 *
 * @param allowedRoles - Array of role names that are allowed
 * @returns Express middleware function
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: any, next: any) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(user.roleName)) {
      return next(
        new UnauthorizedError(
          `Access denied. Required role: ${allowedRoles.join(' or ')}`
        )
      );
    }

    next();
  };
}

/**
 * Require permission middleware factory
 *
 * @param resource - Resource name
 * @param action - Action name
 * @param userRepository - User repository for checking permissions
 * @returns Express middleware function
 */
export function requirePermission(resource: string, action: string, userRepository: IUserRepository) {
  return async (req: Request, res: any, next: any) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    // Check if user has the required permission
    const hasPermission = await userRepository.userHasPermission(user.id, resource, action);

    if (!hasPermission) {
      return next(
        new UnauthorizedError(
          `Access denied. Required permission: ${resource}:${action}`
        )
      );
    }

    next();
  };
}

/**
 * Refresh token strategy factory
 * Validates refresh tokens (separate from access tokens)
 *
 * @param passport - Passport instance
 * @param userRepository - User repository
 * @param jwtService - JWT service instance (optional)
 * @returns Configured strategy name
 */
export function configureRefreshTokenStrategy(
  passport: PassportStatic,
  userRepository: IUserRepository,
  jwtService?: JWTService
): string {
  const service = jwtService || getJWTService();
  const strategyName = 'jwt-refresh';

  const strategy = new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      issuer: process.env.JWT_ISSUER || 'patrolmanager',
      audience: process.env.JWT_AUDIENCE || 'patrolmanager-api',
      algorithms: ['HS256'],
      passReqToCallback: true,
    },
    async (
      req: Request,
      payload: {
        sub: number;
        email: string;
        roleId: number;
        roleName: string;
        type: 'access' | 'refresh';
      },
      done: (error: Error | null, user?: Express.User | false) => void
    ) => {
      try {
        // Verify this is a refresh token
        if (payload.type !== 'refresh') {
          return done(new AuthenticationError('Invalid token type. Refresh token required.'), false);
        }

        // Fetch user
        const user = await userRepository.findById(payload.sub);

        if (!user || user.status !== 'active') {
          return done(new AuthenticationError('Invalid or inactive user'), false);
        }

        return done(null, user);
      } catch (error) {
        return done(error instanceof Error ? error : new Error(String(error)), false);
      }
    }
  );

  passport.use(strategyName, strategy);

  return strategyName;
}

/**
 * Export JWT strategy utilities
 */
export default {
  configureJWTStrategy,
  authenticateJWT,
  optionalAuthenticateJWT,
  requireRole,
  requirePermission,
  configureRefreshTokenStrategy,
  customJwtExtractor,
};
