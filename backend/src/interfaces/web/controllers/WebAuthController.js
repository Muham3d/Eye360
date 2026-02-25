/**
 * Web Authentication Controller
 *
 * Handles authentication for the admin web panel.
 * Renders auth pages and processes form submissions using fetch API.
 *
 * @module interfaces/web/controllers/WebAuthController
 */

import { setFlashMessage, renderView } from '../config/ejs.js';
import { getAuthService } from '@core/services/index.js';

/**
 * Web Auth Controller
 */
export class WebAuthController {
  /**
   * GET /login
   * Render login page
   */
  getLogin = (req, res) => {
    // Redirect if already authenticated
    if (req.session?.user) {
      return res.redirect('/');
    }

    renderView(res, 'auth/login', {
      title: 'Sign In - PatrolManager',
      email: req.session?.email || '',
      csrfToken: req.csrfToken?.() || '',
      currentPath: '/login',
    });
  };

  /**
   * POST /login
   * Handle login form submission
   */
  postLogin = async (req, res, next) => {
    try {
      const { email, password, remember } = req.body;

      // Validate input
      if (!email || !password) {
        if (req.session) {
          req.session.email = email;
        }
        setFlashMessage(req, 'error', 'Please enter both email and password');
        return res.redirect('/login');
      }

      const authService = getAuthService();
      const result = await authService.loginWeb({ email, password });

      if (!result.success) {
        if (req.session) {
          req.session.email = email;
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

      if (req.session) {
        req.session.token = result.sessionToken;
        req.session.user = {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          role: result.user.roleName,
        };

        if (maxAge && req.session.cookie) {
          req.session.cookie.maxAge = maxAge;
        }

        // Save session explicitly before redirect
        await req.session.save();
      }

      // Redirect to original URL or dashboard
      const redirectTo = req.session?.returnTo || '/';
      delete req.session?.returnTo;

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
  postLogout = async (req, res, next) => {
    try {
      const sessionToken = req.session?.token;

      if (sessionToken) {
        const authService = getAuthService();
        await authService.logoutWeb(sessionToken);
      }

      // Destroy session
      req.session?.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
      });

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
  getForgotPassword = (req, res) => {
    renderView(res, 'auth/forgot-password', {
      title: 'Forgot Password - PatrolManager',
      email: req.query.email || '',
      csrfToken: req.csrfToken?.() || '',
      currentPath: '/forgot-password',
    });
  };

  /**
   * POST /forgot-password
   * Handle forgot password form submission
   */
  postForgotPassword = async (req, res, next) => {
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
  getResetPassword = (req, res) => {
    const { token } = req.params;

    renderView(res, 'auth/reset-password', {
      title: 'Reset Password - PatrolManager',
      token,
      csrfToken: req.csrfToken?.() || '',
      currentPath: '/reset-password',
    });
  };

  /**
   * POST /reset-password
   * Handle reset password form submission
   */
  postResetPassword = async (req, res, next) => {
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
  getVerifyEmail = async (req, res, next) => {
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
