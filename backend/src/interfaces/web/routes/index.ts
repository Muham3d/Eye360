/**
 * Web Routes
 *
 * Routes for the admin web panel
 *
 * @module webRoutes
 */

import express, { Request, Response } from 'express';
import { setFlashMessage, renderView } from '../config/ejs.js';
import webAuthController from '../controllers/WebAuthController.js';
import webUserController from '../../http/controllers/WebUserController.js';
import webRealTimeController from '../../http/controllers/WebRealTimeController.js';
import webIncidentController from '../../http/controllers/WebIncidentController.js';
import webReportController from '../../http/controllers/WebReportController.js';
import webSiteController from '../../http/controllers/WebSiteController.js';
import webCheckpointController from '../../http/controllers/WebCheckpointController.js';
import webTemplateController from '../../http/controllers/WebTemplateController.js';
import {
  requireAuth,
  requireRole,
  redirectIfAuthenticated,
  attachCurrentUser,
  validateSession,
} from '../middleware/webAuthMiddleware.js';

const router = express.Router();

/**
 * Apply middleware to attach current user to all requests
 */
router.use(attachCurrentUser as any);

/**
 * Apply middleware to validate session with database
 */
router.use(validateSession as any);

/**
 * @route   GET /
 * @desc    Dashboard home page
 */
router.get('/', requireAuth as any, async (req: Request, res: Response) => {
  try {
    const { getShiftService } = await import('../../../core/services/ShiftService.js');
    const { getIncidentService } = await import('../../../core/services/IncidentService.js');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);

    const stats = {
      activeGuards: 0,
      activeSites: 0,
      patrolsToday: 0,
      openIncidents: 0,
      recentActivity: [],
    };

    try {
      const shiftService = getShiftService();
      const activeShifts = await shiftService.getActiveShifts();
      stats.activeGuards = activeShifts.length;
    } catch (_) {}

    try {
      const incidentService = getIncidentService();
      const incidentStats = await incidentService.getStatistics();
      stats.openIncidents = (incidentStats.byStatus?.new || 0) + (incidentStats.byStatus?.investigating || 0);
    } catch (_) {}

    renderView(res, 'dashboard/index', {
      title: 'Dashboard - PatrolManager',
      stats,
    });
  } catch (error) {
    renderView(res, 'dashboard/index', {
      title: 'Dashboard - PatrolManager',
      stats: { activeGuards: 0, activeSites: 0, patrolsToday: 0, openIncidents: 0, recentActivity: [] },
    });
  }
});

/**
 * @route   GET /command-center
 */
router.get('/command-center', requireAuth as any, requireRole('admin', 'manager', 'supervisor') as any, webRealTimeController.getDashboard as any);

/**
 * Site Routes
 */
router.get('/sites', requireAuth as any, requireRole('admin', 'manager') as any, webSiteController.getIndex as any);
router.get('/sites/new', requireAuth as any, requireRole('admin', 'manager') as any, webSiteController.getCreate as any);
router.post('/sites', requireAuth as any, requireRole('admin', 'manager') as any, webSiteController.postCreate as any);
router.get('/sites/:id/edit', requireAuth as any, requireRole('admin', 'manager') as any, webSiteController.getEdit as any);

/**
 * Checkpoint Routes
 */
router.get('/checkpoints', requireAuth as any, requireRole('admin', 'manager') as any, webCheckpointController.getIndex as any);
router.get('/checkpoints/new', requireAuth as any, requireRole('admin', 'manager') as any, webCheckpointController.getCreate as any);
router.post('/checkpoints', requireAuth as any, requireRole('admin', 'manager') as any, webCheckpointController.postCreate as any);

/**
 * Template Routes
 */
router.get('/templates', requireAuth as any, requireRole('admin', 'manager') as any, webTemplateController.getIndex as any);
router.get('/templates/:id/designer', requireAuth as any, requireRole('admin', 'manager') as any, webTemplateController.getDesigner as any);
router.post('/templates/:id/sequence', requireAuth as any, requireRole('admin', 'manager') as any, webTemplateController.postUpdateSequence as any);

/**
 * Incident Routes
 */
router.get('/incidents', requireAuth as any, requireRole('admin', 'manager', 'supervisor') as any, webIncidentController.getIndex as any);
router.get('/incidents/:id', requireAuth as any, requireRole('admin', 'manager', 'supervisor') as any, webIncidentController.getDetail as any);
router.post('/incidents/:id/comments', requireAuth as any, webIncidentController.postComment as any);
router.post('/incidents/:id/status', requireAuth as any, webIncidentController.postStatus as any);

/**
 * Report Routes
 */
router.get('/reports', requireAuth as any, requireRole('admin', 'manager') as any, webReportController.getIndex as any);
router.post('/reports/generate', requireAuth as any, requireRole('admin', 'manager') as any, webReportController.postGenerate as any);

/**
 * Authentication Routes
 */
router.get('/login', redirectIfAuthenticated as any, webAuthController.getLogin as any);
router.post('/login', webAuthController.postLogin as any);
router.post('/logout', webAuthController.postLogout as any);
router.get('/forgot-password', redirectIfAuthenticated as any, webAuthController.getForgotPassword as any);
router.post('/forgot-password', webAuthController.postForgotPassword as any);
router.get('/reset-password', webAuthController.getResetPassword as any);
router.get('/reset-password/:token', webAuthController.getResetPassword as any);
router.post('/reset-password', webAuthController.postResetPassword as any);

/**
 * Profile & Settings Routes
 */
router.get('/profile', requireAuth as any, (req: Request, res: Response) => {
  renderView(res, 'system/placeholder', {
    title: 'Profile - PatrolManager',
    pageTitle: 'Your Profile',
    pageDescription: 'Manage your account settings and preferences.',
    featurePath: '/profile',
  });
});

router.get('/settings', requireAuth as any, requireRole('admin') as any, (req: Request, res: Response) => {
  renderView(res, 'system/placeholder', {
    title: 'Settings - PatrolManager',
    pageTitle: 'System Settings',
    pageDescription: 'Configure system-wide settings and preferences.',
    featurePath: '/settings',
  });
});

/**
 * User Management Routes
 */
router.get('/users', requireAuth as any, requireRole('admin', 'manager') as any, webUserController.getIndex as any);
router.get('/users/new', requireAuth as any, requireRole('admin', 'manager') as any, webUserController.getCreate as any);
router.post('/users', requireAuth as any, requireRole('admin', 'manager') as any, webUserController.postCreate as any);
router.get('/users/:id/edit', requireAuth as any, requireRole('admin', 'manager') as any, webUserController.getEdit as any);

export default router;
