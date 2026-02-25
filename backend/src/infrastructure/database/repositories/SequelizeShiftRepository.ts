/**
 * Sequelize Shift Repository
 */

import { Op, literal, fn, col } from 'sequelize';
import { BaseRepository } from './BaseRepository.js';
import models from '../models/index.js';
import type {
  IShift,
  ICreateShiftDTO,
  IShiftQueryOptions,
  IShiftStatistics,
  IAttendanceRecord,
  IPaginatedShifts,
  ShiftStatus,
  ShiftType,
} from '../../../core/domain/entities/Shift.js';
import type { IShiftRepository } from '../../../core/domain/repositories/IShiftRepository.js';

/**
 * Sequelize Shift Repository Implementation
 */
export class SequelizeShiftRepository extends BaseRepository<any> implements IShiftRepository {
  protected getModel() {
    return models.Shift;
  }

  /**
   * Map Sequelize model to domain entity
   */
  private mapToEntity(model: any): IShift {
    return {
      id: model.id,
      siteId: model.site_id,
      guardId: model.guard_id,
      status: model.status as ShiftStatus,
      type: model.type as ShiftType,
      scheduledStart: model.scheduled_start,
      scheduledEnd: model.scheduled_end,
      actualStart: model.actual_start,
      actualEnd: model.actual_end,
      clockInLocation: model.clock_in_location
        ? {
            latitude: model.clock_in_location.coordinates[1],
            longitude: model.clock_in_location.coordinates[0],
          }
        : undefined,
      clockOutLocation: model.clock_out_location
        ? {
            latitude: model.clock_out_location.coordinates[1],
            longitude: model.clock_out_location.coordinates[0],
          }
        : undefined,
      notes: model.notes,
      missedReason: model.missed_reason,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    };
  }

  async findById(id: number): Promise<IShift | null> {
    const model = await models.Shift.findByPk(id, {
      include: [
        {
          model: models.Site,
          as: 'site',
          attributes: ['id', 'name'],
        },
        {
          model: models.User,
          as: 'guard',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
    return model ? this.mapToEntity(model) : null;
  }

  async findAll(options: IShiftQueryOptions = {}): Promise<IPaginatedShifts> {
    const whereClause: any = {};

    if (options.siteId) whereClause.site_id = options.siteId;
    if (options.guardId) whereClause.guard_id = options.guardId;
    if (options.status) whereClause.status = options.status;
    if (options.type) whereClause.type = options.type;

    if (options.startDate || options.endDate) {
      whereClause.scheduled_start = {};
      if (options.startDate) whereClause.scheduled_start[Op.gte] = options.startDate;
      if (options.endDate) whereClause.scheduled_start[Op.lte] = options.endDate;
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const sortBy = options.sortBy || 'scheduledStart';
    const sortOrder = options.sortOrder || 'DESC';
    const orderField =
      sortBy === 'scheduledStart'
        ? 'scheduled_start'
        : sortBy === 'actualStart'
        ? 'actual_start'
        : sortBy;

    const { count, rows } = await models.Shift.findAndCountAll({
      where: whereClause,
      include: [
        { model: models.Site, as: 'site', attributes: ['id', 'name'] },
        { model: models.User, as: 'guard', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [[orderField, sortOrder.toUpperCase()]],
      limit,
      offset,
      distinct: true,
    });

    return {
      data: rows.map((m) => this.mapToEntity(m)),
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  async create(data: ICreateShiftDTO): Promise<IShift> {
    const model = await models.Shift.create({
      site_id: data.siteId,
      guard_id: data.guardId,
      type: data.type || 'regular',
      scheduled_start: data.scheduledStart,
      scheduled_end: data.scheduledEnd,
      status: ShiftStatus.SCHEDULED,
      notes: data.notes || null,
    });

    // Fetch with relations
    return (await this.findById(model.id))!;
  }

  async update(id: number, data: any): Promise<IShift | null> {
    const updateData: any = {};

    if (data.status !== undefined) updateData.status = data.status;
    if (data.actualStart !== undefined) updateData.actual_start = data.actualStart;
    if (data.actualEnd !== undefined) updateData.actual_end = data.actualEnd;
    if (data.clockInLocation !== undefined) {
      updateData.clock_in_location = {
        type: 'Point',
        coordinates: [data.clockInLocation.longitude, data.clockInLocation.latitude],
      };
    }
    if (data.clockOutLocation !== undefined) {
      updateData.clock_out_location = {
        type: 'Point',
        coordinates: [data.clockOutLocation.longitude, data.clockOutLocation.latitude],
      };
    }
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.missedReason !== undefined) updateData.missed_reason = data.missedReason;

    await models.Shift.update(updateData, { where: { id } });
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const count = await models.Shift.destroy({ where: { id } });
    return count > 0;
  }

  async findActiveForGuard(userId: number): Promise<IShift | null> {
    const model = await models.Shift.findOne({
      where: {
        guard_id: userId,
        status: ShiftStatus.CLOCKED_IN,
      },
      include: [
        { model: models.Site, as: 'site', attributes: ['id', 'name'] },
        { model: models.User, as: 'guard', attributes: ['id', 'firstName', 'lastName'] },
      ],
    });
    return model ? this.mapToEntity(model) : null;
  }

  async findBySite(siteId: number, range: { start: Date; end: Date }): Promise<IShift[]> {
    const models = await this.getModel().findAll({
      where: {
        site_id: siteId,
        scheduled_start: { [Op.between]: [range.start, range.end] },
      },
      include: [
        { model: models.Site, as: 'site', attributes: ['id', 'name'] },
        { model: models.User, as: 'guard', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['scheduled_start', 'ASC']],
    });
    return models.map((m) => this.mapToEntity(m));
  }

  async findByGuard(guardId: number, options: IShiftQueryOptions = {}): Promise<IPaginatedShifts> {
    return this.findAll({ ...options, guardId });
  }

  async findScheduledShifts(date: Date): Promise<IShift[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const models = await this.getModel().findAll({
      where: {
        scheduled_start: { [Op.between]: [startOfDay, endOfDay] },
        status: { [Op.in]: [ShiftStatus.SCHEDULED, ShiftStatus.CLOCKED_IN, ShiftStatus.CLOCKED_OUT] },
      },
      include: [
        { model: models.Site, as: 'site', attributes: ['id', 'name'] },
        { model: models.User, as: 'guard', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['scheduled_start', 'ASC']],
    });
    return models.map((m) => this.mapToEntity(m));
  }

  async findMissedShifts(date: Date): Promise<IShift[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const models = await this.getModel().findAll({
      where: {
        scheduled_start: { [Op.between]: [startOfDay, endOfDay] },
        status: ShiftStatus.SCHEDULED,
      },
      include: [
        { model: models.Site, as: 'site', attributes: ['id', 'name'] },
        { model: models.User, as: 'guard', attributes: ['id', 'firstName', 'lastName'] },
      ],
      order: [['scheduled_start', 'ASC']],
    });
    return models.map((m) => this.mapToEntity(m));
  }

  async markMissedShifts(date: Date): Promise<number> {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const [affectedCount] = await models.Shift.update(
      { status: ShiftStatus.MISSED, missed_reason: 'No show - auto-marked as missed' },
      {
        where: {
          scheduled_end: { [Op.lt]: endOfDay },
          status: ShiftStatus.SCHEDULED,
        },
      }
    );
    return affectedCount;
  }

  async getStatistics(startDate: Date, endDate: Date): Promise<IShiftStatistics> {
    const whereClause = {
      scheduled_start: { [Op.between]: [startDate, endDate] },
    };

    const totalShifts = await models.Shift.count({ where: whereClause });

    const statusCounts = await models.Shift.findAll({
      where: whereClause,
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const statusMap: Record<string, number> = {
      [ShiftStatus.SCHEDULED]: 0,
      [ShiftStatus.CLOCKED_IN]: 0,
      [ShiftStatus.CLOCKED_OUT]: 0,
      [ShiftStatus.MISSED]: 0,
      [ShiftStatus.CANCELLED]: 0,
    };

    for (const row of statusCounts) {
      statusMap[row.status] = parseInt(row.count);
    }

    const completedShifts = await models.Shift.count({
      where: { ...whereClause, status: ShiftStatus.CLOCKED_OUT },
    });

    // Calculate average shift duration
    const completedShiftModels = await models.Shift.findAll({
      where: { ...whereClause, status: ShiftStatus.CLOCKED_OUT },
      attributes: ['scheduled_start', 'scheduled_end', 'actual_start', 'actual_end'],
      raw: true,
    });

    let totalScheduledDuration = 0;
    let totalActualDuration = 0;
    let onTimeCount = 0;
    let totalOvertime = 0;

    for (const shift of completedShiftModels) {
      const scheduledDuration =
        (new Date(shift.scheduled_end).getTime() - new Date(shift.scheduled_start).getTime()) / (1000 * 60);
      const actualDuration =
        (new Date(shift.actual_end).getTime() - new Date(shift.actual_start).getTime()) / (1000 * 60);

      totalScheduledDuration += scheduledDuration;
      totalActualDuration += actualDuration;

      // Check if clocked in on time (within 5 minutes)
      const lateMinutes = (new Date(shift.actual_start).getTime() - new Date(shift.scheduled_start).getTime()) / (1000 * 60);
      if (lateMinutes <= 5) {
        onTimeCount++;
      }

      // Calculate overtime
      const overtime = actualDuration - scheduledDuration;
      if (overtime > 0) {
        totalOvertime += overtime;
      }
    }

    const averageShiftDuration = completedShifts > 0 ? totalActualDuration / completedShifts : 0;
    const onTimeClockInRate = completedShifts > 0 ? (onTimeCount / completedShifts) * 100 : 0;
    const averageOvertime = completedShifts > 0 ? totalOvertime / completedShifts : 0;

    // Statistics by guard
    const guardStats = await models.Shift.findAll({
      where: whereClause,
      attributes: [
        'guard_id',
        [fn('COUNT', col('id')), 'total_shifts'],
        [fn('SUM', literal("CASE WHEN status = 'clocked_out' THEN 1 ELSE 0 END")), 'completed_shifts'],
        [fn('SUM', literal("CASE WHEN status = 'missed' THEN 1 ELSE 0 END")), 'missed_shifts'],
      ],
      group: ['guard_id'],
      include: [
        {
          model: models.User,
          as: 'guard',
          attributes: ['firstName', 'lastName'],
        },
      ],
      raw: false,
    });

    const byGuard: Record<number, any> = {};
    for (const stat of guardStats) {
      const guardId = stat.guard_id;
      const totalShifts = parseInt(stat.dataValues.total_shifts);
      const completedShifts = parseInt(stat.dataValues.completed_shifts);
      const missedShifts = parseInt(stat.dataValues.missed_shifts);

      // Calculate total hours and on-time rate for this guard
      const guardShifts = await models.Shift.findAll({
        where: { ...whereClause, guard_id: guardId, status: ShiftStatus.CLOCKED_OUT },
        attributes: ['actual_start', 'actual_end', 'scheduled_start'],
        raw: true,
      });

      let totalMinutes = 0;
      let guardOnTimeCount = 0;

      for (const shift of guardShifts) {
        totalMinutes += (new Date(shift.actual_end).getTime() - new Date(shift.actual_start).getTime()) / (1000 * 60);
        const lateMinutes = (new Date(shift.actual_start).getTime() - new Date(shift.scheduled_start).getTime()) / (1000 * 60);
        if (lateMinutes <= 5) guardOnTimeCount++;
      }

      byGuard[guardId] = {
        totalShifts,
        completedShifts,
        missedShifts,
        totalHours: totalMinutes / 60,
        onTimeRate: guardShifts.length > 0 ? (guardOnTimeCount / guardShifts.length) * 100 : 0,
      };
    }

    // Statistics by site
    const siteStats = await models.Shift.findAll({
      where: whereClause,
      attributes: [
        'site_id',
        [fn('COUNT', col('id')), 'total_shifts'],
        [fn('SUM', literal("CASE WHEN status = 'clocked_out' THEN 1 ELSE 0 END")), 'completed_shifts'],
        [fn('SUM', literal("CASE WHEN status = 'missed' THEN 1 ELSE 0 END")), 'missed_shifts'],
      ],
      group: ['site_id'],
      include: [
        {
          model: models.Site,
          as: 'site',
          attributes: ['name'],
        },
      ],
      raw: false,
    });

    const bySite: Record<number, any> = {};
    for (const stat of siteStats) {
      const siteId = stat.site_id;
      const totalShifts = parseInt(stat.dataValues.total_shifts);
      const completedShifts = parseInt(stat.dataValues.completed_shifts);
      const missedShifts = parseInt(stat.dataValues.missed_shifts);

      const siteShifts = await models.Shift.findAll({
        where: { ...whereClause, site_id: siteId, status: ShiftStatus.CLOCKED_OUT },
        attributes: ['actual_start', 'actual_end'],
        raw: true,
      });

      let totalMinutes = 0;
      for (const shift of siteShifts) {
        totalMinutes += (new Date(shift.actual_end).getTime() - new Date(shift.actual_start).getTime()) / (1000 * 60);
      }

      bySite[siteId] = {
        totalShifts,
        completedShifts,
        missedShifts,
        totalHours: totalMinutes / 60,
      };
    }

    return {
      totalShifts,
      scheduledShifts: statusMap[ShiftStatus.SCHEDULED],
      completedShifts: statusMap[ShiftStatus.CLOCKED_OUT],
      missedShifts: statusMap[ShiftStatus.MISSED],
      cancelledShifts: statusMap[ShiftStatus.CANCELLED],
      averageShiftDuration,
      onTimeClockInRate,
      averageOvertime,
      byGuard,
      bySite,
    };
  }

  async getAttendanceReport(siteId: number, startDate: Date, endDate: Date): Promise<IAttendanceRecord[]> {
    const whereClause: any = {
      scheduled_start: { [Op.between]: [startDate, endDate] },
    };

    if (siteId) whereClause.site_id = siteId;

    const shifts = await models.Shift.findAll({
      where: whereClause,
      include: [
        {
          model: models.Site,
          as: 'site',
          attributes: ['id', 'name'],
        },
        {
          model: models.User,
          as: 'guard',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      order: [['scheduled_start', 'ASC']],
    });

    return shifts.map((shift) => {
      const isLate =
        shift.actual_start &&
        new Date(shift.actual_start).getTime() > new Date(shift.scheduled_start).getTime();
      const minutesLate = isLate
        ? (new Date(shift.actual_start).getTime() - new Date(shift.scheduled_start).getTime()) / (1000 * 60)
        : undefined;

      const scheduledDuration =
        (new Date(shift.scheduled_end).getTime() - new Date(shift.scheduled_start).getTime()) / (1000 * 60);
      const actualDuration =
        shift.actual_start && shift.actual_end
          ? (new Date(shift.actual_end).getTime() - new Date(shift.actual_start).getTime()) / (1000 * 60)
          : 0;
      const overtimeMinutes = actualDuration > scheduledDuration ? actualDuration - scheduledDuration : 0;

      const hasEarlyLeave =
        shift.actual_end &&
        new Date(shift.actual_end).getTime() < new Date(shift.scheduled_end).getTime();
      const minutesEarly = hasEarlyLeave
        ? (new Date(shift.scheduled_end).getTime() - new Date(shift.actual_end).getTime()) / (1000 * 60)
        : undefined;

      return {
        guardId: shift.guard_id,
        guardName: `${shift.guard?.firstName || ''} ${shift.guard?.lastName || ''}`.trim(),
        shiftId: shift.id,
        siteName: shift.site?.name || 'Unknown',
        type: shift.type,
        scheduledStart: shift.scheduled_start,
        scheduledEnd: shift.scheduled_end,
        actualStart: shift.actual_start,
        actualEnd: shift.actual_end,
        status: shift.status,
        isLate: isLate || false,
        minutesLate,
        hasEarlyLeave: hasEarlyLeave || false,
        minutesEarly,
        overtimeMinutes,
        notes: shift.notes,
      };
    });
  }
}

export default SequelizeShiftRepository;
