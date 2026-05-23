/**
 * Web User Controller
 *
 * Handles user management for the admin web panel.
 * Renders user pages and processes form submissions.
 *
 * @module interfaces/http/controllers/WebUserController
 */

import { Request, Response, NextFunction } from 'express';
import { setFlashMessage, renderView } from '../../web/config/ejs.js';
import { getUserService } from '../../../core/services/index.js';

/**
 * Web User Controller
 */
export class WebUserController {
  /**
   * GET /users
   * Render user list with filters and pagination
   */
  getIndex = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || null;
      const role = (req.query.role as string) || null;
      const status = (req.query.status as string) || null;
      const sort = (req.query.sort as string) || 'createdAt';
      const order = (req.query.order as string) || 'DESC';

      // Build filters object
      const filters: Record<string, any> = {};
      if (search) filters.search = search;
      if (role) filters.role = role;
      if (status) filters.status = status;

      // Fetch users from service
      const userService = getUserService();
      const result = await userService.listUsers({
        page,
        limit,
        filters,
        sort,
        order,
      });

      // Fetch available roles
      const roles = await userService.getRoles();

      // Build pagination metadata
      const pagination = {
        currentPage: page,
        totalPages: Math.ceil((result?.total || 0) / limit),
        total: result?.total || 0,
        limit,
        from: result?.total ? (page - 1) * limit + 1 : 0,
        to: Math.min(page * limit, result?.total || 0),
        prevPage: page > 1 ? page - 1 : null,
        nextPage: result?.total > page * limit ? page + 1 : null,
      };

      renderView(res, 'users/index', {
        title: 'Users - PatrolManager',
        users: result?.users || [],
        pagination,
        filters: { search, role, status, sort, order },
        roles,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /users/new
   * Render create user form
   */
  getCreate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userService = getUserService();
      const roles = await userService.getRoles();

      renderView(res, 'users/form', {
        title: 'Add New User - PatrolManager',
        mode: 'create',
        user: {},
        roles,
        errors: {},
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /users
   * Handle create user form submission
   */
  postCreate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { firstName, lastName, email, phone, roleId, status, password, confirmPassword } = req.body;

      // Basic validation
      const errors: Record<string, string> = {};

      if (!firstName || firstName.trim().length < 2) {
        errors.firstName = 'First name must be at least 2 characters long';
      }
      if (!lastName || lastName.trim().length < 2) {
        errors.lastName = 'Last name must be at least 2 characters long';
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Please enter a valid email address';
      }
      if (!roleId) {
        errors.roleId = 'Please select a role for this user';
      }
      if (!status) {
        errors.status = 'Please select a status for this user';
      }
      if (!password || password.length < 8) {
        errors.password = 'Password must be at least 8 characters long';
      }
      if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }

      // Return with errors if validation failed
      if (Object.keys(errors).length > 0) {
        const userService = getUserService();
        const roles = await userService.getRoles();

        renderView(res, 'users/form', {
          title: 'Add New User - PatrolManager',
          mode: 'create',
          user: { firstName, lastName, email, phone, roleId, status },
          roles,
          errors,
        });
        return;
      }

      // Create user via service
      const userService = getUserService();
      const result = await userService.createUser({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        roleId: parseInt(roleId),
        status,
        password,
      });

      if (!result.success) {
        const roles = await userService.getRoles();

        // Handle service-level errors
        if (result.error?.includes('email')) {
          errors.email = result.error;
        } else {
          errors.general = result.error || 'Failed to create user';
        }

        renderView(res, 'users/form', {
          title: 'Add New User - PatrolManager',
          mode: 'create',
          user: { firstName, lastName, email, phone, roleId, status },
          roles,
          errors,
        });
        return;
      }

      setFlashMessage(req, 'success', `User ${firstName} ${lastName} has been created successfully.`);
      res.redirect('/users');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /users/:id/edit
   * Render edit user form
   */
  getEdit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const userService = getUserService();
      const result = await userService.getUserById(parseInt(id!));

      if (!result.success || !result.user) {
        setFlashMessage(req, 'error', 'User not found');
        return res.redirect('/users');
      }

      const roles = await userService.getRoles();

      renderView(res, 'users/form', {
        title: 'Edit User - PatrolManager',
        mode: 'edit',
        user: result.user,
        roles,
        errors: {},
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * PUT /users/:id
   * Handle update user form submission
   */
  putUpdate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { firstName, lastName, email, phone, roleId, status } = req.body;

      // Basic validation
      const errors: Record<string, string> = {};

      if (!firstName || firstName.trim().length < 2) {
        errors.firstName = 'First name must be at least 2 characters long';
      }
      if (!lastName || lastName.trim().length < 2) {
        errors.lastName = 'Last name must be at least 2 characters long';
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Please enter a valid email address';
      }
      if (!roleId) {
        errors.roleId = 'Please select a role for this user';
      }
      if (!status) {
        errors.status = 'Please select a status for this user';
      }

      // Return with errors if validation failed
      if (Object.keys(errors).length > 0) {
        const userService = getUserService();
        const [userResult, roles] = await Promise.all([
          userService.getUserById(parseInt(id!)),
          userService.getRoles(),
        ]);

        renderView(res, 'users/form', {
          title: 'Edit User - PatrolManager',
          mode: 'edit',
          user: { ...userResult.user, firstName, lastName, email, phone, roleId, status },
          roles,
          errors,
        });
        return;
      }

      // Update user via service
      const userService = getUserService();
      const result = await userService.updateUser(parseInt(id!), {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        roleId: parseInt(roleId),
        status,
      });

      if (!result.success) {
        const [userResult, roles] = await Promise.all([
          userService.getUserById(parseInt(id!)),
          userService.getRoles(),
        ]);

        // Handle service-level errors
        if (result.error?.includes('email')) {
          errors.email = result.error;
        } else {
          errors.general = result.error || 'Failed to update user';
        }

        renderView(res, 'users/form', {
          title: 'Edit User - PatrolManager',
          mode: 'edit',
          user: { ...userResult.user, firstName, lastName, email, phone, roleId, status },
          roles,
          errors,
        });
        return;
      }

      setFlashMessage(req, 'success', `User ${firstName} ${lastName} has been updated successfully.`);

      // Redirect based on continue parameter
      if (req.query.continue === 'true') {
        res.redirect(`/users/${id}/edit`);
      } else {
        res.redirect('/users');
      }
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /users/:id/role
   * Handle role change
   */
  postChangeRole = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!role) {
        setFlashMessage(req, 'error', 'Please select a valid role');
        return res.redirect('/users');
      }

      const userService = getUserService();
      const result = await userService.changeUserRole(parseInt(id!), role);

      if (!result.success) {
        setFlashMessage(req, 'error', result.error || 'Failed to change user role');
        return res.redirect('/users');
      }

      setFlashMessage(req, 'success', 'User role has been changed successfully');
      res.redirect('/users');
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /users/:id/status
   * Handle status change
   */
  postChangeStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      if (!status) {
        setFlashMessage(req, 'error', 'Please select a valid status');
        return res.redirect('/users');
      }

      const userService = getUserService();
      const result = await userService.changeUserStatus(parseInt(id!), status, reason);

      if (!result.success) {
        setFlashMessage(req, 'error', result.error || 'Failed to change user status');
        return res.redirect('/users');
      }

      setFlashMessage(req, 'success', 'User status has been changed successfully');
      res.redirect('/users');
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /users/:id/delete
   * Handle user deletion
   */
  postDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { confirm, confirmDelete, 'confirm-text': confirmText } = req.body;

      // Validate confirmation
      if (!confirm || !confirmDelete || confirmText !== 'DELETE') {
        setFlashMessage(req, 'error', 'Please confirm all checkboxes and type DELETE to confirm');
        return res.redirect('/users');
      }

      const userService = getUserService();
      const result = await userService.deleteUser(parseInt(id!));

      if (!result.success) {
        setFlashMessage(req, 'error', result.error || 'Failed to delete user');
        return res.redirect('/users');
      }

      setFlashMessage(req, 'success', 'User has been deleted successfully');
      res.redirect('/users');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /users/:id/reset-password
   * Send password reset email
   */
  getResetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      const userService = getUserService();
      const result = await userService.sendPasswordResetEmail(parseInt(id!));

      if (!result.success) {
        setFlashMessage(req, 'error', result.error || 'Failed to send password reset email');
        return res.redirect('/users');
      }

      setFlashMessage(req, 'success', 'Password reset email has been sent to the user');
      res.redirect('/users');
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /users/export
   * Export users to CSV
   */
  getExport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userService = getUserService();
      const result = await userService.exportUsers(req.query as any);

      if (!result.success) {
        setFlashMessage(req, 'error', result.error || 'Failed to export users');
        return res.redirect('/users');
      }

      // Set headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="users-${Date.now()}.csv"`);

      res.send(result.csv);
    } catch (error) {
      next(error);
    }
  };
}

export default new WebUserController();
