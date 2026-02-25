/**
 * Passport Strategies Index
 *
 * Exports all Passport.js authentication strategies.
 *
 * @module interfaces/http/middleware/strategies
 */

// JWT Strategy (for mobile API)
export {
  configureJWTStrategy,
  authenticateJWT,
  optionalAuthenticateJWT,
  requireRole as requireRoleJWT,
  requirePermission as requirePermissionJWT,
  configureRefreshTokenStrategy,
  customJwtExtractor,
} from './JWTStrategy.js';

export type {
  AuthenticatedUser,
  AuthenticatedRequest,
  JWTStrategyOptions,
} from './JWTStrategy.js';

// Session Strategy (for web admin panel)
export {
  configureLocalStrategy,
  configureSessionSerialization,
  authenticateLocal,
  authenticateLocalAPI,
  authenticateSession,
  authenticateSessionAPI,
  optionalAuthenticateSession,
  requireRole as requireRoleSession,
  requirePermission as requirePermissionSession,
  validateSession,
} from './SessionStrategy.js';

export type {
  SessionUser,
  SessionAuthenticatedRequest,
  LoginCredentials,
  SessionStrategyOptions,
} from './SessionStrategy.js';
