/**
 * Sequelize Location History Repository Implementation
 *
 * @module infrastructure/database/repositories
 */

import type {
  ILocationHistory,
  ICreateLocationHistoryDTO,
  ILocationBatchDTO,
  ILocationQueryOptions,
  ILocationStatistics,
} from '../../../core/domain/entities/LocationHistory.js';
import type { ILocationHistoryRepository } from '../../../core/domain/repositories/ILocationHistoryRepository.js';
import { Op } from 'sequelize';
import models from '../models/index.js';

/**
 * Sequelize implementation of Location History Repository
 */
export class SequelizeLocationHistoryRepository implements ILocationHistoryRepository {
  /**
   * Convert model to domain entity
   */
  private toEntity(model: any): ILocationHistory {
    return {
      id: model.id,
      guardId: model.guardId,
      location: {
        latitude: parseFloat(model.latitude),
        longitude: parseFloat(model.longitude),
      },
      accuracy: model.accuracy ? parseFloat(model.accuracy) : undefined,
      speed: model.speed ? parseFloat(model.speed) : undefined,
      bearing: model.bearing ? parseFloat(model.bearing) : undefined,
      altitude: model.altitude ? parseFloat(model.altitude) : undefined,
      batteryLevel: model.batteryLevel,
      isActiveShift: model.isActiveShift,
      activePatrolRunId: model.activePatrolRunId || undefined,
      batchId: model.batchId || undefined,
      status: model.status,
      receivedAt: model.receivedAt,
      createdAt: model.createdAt,
    };
  }

  async create(dto: ICreateLocationHistoryDTO): Promise<ILocationHistory> {
    const location = await models.LocationHistory.create({
      guardId: dto.guardId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      speed: dto.speed,
      bearing: dto.bearing,
      altitude: dto.altitude,
      batteryLevel: dto.batteryLevel,
      isActiveShift: dto.isActiveShift,
      activePatrolRunId: dto.activePatrolRunId,
      batchId: dto.batchId,
      receivedAt: new Date(),
      status: 'processed',
    });
    return this.toEntity(location);
  }

  async createBatch(dto: ILocationBatchDTO): Promise<number> {
    const records = dto.locations.map((loc) => ({
      guardId: dto.guardId,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracy: loc.accuracy,
      speed: loc.speed,
      bearing: loc.bearing,
      altitude: loc.altitude,
      batteryLevel: loc.batteryLevel,
      isActiveShift: dto.isActiveShift,
      activePatrolRunId: dto.activePatrolRunId,
      batchId: dto.batchId,
      receivedAt: loc.timestamp,
      status: 'processed',
      createdAt: new Date(),
    }));

    const result = await models.LocationHistory.bulkCreate(records, {
      validate: true,
      logging: false, // Disable logging for bulk inserts
    });

    return result.length;
  }

  async findByGuardId(
    guardId: number,
    options: ILocationQueryOptions = {}
  ): Promise<ILocationHistory[]> {
    const whereCondition: any = { guardId };

    if (options.startDate || options.endDate) {
      whereCondition.receivedAt = {};
      if (options.startDate) {
        whereCondition.receivedAt[Op.gte] = options.startDate;
      }
      if (options.endDate) {
        whereCondition.receivedAt[Op.lte] = options.endDate;
      }
    }

    if (options.batchId) {
      whereCondition.batchId = options.batchId;
    }

    const locations = await models.LocationHistory.findAll({
      where: whereCondition,
      limit: options.limit || 1000,
      order: [
        [(options.sortBy || 'receivedAt'), (options.sortOrder || 'DESC')],
      ],
    });

    return locations.map((l) => this.toEntity(l));
  }

  async findByPatrolRunId(patrolRunId: number): Promise<ILocationHistory[]> {
    const locations = await models.LocationHistory.findAll({
      where: { activePatrolRunId: patrolRunId },
      order: [['receivedAt', 'ASC']],
    });
    return locations.map((l) => this.toEntity(l));
  }

  async findLatestByGuardId(guardId: number): Promise<ILocationHistory | null> {
    const location = await models.LocationHistory.findOne({
      where: { guardId },
      order: [['receivedAt', 'DESC']],
    });
    return location ? this.toEntity(location) : null;
  }

  async findActiveGuardsLocations(): Promise<Map<number, ILocationHistory>> {
    // Find all guards with active shifts and get their latest locations
    const locations = await models.LocationHistory.findAll({
      where: { isActiveShift: true },
      order: [['receivedAt', 'DESC']],
      limit: 1000,
    });

    const guardLatestMap = new Map<number, ILocationHistory>();
    for (const loc of locations) {
      if (!guardLatestMap.has(loc.guardId)) {
        guardLatestMap.set(loc.guardId, this.toEntity(loc));
      }
    }

    return guardLatestMap;
  }

  async getStatistics(): Promise<ILocationStatistics> {
    const totalPoints = await models.LocationHistory.count();

    // Calculate average accuracy
    const avgAccuracyResult = await models.LocationHistory.findOne({
      attributes: [
        [models.LocationHistory.sequelize.fn('AVG', models.LocationHistory.sequelize.col('accuracy')), 'avgAccuracy'],
      ],
      where: { accuracy: { [Op.not]: null } },
      raw: true,
    });

    // Count active guards (with location in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeGuards = await models.LocationHistory.count({
      where: {
        isActiveShift: true,
        receivedAt: { [Op.gte]: fiveMinutesAgo },
      },
      group: ['guardId'],
    });

    // Calculate coverage distance (sum of all distances between consecutive points)
    // This is a simplified calculation - for production, consider using PostGIS
    const recentLocations = await models.LocationHistory.findAll({
      where: { isActiveShift: true },
      order: [['guardId', 'receivedAt']],
      limit: 1000,
    });

    let totalDistance = 0;
    let lastLocationByGuard = new Map<number, { lat: number; lng: number }>();

    for (const loc of recentLocations) {
      const lat = parseFloat(loc.latitude);
      const lng = parseFloat(loc.longitude);
      const guardId = loc.guardId;

      if (lastLocationByGuard.has(guardId)) {
        const last = lastLocationByGuard.get(guardId)!;
        totalDistance += this.calculateDistance(last.lat, last.lng, lat, lng);
      }

      lastLocationByGuard.set(guardId, { lat, lng });
    }

    return {
      totalPoints,
      averageAccuracy: avgAccuracyResult
        ? parseFloat(avgAccuracyResult.avgAccuracy || '0')
        : 0,
      coverageDistance: totalDistance,
      activeGuards: activeGuards.length,
      averagePointsPerGuard: totalPoints > 0 ? totalPoints / Math.max(activeGuards.length, 1) : 0,
    };
  }

  /**
   * Calculate distance between two points in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async archiveOldRecords(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const [count] = await models.LocationHistory.update(
      { status: 'archived' },
      {
        where: {
          receivedAt: { [Op.lt]: cutoffDate },
          status: 'processed',
        },
      }
    );

    return count;
  }

  async deleteOldRecords(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const count = await models.LocationHistory.destroy({
      where: {
        receivedAt: { [Op.lt]: cutoffDate },
        status: 'archived',
      },
    });

    return count;
  }

  async countByDateRange(startDate: Date, endDate: Date): Promise<number> {
    return await models.LocationHistory.count({
      where: {
        receivedAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
    });
  }
}

export default SequelizeLocationHistoryRepository;
