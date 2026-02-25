/**
 * Shift Controller
 *
 * HTTP controller for shift management endpoints.
 * Handles clock-in/out, shift scheduling, and attendance queries.
 *
 * @module interfaces/http/controllers
 */

import { Request, Response } from 'express';
import { getShiftService } from '../../../core/services/ShiftService';
import { ShiftStatus, ShiftType } from '../../../core/domain/entities/Shift';
import { ValidationError, NotFoundError, ConflictError } from '../../../core/domain/errors/index';

/**
 * Shift Controller
 *
 * Handles all shift-related HTTP requests:
 * - Clock in/out with geofence validation
 * - Shift scheduling and management
 * - Attendance reporting
 * - Statistics
 */
export class ShiftController {
  /**
   * Clock in a guard to a shift
   * POST /api/shifts/clock-in
   *
   * Request body:
   * {
   *   "guardId": number,
   *   "siteId": number,
   *   "location": { "latitude": number, "longitude": number, "accuracy": number },
   *   "notes": string (optional)
   * }
   */
  async clockIn(req: Request, res: Response): Promise<void> {
    try {
      const { guardId, siteId, location, notes } = req.body;

      // Validate required fields
      if (!guardId || typeof guardId !== 'number') {
        res.status(400).json({ error: 'Invalid or missing guardId' });
        return;
      }
      if (!siteId || typeof siteId !== 'number') {
        res.status(400).json({ error: 'Invalid or missing siteId' });
        return;
      }
      if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        res.status(400).json({ error: 'Invalid or missing location' });
        return;
      }

      // Use authenticated user's ID if available
      const userId = (req as any).user?.id || guardId;

      const result = await getShiftService().clockIn({
        guardId: userId,
        siteId,
        location,
        notes,
      });

      if (!result.success) {
        res.status(400).json({
          error: result.error,
          shift: result.shift,
        });
        return;
      }

      res.status(200).json({
        success: true,
        shift: result.shift,
        warning: result.warning,
        isLate: result.isLate,
        minutesLate: result.minutesLate,
        isWithinGeofence: result.isWithinGeofence,
      });
    } catch (error) {
      console.error('Error clocking in:', error);
      res.status(500).json({ error: 'Failed to clock in' });
    }
  }

  /**
   * Clock out a guard from their active shift
   * POST /api/shifts/clock-out
   *
   * Request body:
   * {
   *   "guardId": number,
   *   "location": { "latitude": number, "longitude": number, "accuracy": number },
   *   "notes": string (optional)
   * }
   */
  async clockOut(req: Request, res: Response): Promise<void> {
    try {
      const { guardId, location, notes } = req.body;

      // Validate required fields
      if (!guardId || typeof guardId !== 'number') {
        res.status(400).json({ error: 'Invalid or missing guardId' });
        return;
      }
      if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        res.status(400).json({ error: 'Invalid or missing location' });
        return;
      }

      // Use authenticated user's ID if available
      const userId = (req as any).user?.id || guardId;

      const result = await getShiftService().clockOut({
        guardId: userId,
        location,
        notes,
      });

      if (!result.success) {
        res.status(400).json({
          error: result.error,
        });
        return;
      }

      res.status(200).json({
        success: true,
        shift: result.shift,
        duration: result.duration,
      });
    } catch (error) {
      console.error('Error clocking out:', error);
      res.status(500).json({ error: 'Failed to clock out' });
    }
  }

  /**
   * Get a shift by ID
   * GET /api/shifts/:id
   */
  async getShift(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid shift ID' });
        return;
      }

      const shift = await getShiftService().getShift(id);
      if (!shift) {
        res.status(404).json({ error: 'Shift not found' });
        return;
      }

      res.status(200).json({ shift });
    } catch (error) {
      console.error('Error getting shift:', error);
      res.status(500).json({ error: 'Failed to get shift' });
    }
  }

  /**
   * List shifts with optional filtering
   * GET /api/shifts?siteId=1&guardId=2&status=clocked_in&page=1&limit=20
   */
  async listShifts(req: Request, res: Response): Promise<void> {
    try {
      const options = {
        siteId: req.query.siteId ? parseInt(req.query.siteId as string) : undefined,
        guardId: req.query.guardId ? parseInt(req.query.guardId as string) : undefined,
        status: req.query.status as ShiftStatus | undefined,
        type: req.query.type as ShiftType | undefined,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: (req.query.sortBy as any) || 'scheduledStart',
        sortOrder: (req.query.sortOrder as any) || 'DESC',
      };

      const result = await getShiftService().listShifts(options);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error listing shifts:', error);
      res.status(500).json({ error: 'Failed to list shifts' });
    }
  }

  /**
   * Create a new scheduled shift
   * POST /api/shifts
   *
   * Request body:
   * {
   *   "siteId": number,
   *   "guardId": number,
   *   "type": "regular" | "overtime" | "emergency" | "training",
   *   "scheduledStart": ISO date string,
   *   "scheduledEnd": ISO date string,
   *   "notes": string (optional)
   * }
   */
  async createShift(req: Request, res: Response): Promise<void> {
    try {
      const { siteId, guardId, type, scheduledStart, scheduledEnd, notes } = req.body;

      // Validate required fields
      if (!siteId || !guardId || !scheduledStart || !scheduledEnd) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const shift = await getShiftService().createShift({
        siteId,
        guardId,
        type: type || ShiftType.REGULAR,
        scheduledStart: new Date(scheduledStart),
        scheduledEnd: new Date(scheduledEnd),
        notes,
      });

      res.status(201).json({ shift });
    } catch (error) {
      if (error instanceof ValidationError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error('Error creating shift:', error);
        res.status(500).json({ error: 'Failed to create shift' });
      }
    }
  }

  /**
   * Update a shift
   * PUT /api/shifts/:id
   */
  async updateShift(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid shift ID' });
        return;
      }

      const { siteId, guardId, type, scheduledStart, scheduledEnd, notes } = req.body;

      const shift = await getShiftService().updateShift(id, {
        siteId,
        guardId,
        type,
        scheduledStart: scheduledStart ? new Date(scheduledStart) : undefined,
        scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : undefined,
        notes,
      });

      res.status(200).json({ shift });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
      } else {
        console.error('Error updating shift:', error);
        res.status(500).json({ error: 'Failed to update shift' });
      }
    }
  }

  /**
   * Cancel a shift
   * DELETE /api/shifts/:id
   */
  async cancelShift(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        res.status(400).json({ error: 'Invalid shift ID' });
        return;
      }

      await getShiftService().cancelShift(id);
      res.status(200).json({ success: true, message: 'Shift cancelled' });
    } catch (error) {
      if (error instanceof NotFoundError) {
        res.status(404).json({ error: error.message });
      } else if (error instanceof ConflictError) {
        res.status(409).json({ error: error.message });
      } else {
        console.error('Error cancelling shift:', error);
        res.status(500).json({ error: 'Failed to cancel shift' });
      }
    }
  }

  /**
   * Get shift statistics for a date range
   * GET /api/shifts/statistics?startDate=2024-01-01&endDate=2024-01-31
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const stats = await getShiftService().getStatistics(startDate, endDate);
      res.status(200).json(stats);
    } catch (error) {
      console.error('Error getting shift statistics:', error);
      res.status(500).json({ error: 'Failed to get shift statistics' });
    }
  }

  /**
   * Get attendance report for a site and date range
   * GET /api/shifts/attendance?siteId=1&startDate=2024-01-01&endDate=2024-01-31
   */
  async getAttendanceReport(req: Request, res: Response): Promise<void> {
    try {
      const siteId = req.query.siteId ? parseInt(req.query.siteId as string) : null;
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const report = await getShiftService().getAttendanceReport(siteId, startDate, endDate);
      res.status(200).json({ report, count: report.length });
    } catch (error) {
      console.error('Error getting attendance report:', error);
      res.status(500).json({ error: 'Failed to get attendance report' });
    }
  }

  /**
   * Get shifts for a specific guard
   * GET /api/shifts/guard/:guardId
   */
  async getGuardShifts(req: Request, res: Response): Promise<void> {
    try {
      const guardId = parseInt(req.params.guardId);
      if (isNaN(guardId)) {
        res.status(400).json({ error: 'Invalid guard ID' });
        return;
      }

      const options = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: (req.query.sortBy as any) || 'scheduledStart',
        sortOrder: (req.query.sortOrder as any) || 'DESC',
      };

      const result = await getShiftService().getGuardShifts(guardId, options);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error getting guard shifts:', error);
      res.status(500).json({ error: 'Failed to get guard shifts' });
    }
  }

  /**
   * Get currently active shifts
   * GET /api/shifts/active
   */
  async getActiveShifts(req: Request, res: Response): Promise<void> {
    try {
      const shifts = await getShiftService().getActiveShifts();
      res.status(200).json({ shifts, count: shifts.length });
    } catch (error) {
      console.error('Error getting active shifts:', error);
      res.status(500).json({ error: 'Failed to get active shifts' });
    }
  }

  /**
   * Get scheduled shifts for a date
   * GET /api/shifts/scheduled?date=2024-01-01
   */
  async getScheduledShifts(req: Request, res: Response): Promise<void> {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const shifts = await getShiftService().getScheduledShifts(date);
      res.status(200).json({ shifts, count: shifts.length });
    } catch (error) {
      console.error('Error getting scheduled shifts:', error);
      res.status(500).json({ error: 'Failed to get scheduled shifts' });
    }
  }

  /**
   * Get missed shifts for a date
   * GET /api/shifts/missed?date=2024-01-01
   */
  async getMissedShifts(req: Request, res: Response): Promise<void> {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const shifts = await getShiftService().getMissedShifts(date);
      res.status(200).json({ shifts, count: shifts.length });
    } catch (error) {
      console.error('Error getting missed shifts:', error);
      res.status(500).json({ error: 'Failed to get missed shifts' });
    }
  }

  /**
   * Mark missed shifts for a date (admin operation)
   * POST /api/shifts/mark-missed
   *
   * Request body:
   * {
   *   "date": ISO date string
   * }
   */
  async markMissedShifts(req: Request, res: Response): Promise<void> {
    try {
      const { date } = req.body;
      const targetDate = date ? new Date(date) : new Date();

      const count = await getShiftService().markMissedShifts(targetDate);
      res.status(200).json({
        success: true,
        marked: count,
        message: `Marked ${count} shifts as missed`,
      });
    } catch (error) {
      console.error('Error marking missed shifts:', error);
      res.status(500).json({ error: 'Failed to mark missed shifts' });
    }
  }

  /**
   * Get shifts for a specific site
   * GET /api/shifts/site/:siteId?startDate=2024-01-01&endDate=2024-01-31
   */
  async getSiteShifts(req: Request, res: Response): Promise<void> {
    try {
      const siteId = parseInt(req.params.siteId);
      if (isNaN(siteId)) {
        res.status(400).json({ error: 'Invalid site ID' });
        return;
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const shifts = await getShiftService().getSiteShifts(siteId, startDate, endDate);
      res.status(200).json({ shifts, count: shifts.length });
    } catch (error) {
      console.error('Error getting site shifts:', error);
      res.status(500).json({ error: 'Failed to get site shifts' });
    }
  }
}

export default ShiftController;
