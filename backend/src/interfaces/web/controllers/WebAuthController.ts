/**
 * Web Authentication Controller
 *
 * Handles authentication for the admin web panel.
 * Renders auth pages and processes form submissions using fetch API.
 *
 * @module interfaces/web/controllers/WebAuthController
 */

import { Request, Response, NextFunction } from 'express';
import { setFlashMessage, renderView } from '../config/ejs.js';
import { getAuthService } from '../../../core/services/index.js';

/**
 * Web Auth Controller
 */
export class WebAuthController {
  /**
   * GET /login
   * Render login page
   */
  getLogin = (req: Request, res: Response): void => {
    // Redirect if already authenticated
    const session = req.session as any;
    if (session?.user) {
      return res.redirect('/');
    }

    renderView(res, 'auth/login', {
      title: 'Sign In - PatrolManager',
      email: session?.email || '',
      csrfToken: (req as any).csrfToken?.() || '',
      currentPath: '/login',
    });
  };

  /**
   * POST /login
   * Handle login form submission
   */
  postLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, remember } = req.body;
      const session = req.session as any;

      // Validate input
      if (!email || !password) {
        if (session) {
          session.email = email;
        }
        setFlashMessage(req, 'error', 'Please enter both email and password');
        return res.redirect('/login');
      }

      const authService = getAuthService();
      const result = await authService.loginWeb({ email, password });

      if (!result.success) {
        if (session) {
          session.email = email;
        }

        // Handle specific error messages
        if (result.accountLocked) {
          const lockedUntil = result.accountLockedUntil
            ? new Date(result.accountLockedUntil).toLocaleString()
            : '30 minutes';
          setFlashMessage(
            req,
            'error',
            `Account has been locked due to too many failed attempts. Please try again after ${lockedUntil}.`
          );
        } else if (result.remainingAttempts !== undefined) {
          setFlashMessage(
            req,
            'error',
            `Invalid email or password. ${result.remainingAttempts} attempt(s) remaining.`
          );
        } else {
          setFlashMessage(req, 'error', result.error || 'Invalid email or password');
        }

        return res.redirect('/login');
      }

      // Set session
      const maxAge = remember ? 30 * 24 * 60 * 60 * 1000 : undefined; // 30 days or session default

      if (session) {
        session.token = result.sessionToken;
        session.user = {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.roleName,
        };

        if (maxAge && session.cookie) {
          session.cookie.maxAge = maxAge;
        }

        // Save session explicitly before redirect
        await new Promise<void>((resolve, reject) => {
          session.save((err: any) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      // Redirect to original URL or dashboard
      const redirectTo = session?.returnTo || '/';
      if (session) {
        delete session.returnTo;
      }

      setFlashMessage(req, 'success', 'Welcome back! You have successfully signed in.');
      res.redirect(redirectTo);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /logout
   * Handle logout
   */
  postLogout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = req.session as any;
      const sessionToken = session?.token;

      if (sessionToken) {
        const authService = getAuthService();
        await authService.logoutWeb(sessionToken);
      }

      // Destroy session
      if (session) {
        await new Promise<void>((resolve) => {
          session.destroy((err: any) => {
            if (err) {
              console.error('Error destroying session:', err);
            }
            resolve();
          });
        });
      }

      res.clearCookie('connect.sid');
      setFlashMessage(req, 'success', 'You have been logged out successfully.');
      res.redirect('/login');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /forgot-password
   * Render forgot password page
   */
  getForgotPassword = (req: Request, res: Response): void => {
    renderView(res, 'auth/forgot-password', {
      title: 'Forgot Password - PatrolManager',
      email: req.query.email || '',
      csrfToken: (req as any).csrfToken?.() || '',
      currentPath: '/forgot-password',
    });
  };

  /**
   * POST /forgot-password
   * Handle forgot password form submission
   */
  postForgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        setFlashMessage(req, 'error', 'Please enter your email address');
        return res.redirect('/forgot-password');
      }

      const authService = getAuthService();
      await authService.forgotPassword(email);

      // Always show success to prevent email enumeration
      setFlashMessage(
        req,
        'success',
        'If an account exists with this email, a password reset link has been sent.'
      );
      res.redirect('/forgot-password');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /reset-password/:token
   * Render reset password page
   */
  getResetPassword = (req: Request, res: Response): void => {
    const { token } = req.params;

    renderView(res, 'auth/reset-password', {
      title: 'Reset Password - PatrolManager',
      token,
      csrfToken: (req as any).csrfToken?.() || '',
      currentPath: '/reset-password',
    });
  };

  /**
   * POST /reset-password
   * Handle reset password form submission
   */
  postResetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        setFlashMessage(req, 'error', 'Invalid reset request');
        return res.redirect('/forgot-password');
      }

      if (password.length < 8) {
        setFlashMessage(req, 'error', 'Password must be at least 8 characters long');
        return res.redirect(`/reset-password/${token}`);
      }

      const authService = getAuthService();
      const result = await authService.resetPassword(token, password);

      if (!result.success) {
        setFlashMessage(
          req,
          'error',
          result.error || 'Password reset failed. The link may have expired.'
        );
        return res.redirect('/forgot-password');
      }

      setFlashMessage(req, 'success', 'Your password has been reset successfully. Please sign in with your new password.');
      res.redirect('/login');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /verify-email/:token
   * Verify email address
   */
  getVerifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { token } = req.params;
      // TODO: Implement email verification
      setFlashMessage(req, 'success', 'Email verified successfully');
      res.redirect('/login');
    } catch (error) {
      next(error);
    }
  };
}

export default new WebAuthController();
