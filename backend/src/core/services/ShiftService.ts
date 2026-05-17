/**
 * Shift Service
 *
 * Core service for shift management with geofenced clock-in/out validation.
 * Handles shift scheduling, attendance tracking, and statistics.
 *
 * @module core/services
 */

import { ValidationError, NotFoundError, ConflictError } from '../domain/errors/index.js';
import type { IShiftRepository } from '../domain/repositories/IShiftRepository.js';
import type { ISiteRepository } from '../domain/repositories/ISiteRepository.js';
import { GeofenceService } from './GeofenceService.js';
import { GeofenceBoundary } from '../domain/value-objects/GeofenceBoundary.js';
import type {
  IShift,
  ICreateShiftDTO,
  IClockInDTO,
  IClockOutDTO,
  IClockInResult,
  IClockOutResult,
  IShiftQueryOptions,
  IShiftStatistics,
  IAttendanceRecord,
  IPaginatedShifts,
  ShiftStatus,
  ShiftType,
} from '../domain/entities/Shift.js';

/**
 * Shift Configuration
 */
export interface IShiftConfig {
  lateToleranceMinutes: number; // Minutes after scheduled start before considered late
  earlyLeaveToleranceMinutes: number; // Minutes before scheduled end for early leave
  requireGeofenceForClockIn: boolean; // Require being inside geofence to clock in
  requireGeofenceForClockOut: boolean; // Require being inside geofence to clock out
  autoMarkMissedShifts: boolean; // Automatically mark shifts as missed
  autoMarkMissedAfterMinutes: number; // Minutes after scheduled end to auto-mark as missed
}

/**
 * Default shift configuration
 */
export const DEFAULT_SHIFT_CONFIG: IShiftConfig = {
  lateToleranceMinutes: 5,
  earlyLeaveToleranceMinutes: 5,
  requireGeofenceForClockIn: true,
  requireGeofenceForClockOut: true,
  autoMarkMissedShifts: true,
  autoMarkMissedAfterMinutes: 15,
} as const;

/**
 * Shift Service
 *
 * Provides comprehensive shift management:
 * - Geofenced clock-in/out validation
 * - Shift scheduling and management
 * - Attendance tracking and reporting
 * - Statistics and analytics
 */
export class ShiftService {
  constructor(
    private readonly shiftRepository: IShiftRepository,
    private readonly siteRepository: ISiteRepository,
    private readonly geofenceService: GeofenceService,
    private readonly config: IShiftConfig = DEFAULT_SHIFT_CONFIG
  ) {}

  /**
   * Clock in a guard to a shift
   * Validates that the guard is within the site's geofence (if required)
   *
   * @param data - Clock in data including location
   * @returns Clock in result with shift and validation details
   */
  async clockIn(data: IClockInDTO): Promise<IClockInResult> {
    // 1. Check if already clocked in
    const active = await this.shiftRepository.findActiveForGuard(data.guardId);
    if (active) {
      return {
        success: false,
        error: 'Already clocked in to an active shift',
        shift: active,
      };
    }

    // 2. Verify site exists
    const site = await this.siteRepository.findById(data.siteId);
    if (!site) {
      return {
        success: false,
        error: 'Site not found',
      };
    }

    // 3. Validate GPS location
    const gpsValidation = this.geofenceService.validateGPSLocation({
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      accuracy: data.location.accuracy,
      timestamp: new Date(),
    });

    if (!gpsValidation.isValid) {
      return {
        success: false,
        error: gpsValidation.errors?.join(', ') || 'Invalid GPS location',
      };
    }

    // 4. Validate geofence (if required)
    let isWithinGeofence = true;
    let warning: string | undefined;

    if (this.config.requireGeofenceForClockIn) {
      const geofence = new GeofenceBoundary(site.geofenceBoundary, site.geofenceBuffer);
      const geofenceValidation = this.geofenceService.validateLocationInGeofence(
        site.id,
        geofence,
        data.location.latitude,
        data.location.longitude,
        data.location.accuracy
      );

      isWithinGeofence = geofenceValidation.isInsideGeofence;

      if (!isWithinGeofence) {
        return {
          success: false,
          error: 'Must be within site geofence to clock in',
          isWithinGeofence: false,
        };
      }

      if (geofenceValidation.warnings && geofenceValidation.warnings.length > 0) {
        warning = geofenceValidation.warnings.join(', ');
      }
    }

    // 5. Find scheduled shift for today (or create unscheduled shift)
    const now = new Date();
    const scheduledShifts = await this.shiftRepository.findScheduledShifts(now);
    const scheduledForToday = scheduledShifts.find(
      (s) => s.siteId === data.siteId && s.guardId === data.guardId
    );

    let shift: IShift;

    if (scheduledForToday) {
      // Update the scheduled shift with clock-in data
      shift = (await this.shiftRepository.update(scheduledForToday.id, {
        status: ShiftStatus.CLOCKED_IN,
        actualStart: now,
        clockInLocation: data.location,
        notes: data.notes || scheduledForToday.notes,
      }))!;
    } else {
      // Create an unscheduled shift
      const scheduledEnd = new Date(now);
      scheduledEnd.setHours(scheduledEnd.getHours() + 8); // Default 8-hour shift

      shift = await this.shiftRepository.create({
        siteId: data.siteId,
        guardId: data.guardId,
        type: ShiftType.REGULAR,
        scheduledStart: now,
        scheduledEnd,
      });

      // Update to clocked-in state
      shift = (await this.shiftRepository.update(shift.id, {
        status: ShiftStatus.CLOCKED_IN,
        actualStart: now,
        clockInLocation: data.location,
        notes: data.notes,
      }))!;
    }

    // 6. Check if late
    const scheduledStart = new Date(shift.scheduledStart);
    const minutesLate = Math.max(0, (now.getTime() - scheduledStart.getTime()) / (1000 * 60));
    const isLate = minutesLate > this.config.lateToleranceMinutes;

    return {
      success: true,
      shift,
      warning,
      isLate,
      minutesLate: isLate ? minutesLate : undefined,
      isWithinGeofence,
    };
  }

  /**
   * Clock out a guard from their active shift
   * Validates that the guard is within the site's geofence (if required)
   *
   * @param data - Clock out data including location
   * @returns Clock out result with duration details
   */
  async clockOut(data: IClockOutDTO): Promise<IClockOutResult> {
    // 1. Find active shift
    const active = await this.shiftRepository.findActiveForGuard(data.guardId);
    if (!active) {
      return {
        success: false,
        error: 'No active shift found to clock out',
      };
    }

    // 2. Validate GPS location
    const gpsValidation = this.geofenceService.validateGPSLocation({
      latitude: data.location.latitude,
      longitude: data.location.longitude,
      accuracy: data.location.accuracy,
      timestamp: new Date(),
    });

    if (!gpsValidation.isValid) {
      return {
        success: false,
        error: gpsValidation.errors?.join(', ') || 'Invalid GPS location',
      };
    }

    // 3. Validate geofence (if required)
    const site = await this.siteRepository.findById(active.siteId);
    if (this.config.requireGeofenceForClockOut && site) {
      const geofence = new GeofenceBoundary(site.geofenceBoundary, site.geofenceBuffer);
      const geofenceValidation = this.geofenceService.validateLocationInGeofence(
        site.id,
        geofence,
        data.location.latitude,
        data.location.longitude,
        data.location.accuracy
      );

      if (!geofenceValidation.isInsideGeofence) {
        return {
          success: false,
          error: 'Must be within site geofence to clock out',
        };
      }
    }

    // 4. Calculate duration
    const now = new Date();
    const scheduledStart = new Date(active.scheduledStart);
    const scheduledEnd = new Date(active.scheduledEnd);
    const actualStart = new Date(active.actualStart!);

    const scheduledDuration = (scheduledEnd.getTime() - scheduledStart.getTime()) / (1000 * 60);
    const actualDuration = (now.getTime() - actualStart.getTime()) / (1000 * 60);
    const overtime = Math.max(0, actualDuration - scheduledDuration);

    // 5. Update shift
    const shift = (await this.shiftRepository.update(active.id, {
      status: ShiftStatus.CLOCKED_OUT,
      actualEnd: now,
      clockOutLocation: data.location,
      notes: data.notes || active.notes,
    }))!;

    return {
      success: true,
      shift,
      duration: {
        scheduled: scheduledDuration,
        actual: actualDuration,
        overtime,
      },
    };
  }

  /**
   * Get a shift by ID
   *
   * @param id - Shift ID
   * @returns Shift or null if not found
   */
  async getShift(id: number): Promise<IShift | null> {
    return this.shiftRepository.findById(id);
  }

  /**
   * List shifts with optional filtering
   *
   * @param options - Query options for filtering and pagination
   * @returns Paginated shifts
   */
  async listShifts(options: IShiftQueryOptions = {}): Promise<IPaginatedShifts> {
    return this.shiftRepository.findAll(options);
  }

  /**
   * Create a new scheduled shift
   *
   * @param data - Shift creation data
   * @returns Created shift
   */
  async createShift(data: ICreateShiftDTO): Promise<IShift> {
    if (data.scheduledEnd <= data.scheduledStart) {
      throw new ValidationError('Scheduled end time must be after start time');
    }

    // Check for overlapping shifts for the same guard
    const guardShifts = await this.shiftRepository.findByGuard(data.guardId, {
      start: data.scheduledStart,
      end: data.scheduledEnd,
    });

    const hasOverlap = guardShifts.data.some((existing) => {
      if (existing.status === ShiftStatus.CANCELLED) return false;
      const existingStart = new Date(existing.scheduledStart).getTime();
      const existingEnd = new Date(existing.scheduledEnd).getTime();
      const newStart = new Date(data.scheduledStart).getTime();
      const newEnd = new Date(data.scheduledEnd).getTime();
      return newStart < existingEnd && newEnd > existingStart;
    });

    if (hasOverlap) {
      throw new ConflictError('Guard already has a shift scheduled during this time period');
    }

    return this.shiftRepository.create(data);
  }

  /**
   * Update a shift
   *
   * @param id - Shift ID
   * @param data - Update data
   * @returns Updated shift or null if not found
   */
  async updateShift(id: number, data: Partial<ICreateShiftDTO>): Promise<IShift | null> {
    const shift = await this.shiftRepository.findById(id);
    if (!shift) {
      throw new NotFoundError('Shift not found');
    }

    // Cannot modify active shifts
    if (shift.status === ShiftStatus.CLOCKED_IN) {
      throw new ConflictError('Cannot modify a shift that is currently in progress');
    }

    return this.shiftRepository.update(id, data);
  }

  /**
   * Cancel a shift
   *
   * @param id - Shift ID
   * @returns True if cancelled
   */
  async cancelShift(id: number): Promise<boolean> {
    const shift = await this.shiftRepository.findById(id);
    if (!shift) {
      throw new NotFoundError('Shift not found');
    }

    // Cannot cancel active shifts
    if (shift.status === ShiftStatus.CLOCKED_IN) {
      throw new ConflictError('Cannot cancel a shift that is currently in progress');
    }

    // Cannot cancel completed shifts
    if (shift.status === ShiftStatus.CLOCKED_OUT) {
      throw new ConflictError('Cannot cancel a completed shift');
    }

    await this.shiftRepository.update(id, { status: ShiftStatus.CANCELLED });
    return true;
  }

  /**
   * Get shift statistics for a date range
   *
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Shift statistics
   */
  async getStatistics(startDate: Date, endDate: Date): Promise<IShiftStatistics> {
    return this.shiftRepository.getStatistics(startDate, endDate);
  }

  /**
   * Get attendance report for a site and date range
   *
   * @param siteId - Site ID (optional, all sites if null)
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Attendance records
   */
  async getAttendanceReport(siteId: number | null, startDate: Date, endDate: Date): Promise<IAttendanceRecord[]> {
    return this.shiftRepository.getAttendanceReport(siteId || 0, startDate, endDate);
  }

  /**
   * Mark missed shifts for a given date
   * Should be called periodically (e.g., every hour) to auto-mark missed shifts
   *
   * @param date - Date to check for missed shifts
   * @returns Number of shifts marked as missed
   */
  async markMissedShifts(date: Date): Promise<number> {
    if (!this.config.autoMarkMissedShifts) {
      return 0;
    }

    return this.shiftRepository.markMissedShifts(date);
  }

  /**
   * Get scheduled shifts for a date
   *
   * @param date - Date to get shifts for
   * @returns List of scheduled shifts
   */
  async getScheduledShifts(date: Date): Promise<IShift[]> {
    return this.shiftRepository.findScheduledShifts(date);
  }

  /**
   * Get missed shifts for a date
   *
   * @param date - Date to get missed shifts for
   * @returns List of missed shifts
   */
  async getMissedShifts(date: Date): Promise<IShift[]> {
    return this.shiftRepository.findMissedShifts(date);
  }

  /**
   * Get shifts for a specific guard
   *
   * @param guardId - Guard ID
   * @param options - Query options
   * @returns Paginated shifts
   */
  async getGuardShifts(guardId: number, options: IShiftQueryOptions = {}): Promise<IPaginatedShifts> {
    return this.shiftRepository.findByGuard(guardId, options);
  }

  /**
   * Get shifts for a specific site
   *
   * @param siteId - Site ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns List of shifts
   */
  async getSiteShifts(siteId: number, startDate: Date, endDate: Date): Promise<IShift[]> {
    return this.shiftRepository.findBySite(siteId, { start: startDate, end: endDate });
  }

  /**
   * Get active shifts for all guards
   *
   * @returns List of currently active shifts
   */
  async getActiveShifts(): Promise<IShift[]> {
    const result = await this.shiftRepository.findAll({ status: ShiftStatus.CLOCKED_IN });
    return result.data;
  }

  /**
   * Update shift configuration
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<IShiftConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Get current configuration
   *
   * @returns Current shift configuration
   */
  getConfig(): IShiftConfig {
    return { ...this.config };
  }
}

/**
 * Service singleton instance
 */
let shiftServiceInstance: ShiftService | null = null;

/**
 * Initialize the ShiftService singleton
 *
 * @param shiftRepository - Shift repository
 * @param siteRepository - Site repository
 * @param geofenceService - Geofence service
 * @param config - Optional configuration
 * @returns ShiftService instance
 */
export function initializeShiftService(
  shiftRepository: IShiftRepository,
  siteRepository: ISiteRepository,
  geofenceService: GeofenceService,
  config?: IShiftConfig
): ShiftService {
  if (!shiftServiceInstance) {
    shiftServiceInstance = new ShiftService(shiftRepository, siteRepository, geofenceService, config);
  }
  return shiftServiceInstance;
}

/**
 * Get the ShiftService singleton instance
 *
 * @returns ShiftService instance or throws if not initialized
 */
export function getShiftService(): ShiftService {
  if (!shiftServiceInstance) {
    throw new Error('ShiftService not initialized. Call initializeShiftService first.');
  }
  return shiftServiceInstance;
}
