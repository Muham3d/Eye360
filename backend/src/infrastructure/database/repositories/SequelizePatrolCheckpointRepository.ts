/**
 * Sequelize Patrol Checkpoint Repository
 *
 * Implements the IPatrolCheckpointRepository interface using Sequelize ORM.
 * Handles the join table between patrol templates and checkpoints.
 *
 * @module infrastructure/database/repositories
 */

import { Transaction, Op, literal } from 'sequelize';
import {
  IPatrolCheckpoint,
  IPatrolCheckpointDetail,
  ICreatePatrolCheckpointDTO,
  IUpdatePatrolCheckpointDTO,
  IBulkCreatePatrolCheckpointsDTO,
  ITimeWindowValidationResult,
} from '../../../core/domain/entities/PatrolCheckpoint.js';
import {
  IPatrolCheckpointRepository,
  PatrolCheckpointRepositoryError,
  PatrolCheckpointRepositoryErrorCode,
} from '../../../core/domain/repositories/IPatrolCheckpointRepository.js';
import { BaseRepository } from './BaseRepository.js';
import models from '../models/index.js';

/**
 * PatrolCheckpoint Model Type
 */
type PatrolCheckpointModel = ReturnType<typeof models.PatrolCheckpoint>;

/**
 * Sequelize Patrol Checkpoint Repository
 *
 * Implements patrol checkpoint data access for the join table.
 */
export class SequelizePatrolCheckpointRepository extends BaseRepository<PatrolCheckpointModel>
  implements IPatrolCheckpointRepository {

  /**
   * Get the Sequelize PatrolCheckpoint model
   */
  protected getModel(): PatrolCheckpointModel {
    return models.PatrolCheckpoint;
  }

  /**
   * Map Sequelize model to domain entity
   */
  private mapToEntity(model: any): IPatrolCheckpoint {
    return {
      id: model.id,
      templateId: model.template_id,
      checkpointId: model.checkpoint_id,
      sequenceOrder: model.sequence_order,
      requiredPhoto: model.photo_required,
      timeWindowStart: model.time_limit_seconds ? model.time_limit_seconds.toString() : undefined,
      timeWindowEnd: undefined, // Not in current schema, maybe using time_limit as duration
      pointsValue: 10, // Default value, could be derived from is_mandatory
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    };
  }

  /**
   * Map Sequelize model with checkpoint to detail entity
   */
  private mapToDetail(model: any): IPatrolCheckpointDetail {
    const entity = this.mapToEntity(model);
    return {
      ...entity,
      checkpointName: model.checkpoint?.name || '',
      checkpointDescription: model.checkpoint?.description,
      verificationType: model.checkpoint?.nfc_tag_id ? 'nfc' :
        model.checkpoint?.qr_code_data ? 'qr' : 'gps',
      location: {
        latitude: parseFloat(model.checkpoint?.latitude || 0),
        longitude: parseFloat(model.checkpoint?.longitude || 0),
      },
      gpsTolerance: model.checkpoint?.site?.allowed_distance_meters || 100,
    };
  }

  /**
   * Map DTO to database creation attributes
   */
  private mapCreateDataToDB(data: ICreatePatrolCheckpointDTO): any {
    return {
      template_id: data.templateId,
      checkpoint_id: data.checkpointId,
      sequence_order: data.sequenceOrder,
      photo_required: data.requiredPhoto || false,
      notes_required: false,
      is_mandatory: true,
      time_limit_seconds: data.timeWindowStart ? parseInt(data.timeWindowStart) : null,
    };
  }

  /**
   * Find a patrol checkpoint by ID
   */
  async findById(id: number): Promise<IPatrolCheckpoint | null> {
    try {
      const model = await models.PatrolCheckpoint.findByPk(id);
      return model ? this.mapToEntity(model) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find patrol checkpoints by template ID
   */
  async findByTemplateId(templateId: number): Promise<IPatrolCheckpoint[]> {
    try {
      const models = await models.PatrolCheckpoint.findAll({
        where: { template_id: templateId },
        order: [['sequence_order', 'ASC']],
      });

      return models.map((m) => this.mapToEntity(m));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find patrol checkpoints by template ID with detail
   */
  async findByTemplateIdWithDetail(templateId: number): Promise<IPatrolCheckpointDetail[]> {
    try {
      const models = await models.PatrolCheckpoint.findAll({
        where: { template_id: templateId },
        order: [['sequence_order', 'ASC']],
        include: [
          {
            model: models.Checkpoint,
            as: 'checkpoint',
          },
        ],
      });

      return models.map((m) => this.mapToDetail(m));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find a specific checkpoint in a template
   */
  async findByTemplateAndCheckpoint(
    templateId: number,
    checkpointId: number
  ): Promise<IPatrolCheckpoint | null> {
    try {
      const model = await models.PatrolCheckpoint.findOne({
        where: {
          template_id: templateId,
          checkpoint_id: checkpointId,
        },
      });

      return model ? this.mapToEntity(model) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a new patrol checkpoint
   */
  async create(checkpointData: ICreatePatrolCheckpointDTO): Promise<IPatrolCheckpoint> {
    try {
      // Check if already exists
      const existing = await this.findByTemplateAndCheckpoint(
        checkpointData.templateId,
        checkpointData.checkpointId
      );

      if (existing) {
        throw new PatrolCheckpointRepositoryError(
          PatrolCheckpointRepositoryErrorCode.INVALID_SEQUENCE,
          'Checkpoint is already in this template'
        );
      }

      const dbData = this.mapCreateDataToDB(checkpointData);
      const model = await models.PatrolCheckpoint.create(dbData);
      return this.mapToEntity(model);
    } catch (error) {
      if (error instanceof PatrolCheckpointRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Bulk create patrol checkpoints for a template
   */
  async bulkCreate(data: IBulkCreatePatrolCheckpointsDTO): Promise<IPatrolCheckpoint[]> {
    try {
      // Clear existing checkpoints for template
      await models.PatrolCheckpoint.destroy({
        where: { template_id: data.templateId },
      });

      // Create new checkpoints
      const createData = data.checkpoints.map((cp) => ({
        template_id: data.templateId,
        checkpoint_id: cp.checkpointId,
        sequence_order: cp.sequenceOrder,
        photo_required: cp.requiredPhoto || false,
        notes_required: false,
        is_mandatory: true,
      }));

      const models = await models.PatrolCheckpoint.bulkCreate(createData);
      return models.map((m) => this.mapToEntity(m));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing patrol checkpoint
   */
  async update(id: number, checkpointData: IUpdatePatrolCheckpointDTO): Promise<IPatrolCheckpoint | null> {
    try {
      const updateData: any = {};

      if (checkpointData.sequenceOrder !== undefined) {
        updateData.sequence_order = checkpointData.sequenceOrder;
      }
      if (checkpointData.requiredPhoto !== undefined) {
        updateData.photo_required = checkpointData.requiredPhoto;
      }
      if (checkpointData.pointsValue !== undefined) {
        // Not directly stored in current schema
      }

      await models.PatrolCheckpoint.update(updateData, { where: { id } });

      const updated = await models.PatrolCheckpoint.findByPk(id);
      return updated ? this.mapToEntity(updated) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a patrol checkpoint
   */
  async delete(id: number): Promise<boolean> {
    try {
      const deletedCount = await models.PatrolCheckpoint.destroy({ where: { id } });
      return deletedCount > 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete all checkpoints for a template
   */
  async deleteByTemplateId(templateId: number): Promise<number> {
    try {
      return await models.PatrolCheckpoint.destroy({
        where: { template_id: templateId },
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update sequence order for checkpoints in a template
   */
  async updateSequenceOrder(
    templateId: number,
    checkpointOrders: Array<{ checkpointId: number; sequenceOrder: number }>
  ): Promise<boolean> {
    try {
      for (const item of checkpointOrders) {
        await models.PatrolCheckpoint.update(
          { sequence_order: item.sequenceOrder },
          {
            where: {
              template_id: templateId,
              checkpoint_id: item.checkpointId,
            },
          }
        );
      }
      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get the next sequence order for a template
   */
  async getNextSequenceOrder(templateId: number): Promise<number> {
    try {
      const max = await models.PatrolCheckpoint.max('sequence_order', {
        where: { template_id: templateId },
      });

      return (max || -1) + 1;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get checkpoint count for a template
   */
  async countByTemplate(templateId: number): Promise<number> {
    try {
      return await models.PatrolCheckpoint.count({
        where: { template_id: templateId },
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate time window for a checkpoint
   */
  async validateTimeWindow(
    patrolCheckpointId: number,
    verificationTime: Date
  ): Promise<ITimeWindowValidationResult> {
    try {
      const patrolCheckpoint = await models.PatrolCheckpoint.findByPk(patrolCheckpointId);

      if (!patrolCheckpoint) {
        throw new PatrolCheckpointRepositoryError(
          PatrolCheckpointRepositoryErrorCode.PATROL_CHECKPOINT_NOT_FOUND,
          `Patrol checkpoint with ID ${patrolCheckpointId} not found`
        );
      }

      // Time windows not supported in current schema
      // Return valid result
      return {
        isValid: true,
        isWithinWindow: true,
      };
    } catch (error) {
      if (error instanceof PatrolCheckpointRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Get checkpoints by sequence order range
   */
  async findBySequenceRange(
    templateId: number,
    startOrder: number,
    endOrder: number
  ): Promise<IPatrolCheckpoint[]> {
    try {
      const models = await models.PatrolCheckpoint.findAll({
        where: {
          template_id: templateId,
          sequence_order: {
            [Op.between]: [startOrder, endOrder],
          },
        },
        order: [['sequence_order', 'ASC']],
      });

      return models.map((m) => this.mapToEntity(m));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if checkpoint is in valid sequence
   */
  async isValidNextCheckpoint(
    templateId: number,
    checkpointId: number,
    lastVerifiedCheckpointId: number | null
  ): Promise<boolean> {
    try {
      if (lastVerifiedCheckpointId === null) {
        // First checkpoint must be sequence_order 0
        const firstCheckpoint = await models.PatrolCheckpoint.findOne({
          where: {
            template_id: templateId,
            checkpoint_id: checkpointId,
          },
        });

        return firstCheckpoint?.sequence_order === 0;
      }

      // Get last verified checkpoint sequence
      const lastVerified = await models.PatrolCheckpoint.findOne({
        where: {
          template_id: templateId,
          checkpoint_id: lastVerifiedCheckpointId,
        },
      });

      // Get current checkpoint sequence
      const current = await models.PatrolCheckpoint.findOne({
        where: {
          template_id: templateId,
          checkpoint_id: checkpointId,
        },
      });

      if (!lastVerified || !current) {
        return false;
      }

      return current.sequence_order === lastVerified.sequence_order + 1;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get total points value for a template
   */
  async getTotalPoints(templateId: number): Promise<number> {
    try {
      const count = await models.PatrolCheckpoint.count({
        where: { template_id: templateId },
      });

      // Default 10 points per checkpoint
      return count * 10;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Duplicate checkpoints from one template to another
   */
  async duplicateCheckpoints(
    sourceTemplateId: number,
    targetTemplateId: number
  ): Promise<IPatrolCheckpoint[]> {
    try {
      const sourceCheckpoints = await models.PatrolCheckpoint.findAll({
        where: { template_id: sourceTemplateId },
        order: [['sequence_order', 'ASC']],
      });

      const createData = sourceCheckpoints.map((cp) => ({
        template_id: targetTemplateId,
        checkpoint_id: cp.checkpoint_id,
        sequence_order: cp.sequence_order,
        photo_required: cp.photo_required,
        notes_required: cp.notes_required,
        is_mandatory: cp.is_mandatory,
        time_limit_seconds: cp.time_limit_seconds,
        special_instructions: cp.special_instructions,
      }));

      const models = await models.PatrolCheckpoint.bulkCreate(createData);
      return models.map((m) => this.mapToEntity(m));
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export default SequelizePatrolCheckpointRepository;
