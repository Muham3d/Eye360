/**
 * Web Authentication Middleware
 *
 * Middleware for protecting web routes with session-based authentication.
 *
 * @module interfaces/web/middleware/webAuthMiddleware
 */

import { UnauthorizedError } from '@core/domain/errors/index.js';
import { setFlashMessage } from '../config/ejs.js';
import { getSessionService } from '@core/services/index.js';

/**
 * Enhanced request type with session user
 */
export interface WebAuthenticatedRequest extends Request {
  session?: {
    user?: {
      id: number;
      email: string;
      firstName?: string;
      lastName?: string;
      role: string;
    };
    token?: string;
    returnTo?: string;
    email?: string;
    cookie?: {
      maxAge?: number;
    };
  };
}

/**
 * Require authentication for web routes
 * Redirects to login page if user is not authenticated
 * Stores original URL for post-login redirect
 */
export function requireAuth(req: WebAuthenticatedRequest, res: any, next: any): void {
  if (req.session?.user) {
    return next();
  }

  // Store original URL for redirect after login
  // Only set if session object exists (may be undefined if session middleware not initialized)
  if (req.session && typeof req.session === 'object') {
    (req.session as any).returnTo = req.originalUrl;
  }
  setFlashMessage(req, 'warning', 'Please log in to access this page');
  return res.redirect('/login');
}

/**
 * Optional authentication for web routes
 * Attaches user to res.locals if authenticated, but doesn't require it
 */
export function optionalAuth(req: WebAuthenticatedRequest, res: any, next: any): void {
  if (req.session?.user) {
    res.locals.currentUser = req.session.user;
  }
  next();
}

/**
 * Require specific role(s) for web routes
 * Redirects to dashboard with error if user doesn't have required role
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: WebAuthenticatedRequest, res: any, next: any): void => {
    if (!req.session?.user) {
      if (req.session && typeof req.session === 'object') {
        (req.session as any).returnTo = req.originalUrl;
      }
      setFlashMessage(req, 'warning', 'Please log in to access this page');
      return res.redirect('/login');
    }

    if (!allowedRoles.includes(req.session.user.role)) {
      setFlashMessage(req, 'error', 'You do not have permission to access this page');
      return res.redirect('/');
    }

    next();
  };
}

/**
 * Redirect authenticated users away from auth pages
 * Use on login, register, forgot-password pages
 */
export function redirectIfAuthenticated(req: WebAuthenticatedRequest, res: any, next: any): void {
  if (req.session?.user) {
    return res.redirect('/');
  }
  next();
}

/**
 * Attach current user to response locals
 * Makes user info available in all templates
 */
export function attachCurrentUser(req: WebAuthenticatedRequest, res: any, next: any): void {
  res.locals.currentUser = req.session?.user || null;
  res.locals.currentPath = req.path || req.originalUrl || '/';
  next();
}

/**
 * Check if user account is active
 * TODO: Implement account status checks
 */
export function requireActiveAccount(req: WebAuthenticatedRequest, res: any, next: any): void {
  if (!req.session?.user) {
    return next();
  }

  // TODO: Check account status from database
  // For now, just pass through
  next();
}

/**
 * Validate session and redirect if expired
 * TODO: Implement session validation
 */
export async function validateSession(req: WebAuthenticatedRequest, res: any, next: any): Promise<void> {
  if (!req.session?.user || !req.session?.token) {
    return next();
  }

  try {
    const sessionService = getSessionService();
    const result = await sessionService.validateSession(req.session.token);

    if (!result.valid) {
      // Clear session data if invalid
      if (req.session) {
        // We use req.session.user = null instead of destroy() because destroy() is async
        // and may cause issues if not handled carefully in middleware.
        // Also, we want to keep flash messages for the next request.
        req.session.user = undefined;
        req.session.token = undefined;
      }

      setFlashMessage(req, 'warning', 'Your session has expired. Please log in again.');
      return res.redirect('/login');
    }

    // Update session user with latest data from database
    if (result.user) {
      req.session.user = {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.roleName,
      };
    }

    next();
  } catch (error) {
    next(error);
  }
}

export default {
  requireAuth,
  optionalAuth,
  requireRole,
  redirectIfAuthenticated,
  attachCurrentUser,
  requireActiveAccount,
  validateSession,
};
