/**
 * Sequelize Audit Log Repository Implementation
 *
 * Provides data access for audit logs using Sequelize ORM.
 *
 * @module infrastructure/database/repositories
 */

import { Op, literal, fn, col } from 'sequelize';
import { AuditLog, AuditAction, AuditSeverity, IAuditLogFilters, IAuditLogSummary } from '../../../core/domain/entities/AuditLog.js';
import { IAuditLogRepository } from '../../../core/domain/repositories/IAuditLogRepository.js';

// AuditLog model will be defined separately
let AuditLogModel: any;

/**
 * Set the AuditLog model (called during app initialization)
 */
export function setAuditLogModel(model: any): void {
  AuditLogModel = model;
}

/**
 * Sequelize Audit Log Repository
 */
export class SequelizeAuditLogRepository implements IAuditLogRepository {
  /**
   * Create a new audit log entry
   */
  async create(entry: AuditLog): Promise<AuditLog> {
    if (!AuditLogModel) {
      throw new Error('AuditLogModel not initialized');
    }

    const data = entry.toJSON();
    const created = await AuditLogModel.create(data);

    return this.mapToEntity(created);
  }

  /**
   * Find audit log by ID
   */
  async findById(id: number): Promise<AuditLog | null> {
    if (!AuditLogModel) {
      throw new Error('AuditLogModel not initialized');
    }

    const found = await AuditLogModel.findByPk(id);

    return found ? this.mapToEntity(found) : null;
  }

  /**
   * Find audit logs with filters
   */
  async findMany(filters: IAuditLogFilters): Promise<{
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (!AuditLogModel) {
      throw new Error('AuditLogModel not initialized');
    }

    const whereClause = this.buildWhereClause(filters);

    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await AuditLogModel.findAndCountAll({
      where: whereClause,
      order: [['timestamp', 'DESC']],
      limit,
      offset,
    });

    const data = rows.map((row: any) => this.mapToEntity(row));

    return {
      data,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    };
  }

  /**
   * Find audit logs by user ID
   */
  async findByUserId(userId: number, limit: number = 100): Promise<AuditLog[]> {
    if (!AuditLogModel) {
      throw new Error('AuditLogModel not initialized');
    }

    const rows = await AuditLogModel.findAll({
      where: { userId },
      order: [['timestamp', 'DESC']],
      limit,
    });

    return rows.map((row: any) => this.mapToEntity(row));
  }

  /**
   * Find audit logs by entity
   */
  async findByEntity(entityType: string, entityId: number, limit: number = 100): Promise<AuditLog[]> {
    if (!AuditLogModel) {
      throw new Error('AuditLogModel not initialized');
    }

    const rows = await AuditLogModel.findAll({
      where: {
        entityType,
        entityId,
      },
      order: [['timestamp', 'DESC']],
      limit,
    });

    return rows.map((row: any) => this.mapToEntity(row));
  }

  /**
   * Get audit log summary statistics
   */
  async getSummary(filters: Omit<IAuditLogFilters, 'page' | 'limit'>): Promise<IAuditLogSummary> {
    if (!AuditLogModel) {
      throw new Error('AuditLogModel not initialized');
    }

    const whereClause = this.buildWhereClause(filters);

    // Count total, successful, and failed actions
    const [totalActions, successfulActions, failedActions, criticalActions] = await Promise.all([
      AuditLogModel.count({ where: whereClause }),
      AuditLogModel.count({ where: { ...whereClause, result: 'SUCCESS' } }),
      AuditLogModel.count({ where: { ...whereClause, result: 'FAILURE' } }),
      AuditLogModel.count({ where: { ...whereClause, severity: 'CRITICAL' } }),
    ]);

    // Get top actions
    const topActionsResult = await AuditLogModel.findAll({
      attributes: [
        'action',
        [fn('COUNT', col('id')), 'count'],
      ],
      where: whereClause,
      group: ['action'],
      order: [[literal('count'), 'DESC']],
      limit: 10,
      raw: true,
    });

    const topActions = topActionsResult.map((row: any) => ({
      action: row.action,
      count: parseInt(row.count, 10),
    }));

    // Get top users
    const topUsersResult = await AuditLogModel.findAll({
      attributes: [
        'userId',
        'userName',
        [fn('COUNT', col('id')), 'count'],
      ],
      where: whereClause,
      group: ['userId', 'userName'],
      order: [[literal('count'), 'DESC']],
      limit: 10,
      raw: true,
    });

    const topUsers = topUsersResult.map((row: any) => ({
      userId: row.userId,
      userName: row.userName,
      count: parseInt(row.count, 10),
    }));

    return {
      totalActions,
      successfulActions,
      failedActions,
      criticalActions,
      topActions,
      topUsers,
    };
  }

  /**
   * Delete audit logs older than specified date
   */
  async deleteOlderThan(date: Date): Promise<number> {
    if (!AuditLogModel) {
      throw new Error('AuditLogModel not initialized');
    }

    const result = await AuditLogModel.destroy({
      where: {
        timestamp: {
          [Op.lt]: date,
        },
      },
    });

    return result;
  }

  /**
   * Build Sequelize where clause from filters
   */
  private buildWhereClause(filters: IAuditLogFilters): any {
    const clause: any = {};

    if (filters.tenantId) {
      clause.tenantId = filters.tenantId;
    }

    if (filters.userId) {
      clause.userId = filters.userId;
    }

    if (filters.action) {
      clause.action = filters.action;
    }

    if (filters.entityType) {
      clause.entityType = filters.entityType;
    }

    if (filters.entityId) {
      clause.entityId = filters.entityId;
    }

    if (filters.severity) {
      clause.severity = filters.severity;
    }

    if (filters.result) {
      clause.result = filters.result;
    }

    if (filters.startDate || filters.endDate) {
      clause.timestamp = {};
      if (filters.startDate) {
        clause.timestamp[Op.gte] = filters.startDate;
      }
      if (filters.endDate) {
        clause.timestamp[Op.lte] = filters.endDate;
      }
    }

    return clause;
  }

  /**
   * Map database model to domain entity
   */
  private mapToEntity(model: any): AuditLog {
    return new AuditLog({
      id: model.id,
      tenantId: model.tenantId,
      userId: model.userId,
      userName: model.userName,
      userEmail: model.userEmail,
      action: model.action as AuditAction,
      entityType: model.entityType,
      entityId: model.entityId,
      entityName: model.entityName,
      severity: model.severity as AuditSeverity,
      ipAddress: model.ipAddress,
      userAgent: model.userAgent,
      timestamp: model.timestamp,
      details: model.details ? JSON.parse(model.details) : undefined,
      result: model.result,
      errorMessage: model.errorMessage,
    });
  }
}

export default SequelizeAuditLogRepository;
