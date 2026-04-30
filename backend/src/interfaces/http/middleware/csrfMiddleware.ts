/**
 * CSRF Middleware
 *
 * Simple CSRF protection for state-changing operations.
 * Uses session-based tokens for validation.
 *
 * @module interfaces/http/middleware/csrfMiddleware
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Validate CSRF token for state-changing operations
 *
 * Checks that the CSRF token in the request body matches
 * the token stored in the session.
 *
 * @param req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export function validateCSRF(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF validation for GET requests (they should not modify state)
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  // Get CSRF token from request body or header
  const tokenFromBody = req.body?._csrf || req.body?.csrfToken;
  const tokenFromHeader = req.headers['x-csrf-token'] as string;
  const token = tokenFromBody || tokenFromHeader;

  // Get expected token from session
  const sessionToken = req.session?.csrfToken;

  // Validate token
  if (!sessionToken || !token || token !== sessionToken) {
    // Token mismatch - reject request
    return res.status(403).json({
      error: 'CSRF token validation failed',
      message: 'The form has expired. Please refresh and try again.',
    });
  }

  // Token is valid, proceed
  next();
}

/**
 * Express middleware wrapper for CSRF validation
 */
export function csrfMiddleware(req: Request, res: Response, next: NextFunction): void {
  validateCSRF(req, res, next);
}

export default csrfMiddleware;
