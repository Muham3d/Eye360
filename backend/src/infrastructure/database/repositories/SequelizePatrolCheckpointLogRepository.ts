/**
 * Sequelize Patrol Checkpoint Log Repository
 *
 * Implements the IPatrolCheckpointLogRepository interface using Sequelize ORM.
 * Handles checkpoint verification logs with GPS validation data.
 *
 * @module infrastructure/database/repositories
 */

import { Transaction, literal, Op } from 'sequelize';
import {
  IPatrolCheckpointLog,
  IPatrolCheckpointLogDetail,
  ICreatePatrolCheckpointLogDTO,
  IUpdatePatrolCheckpointLogDTO,
  IPatrolCheckpointLogQueryOptions,
  IPatrolCheckpointLogSummary,
  PatrolCheckpointLogStatus,
} from '../../../core/domain/entities/PatrolCheckpointLog.js';
import { VerificationType } from '../../../core/domain/entities/Checkpoint.js';
import { GeoJSONPoint } from '../../../core/domain/types/geojson.js';
import { IPaginatedResult } from '../../../core/domain/repositories/IUserRepository.js';
import {
  IPatrolCheckpointLogRepository,
  PatrolCheckpointLogRepositoryError,
  PatrolCheckpointLogRepositoryErrorCode,
} from '../../../core/domain/repositories/IPatrolCheckpointLogRepository.js';
import { BaseRepository, QueryOptions } from './BaseRepository.js';
import models from '../models/index.js';

/**
 * PatrolCheckpointLog Model Type
 */
type PatrolCheckpointLogModel = ReturnType<typeof models.PatrolCheckpointLog>;

/**
 * Sequelize Patrol Checkpoint Log Repository
 *
 * Implements checkpoint log data access with verification tracking.
 */
export class SequelizePatrolCheckpointLogRepository extends BaseRepository<PatrolCheckpointLogModel>
  implements IPatrolCheckpointLogRepository {

  /**
   * Get the Sequelize PatrolCheckpointLog model
   */
  protected getModel(): PatrolCheckpointLogModel {
    return models.PatrolCheckpointLog;
  }

  /**
   * Map Sequelize model to domain entity
   */
  private mapToEntity(model: PatrolCheckpointLogModel): IPatrolCheckpointLog {
    return {
      id: model.id,
      patrolRunId: model.patrol_run_id,
      checkpointId: model.checkpoint_id,
      verifiedAt: model.verified_at ? new Date(model.verified_at) : undefined,
      verificationType: model.verification_method as VerificationType || undefined,
      location: model.location ? this.parseGeoJSONPoint(model.location) : undefined,
      gpsAccuracy: model.accuracy_meters ? parseFloat(model.accuracy_meters as any) : undefined,
      photoEvidence: model.photo_evidence_urls?.[0],
      notes: model.notes,
      status: this.mapStatusFromDB(model.status),
      verificationMetadata: undefined, // Would be stored as JSONB
      skippedReason: undefined, // Not in current schema
      missedReason: model.failed_reason ?? undefined,
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
  private mapStatusToDB(status: PatrolCheckpointLogStatus): string {
    const statusMap: Record<PatrolCheckpointLogStatus, string> = {
      [PatrolCheckpointLogStatus.VERIFIED]: 'verified',
      [PatrolCheckpointLogStatus.MISSED]: 'failed',
      [PatrolCheckpointLogStatus.SKIPPED]: 'skipped',
    };
    return statusMap[status] || 'pending';
  }

  /**
   * Map database status to domain enum
   */
  private mapStatusFromDB(status: string): PatrolCheckpointLogStatus {
    const statusMap: Record<string, PatrolCheckpointLogStatus> = {
      'pending': PatrolCheckpointLogStatus.SKIPPED,
      'verified': PatrolCheckpointLogStatus.VERIFIED,
      'failed': PatrolCheckpointLogStatus.MISSED,
      'skipped': PatrolCheckpointLogStatus.SKIPPED,
      'manually_approved': PatrolCheckpointLogStatus.VERIFIED,
    };
    return statusMap[status] || PatrolCheckpointLogStatus.SKIPPED;
  }

  /**
   * Map DTO to database creation attributes
   */
  private mapCreateDataToDB(data: ICreatePatrolCheckpointLogDTO): any {
    const dbData: any = {
      patrol_run_id: data.patrolRunId,
      checkpoint_id: data.checkpointId,
      status: data.status ? this.mapStatusToDB(data.status) : 'pending',
    };

    if (data.verifiedAt) {
      dbData.verified_at = data.verifiedAt;
    }
    if (data.verificationType) {
      dbData.verification_method = data.verificationType;
    }
    if (data.location) {
      dbData.latitude = data.location.coordinates[1];
      dbData.longitude = data.location.coordinates[0];
      dbData.location = JSON.stringify(data.location);
    }
    if (data.gpsAccuracy !== undefined) {
      dbData.accuracy_meters = data.gpsAccuracy;
    }
    if (data.photoEvidence) {
      dbData.photo_evidence_urls = [data.photoEvidence];
    }
    if (data.notes) {
      dbData.notes = data.notes;
    }
    if (data.missedReason) {
      dbData.failed_reason = data.missedReason;
    }

    return dbData;
  }

  /**
   * Find a checkpoint log by ID
   */
  async findById(id: number): Promise<IPatrolCheckpointLog | null> {
    try {
      const model = await models.PatrolCheckpointLog.findByPk(id);
      return model ? this.mapToEntity(model) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find a checkpoint log by ID with detail
   */
  async findByIdWithDetail(id: number): Promise<IPatrolCheckpointLogDetail | null> {
    try {
      const model = await models.PatrolCheckpointLog.findByPk(id, {
        include: [
          {
            model: models.Checkpoint,
            as: 'checkpoint',
            include: [
              {
                model: models.Site,
                as: 'site',
              },
            ],
          },
        ],
      });

      if (!model) {
        return null;
      }

      const entity = this.mapToEntity(model);
      const checkpoint = (model as any).checkpoint;
      const site = checkpoint?.site;

      let distanceFromExpected: number | undefined;
      let isWithinTolerance = false;

      if (model.latitude && model.longitude && checkpoint?.latitude && checkpoint?.longitude) {
        // Calculate distance
        const [distanceResult] = await models.sequelize.query(`
          SELECT ST_Distance(
            ST_SetSRID(ST_MakePoint(:lon1, :lat1)::geography, 4326),
            ST_SetSRID(ST_MakePoint(:lon2, :lat2)::geography, 4326)
          ) as distance_m
        `, {
          replacements: {
            lon1: model.longitude,
            lat1: model.latitude,
            lon2: checkpoint.longitude,
            lat2: checkpoint.latitude,
          },
          type: 'SELECT',
        });

        distanceFromExpected = distanceResult?.distance_m ?
          parseFloat(distanceResult.distance_m) : undefined;

        const allowedDistance = site?.allowed_distance_meters || 100;
        isWithinTolerance = (distanceFromExpected || 0) <= allowedDistance;
      }

      return {
        ...entity,
        checkpointName: checkpoint?.name || '',
        checkpointDescription: checkpoint?.description,
        siteId: site?.id || 0,
        siteName: site?.name || '',
        expectedLocation: {
          latitude: parseFloat(checkpoint?.latitude || 0),
          longitude: parseFloat(checkpoint?.longitude || 0),
        },
        distanceFromExpected,
        isWithinTolerance,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all checkpoint logs with filtering and pagination
   */
  async findAll(options?: IPatrolCheckpointLogQueryOptions): Promise<IPaginatedResult<IPatrolCheckpointLog>> {
    try {
      const queryOptions: QueryOptions = {
        page: options?.page,
        limit: options?.limit,
        sortBy: options?.sortBy || 'verifiedAt',
        sortOrder: options?.sortOrder || 'DESC',
      };

      const where: any = {};

      if (options?.patrolRunId) {
        where.patrol_run_id = options.patrolRunId;
      }

      if (options?.checkpointId) {
        where.checkpoint_id = options.checkpointId;
      }

      if (options?.status) {
        where.status = this.mapStatusToDB(options.status);
      }

      if (options?.verificationType) {
        where.verification_method = options.verificationType;
      }

      if (options?.verifiedAfter) {
        where.verified_at = {
          ...where.verified_at,
          [Op.gte]: options.verifiedAfter,
        };
      }

      if (options?.verifiedBefore) {
        where.verified_at = {
          ...where.verified_at,
          [Op.lte]: options.verifiedBefore,
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
   * Get checkpoint logs for a patrol run
   */
  async findByPatrolRunId(
    patrolRunId: number,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPaginatedResult<IPatrolCheckpointLog>> {
    try {
      return await this.findAll({
        ...options,
        patrolRunId,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get checkpoint logs for a specific checkpoint
   */
  async findByCheckpointId(
    checkpointId: number,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPaginatedResult<IPatrolCheckpointLog>> {
    try {
      return await this.findAll({
        ...options,
        checkpointId,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get checkpoint logs for a patrol run with detail
   */
  async findByPatrolRunIdWithDetail(
    patrolRunId: number,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPatrolCheckpointLogDetail[]> {
    try {
      const models = await models.PatrolCheckpointLog.findAll({
        where: {
          patrol_run_id: patrolRunId,
          ...(options?.status && { status: this.mapStatusToDB(options.status) }),
        },
        order: [['verified_at', 'ASC'], ['sequence_order', 'ASC']],
        include: [
          {
            model: models.Checkpoint,
            as: 'checkpoint',
            include: [
              {
                model: models.Site,
                as: 'site',
              },
            ],
          },
        ],
      });

      const results: IPatrolCheckpointLogDetail[] = [];

      for (const model of models) {
        const entity = this.mapToEntity(model);
        const checkpoint = (model as any).checkpoint;
        const site = checkpoint?.site;

        let distanceFromExpected: number | undefined;
        let isWithinTolerance = false;

        if (model.latitude && model.longitude && checkpoint?.latitude && checkpoint?.longitude) {
          const allowedDistance = site?.allowed_distance_meters || 100;
          // Simple distance calculation for now
          const R = 6371e3; // Earth radius in meters
          const lat1 = model.latitude * Math.PI / 180;
          const lat2 = checkpoint.latitude * Math.PI / 180;
          const deltaLat = (checkpoint.latitude - model.latitude) * Math.PI / 180;
          const deltaLon = (checkpoint.longitude - model.longitude) * Math.PI / 180;

          const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distanceFromExpected = R * c;
          isWithinTolerance = distanceFromExpected <= allowedDistance;
        }

        results.push({
          ...entity,
          checkpointName: checkpoint?.name || '',
          checkpointDescription: checkpoint?.description,
          siteId: site?.id || 0,
          siteName: site?.name || '',
          expectedLocation: {
            latitude: parseFloat(checkpoint?.latitude || 0),
            longitude: parseFloat(checkpoint?.longitude || 0),
          },
          distanceFromExpected,
          isWithinTolerance,
        });
      }

      return results;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a new checkpoint log
   */
  async create(logData: ICreatePatrolCheckpointLogDTO): Promise<IPatrolCheckpointLog> {
    try {
      const dbData = this.mapCreateDataToDB(logData);
      const model = await models.PatrolCheckpointLog.create(dbData);
      return this.mapToEntity(model);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing checkpoint log
   */
  async update(id: number, logData: IUpdatePatrolCheckpointLogDTO): Promise<IPatrolCheckpointLog | null> {
    try {
      const updateData: any = {};

      if (logData.verifiedAt !== undefined) {
        updateData.verified_at = logData.verifiedAt;
      }
      if (logData.verificationType !== undefined) {
        updateData.verification_method = logData.verificationType;
      }
      if (logData.location !== undefined) {
        updateData.latitude = logData.location.coordinates[1];
        updateData.longitude = logData.location.coordinates[0];
        updateData.location = JSON.stringify(logData.location);
      }
      if (logData.gpsAccuracy !== undefined) {
        updateData.accuracy_meters = logData.gpsAccuracy;
      }
      if (logData.photoEvidence !== undefined) {
        updateData.photo_evidence_urls = [logData.photoEvidence];
      }
      if (logData.notes !== undefined) {
        updateData.notes = logData.notes;
      }
      if (logData.status !== undefined) {
        updateData.status = this.mapStatusToDB(logData.status);
      }
      if (logData.missedReason !== undefined) {
        updateData.failed_reason = logData.missedReason;
      }

      await models.PatrolCheckpointLog.update(updateData, { where: { id } });

      const updated = await models.PatrolCheckpointLog.findByPk(id);
      return updated ? this.mapToEntity(updated) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a checkpoint log
   */
  async delete(id: number): Promise<boolean> {
    try {
      const deletedCount = await models.PatrolCheckpointLog.destroy({ where: { id } });
      return deletedCount > 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get the latest checkpoint log for a patrol run and checkpoint
   */
  async findLatest(patrolRunId: number, checkpointId: number): Promise<IPatrolCheckpointLog | null> {
    try {
      const model = await models.PatrolCheckpointLog.findOne({
        where: {
          patrol_run_id: patrolRunId,
          checkpoint_id: checkpointId,
        },
        order: [['verified_at', 'DESC']],
      });

      return model ? this.mapToEntity(model) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get the latest verified checkpoint for a patrol run
   */
  async findLatestVerified(patrolRunId: number): Promise<IPatrolCheckpointLog | null> {
    try {
      const model = await models.PatrolCheckpointLog.findOne({
        where: {
          patrol_run_id: patrolRunId,
          status: 'verified',
        },
        order: [['verified_at', 'DESC']],
      });

      return model ? this.mapToEntity(model) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get checkpoint log summary for a patrol run
   */
  async getSummary(patrolRunId: number): Promise<IPatrolCheckpointLogSummary> {
    try {
      const [totalCheckpoints, verifiedCheckpoints, missedCheckpoints, skippedCheckpoints] =
        await Promise.all([
          models.PatrolCheckpointLog.count({
            where: { patrol_run_id: patrolRunId },
          }),
          models.PatrolCheckpointLog.count({
            where: {
              patrol_run_id: patrolRunId,
              status: 'verified',
            },
          }),
          models.PatrolCheckpointLog.count({
            where: {
              patrol_run_id: patrolRunId,
              status: 'failed',
            },
          }),
          models.PatrolCheckpointLog.count({
            where: {
              patrol_run_id: patrolRunId,
              status: 'skipped',
            },
          }),
        ]);

      // Get verification times for average calculation
      const logs = await models.PatrolCheckpointLog.findAll({
        where: {
          patrol_run_id: patrolRunId,
          verified_at: { [Op.ne]: null },
        },
        order: [['verified_at', 'ASC']],
      });

      let averageVerificationTime = 0;
      if (logs.length > 1) {
        const totalTime = logs[logs.length - 1].verified_at!.getTime() -
          logs[0].verified_at!.getTime();
        averageVerificationTime = totalTime / logs.length / 60000; // Minutes
      }

      // Get fastest and slowest checkpoints
      let fastestCheckpoint: { name: string; verifiedAt: Date } | undefined;
      let slowestCheckpoint: { name: string; verifiedAt: Date } | undefined;

      if (logs.length > 0) {
        const withNames = await Promise.all(
          logs.map(async (log) => {
            const checkpoint = await models.Checkpoint.findByPk(log.checkpoint_id);
            return {
              name: checkpoint?.name || 'Unknown',
              verifiedAt: log.verified_at!,
              time: log.verified_at!.getTime(),
            };
          })
        );

        withNames.sort((a, b) => a.time - b.time);
        fastestCheckpoint = {
          name: withNames[0].name,
          verifiedAt: withNames[0].verifiedAt,
        };
        slowestCheckpoint = {
          name: withNames[withNames.length - 1].name,
          verifiedAt: withNames[withNames.length - 1].verifiedAt,
        };
      }

      // Calculate total score (10 points per verified checkpoint)
      const totalScore = verifiedCheckpoints * 10;

      return {
        patrolRunId,
        totalCheckpoints,
        verifiedCheckpoints,
        missedCheckpoints,
        skippedCheckpoints,
        averageVerificationTime: Math.round(averageVerificationTime),
        fastestCheckpoint: fastestCheckpoint || { name: 'N/A', verifiedAt: new Date() },
        slowestCheckpoint: slowestCheckpoint || { name: 'N/A', verifiedAt: new Date() },
        totalScore,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Mark a checkpoint as verified
   */
  async markVerified(
    patrolRunId: number,
    checkpointId: number,
    verificationData: {
      verifiedAt: Date;
      verificationType: string;
      location: { latitude: number; longitude: number };
      gpsAccuracy?: number;
      photoEvidence?: string;
      notes?: string;
      verificationMetadata?: object;
    }
  ): Promise<IPatrolCheckpointLog> {
    try {
      // Check if already verified
      const existing = await this.findLatest(patrolRunId, checkpointId);

      const dbData = {
        patrol_run_id: patrolRunId,
        checkpoint_id: checkpointId,
        verified_at: verificationData.verifiedAt,
        verification_method: verificationData.verificationType,
        latitude: verificationData.location.latitude,
        longitude: verificationData.location.longitude,
        location: JSON.stringify({
          type: 'Point',
          coordinates: [
            verificationData.location.longitude,
            verificationData.location.latitude,
          ],
        }),
        accuracy_meters: verificationData.gpsAccuracy,
        photo_evidence_urls: verificationData.photoEvidence ? [verificationData.photoEvidence] : null,
        notes: verificationData.notes,
        status: 'verified',
      };

      let model;
      if (existing) {
        // Update existing log
        await models.PatrolCheckpointLog.update(dbData, { where: { id: existing.id } });
        model = await models.PatrolCheckpointLog.findByPk(existing.id);
      } else {
        // Create new log
        // Get sequence order
        const patrolRun = await models.PatrolRun.findByPk(patrolRunId);
        const template = patrolRun ? await models.PatrolTemplate.findByPk(patrolRun.template_id) : null;
        if (template) {
          const patrolCheckpoint = await models.PatrolCheckpoint.findOne({
            where: {
              template_id: template.id,
              checkpoint_id: checkpointId,
            },
          });
          (dbData as any).sequence_order = patrolCheckpoint?.sequence_order || 0;
        }

        model = await models.PatrolCheckpointLog.create(dbData);
      }

      return model ? this.mapToEntity(model) : this.mapToEntity(
        await models.PatrolCheckpointLog.findOne({ where: { id: (model as any).id } }) as PatrolCheckpointLogModel
      );
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Mark a checkpoint as missed
   */
  async markMissed(patrolRunId: number, checkpointId: number, reason?: string): Promise<IPatrolCheckpointLog> {
    try {
      // Check if log exists
      const existing = await this.findLatest(patrolRunId, checkpointId);

      const dbData: any = {
        patrol_run_id: patrolRunId,
        checkpoint_id: checkpointId,
        status: 'failed',
      };

      if (reason) {
        dbData.failed_reason = reason;
      }

      let model;
      if (existing) {
        await models.PatrolCheckpointLog.update(dbData, { where: { id: existing.id } });
        model = await models.PatrolCheckpointLog.findByPk(existing.id);
      } else {
        model = await models.PatrolCheckpointLog.create(dbData);
      }

      return model ? this.mapToEntity(model) : this.mapToEntity(
        await models.PatrolCheckpointLog.findOne({ where: { id: (model as any).id } }) as PatrolCheckpointLogModel
      );
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Mark a checkpoint as skipped
   */
  async markSkipped(patrolRunId: number, checkpointId: number, reason?: string): Promise<IPatrolCheckpointLog> {
    try {
      const existing = await this.findLatest(patrolRunId, checkpointId);

      const dbData: any = {
        patrol_run_id: patrolRunId,
        checkpoint_id: checkpointId,
        status: 'skipped',
      };

      if (reason) {
        dbData.notes = reason;
      }

      let model;
      if (existing) {
        await models.PatrolCheckpointLog.update(dbData, { where: { id: existing.id } });
        model = await models.PatrolCheckpointLog.findByPk(existing.id);
      } else {
        model = await models.PatrolCheckpointLog.create(dbData);
      }

      return model ? this.mapToEntity(model) : this.mapToEntity(
        await models.PatrolCheckpointLog.findOne({ where: { id: (model as any).id } }) as PatrolCheckpointLogModel
      );
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get verified checkpoint logs within a time range
   */
  async findVerifiedInTimeRange(
    startDate: Date,
    endDate: Date,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPatrolCheckpointLog[]> {
    try {
      return await this.findAll({
        ...options,
        status: PatrolCheckpointLogStatus.VERIFIED,
        verifiedAfter: startDate,
        verifiedBefore: endDate,
      }).then((result) => result.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get checkpoint logs by verification type
   */
  async findByVerificationType(
    verificationType: string,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPatrolCheckpointLog[]> {
    try {
      return await this.findAll({
        ...options,
        verificationType: verificationType as VerificationType,
      }).then((result) => result.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get checkpoint count by status for a patrol run
   */
  async countByStatus(patrolRunId: number, status: string): Promise<number> {
    try {
      return await models.PatrolCheckpointLog.count({
        where: {
          patrol_run_id: patrolRunId,
          status: this.mapStatusToDB(status as PatrolCheckpointLogStatus),
        },
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all checkpoint logs for a checkpoint
   */
  async findByCheckpoint(
    checkpointId: number,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPaginatedResult<IPatrolCheckpointLog>> {
    try {
      return await this.findAll({
        ...options,
        checkpointId,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get checkpoint logs with photos
   */
  async findWithPhotos(patrolRunId: number): Promise<IPatrolCheckpointLog[]> {
    try {
      const models = await models.PatrolCheckpointLog.findAll({
        where: {
          patrol_run_id: patrolRunId,
          photo_evidence_urls: { [Op.ne]: null },
        },
      });

      return models.map((m) => this.mapToEntity(m));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get checkpoint verification history
   */
  async getVerificationHistory(
    checkpointId: number,
    startDate: Date,
    endDate: Date,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPaginatedResult<IPatrolCheckpointLog>> {
    try {
      return await this.findAll({
        ...options,
        checkpointId,
        status: PatrolCheckpointLogStatus.VERIFIED,
        verifiedAfter: startDate,
        verifiedBefore: endDate,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete all checkpoint logs for a patrol run
   */
  async deleteByPatrolRunId(patrolRunId: number): Promise<number> {
    try {
      return await models.PatrolCheckpointLog.destroy({
        where: { patrol_run_id: patrolRunId },
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Calculate average verification time for checkpoints
   */
  async calculateAverageVerificationTime(patrolRunId: number): Promise<number> {
    try {
      const summary = await this.getSummary(patrolRunId);
      return summary.averageVerificationTime;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export default SequelizePatrolCheckpointLogRepository;
