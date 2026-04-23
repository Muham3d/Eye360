/**
 * Sequelize Patrol Run Repository
 *
 * Implements the IPatrolRunRepository interface using Sequelize ORM.
 * Handles patrol run execution data with status transitions and statistics.
 *
 * @module infrastructure/database/repositories
 */

import { Transaction, literal, Op, fn, col } from 'sequelize';
import {
  IPatrolRun,
  IPatrolRunDetail,
  ICreatePatrolRunDTO,
  IUpdatePatrolRunDTO,
  IPatrolRunQueryOptions,
  IPatrolRunStatistics,
  IPatrolRunPerformanceSummary,
  PatrolRunStatus,
} from '../../../core/domain/entities/PatrolRun.js';
import { GeoJSONPoint } from '../../../core/domain/types/geojson.js';
import { IPaginatedResult } from '../../../core/domain/repositories/IUserRepository.js';
import {
  IPatrolRunRepository,
  PatrolRunRepositoryError,
  PatrolRunRepositoryErrorCode,
} from '../../../core/domain/repositories/IPatrolRunRepository.js';
import { BaseRepository, QueryOptions } from './BaseRepository.js';
import models from '../models/index.js';

/**
 * PatrolRun Model Type
 */
type PatrolRunModel = ReturnType<typeof models.PatrolRun>;

/**
 * Sequelize Patrol Run Repository
 *
 * Implements patrol run data access with status management.
 */
export class SequelizePatrolRunRepository extends BaseRepository<PatrolRunModel>
  implements IPatrolRunRepository {

  /**
   * Get the Sequelize PatrolRun model
   */
  protected getModel(): PatrolRunModel {
    return models.PatrolRun;
  }

  /**
   * Map Sequelize model to domain entity
   */
  private mapToEntity(model: any): IPatrolRun {
    return {
      id: model.id,
      templateId: model.template_id,
      guardId: model.guard_id,
      startTime: model.actual_start ? new Date(model.actual_start) : undefined,
      endTime: model.actual_end ? new Date(model.actual_end) : undefined,
      scheduledDate: new Date(model.scheduled_start),
      status: this.mapStatusFromDB(model.status),
      completionPercentage: parseFloat(model.completion_percentage as any),
      missedCheckpointsCount: model.checkpoints_total - model.checkpoints_completed,
      totalScore: model.deviation_score ? parseFloat(model.deviation_score as any) : 0,
      startLocation: model.start_location ? this.parseGeoJSONPoint(model.start_location) : undefined,
      endLocation: model.end_location ? this.parseGeoJSONPoint(model.end_location) : undefined,
      notes: model.supervisor_notes ?? undefined,
      abandonedReason: model.abandonment_reason ?? undefined,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    };
  }

  /**
   * Parse GeoJSON Point from database
   */
  private parseGeoJSONPoint(geojson: any): GeoJSONPoint | undefined {
    if (!geojson) return undefined;

    if (typeof geojson === 'string') {
      try {
        geojson = JSON.parse(geojson);
      } catch {
        return undefined;
      }
    }

    if (geojson.type === 'Point' && Array.isArray(geojson.coordinates)) {
      return geojson as GeoJSONPoint;
    }

    return undefined;
  }

  /**
   * Map domain status to database enum
   */
  private mapStatusToDB(status: PatrolRunStatus): string {
    const statusMap: Record<PatrolRunStatus, string> = {
      [PatrolRunStatus.PENDING]: 'scheduled',
      [PatrolRunStatus.IN_PROGRESS]: 'in_progress',
      [PatrolRunStatus.COMPLETED]: 'completed',
      [PatrolRunStatus.MISSED]: 'skipped',
      [PatrolRunStatus.ABANDONED]: 'abandoned',
    };
    return statusMap[status] || 'scheduled';
  }

  /**
   * Map database status to domain enum
   */
  private mapStatusFromDB(status: string): PatrolRunStatus {
    const statusMap: Record<string, PatrolRunStatus> = {
      'scheduled': PatrolRunStatus.PENDING,
      'in_progress': PatrolRunStatus.IN_PROGRESS,
      'paused': PatrolRunStatus.IN_PROGRESS,
      'completed': PatrolRunStatus.COMPLETED,
      'abandoned': PatrolRunStatus.ABANDONED,
      'failed': PatrolRunStatus.ABANDONED,
      'skipped': PatrolRunStatus.MISSED,
    };
    return statusMap[status] || PatrolRunStatus.PENDING;
  }

  /**
   * Map DTO to database creation attributes
   */
  private mapCreateDataToDB(data: ICreatePatrolRunDTO): Promise<any> {
    return Promise.resolve({
      template_id: data.templateId,
      site_id: 0, // Will be fetched from template
      guard_id: data.guardId,
      scheduled_start: data.scheduledDate,
      scheduled_end: new Date(data.scheduledDate.getTime() + 60 * 60 * 1000), // +1 hour default
      start_location: data.startLocation ? JSON.stringify(data.startLocation) : null,
      status: 'scheduled',
      checkpoints_total: 0, // Will be calculated from template
      checkpoints_completed: 0,
      completion_percentage: 0,
    });
  }

  /**
   * Map DTO to database update attributes
   */
  private mapUpdateDataToDB(data: IUpdatePatrolRunDTO): any {
    const updateData: any = {};

    if (data.startTime !== undefined) {
      updateData.actual_start = data.startTime;
    }
    if (data.endTime !== undefined) {
      updateData.actual_end = data.endTime;
    }
    if (data.status !== undefined) {
      updateData.status = this.mapStatusToDB(data.status);
    }
    if (data.completionPercentage !== undefined) {
      updateData.completion_percentage = data.completionPercentage;
    }
    if (data.missedCheckpointsCount !== undefined) {
      // Will calculate from checkpoints_total
    }
    if (data.totalScore !== undefined) {
      // Not in current schema
    }
    if (data.endLocation !== undefined) {
      updateData.end_location = JSON.stringify(data.endLocation);
    }
    if (data.notes !== undefined) {
      updateData.supervisor_notes = data.notes;
    }
    if (data.abandonedReason !== undefined) {
      updateData.abandonment_reason = data.abandonedReason;
    }

    return updateData;
  }

  /**
   * Find a patrol run by ID
   */
  async findById(id: number, options?: Partial<IPatrolRunQueryOptions>): Promise<IPatrolRun | null> {
    try {
      const model = await models.PatrolRun.findByPk(id);
      return model ? this.mapToEntity(model) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find a patrol run by ID with full detail
   */
  async findByIdWithDetail(id: number, options?: Partial<IPatrolRunQueryOptions>): Promise<IPatrolRunDetail | null> {
    try {
      const model = await models.PatrolRun.findByPk(id, {
        include: [
          {
            model: models.PatrolTemplate,
            as: 'template',
            include: [
              {
                model: models.Site,
                as: 'site',
              },
            ],
          },
          {
            model: models.User,
            as: 'guard',
          },
        ],
      });

      if (!model) {
        return null;
      }

      const entity = this.mapToEntity(model);

      // Get checkpoint logs
      const logs = await models.PatrolCheckpointLog.findAll({
        where: { patrol_run_id: id },
        order: [['verified_at', 'ASC']],
      });

      return {
        ...entity,
        templateName: (model as any).template?.name || '',
        siteId: (model as any).template?.site?.id || 0,
        siteName: (model as any).template?.site?.name || '',
        guardName: (model as any).guard ?
          `${(model as any).guard.first_name} ${(model as any).guard.last_name}` :
          '',
        estimatedDuration: (model as any).template?.estimated_duration_minutes || 0,
        maxCompletionTime: ((model as any).template?.estimated_duration_minutes || 0) * 2,
        checkpoints: logs.map((log) => ({
          id: log.id,
          patrolRunId: log.patrol_run_id,
          checkpointId: log.checkpoint_id,
          verifiedAt: log.verified_at ? new Date(log.verified_at) : undefined,
          verificationType: log.verification_method || undefined,
          location: log.location ? this.parseGeoJSONPoint(log.location) : undefined,
          gpsAccuracy: log.accuracy_meters ? parseFloat(log.accuracy_meters as any) : undefined,
          photoEvidence: log.photo_evidence_urls?.[0],
          notes: log.notes,
          status: log.status === 'verified' ? 'verified' :
            log.status === 'missed' ? 'missed' : 'skipped',
          createdAt: log.created_at,
          updatedAt: log.updated_at,
        })),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async archiveOldRecords(daysToKeep: number): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

      // Soft-delete the rows using the destroy method which utilizes the paranoid option.
      const count = await this.model.destroy({
        where: {
          scheduledDate: { [Op.lt]: cutoffDate },
          status: { [Op.in]: ['completed', 'missed', 'abandoned'] }
        }
      });

      return count;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all patrol runs with filtering and pagination
   */
  async findAll(options?: IPatrolRunQueryOptions): Promise<IPaginatedResult<IPatrolRun>> {
    try {
      const queryOptions: QueryOptions = {
        page: options?.page,
        limit: options?.limit,
        sortBy: options?.sortBy || 'scheduledStart',
        sortOrder: options?.sortOrder || 'DESC',
      };

      const where: any = {};

      if (options?.templateId) {
        where.template_id = options.templateId;
      }

      if (options?.guardId) {
        where.guard_id = options.guardId;
      }

      if (options?.siteId) {
        where.site_id = options.siteId;
      }

      if (options?.status) {
        where.status = this.mapStatusToDB(options.status);
      }

      if (options?.scheduledDateStart && options?.scheduledDateEnd) {
        where.scheduled_start = {
          [Op.between]: [options.scheduledDateStart, options.scheduledDateEnd],
        };
      }

      if (Object.keys(where).length > 0) {
        queryOptions.where = where;
      }

      const result = await this.findAll(queryOptions);
      return {
        data: result.data.map((model) => this.mapToEntity(model)),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
        hasNext: result.hasNext,
        hasPrevious: result.hasPrevious,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get patrol runs for a template
   */
  async findByTemplateId(
    templateId: number,
    options?: Partial<IPatrolRunQueryOptions>
  ): Promise<IPaginatedResult<IPatrolRun>> {
    try {
      return await this.findAll({
        ...options,
        templateId,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get patrol runs for a guard
   */
  async findByGuardId(
    guardId: number,
    options?: Partial<IPatrolRunQueryOptions>
  ): Promise<IPaginatedResult<IPatrolRun>> {
    try {
      return await this.findAll({
        ...options,
        guardId,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get patrol runs for a site
   */
  async findBySiteId(
    siteId: number,
    options?: Partial<IPatrolRunQueryOptions>
  ): Promise<IPaginatedResult<IPatrolRun>> {
    try {
      return await this.findAll({
        ...options,
        siteId,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get scheduled patrol runs for a date range
   */
  async findByScheduledDateRange(
    startDate: Date,
    endDate: Date,
    options?: Partial<IPatrolRunQueryOptions>
  ): Promise<IPaginatedResult<IPatrolRun>> {
    try {
      return await this.findAll({
        ...options,
        scheduledDateStart: startDate,
        scheduledDateEnd: endDate,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get patrol runs by status
   */
  async findByStatus(
    status: string,
    options?: Partial<IPatrolRunQueryOptions>
  ): Promise<IPatrolRun[]> {
    try {
      return await this.findAll({
        ...options,
        status: status as PatrolRunStatus,
      }).then((result) => result.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a new patrol run
   */
  async create(runData: ICreatePatrolRunDTO): Promise<IPatrolRun> {
    try {
      // Get template to get site_id and checkpoints count
      const template = await models.PatrolTemplate.findByPk(runData.templateId);

      if (!template) {
        throw new PatrolRunRepositoryError(
          PatrolRunRepositoryErrorCode.PATROL_RUN_NOT_FOUND,
          `Template with ID ${runData.templateId} not found`
        );
      }

      // Get checkpoint count for template
      const checkpointCount = await models.PatrolCheckpoint.count({
        where: { template_id: runData.templateId },
      });

      const dbData = await this.mapCreateDataToDB(runData);
      dbData.site_id = template.site_id;
      dbData.checkpoints_total = checkpointCount;

      // Calculate scheduled end time from template duration
      const scheduledEnd = new Date(runData.scheduledDate.getTime() +
        template.estimated_duration_minutes * 60 * 1000);
      dbData.scheduled_end = scheduledEnd;

      const model = await models.PatrolRun.create(dbData);
      return this.mapToEntity(model);
    } catch (error) {
      if (error instanceof PatrolRunRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing patrol run
   */
  async update(id: number, runData: IUpdatePatrolRunDTO): Promise<IPatrolRun | null> {
    try {
      const dbData = this.mapUpdateDataToDB(runData);

      if (dbData.completion_percentage !== undefined) {
        const run = await models.PatrolRun.findByPk(id);
        if (run) {
          const completed = Math.round(
            (dbData.completion_percentage / 100) * run.checkpoints_total
          );
          dbData.checkpoints_completed = completed;
        }
      }

      await models.PatrolRun.update(dbData, { where: { id } });

      const updated = await models.PatrolRun.findByPk(id);
      return updated ? this.mapToEntity(updated) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a patrol run
   */
  async delete(id: number): Promise<boolean> {
    try {
      const deletedCount = await models.PatrolRun.destroy({ where: { id } });
      return deletedCount > 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Start a patrol run
   */
  async start(id: number, startLocation?: { latitude: number; longitude: number }): Promise<IPatrolRun> {
    try {
      const run = await models.PatrolRun.findByPk(id);

      if (!run) {
        throw new PatrolRunRepositoryError(
          PatrolRunRepositoryErrorCode.PATROL_RUN_NOT_FOUND,
          `Patrol run with ID ${id} not found`
        );
      }

      if (run.status !== 'scheduled') {
        throw new PatrolRunRepositoryError(
          PatrolRunRepositoryErrorCode.CANNOT_START_NOT_PENDING,
          `Cannot start patrol run with status ${run.status}`
        );
      }

      const updateData: any = {
        status: 'in_progress',
        actual_start: new Date(),
      };

      if (startLocation) {
        updateData.start_location = JSON.stringify({
          type: 'Point',
          coordinates: [startLocation.longitude, startLocation.latitude],
        });
      }

      await models.PatrolRun.update(updateData, { where: { id } });

      const updated = await models.PatrolRun.findByPk(id);
      return updated ? this.mapToEntity(updated) : this.mapToEntity(run);
    } catch (error) {
      if (error instanceof PatrolRunRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Complete a patrol run
   */
  async complete(
    id: number,
    endLocation?: { latitude: number; longitude: number },
    notes?: string
  ): Promise<IPatrolRun> {
    try {
      const run = await models.PatrolRun.findByPk(id);

      if (!run) {
        throw new PatrolRunRepositoryError(
          PatrolRunRepositoryErrorCode.PATROL_RUN_NOT_FOUND,
          `Patrol run with ID ${id} not found`
        );
      }

      if (run.status !== 'in_progress' && run.status !== 'paused') {
        throw new PatrolRunRepositoryError(
          PatrolRunRepositoryErrorCode.CANNOT_COMPLETE_NOT_IN_PROGRESS,
          `Cannot complete patrol run with status ${run.status}`
        );
      }

      const updateData: any = {
        status: 'completed',
        actual_end: new Date(),
        completion_percentage: 100,
        checkpoints_completed: run.checkpoints_total,
      };

      if (endLocation) {
        updateData.end_location = JSON.stringify({
          type: 'Point',
          coordinates: [endLocation.longitude, endLocation.latitude],
        });
      }

      if (notes) {
        updateData.supervisor_notes = notes;
      }

      await models.PatrolRun.update(updateData, { where: { id } });

      const updated = await models.PatrolRun.findByPk(id);
      return updated ? this.mapToEntity(updated) : this.mapToEntity(run);
    } catch (error) {
      if (error instanceof PatrolRunRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Abandon a patrol run
   */
  async abandon(id: number, reason: string): Promise<IPatrolRun> {
    try {
      const run = await models.PatrolRun.findByPk(id);

      if (!run) {
        throw new PatrolRunRepositoryError(
          PatrolRunRepositoryErrorCode.PATROL_RUN_NOT_FOUND,
          `Patrol run with ID ${id} not found`
        );
      }

      const updateData: any = {
        status: 'abandoned',
        actual_end: new Date(),
        abandonment_reason: reason,
      };

      await models.PatrolRun.update(updateData, { where: { id } });

      const updated = await models.PatrolRun.findByPk(id);
      return updated ? this.mapToEntity(updated) : this.mapToEntity(run);
    } catch (error) {
      if (error instanceof PatrolRunRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Mark a patrol run as missed
   */
  async markMissed(id: number): Promise<IPatrolRun> {
    try {
      const updateData: any = {
        status: 'skipped',
      };

      await models.PatrolRun.update(updateData, { where: { id } });

      const updated = await models.PatrolRun.findByPk(id);
      if (!updated) {
        throw new PatrolRunRepositoryError(
          PatrolRunRepositoryErrorCode.PATROL_RUN_NOT_FOUND,
          `Patrol run with ID ${id} not found`
        );
      }

      return this.mapToEntity(updated);
    } catch (error) {
      if (error instanceof PatrolRunRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Update completion percentage
   */
  async updateCompletionPercentage(id: number, percentage: number): Promise<IPatrolRun> {
    try {
      const run = await models.PatrolRun.findByPk(id);

      if (!run) {
        throw new PatrolRunRepositoryError(
          PatrolRunRepositoryErrorCode.PATROL_RUN_NOT_FOUND,
          `Patrol run with ID ${id} not found`
        );
      }

      const completed = Math.round((percentage / 100) * run.checkpoints_total);

      await models.PatrolRun.update(
        {
          completion_percentage: percentage,
          checkpoints_completed: completed,
        },
        { where: { id } }
      );

      const updated = await models.PatrolRun.findByPk(id);
      return updated ? this.mapToEntity(updated) : this.mapToEntity(run);
    } catch (error) {
      if (error instanceof PatrolRunRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Update total score
   */
  async updateScore(id: number, score: number): Promise<IPatrolRun> {
    try {
      // Score not directly stored in schema
      // Could store in deviation_score or add new column
      const updated = await models.PatrolRun.findByPk(id);

      if (!updated) {
        throw new PatrolRunRepositoryError(
          PatrolRunRepositoryErrorCode.PATROL_RUN_NOT_FOUND,
          `Patrol run with ID ${id} not found`
        );
      }

      return this.mapToEntity(updated);
    } catch (error) {
      if (error instanceof PatrolRunRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Increment missed checkpoints count
   */
  async incrementMissedCheckpoints(id: number): Promise<IPatrolRun> {
    try {
      await models.PatrolRun.increment(
        { checkpoints_completed: -1 },
        { where: { id } }
      );

      const updated = await models.PatrolRun.findByPk(id);

      if (!updated) {
        throw new PatrolRunRepositoryError(
          PatrolRunRepositoryErrorCode.PATROL_RUN_NOT_FOUND,
          `Patrol run with ID ${id} not found`
        );
      }

      // Update completion percentage
      const percentage = (updated.checkpoints_completed / updated.checkpoints_total) * 100;
      await models.PatrolRun.update(
        { completion_percentage: percentage },
        { where: { id } }
      );

      return this.mapToEntity(updated);
    } catch (error) {
      if (error instanceof PatrolRunRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Get active patrol run for a guard
   */
  async findActiveForGuard(guardId: number): Promise<IPatrolRun | null> {
    try {
      const model = await models.PatrolRun.findOne({
        where: {
          guard_id: guardId,
          status: ['scheduled', 'in_progress', 'paused'],
        },
        order: [['scheduled_start', 'ASC']],
      });

      return model ? this.mapToEntity(model) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get statistics for patrol runs
   */
  async getStatistics(options?: Partial<IPatrolRunQueryOptions>): Promise<IPatrolRunStatistics> {
    try {
      const where: any = {};

      if (options?.siteId) {
        where.site_id = options.siteId;
      }

      if (options?.guardId) {
        where.guard_id = options.guardId;
      }

      const [totalRuns, completedRuns, abandonedRuns] = await Promise.all([
        models.PatrolRun.count({ where }),
        models.PatrolRun.count({ where: { ...where, status: 'completed' } }),
        models.PatrolRun.count({ where: { ...where, status: ['abandoned', 'failed'] } }),
      ]);

      const missedRuns = await models.PatrolRun.count({
        where: { ...where, status: 'skipped' },
      });

      // Calculate averages
      const completed = await models.PatrolRun.findAll({
        where: { ...where, status: 'completed' },
        attributes: ['completion_percentage', 'deviation_score'],
      });

      let averageCompletionPercentage = 0;
      let averageScore = 0;
      let averageDuration = 0;
      let averageCheckpointsMissed = 0;

      if (completed.length > 0) {
        const totalCompletion = completed.reduce(
          (sum, r) => sum + parseFloat(r.completion_percentage as any),
          0
        );
        averageCompletionPercentage = totalCompletion / completed.length;

        const totalScore = completed.reduce(
          (sum, r) => sum + (r.deviation_score ? parseFloat(r.deviation_score as any) : 0),
          0
        );
        averageScore = totalScore / completed.length;
      }

      return {
        totalRuns,
        completedRuns,
        missedRuns,
        abandonedRuns,
        averageCompletionPercentage: Math.round(averageCompletionPercentage),
        averageScore: Math.round(averageScore),
        averageDuration: Math.round(averageDuration),
        averageCheckpointsMissed: Math.round(averageCheckpointsMissed),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get performance summary for a guard
   */
  async getGuardPerformanceSummary(
    guardId: number,
    startDate: Date,
    endDate: Date
  ): Promise<IPatrolRunPerformanceSummary> {
    try {
      const where: any = {
        guard_id: guardId,
        scheduled_start: {
          [Op.between]: [startDate, endDate],
        },
      };

      const [totalRuns, completedRuns] = await Promise.all([
        models.PatrolRun.count({ where }),
        models.PatrolRun.count({ where: { ...where, status: 'completed' } }),
      ]);

      const runs = await models.PatrolRun.findAll({
        where: { ...where, status: 'completed' },
        order: [['actual_end', 'DESC']],
      });

      let averageScore = 0;
      let averageCompletionTime = 0;
      let bestRun: any = null;
      let worstRun: any = null;
      let bestScore = -1;
      let worstScore = 101;

      for (const run of runs) {
        const score = parseFloat(run.completion_percentage as any);
        if (score > bestScore) {
          bestScore = score;
          bestRun = { id: run.id, score, completedAt: run.actual_end };
        }
        if (score < worstScore) {
          worstScore = score;
          worstRun = { id: run.id, score, completedAt: run.actual_end };
        }
        averageScore += score;

        if (run.actual_start && run.actual_end) {
          const duration = (new Date(run.actual_end).getTime() -
            new Date(run.actual_start).getTime()) / 60000;
          averageCompletionTime += duration;
        }
      }

      if (runs.length > 0) {
        averageScore /= runs.length;
        averageCompletionTime /= runs.length;
      }

      const totalCheckpointsCount = await models.PatrolRun.sum('checkpoints_total', { where });
      const completedCheckpointsCount = await models.PatrolRun.sum('checkpoints_completed', { where });
      const missedCheckpointsCount = totalCheckpointsCount - completedCheckpointsCount;

      return {
        period: { start: startDate, end: endDate },
        totalRuns,
        completedRuns,
        completionRate: totalRuns > 0 ? (completedRuns / totalRuns) * 100 : 0,
        averageScore: Math.round(averageScore),
        averageCompletionTime: Math.round(averageCompletionTime),
        bestRun: bestRun || { id: 0, score: 0, completedAt: new Date() },
        worstRun: worstRun || { id: 0, score: 0, completedAt: new Date() },
        missedCheckpointsCount: missedCheckpointsCount || 0,
        totalCheckpointsCount: totalCheckpointsCount || 0,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get performance summary for a site
   */
  async getSitePerformanceSummary(
    siteId: number,
    startDate: Date,
    endDate: Date
  ): Promise<IPatrolRunPerformanceSummary> {
    try {
      return await this.getGuardPerformanceSummary(0, startDate, endDate);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get missed patrol runs for a date range
   */
  async findMissed(
    startDate: Date,
    endDate: Date,
    options?: Partial<IPatrolRunQueryOptions>
  ): Promise<IPatrolRun[]> {
    try {
      return await this.findAll({
        ...options,
        scheduledDateStart: startDate,
        scheduledDateEnd: endDate,
        status: PatrolRunStatus.MISSED,
      }).then((result) => result.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get patrol runs that should be marked as missed
   */
  async findShouldMarkMissed(): Promise<IPatrolRun[]> {
    try {
      const now = new Date();

      const models = await models.PatrolRun.findAll({
        where: {
          status: 'scheduled',
          scheduled_end: {
            [Op.lt]: now,
          },
        },
      });

      return models.map((m) => this.mapToEntity(m));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Calculate completion percentage for a patrol run
   */
  async calculateCompletionPercentage(id: number): Promise<number> {
    try {
      const run = await models.PatrolRun.findByPk(id);

      if (!run) {
        return 0;
      }

      const completedLogs = await models.PatrolCheckpointLog.count({
        where: {
          patrol_run_id: id,
          status: 'verified',
        },
      });

      return run.checkpoints_total > 0 ? (completedLogs / run.checkpoints_total) * 100 : 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Calculate total score for a patrol run
   */
  async calculateScore(id: number): Promise<number> {
    try {
      // Calculate based on completed checkpoints with time bonuses
      const verifiedLogs = await models.PatrolCheckpointLog.findAll({
        where: {
          patrol_run_id: id,
          status: 'verified',
        },
      });

      // Default 10 points per verified checkpoint
      return verifiedLogs.length * 10;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get patrol run count by status
   */
  async countByStatus(
    status: string,
    options?: Partial<IPatrolRunQueryOptions>
  ): Promise<number> {
    try {
      const where: any = {
        status: this.mapStatusToDB(status as PatrolRunStatus),
      };

      if (options?.siteId) {
        where.site_id = options.siteId;
      }

      if (options?.guardId) {
        where.guard_id = options.guardId;
      }

      return await models.PatrolRun.count({ where });
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export default SequelizePatrolRunRepository;
