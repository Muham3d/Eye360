/**
 * Mobile Routes
 *
 * Defines API routes for mobile client operations.
 * Includes patrol sync, assignments, and real-time operations.
 *
 * @module interfaces/http/routes
 */

import { Router } from 'express';
import SyncController from '../controllers/SyncController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// All mobile routes require authentication
router.use(authMiddleware);

/**
 * @route   POST /api/v1/mobile/patrols/sync
 * @desc    Synchronize offline patrol runs
 * @access  Guard, Supervisor, Manager, Admin
 * @body     { patrolRuns: IPatrolRunSync[] }
 */
router.post('/patrols/sync', SyncController.syncPatrolRuns);

/**
 * @route   GET /api/v1/mobile/assignments
 * @desc    Get today's assigned sites and patrol templates
 * @access  Guard, Supervisor, Manager, Admin
 */
router.get('/assignments', SyncController.getAssignments);

/**
 * @route   GET /api/v1/mobile/patrols/active
 * @desc    Get active patrol for current guard
 * @access  Guard, Supervisor, Manager, Admin
 */
router.get('/patrols/active', SyncController.getActivePatrol);

/**
 * @route   POST /api/v1/mobile/patrols/:id/start
 * @desc    Start a scheduled patrol
 * @access  Guard (Assigned)
 */
router.post('/patrols/:id/start', SyncController.startPatrol);

/**
 * @route   POST /api/v1/mobile/patrols/:id/verify
 * @desc    Verify a checkpoint
 * @access  Guard (Assigned)
 */
router.post('/patrols/:id/verify', SyncController.verifyCheckpoint);

/**
 * @route   POST /api/v1/mobile/patrols/:id/complete
 * @desc    Complete a patrol run
 * @access  Guard (Assigned)
 */
router.post('/patrols/:id/complete', SyncController.completePatrol);

/**
 * @route   POST /api/v1/mobile/patrols/:id/abandon
 * @desc    Abandon a patrol run
 * @access  Guard (Assigned), Supervisor, Manager, Admin
 */
router.post('/patrols/:id/abandon', SyncController.abandonPatrol);

export default router;
