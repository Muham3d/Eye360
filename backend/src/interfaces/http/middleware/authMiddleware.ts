/**
 * Authentication Middleware
 *
 * Validates JWT tokens and Express sessions for API and Web routes.
 *
 * @module interfaces/http/middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '@infrastructure/config/env.js';
import { UnauthorizedError, ForbiddenError } from '@core/domain/errors/index.js';

/**
 * User information attached to request by auth middleware
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    sessionId?: string;
  };
  sessionUser?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * JWT payload structure
 */
interface JWTPayload {
  sub: number;
  email: string;
  role: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Extract JWT token from request
 */
function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return null;
}

/**
 * Verify JWT token and return payload
 */
function verifyToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, config.jwt.secret) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw UnauthorizedError.expiredToken();
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw UnauthorizedError.invalidToken();
    }
    throw UnauthorizedError.invalidToken();
  }
}

/**
 * JWT authentication middleware for API routes
 * Validates Bearer token from Authorization header
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req);

    if (!token) {
      throw UnauthorizedError.missingToken();
    }

    const payload = verifyToken(token);

    // Attach user info to request
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
    };

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional authentication middleware
 * Attaches user info if token is present, but doesn't require it
 */
export function optionalAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  try {
    const token = extractToken(req);

    if (token) {
      const payload = verifyToken(token);
      req.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        sessionId: payload.sessionId,
      };
    }

    next();
  } catch (error) {
    // Silent fail for optional auth
    next();
  }
}

/**
 * Role-based authorization middleware factory
 * Creates middleware that checks if user has required role
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(UnauthorizedError.missing());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        ForbiddenError.insufficientRole(
          allowedRoles.join(' or '),
          req.user.role
        )
      );
    }

    next();
  };
}

/**
 * Session authentication middleware for web routes
 * Validates Express session for admin panel
 */
export function sessionAuthMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.session || !req.session.user) {
    return next(UnauthorizedError.sessionExpired());
  }

  req.sessionUser = req.session.user;
  next();
}

/**
 * TODO: Implement refresh token validation
 * TODO: Add device fingerprinting for enhanced security
 * TODO: Implement IP-based rate limiting per user
 */
