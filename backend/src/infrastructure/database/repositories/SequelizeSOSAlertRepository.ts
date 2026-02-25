/**
 * Sequelize SOS Alert Repository Implementation
 *
 * @module infrastructure/database/repositories
 */

import type {
  ISOSAlert,
  ICreateSOSAlertDTO,
  IAcknowledgeSOSDTO,
  IDispatchSOSDTO,
  IResolveSOSDTO,
  INearbyGuard,
  ISOSStatistics,
} from '../../../core/domain/entities/SOSAlert.js';
import { SOSStatus, SOSPriority } from '../../../core/domain/entities/SOSAlert.js';
import type { ISOSAlertRepository } from '../../../core/domain/repositories/ISOSAlertRepository.js';
import { Op, literal } from 'sequelize';
import models from '../models/index.js';

/**
 * Sequelize implementation of SOS Alert Repository
 */
export class SequelizeSOSAlertRepository implements ISOSAlertRepository {
  /**
   * Convert model to domain entity
   */
  private toEntity(model: any): ISOSAlert {
    return {
      id: model.id,
      guardId: model.guardId,
      location: {
        latitude: parseFloat(model.latitude),
        longitude: parseFloat(model.longitude),
      },
      accuracy: model.accuracy ? parseFloat(model.accuracy) : undefined,
      status: model.status as SOSStatus,
      priority: model.priority as SOSPriority,
      message: model.message || undefined,
      acknowledgedById: model.acknowledgedById || undefined,
      acknowledgedAt: model.acknowledgedAt || undefined,
      dispatchedToId: model.dispatchedToId || undefined,
      dispatchedAt: model.dispatchedAt || undefined,
      resolvedAt: model.resolvedAt || undefined,
      resolutionNotes: model.resolutionNotes || undefined,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }

  async create(dto: ICreateSOSAlertDTO): Promise<ISOSAlert> {
    const alert = await models.SOSAlert.create({
      guardId: dto.guardId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracy: dto.accuracy,
      status: SOSStatus.TRIGGERED,
      priority: dto.priority || SOSPriority.HIGH,
      message: dto.message,
    });
    return this.toEntity(alert);
  }

  async findById(id: number): Promise<ISOSAlert | null> {
    const alert = await models.SOSAlert.findByPk(id);
    return alert ? this.toEntity(alert) : null;
  }

  async findActive(): Promise<ISOSAlert[]> {
    const alerts = await models.SOSAlert.findAll({
      where: {
        status: {
          [Op.notIn]: [SOSStatus.RESOLVED, SOSStatus.FALSE_ALARM],
        },
      },
      order: [['createdAt', 'DESC']],
    });
    return alerts.map((a) => this.toEntity(a));
  }

  async findByGuardId(guardId: number, limit = 50): Promise<ISOSAlert[]> {
    const alerts = await models.SOSAlert.findAll({
      where: { guardId },
      limit,
      order: [['createdAt', 'DESC']],
    });
    return alerts.map((a) => this.toEntity(a));
  }

  async acknowledge(id: number, dto: IAcknowledgeSOSDTO): Promise<ISOSAlert> {
    const alert = await models.SOSAlert.findByPk(id);
    if (!alert) {
      throw new Error(`SOS Alert with ID ${id} not found`);
    }

    await alert.update({
      status: SOSStatus.ACKNOWLEDGED,
      acknowledgedById: dto.acknowledgedById,
      acknowledgedAt: new Date(),
    });

    return this.toEntity(alert);
  }

  async dispatch(id: number, dto: IDispatchSOSDTO): Promise<ISOSAlert> {
    const alert = await models.SOSAlert.findByPk(id);
    if (!alert) {
      throw new Error(`SOS Alert with ID ${id} not found`);
    }

    await alert.update({
      status: SOSStatus.DISPATCHED,
      dispatchedToId: dto.dispatchedToId,
      dispatchedAt: new Date(),
    });

    return this.toEntity(alert);
  }

  async resolve(id: number, dto: IResolveSOSDTO): Promise<ISOSAlert> {
    const alert = await models.SOSAlert.findByPk(id);
    if (!alert) {
      throw new Error(`SOS Alert with ID ${id} not found`);
    }

    await alert.update({
      status: dto.status,
      resolvedAt: new Date(),
      resolutionNotes: dto.resolutionNotes,
    });

    return this.toEntity(alert);
  }

  async findNearbyGuards(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    excludeGuardId?: number
  ): Promise<INearbyGuard[]> {
    // Use Haversine formula for distance calculation
    const distanceFormula = literal(`
      6371000 * acos(
        cos(radians(${latitude})) * cos(radians(latitude)) *
        cos(radians(longitude) - radians(${longitude})) +
        sin(radians(${latitude})) * sin(radians(latitude))
      )
    `);

    const whereCondition: any = {
      isActiveShift: true,
    };

    if (excludeGuardId) {
      whereCondition.guardId = { [Op.ne]: excludeGuardId };
    }

    // Get latest location per guard
    const locations = await models.LocationHistory.findAll({
      where: whereCondition,
      order: [['receivedAt', 'DESC']],
      limit: 500, // Reasonable limit for performance
    });

    // Group by guard and get the latest
    const guardLatestMap = new Map<number, any>();
    for (const loc of locations) {
      if (!guardLatestMap.has(loc.guardId)) {
        guardLatestMap.set(loc.guardId, loc);
      }
    }

    // Calculate distance and filter
    const nearbyGuards: INearbyGuard[] = [];
    for (const [guardId, location] of guardLatestMap) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        parseFloat(location.latitude),
        parseFloat(location.longitude)
      );

      if (distance <= radiusMeters) {
        // Get guard name from User model
        const user = await models.User.findByPk(guardId);
        nearbyGuards.push({
          guardId,
          guardName: user ? `${user.firstName} ${user.lastName}` : `Guard #${guardId}`,
          distance,
          lastLocation: {
            latitude: parseFloat(location.latitude),
            longitude: parseFloat(location.longitude),
          },
          lastSeen: location.receivedAt,
        });
      }
    }

    return nearbyGuards.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // Earth's radius in meters
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

  async getStatistics(): Promise<ISOSStatistics> {
    const totalAlerts = await models.SOSAlert.count();
    const activeAlerts = await models.SOSAlert.count({
      where: {
        status: { [Op.notIn]: [SOSStatus.RESOLVED, SOSStatus.FALSE_ALARM] },
      },
    });

    // Today's resolved alerts
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const resolvedToday = await models.SOSAlert.count({
      where: {
        status: { [Op.in]: [SOSStatus.RESOLVED, SOSStatus.FALSE_ALARM] },
        resolvedAt: { [Op.gte]: today },
      },
    });

    // Calculate average response time (acknowledged - created)
    const acknowledgedAlerts = await models.SOSAlert.findAll({
      where: {
        acknowledgedAt: { [Op.not]: null },
      },
      attributes: ['createdAt', 'acknowledgedAt'],
    });

    let totalResponseTime = 0;
    for (const alert of acknowledgedAlerts) {
      const diff = alert.acknowledgedAt.getTime() - alert.createdAt.getTime();
      totalResponseTime += diff;
    }
    const avgResponseTimeMs = acknowledgedAlerts.length > 0
      ? totalResponseTime / acknowledgedAlerts.length
      : 0;

    // False alarm rate
    const falseAlarms = await models.SOSAlert.count({
      where: { status: SOSStatus.FALSE_ALARM },
    });
    const resolved = await models.SOSAlert.count({
      where: { status: { [Op.in]: [SOSStatus.RESOLVED, SOSStatus.FALSE_ALARM] } },
    });
    const falseAlarmRate = resolved > 0 ? (falseAlarms / resolved) * 100 : 0;

    return {
      totalAlerts,
      activeAlerts,
      resolvedToday,
      averageResponseTime: avgResponseTimeMs / 60000, // Convert to minutes
      falseAlarmRate,
    };
  }

  async updateStatus(id: number, status: SOSStatus): Promise<ISOSAlert> {
    const alert = await models.SOSAlert.findByPk(id);
    if (!alert) {
      throw new Error(`SOS Alert with ID ${id} not found`);
    }

    await alert.update({ status });
    return this.toEntity(alert);
  }

  async findRecent(limit: number): Promise<ISOSAlert[]> {
    const alerts = await models.SOSAlert.findAll({
      limit,
      order: [['createdAt', 'DESC']],
    });
    return alerts.map((a) => this.toEntity(a));
  }
}

export default SequelizeSOSAlertRepository;
