/**
 * IShiftRepository Interface
 */

import type {
  IShift,
  ICreateShiftDTO,
  IShiftQueryOptions,
  IShiftStatistics,
  IAttendanceRecord,
  IPaginatedShifts,
} from '../entities/Shift.js';

export interface IShiftRepository {
  findById(id: number): Promise<IShift | null>;
  findAll(options?: IShiftQueryOptions): Promise<IPaginatedShifts>;
  create(data: ICreateShiftDTO): Promise<IShift>;
  update(id: number, data: any): Promise<IShift | null>;
  delete(id: number): Promise<boolean>;
  findActiveForGuard(userId: number): Promise<IShift | null>;
  findBySite(siteId: number, range: { start: Date; end: Date }): Promise<IShift[]>;
  findByGuard(guardId: number, options?: IShiftQueryOptions): Promise<IPaginatedShifts>;
  findScheduledShifts(date: Date): Promise<IShift[]>;
  findMissedShifts(date: Date): Promise<IShift[]>;
  markMissedShifts(date: Date): Promise<number>;
  getStatistics(startDate: Date, endDate: Date): Promise<IShiftStatistics>;
  getAttendanceReport(siteId: number, startDate: Date, endDate: Date): Promise<IAttendanceRecord[]>;
}
