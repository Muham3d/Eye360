/**
 * Shift Domain Entity
 *
 * Represents a guard's scheduled and actual work shift.
 * Supports geofenced clock-in/out and attendance tracking.
 *
 * @module core/domain/entities
 */

/**
 * GPS Location interface
 */
export interface GPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

/**
 * Shift Status Enum
 * Represents the state of a shift throughout its lifecycle
 */
export enum ShiftStatus {
  SCHEDULED = 'scheduled',
  CLOCKED_IN = 'clocked_in',
  CLOCKED_OUT = 'clocked_out',
  MISSED = 'missed',
  CANCELLED = 'cancelled',
}

/**
 * Shift Type Enum
 * Different types of shifts for scheduling purposes
 */
export enum ShiftType {
  REGULAR = 'regular',
  OVERTIME = 'overtime',
  EMERGENCY = 'emergency',
  TRAINING = 'training',
}

/**
 * Clock In Result
 * Result of a clock-in attempt with validation details
 */
export interface IClockInResult {
  success: boolean;
  shift?: IShift;
  error?: string;
  warning?: string;
  isLate?: boolean;
  minutesLate?: number;
  isWithinGeofence?: boolean;
}

/**
 * Clock Out Result
 * Result of a clock-out attempt with work duration details
 */
export interface IClockOutResult {
  success: boolean;
  shift?: IShift;
  error?: string;
  duration?: {
    scheduled: number; // minutes
    actual: number; // minutes
    overtime: number; // minutes
  };
}

/**
 * Shift Domain Entity
 * Pure domain entity without database-specific annotations
 */
export interface IShift {
  id: number;
  siteId: number;
  guardId: number;
  status: ShiftStatus;
  type: ShiftType;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  clockInLocation?: GPSLocation;
  clockOutLocation?: GPSLocation;
  notes: string | null;
  missedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Shift Creation DTO
 * Data required to create a new scheduled shift
 */
export interface ICreateShiftDTO {
  siteId: number;
  guardId: number;
  type: ShiftType;
  scheduledStart: Date;
  scheduledEnd: Date;
  notes?: string;
}

/**
 * Clock In DTO
 * Data required for clock-in
 */
export interface IClockInDTO {
  guardId: number;
  siteId: number;
  location: GPSLocation;
  notes?: string;
}

/**
 * Clock Out DTO
 * Data required for clock-out
 */
export interface IClockOutDTO {
  guardId: number;
  location: GPSLocation;
  notes?: string;
}

/**
 * Shift Query Options
 * Filters and pagination options for shift queries
 */
export interface IShiftQueryOptions {
  siteId?: number;
  guardId?: number;
  status?: ShiftStatus;
  type?: ShiftType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'scheduledStart' | 'actualStart' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Shift Statistics
 * Aggregated shift statistics for reporting
 */
export interface IShiftStatistics {
  totalShifts: number;
  scheduledShifts: number;
  completedShifts: number;
  missedShifts: number;
  cancelledShifts: number;
  averageShiftDuration: number; // minutes
  onTimeClockInRate: number; // percentage
  averageOvertime: number; // minutes per shift
  byGuard: Record<number, {
    totalShifts: number;
    completedShifts: number;
    missedShifts: number;
    totalHours: number;
    onTimeRate: number;
  }>;
  bySite: Record<number, {
    totalShifts: number;
    completedShifts: number;
    missedShifts: number;
    totalHours: number;
  }>;
}

/**
 * Attendance Record
 * Individual attendance record for a guard
 */
export interface IAttendanceRecord {
  guardId: number;
  guardName: string;
  shiftId: number;
  siteName: string;
  type: ShiftType;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  status: ShiftStatus;
  isLate: boolean;
  minutesLate?: number;
  hasEarlyLeave?: boolean;
  minutesEarly?: number;
  overtimeMinutes?: number;
  notes?: string;
}

/**
 * Paginated Shifts
 * Paginated result for shift queries
 */
export interface IPaginatedShifts {
  data: IShift[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
