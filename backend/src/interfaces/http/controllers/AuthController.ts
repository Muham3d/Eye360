/**
 * Authentication Controller
 *
 * Thin controller for authentication endpoints.
 * Handles HTTP requests/responses and delegates to AuthService.
 *
 * @module interfaces/http/controllers
 */

import { Request, Response, NextFunction } from 'express';
import { getAuthService } from '@core/services/index.js';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/authMiddleware';

/**
 * Standard API response format
 */
interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Auth Controller Class
 */
export class AuthController {
  /**
   * POST /api/auth/register
   * Register a new user (Admin only)
   */
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authService = getAuthService();
    const createdBy = (req as AuthenticatedRequest).user?.id;

    if (!createdBy) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authentication required',
        },
      });
      return;
    }

    const user = await authService.registerUser(req.body, createdBy);

    const response: ApiResponse = {
      success: true,
      data: { user },
      message: 'User registered successfully',
    };

    res.status(201).json(response);
  });

  /**
   * POST /api/auth/login
   * Login endpoint (supports both mobile JWT and web session)
   */
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authService = getAuthService();
    const { email, password } = req.body;

    // Detect login type from headers
    // Mobile: Authorization header will be set in future requests
    // Web: Session cookie will be used
    const isMobile = req.headers['x-client-type'] === 'mobile';

    if (isMobile) {
      // Mobile login - return JWT tokens
      const result = await authService.loginMobile({ email, password });

      if (!result.success) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_002',
            message: result.error || 'Authentication failed',
            details: {
              accountLocked: result.accountLocked,
              accountLockedUntil: result.accountLockedUntil,
              remainingAttempts: result.remainingAttempts,
            },
          },
        });
        return;
      }

      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
          tokens: result.tokens,
        },
        message: 'Login successful',
      };

      res.status(200).json(response);
    } else {
      // Web login - create session
      const result = await authService.loginWeb({ email, password });

      if (!result.success) {
        res.status(401).json({
          success: false,
          error: {
            code: 'AUTH_002',
            message: result.error || 'Authentication failed',
            details: {
              accountLocked: result.accountLocked,
              accountLockedUntil: result.accountLockedUntil,
              remainingAttempts: result.remainingAttempts,
            },
          },
        });
        return;
      }

      // Set session cookie for web
      if (req.session && result.sessionToken) {
        req.session.token = result.sessionToken;
        req.session.user = {
          id: result.user!.id,
          email: result.user!.email,
          role: result.user!.roleName,
        };
      }

      const response: ApiResponse = {
        success: true,
        data: {
          user: result.user,
        },
        message: 'Login successful',
      };

      res.status(200).json(response);
    }
  });

  /**
   * POST /api/auth/logout
   * Logout endpoint
   */
  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authService = getAuthService();
    const isMobile = req.headers['x-client-type'] === 'mobile';

    if (isMobile) {
      // Mobile logout - revoke JWT tokens
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : '';
      const { refreshToken } = req.body;

      await authService.logoutMobile(accessToken, refreshToken);

      res.status(200).json({
        success: true,
        data: null,
        message: 'Logout successful',
      });
    } else {
      // Web logout - destroy session
      if (req.session) {
        const sessionToken = req.session.token;
        if (sessionToken) {
          await authService.logoutWeb(sessionToken);
        }
        req.session.destroy((err) => {
          if (err) {
            console.error('Error destroying session:', err);
          }
        });
      }

      res.clearCookie('connect.sid');
      res.status(200).json({
        success: true,
        data: null,
        message: 'Logout successful',
      });
    }
  });

  /**
   * POST /api/auth/refresh
   * Refresh JWT access token
   */
  refresh = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authService = getAuthService();
    const { refreshToken } = req.body;

    const result = await authService.refreshTokens(refreshToken);

    if (!result.success) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_003',
          message: result.error || 'Token refresh failed',
        },
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        tokens: result.tokens,
      },
      message: 'Token refreshed successfully',
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/auth/forgot-password
   * Request password reset
   */
  forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authService = getAuthService();
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      data: {
        // Don't include resetToken in production (send via email)
        expiresAt: result.expiresAt,
      },
      message: 'If an account exists with this email, a password reset link has been sent',
    });
  });

  /**
   * POST /api/auth/reset-password
   * Reset password with token
   */
  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authService = getAuthService();
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: {
          code: 'AUTH_004',
          message: result.error || 'Password reset failed',
        },
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: null,
      message: 'Password reset successfully',
    });
  });

  /**
   * GET /api/auth/me
   * Get current user profile
   */
  getProfile = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authService = getAuthService();
    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authentication required',
        },
      });
      return;
    }

    const result = await authService.getUserProfile(userId);

    if (result.error) {
      res.status(404).json({
        success: false,
        error: {
          code: 'AUTH_005',
          message: result.error,
        },
      });
      return;
    }

    const response: ApiResponse = {
      success: true,
      data: {
        user: result.user,
        role: result.role,
        permissions: result.permissions,
      },
    };

    res.status(200).json(response);
  });

  /**
   * POST /api/auth/change-password
   * Change authenticated user password
   */
  changePassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authService = getAuthService();
    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authentication required',
        },
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(userId, currentPassword, newPassword);

    res.status(200).json({
      success: true,
      data: null,
      message: 'Password changed successfully',
    });
  });

  /**
   * POST /api/auth/logout-all
   * Logout from all devices
   */
  logoutAll = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const authService = getAuthService();
    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTH_001',
          message: 'Authentication required',
        },
      });
      return;
    }

    const currentSessionToken = req.session?.token;
    const revokedCount = await authService.logoutAll(userId, currentSessionToken);

    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });
    }

    res.clearCookie('connect.sid');
    res.status(200).json({
      success: true,
      data: {
        revokedCount,
      },
      message: `Logged out from ${revokedCount} session(s)`,
    });
  });
}

export default new AuthController();
