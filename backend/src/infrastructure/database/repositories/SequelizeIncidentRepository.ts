/**
 * Sequelize Incident Repository
 */

import { Op, literal, fn, col } from 'sequelize';
import { BaseRepository } from './BaseRepository.js';
import models from '../models/index.js';
import type {
  IIncident,
  ICreateIncidentDTO,
  IUpdateIncidentDTO,
  IIncidentQueryOptions,
  IIncidentStatistics,
  IPaginatedIncidents,
  ICreateEvidenceDTO,
  ICreateCommentDTO,
  IncidentStatus,
  IncidentPriority,
  IncidentType,
} from '../../../core/domain/entities/Incident.js';
import type { IIncidentRepository } from '../../../core/domain/repositories/IIncidentRepository.js';

/**
 * Sequelize Incident Repository Implementation
 */
export class SequelizeIncidentRepository extends BaseRepository<any> implements IIncidentRepository {
  protected getModel() {
    return models.Incident;
  }

  /**
   * Map Sequelize model to domain entity
   */
  private mapToEntity(model: any): IIncident {
    return {
      id: model.id,
      siteId: model.site_id,
      reportedBy: model.reported_by,
      assignedTo: model.assigned_to,
      title: model.title,
      description: model.description,
      type: model.type as IncidentType,
      priority: model.priority as IncidentPriority,
      status: model.status as IncidentStatus,
      location: model.location,
      patrolRunId: model.patrol_run_id,
      resolvedAt: model.resolved_at,
      resolvedBy: model.resolved_by,
      closedAt: model.closed_at,
      closedBy: model.closed_by,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
      evidence: model.IncidentEvidence?.map((e: any) => ({
        id: e.id,
        incidentId: e.incident_id,
        filePath: e.file_path,
        fileType: e.file_type,
        caption: e.caption,
        uploadedBy: e.uploaded_by,
        createdAt: e.created_at,
      })) || [],
      comments: model.IncidentComments?.map((c: any) => ({
        id: c.id,
        incidentId: c.incident_id,
        userId: c.user_id,
        comment: c.comment,
        createdAt: c.created_at,
      })) || [],
    };
  }

  async findById(id: number): Promise<IIncident | null> {
    const model = await models.Incident.findByPk(id, {
      include: [
        {
          model: models.IncidentEvidence,
          as: 'IncidentEvidence',
        },
        {
          model: models.IncidentComment,
          as: 'IncidentComments',
          include: [
            {
              model: models.User,
              as: 'user',
              attributes: ['id', 'firstName', 'lastName', 'email'],
            },
          ],
          order: [['created_at', 'ASC']],
        },
        {
          model: models.Site,
          as: 'site',
          attributes: ['id', 'name'],
        },
        {
          model: models.User,
          as: 'reporter',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: models.User,
          as: 'assignee',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });
    return model ? this.mapToEntity(model) : null;
  }

  async findAll(options: IIncidentQueryOptions = {}): Promise<IPaginatedIncidents> {
    const whereClause: any = {};

    if (options.siteId) whereClause.site_id = options.siteId;
    if (options.reportedBy) whereClause.reported_by = options.reportedBy;
    if (options.assignedTo) whereClause.assigned_to = options.assignedTo;
    if (options.status) whereClause.status = options.status;
    if (options.priority) whereClause.priority = options.priority;
    if (options.type) whereClause.type = options.type;

    if (options.startDate || options.endDate) {
      whereClause.created_at = {};
      if (options.startDate) whereClause.created_at[Op.gte] = options.startDate;
      if (options.endDate) whereClause.created_at[Op.lte] = options.endDate;
    }

    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const sortBy = options.sortBy || 'createdAt';
    const sortOrder = options.sortOrder || 'DESC';
    const orderField = sortBy === 'createdAt' ? 'created_at' : sortBy === 'updatedAt' ? 'updated_at' : sortBy;

    const { count, rows } = await models.Incident.findAndCountAll({
      where: whereClause,
      include: [
        { model: models.IncidentEvidence, as: 'IncidentEvidence' },
        { model: models.IncidentComment, as: 'IncidentComments' },
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

  async search(query: string, options: IIncidentQueryOptions = {}): Promise<IPaginatedIncidents> {
    const searchClause = {
      [Op.or]: [
        { title: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
      ],
    };

    // Combine with other filters
    const whereClause: any = { ...searchClause };
    if (options.siteId) whereClause.site_id = options.siteId;
    if (options.status) whereClause.status = options.status;

    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    const { count, rows } = await models.Incident.findAndCountAll({
      where: whereClause,
      include: [
        { model: models.IncidentEvidence, as: 'IncidentEvidence' },
        { model: models.IncidentComment, as: 'IncidentComments' },
      ],
      order: [['created_at', 'DESC']],
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

  async create(data: ICreateIncidentDTO): Promise<IIncident> {
    const model = await models.Incident.create({
      site_id: data.siteId,
      reported_by: data.reportedBy,
      title: data.title,
      description: data.description,
      type: data.type,
      priority: data.priority || IncidentPriority.MEDIUM,
      location: data.location,
      patrol_run_id: data.patrolRunId || null,
      status: IncidentStatus.NEW,
    });

    // Fetch with relations
    return (await this.findById(model.id))!;
  }

  async update(id: number, data: IUpdateIncidentDTO): Promise<IIncident | null> {
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.type !== undefined) updateData.type = data.type;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.assignedTo !== undefined) updateData.assigned_to = data.assignedTo;
    if (data.resolvedAt !== undefined) updateData.resolved_at = data.resolvedAt;
    if (data.resolvedBy !== undefined) updateData.resolved_by = data.resolvedBy;
    if (data.closedAt !== undefined) updateData.closed_at = data.closedAt;
    if (data.closedBy !== undefined) updateData.closed_by = data.closedBy;

    await models.Incident.update(updateData, { where: { id } });
    return await this.findById(id);
  }

  async delete(id: number): Promise<boolean> {
    const count = await models.Incident.destroy({ where: { id } });
    return count > 0;
  }

  async addEvidence(incidentId: number, data: ICreateEvidenceDTO): Promise<void> {
    await models.IncidentEvidence.create({
      incident_id: incidentId,
      file_path: data.filePath,
      file_type: data.fileType,
      caption: data.caption,
      uploaded_by: data.uploadedBy,
    });
  }

  async deleteEvidence(incidentId: number, evidenceId: number, userId: number): Promise<boolean> {
    const count = await models.IncidentEvidence.destroy({
      where: { id: evidenceId, incident_id: incidentId },
    });
    return count > 0;
  }

  async addComment(incidentId: number, userId: number, comment: string): Promise<void> {
    await models.IncidentComment.create({
      incident_id: incidentId,
      user_id: userId,
      comment,
    });
  }

  async getComments(incidentId: number): Promise<any[]> {
    const comments = await models.IncidentComment.findAll({
      where: { incident_id: incidentId },
      include: [
        {
          model: models.User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
      order: [['created_at', 'ASC']],
    });
    return comments;
  }

  async getEvidence(incidentId: number): Promise<any[]> {
    return await models.IncidentEvidence.findAll({
      where: { incident_id: incidentId },
      order: [['created_at', 'ASC']],
    });
  }

  async findBySite(siteId: number): Promise<IIncident[]> {
    const models = await this.getModel().findAll({
      where: { site_id: siteId },
      include: [
        { model: models.IncidentEvidence, as: 'IncidentEvidence' },
        { model: models.IncidentComment, as: 'IncidentComments' },
      ],
      order: [['created_at', 'DESC']],
    });
    return models.map((m) => this.mapToEntity(m));
  }

  async findByReporter(userId: number): Promise<IIncident[]> {
    const models = await this.getModel().findAll({
      where: { reported_by: userId },
      include: [
        { model: models.IncidentEvidence, as: 'IncidentEvidence' },
        { model: models.IncidentComment, as: 'IncidentComments' },
      ],
      order: [['created_at', 'DESC']],
    });
    return models.map((m) => this.mapToEntity(m));
  }

  async findByAssignee(userId: number): Promise<IIncident[]> {
    const models = await this.getModel().findAll({
      where: { assigned_to: userId },
      include: [
        { model: models.IncidentEvidence, as: 'IncidentEvidence' },
        { model: models.IncidentComment, as: 'IncidentComments' },
      ],
      order: [['created_at', 'DESC']],
    });
    return models.map((m) => this.mapToEntity(m));
  }

  async getStatistics(): Promise<IIncidentStatistics> {
    const totalIncidents = await models.Incident.count();

    const activeIncidents = await models.Incident.count({
      where: { status: { [Op.ne]: IncidentStatus.CLOSED } },
    });

    // Count by status
    const statusCounts = await models.Incident.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const byStatus: Record<string, number> = {
      [IncidentStatus.NEW]: 0,
      [IncidentStatus.INVESTIGATING]: 0,
      [IncidentStatus.RESOLVED]: 0,
      [IncidentStatus.CLOSED]: 0,
    };

    for (const row of statusCounts) {
      byStatus[row.status] = parseInt(row.count);
    }

    // Count by priority
    const priorityCounts = await models.Incident.findAll({
      attributes: ['priority', [fn('COUNT', col('id')), 'count']],
      group: ['priority'],
      raw: true,
    });

    const byPriority: Record<string, number> = {
      [IncidentPriority.LOW]: 0,
      [IncidentPriority.MEDIUM]: 0,
      [IncidentPriority.HIGH]: 0,
      [IncidentPriority.CRITICAL]: 0,
    };

    for (const row of priorityCounts) {
      byPriority[row.priority] = parseInt(row.count);
    }

    // Count by type
    const typeCounts = await models.Incident.findAll({
      attributes: ['type', [fn('COUNT', col('id')), 'count']],
      group: ['type'],
      raw: true,
    });

    const byType: Record<string, number> = {
      [IncidentType.SECURITY]: 0,
      [IncidentType.SAFETY]: 0,
      [IncidentType.MAINTENANCE]: 0,
      [IncidentType.MEDICAL]: 0,
      [IncidentType.OTHER]: 0,
    };

    for (const row of typeCounts) {
      byType[row.type] = parseInt(row.count);
    }

    // Calculate average resolution time (in hours)
    const resolvedIncidents = await models.Incident.findAll({
      where: { status: { [Op.in]: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] } },
      attributes: ['created_at', 'resolved_at'],
      raw: true,
    });

    let totalResolutionTime = 0;
    let resolvedCount = 0;

    for (const incident of resolvedIncidents) {
      if (incident.resolved_at) {
        const diff = new Date(incident.resolved_at).getTime() - new Date(incident.created_at).getTime();
        totalResolutionTime += diff;
        resolvedCount++;
      }
    }

    const averageResolutionTime = resolvedCount > 0 ? totalResolutionTime / resolvedCount / (1000 * 60 * 60) : 0;

    // Count resolved this week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const resolvedThisWeek = await models.Incident.count({
      where: {
        status: { [Op.in]: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED] },
        resolved_at: { [Op.gte]: oneWeekAgo },
      },
    });

    return {
      totalIncidents,
      activeIncidents,
      byStatus,
      byPriority,
      byType,
      averageResolutionTime,
      resolvedThisWeek,
    };
  }

  async countByStatus(): Promise<Record<string, number>> {
    const counts = await models.Incident.findAll({
      attributes: ['status', [fn('COUNT', col('id')), 'count']],
      group: ['status'],
      raw: true,
    });

    const result: Record<string, number> = {};
    for (const row of counts) {
      result[row.status] = parseInt(row.count);
    }

    return result;
  }

  async countByPriority(): Promise<Record<string, number>> {
    const counts = await models.Incident.findAll({
      attributes: ['priority', [fn('COUNT', col('id')), 'count']],
      group: ['priority'],
      raw: true,
    });

    const result: Record<string, number> = {};
    for (const row of counts) {
      result[row.priority] = parseInt(row.count);
    }

    return result;
  }
}

export default SequelizeIncidentRepository;
