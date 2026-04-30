/**
 * Web Routes
 *
 * Routes for the admin web panel
 *
 * @module webRoutes
 */

import express from 'express';
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
router.use(attachCurrentUser);

/**
 * Apply middleware to validate session with database
 */
router.use(validateSession);

/**
 * @route   GET /
 * @desc    Dashboard home page
 */
router.get('/', requireAuth, (req, res) => {
  const stats = {
    activeGuards: 24,
    activeSites: 8,
    patrolsToday: 156,
    openIncidents: 3,
    recentActivity: [],
  };

  renderView(res, 'dashboard/index', {
    title: 'Dashboard - PatrolManager',
    stats,
  });
});

/**
 * @route   GET /command-center
 */
router.get('/command-center', requireAuth, requireRole('admin', 'manager', 'supervisor'), webRealTimeController.getDashboard);

/**
 * Site Routes
 */
router.get('/sites', requireAuth, requireRole('admin', 'manager'), webSiteController.getIndex);
router.get('/sites/new', requireAuth, requireRole('admin', 'manager'), webSiteController.getCreate);
router.post('/sites', requireAuth, requireRole('admin', 'manager'), webSiteController.postCreate);
router.get('/sites/:id/edit', requireAuth, requireRole('admin', 'manager'), webSiteController.getEdit);

/**
 * Checkpoint Routes
 */
router.get('/checkpoints', requireAuth, requireRole('admin', 'manager'), webCheckpointController.getIndex);
router.get('/checkpoints/new', requireAuth, requireRole('admin', 'manager'), webCheckpointController.getCreate);
router.post('/checkpoints', requireAuth, requireRole('admin', 'manager'), webCheckpointController.postCreate);

/**
 * Template Routes
 */
router.get('/templates', requireAuth, requireRole('admin', 'manager'), webTemplateController.getIndex);
router.get('/templates/:id/designer', requireAuth, requireRole('admin', 'manager'), webTemplateController.getDesigner);
router.post('/templates/:id/sequence', requireAuth, requireRole('admin', 'manager'), webTemplateController.postUpdateSequence);

/**
 * Incident Routes
 */
router.get('/incidents', requireAuth, requireRole('admin', 'manager', 'supervisor'), webIncidentController.getIndex);
router.get('/incidents/:id', requireAuth, requireRole('admin', 'manager', 'supervisor'), webIncidentController.getDetail);
router.post('/incidents/:id/comments', requireAuth, webIncidentController.postComment);
router.post('/incidents/:id/status', requireAuth, webIncidentController.postStatus);

/**
 * Report Routes
 */
router.get('/reports', requireAuth, requireRole('admin', 'manager'), webReportController.getIndex);
router.post('/reports/generate', requireAuth, requireRole('admin', 'manager'), webReportController.postGenerate);

/**
 * Authentication Routes
 */
router.get('/login', redirectIfAuthenticated, webAuthController.getLogin);
router.post('/login', webAuthController.postLogin);
router.post('/logout', webAuthController.postLogout);

/**
 * User Management Routes
 */
router.get('/users', requireAuth, requireRole('admin', 'manager'), webUserController.getIndex);
router.get('/users/new', requireAuth, requireRole('admin', 'manager'), webUserController.getCreate);
router.post('/users', requireAuth, requireRole('admin', 'manager'), webUserController.postCreate);
router.get('/users/:id/edit', requireAuth, requireRole('admin', 'manager'), webUserController.getEdit);

export default router;
