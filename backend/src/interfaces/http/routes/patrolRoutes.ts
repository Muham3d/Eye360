/**
 * Patrol Routes
 *
 * Defines API routes for patrol execution and management.
 *
 * @module interfaces/http/routes
 */

import { Router } from 'express';
import PatrolController from '../controllers/PatrolController';
import { authMiddleware } from '../middleware/authMiddleware';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';

const router = Router();

// All patrol routes require authentication and tenant scoping
router.use(authMiddleware);
router.use(tenantMiddleware);

/**
 * @route   GET /api/v1/patrols/active
 * @desc    Get active patrol for current guard
 * @access  Guard, Supervisor, Manager, Admin
 */
router.get('/active', PatrolController.getActivePatrol);

/**
 * @route   GET /api/v1/patrols/:id
 * @desc    Get patrol run details
 * @access  Guard, Supervisor, Manager, Admin
 */
router.get('/:id', PatrolController.getPatrolDetails);

/**
 * @route   POST /api/v1/patrols/:id/start
 * @desc    Start a scheduled patrol
 * @access  Guard (Assigned)
 */
router.post('/:id/start', PatrolController.startPatrol);

/**
 * @route   POST /api/v1/patrols/:id/verify
 * @desc    Verify a checkpoint
 * @access  Guard (Assigned)
 */
router.post('/:id/verify', PatrolController.verifyCheckpoint);

/**
 * @route   POST /api/v1/patrols/:id/complete
 * @desc    Complete a patrol run
 * @access  Guard (Assigned)
 */
router.post('/:id/complete', PatrolController.completePatrol);

/**
 * @route   POST /api/v1/patrols/:id/abandon
 * @desc    Abandon a patrol run
 * @access  Guard (Assigned), Supervisor, Manager, Admin
 */
router.post('/:id/abandon', PatrolController.abandonPatrol);

export default router;
