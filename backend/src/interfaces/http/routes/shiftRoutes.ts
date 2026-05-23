/**
 * Shift Routes
 *
 * Route definitions for shift management endpoints.
 *
 * @module interfaces/http/routes
 */

import { Router } from 'express';
import { ShiftController } from '../controllers/ShiftController';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { tenantMiddleware } from '../middleware/tenantMiddleware.js';

const router = Router();
router.use(authMiddleware);
router.use(tenantMiddleware);

const shiftController = new ShiftController();

/**
 * @route   POST /api/shifts/clock-in
 * @desc    Clock in a guard to a shift with geofence validation
 * @access  Private (Guard, Supervisor, Manager, Admin)
 */
router.post('/clock-in', (req, res) => shiftController.clockIn(req, res));

/**
 * @route   POST /api/shifts/clock-out
 * @desc    Clock out a guard from their active shift
 * @access  Private (Guard, Supervisor, Manager, Admin)
 */
router.post('/clock-out', (req, res) => shiftController.clockOut(req, res));

/**
 * @route   GET /api/shifts/active
 * @desc    Get all currently active shifts
 * @access  Private (Supervisor, Manager, Admin)
 */
router.get('/active', (req, res) => shiftController.getActiveShifts(req, res));

/**
 * @route   GET /api/shifts/statistics
 * @desc    Get shift statistics for a date range
 * @access  Private (Manager, Admin)
 */
router.get('/statistics', (req, res) => shiftController.getStatistics(req, res));

/**
 * @route   GET /api/shifts/attendance
 * @desc    Get attendance report for a site and date range
 * @access  Private (Supervisor, Manager, Admin)
 */
router.get('/attendance', (req, res) => shiftController.getAttendanceReport(req, res));

/**
 * @route   GET /api/shifts/scheduled
 * @desc    Get scheduled shifts for a date
 * @access  Private (Supervisor, Manager, Admin)
 */
router.get('/scheduled', (req, res) => shiftController.getScheduledShifts(req, res));

/**
 * @route   GET /api/shifts/missed
 * @desc    Get missed shifts for a date
 * @access  Private (Supervisor, Manager, Admin)
 */
router.get('/missed', (req, res) => shiftController.getMissedShifts(req, res));

/**
 * @route   POST /api/shifts/mark-missed
 * @desc    Mark missed shifts for a date (admin operation)
 * @access  Private (Admin)
 */
router.post('/mark-missed', (req, res) => shiftController.markMissedShifts(req, res));

/**
 * @route   GET /api/shifts
 * @desc    List shifts with optional filtering
 * @access  Private (Supervisor, Manager, Admin)
 */
router.get('/', (req, res) => shiftController.listShifts(req, res));

/**
 * @route   POST /api/shifts
 * @desc    Create a new scheduled shift
 * @access  Private (Manager, Admin)
 */
router.post('/', (req, res) => shiftController.createShift(req, res));

/**
 * @route   GET /api/shifts/guard/:guardId
 * @desc    Get shifts for a specific guard
 * @access  Private (Guard can view own, Supervisor/Manager/Admin can view all)
 */
router.get('/guard/:guardId', (req, res) => shiftController.getGuardShifts(req, res));

/**
 * @route   GET /api/shifts/site/:siteId
 * @desc    Get shifts for a specific site
 * @access  Private (Supervisor, Manager, Admin)
 */
router.get('/site/:siteId', (req, res) => shiftController.getSiteShifts(req, res));

/**
 * @route   GET /api/shifts/:id
 * @desc    Get a shift by ID
 * @access  Private (Guard can view own, Supervisor/Manager/Admin can view all)
 */
router.get('/:id', (req, res) => shiftController.getShift(req, res));

/**
 * @route   PUT /api/shifts/:id
 * @desc    Update a shift
 * @access  Private (Manager, Admin)
 */
router.put('/:id', (req, res) => shiftController.updateShift(req, res));

/**
 * @route   DELETE /api/shifts/:id
 * @desc    Cancel a shift
 * @access  Private (Manager, Admin)
 */
router.delete('/:id', (req, res) => shiftController.cancelShift(req, res));

export default router;
