/**
 * Dashboard Routes
 *
 * API routes for the real-time command center dashboard.
 * Handles SOS alert management and statistics.
 *
 * @module interfaces/http/routes
 */

import { Router } from 'express';
import webRealTimeController from '../controllers/WebRealTimeController';

const router = Router();

/**
 * @route   GET /api/v1/dashboard/sos/active
 * @desc    Get all active (unresolved) SOS alerts
 * @access  Private (Supervisor, Manager, Admin)
 */
router.get('/sos/active', webRealTimeController.getActiveSOSAlerts);

/**
 * @route   GET /api/v1/dashboard/sos/recent
 * @desc    Get recent SOS alerts
 * @access  Private (Supervisor, Manager, Admin)
 * @query   limit - Number of alerts to return (default: 20)
 */
router.get('/sos/recent', webRealTimeController.getRecentSOSAlerts);

/**
 * @route   GET /api/v1/dashboard/sos/:id
 * @desc    Get SOS alert by ID
 * @access  Private (Supervisor, Manager, Admin)
 */
router.get('/sos/:id', webRealTimeController.getSOSAlertById);

/**
 * @route   POST /api/v1/dashboard/sos/:id/acknowledge
 * @desc    Acknowledge an SOS alert
 * @access  Private (Supervisor, Manager, Admin)
 */
router.post('/sos/:id/acknowledge', webRealTimeController.acknowledgeSOS);

/**
 * @route   POST /api/v1/dashboard/sos/:id/dispatch
 * @desc    Dispatch help to SOS location
 * @access  Private (Manager, Admin)
 */
router.post('/sos/:id/dispatch', webRealTimeController.dispatchSOS);

/**
 * @route   POST /api/v1/dashboard/sos/:id/resolve
 * @desc    Resolve an SOS alert
 * @access  Private (Supervisor, Manager, Admin)
 * @body    status - "resolved" or "false_alarm"
 * @body    resolutionNotes - Optional notes about resolution
 */
router.post('/sos/:id/resolve', webRealTimeController.resolveSOS);

/**
 * @route   GET /api/v1/dashboard/sos/:id/nearby-guards
 * @desc    Get nearby guards for an SOS alert
 * @access  Private (Supervisor, Manager, Admin)
 * @query   radius - Search radius in meters (default: 500)
 */
router.get('/sos/:id/nearby-guards', webRealTimeController.getNearbyGuards);

/**
 * @route   GET /api/v1/dashboard/statistics
 * @desc    Get dashboard statistics
 * @access  Private (Supervisor, Manager, Admin)
 */
router.get('/statistics', webRealTimeController.getDashboardStatistics);

/**
 * @route   GET /api/v1/dashboard/guards/:id/locations
 * @desc    Get location history for a guard
 * @access  Private (Supervisor, Manager, Admin)
 * @query   limit - Number of location points to return (default: 100)
 * @query   startDate - Filter by start date
 * @query   endDate - Filter by end date
 */
router.get('/guards/:id/locations', webRealTimeController.getGuardLocationHistory);

/**
 * @route   GET /api/v1/dashboard/patrols/:id/path
 * @desc    Get patrol path (location history for a patrol run)
 * @access  Private (Supervisor, Manager, Admin)
 */
router.get('/patrols/:id/path', webRealTimeController.getPatrolPath);

export default router;
