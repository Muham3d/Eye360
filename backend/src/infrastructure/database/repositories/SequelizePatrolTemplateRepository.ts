/**
 * Sequelize Patrol Template Repository
 *
 * Implements the IPatrolTemplateRepository interface using Sequelize ORM.
 * Handles patrol template data access with checkpoint management.
 *
 * @module infrastructure/database/repositories
 */

import { Transaction, literal, Op } from 'sequelize';
import {
  IPatrolTemplate,
  IPatrolTemplateDetail,
  ICreatePatrolTemplateDTO,
  IUpdatePatrolTemplateDTO,
  IPatrolTemplateQueryOptions,
  PatrolTemplateStatus,
} from '../../../core/domain/entities/PatrolTemplate.js';
import {
  IPatrolCheckpoint,
  IPatrolCheckpointDetail,
  ICreatePatrolCheckpointDTO,
} from '../../../core/domain/entities/PatrolCheckpoint.js';
import { IPaginatedResult } from '../../../core/domain/repositories/IUserRepository.js';
import {
  IPatrolTemplateRepository,
  PatrolTemplateRepositoryError,
  PatrolTemplateRepositoryErrorCode,
} from '../../../core/domain/repositories/IPatrolTemplateRepository.js';
import { BaseRepository, QueryOptions } from './BaseRepository.js';
import models from '../models/index.js';

/**
 * PatrolTemplate Model Type
 */
type PatrolTemplateModel = ReturnType<typeof models.PatrolTemplate>;

/**
 * Sequelize Patrol Template Repository
 *
 * Implements patrol template data access with checkpoint management.
 */
export class SequelizePatrolTemplateRepository extends BaseRepository<PatrolTemplateModel>
  implements IPatrolTemplateRepository {

  /**
   * Get the Sequelize PatrolTemplate model
   */
  protected getModel(): PatrolTemplateModel {
    return models.PatrolTemplate;
  }

  /**
   * Map Sequelize model to domain entity
   */
  private mapToEntity(model: PatrolTemplateModel): IPatrolTemplate {
    return {
      id: model.id,
      siteId: model.site_id,
      name: model.name,
      description: model.description ?? undefined,
      estimatedDuration: model.estimated_duration_minutes,
      maxCompletionTime: model.estimated_duration_minutes * 2, // Default calculation
      requiredRole: this.mapRequiredRole(model.type),
      status: this.mapStatusFromDB(model.status),
      createdById: model.created_by,
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    };
  }

  /**
   * Map domain status to database enum
   */
  private mapStatusToDB(status: PatrolTemplateStatus): string {
    const statusMap: Record<PatrolTemplateStatus, string> = {
      [PatrolTemplateStatus.ACTIVE]: 'active',
      [PatrolTemplateStatus.INACTIVE]: 'inactive',
      [PatrolTemplateStatus.ARCHIVED]: 'archived',
    };
    return statusMap[status] || 'draft';
  }

  /**
   * Map database status to domain enum
   */
  private mapStatusFromDB(status: string): PatrolTemplateStatus {
    const statusMap: Record<string, PatrolTemplateStatus> = {
      'draft': PatrolTemplateStatus.INACTIVE,
      'active': PatrolTemplateStatus.ACTIVE,
      'inactive': PatrolTemplateStatus.INACTIVE,
      'archived': PatrolTemplateStatus.ARCHIVED,
    };
    return statusMap[status] || PatrolTemplateStatus.INACTIVE;
  }

  /**
   * Map patrol type to required role
   */
  private mapRequiredRole(type: string): 'guard' | 'supervisor' | 'manager' {
    const typeMap: Record<string, 'guard' | 'supervisor' | 'manager'> = {
      'routine': 'guard',
      'emergency': 'supervisor',
      'special': 'supervisor',
      'training': 'guard',
    };
    return typeMap[type] || 'guard';
  }

  /**
   * Map required role to patrol type
   */
  private mapRoleToType(role: string): string {
    const roleMap: Record<string, string> = {
      'guard': 'routine',
      'supervisor': 'special',
      'manager': 'special',
    };
    return roleMap[role] || 'routine';
  }

  /**
   * Map DTO to database creation attributes
   */
  private mapCreateDataToDB(data: ICreatePatrolTemplateDTO): any {
    return {
      site_id: data.siteId,
      name: data.name,
      description: data.description ?? null,
      type: data.requiredRole ? this.mapRoleToType(data.requiredRole) : 'routine',
      status: data.status ? this.mapStatusToDB(data.status) : 'draft',
      estimated_duration_minutes: data.estimatedDuration,
      required_guards: 1,
      created_by: data.createdById,
      code: data.name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50),
    };
  }

  /**
   * Map DTO to database update attributes
   */
  private mapUpdateDataToDB(data: IUpdatePatrolTemplateDTO): any {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.estimatedDuration !== undefined) {
      updateData.estimated_duration_minutes = data.estimatedDuration;
    }
    if (data.maxCompletionTime !== undefined) {
      // Not directly stored - could be calculated from estimatedDuration
    }
    if (data.requiredRole !== undefined) {
      updateData.type = this.mapRoleToType(data.requiredRole);
    }
    if (data.status !== undefined) updateData.status = this.mapStatusToDB(data.status);

    return updateData;
  }

  /**
   * Find a template by ID
   */
  async findById(id: number, options?: Partial<IPatrolTemplateQueryOptions>): Promise<IPatrolTemplate | null> {
    try {
      const model = await models.PatrolTemplate.findByPk(id);
      return model ? this.mapToEntity(model) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find a template by ID with checkpoints
   */
  async findByIdWithDetail(id: number, options?: Partial<IPatrolTemplateQueryOptions>): Promise<IPatrolTemplateDetail | null> {
    try {
      const template = await models.PatrolTemplate.findByPk(id);

      if (!template) {
        return null;
      }

      const entity = this.mapToEntity(template);

      // Get checkpoints for this template
      const patrolCheckpoints = await models.PatrolCheckpoint.findAll({
        where: { template_id: id },
        order: [['sequence_order', 'ASC']],
        include: [
          {
            model: models.Checkpoint,
            as: 'checkpoint',
          },
        ],
      });

      const checkpoints: IPatrolCheckpointDetail[] = patrolCheckpoints.map((pc) => ({
        id: pc.id,
        templateId: pc.template_id,
        checkpointId: pc.checkpoint_id,
        sequenceOrder: pc.sequence_order,
        requiredPhoto: pc.photo_required,
        timeWindowStart: undefined, // Not in current schema
        timeWindowEnd: undefined, // Not in current schema
        pointsValue: 10, // Default value
        createdAt: pc.created_at,
        updatedAt: pc.updated_at,
        checkpointName: (pc as any).checkpoint?.name || '',
        checkpointDescription: (pc as any).checkpoint?.description,
        verificationType: (pc as any).checkpoint?.nfc_tag_id ? 'nfc' :
          (pc as any).checkpoint?.qr_code_data ? 'qr' : 'gps',
        location: {
          latitude: parseFloat((pc as any).checkpoint?.latitude || 0),
          longitude: parseFloat((pc as any).checkpoint?.longitude || 0),
        },
        gpsTolerance: 100, // Default
      }));

      const totalPointsValue = checkpoints.reduce((sum, cp) => sum + cp.pointsValue, 0);

      return {
        ...entity,
        checkpoints,
        totalPointsValue,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all templates with filtering and pagination
   */
  async findAll(options?: IPatrolTemplateQueryOptions): Promise<IPaginatedResult<IPatrolTemplate>> {
    try {
      const queryOptions: QueryOptions = {
        page: options?.page,
        limit: options?.limit,
        sortBy: options?.sortBy || 'name',
        sortOrder: options?.sortOrder || 'ASC',
      };

      const where: any = {};

      if (options?.siteId) {
        where.site_id = options.siteId;
      }

      if (options?.status) {
        where.status = this.mapStatusToDB(options.status);
      }

      if (options?.requiredRole) {
        where.type = this.mapRoleToType(options.requiredRole);
      }

      if (options?.createdById) {
        where.created_by = options.createdById;
      }

      if (options?.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${options.search}%` } },
          { description: { [Op.iLike]: `%${options.search}%` } },
        ];
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
   * Get all templates for a site
   */
  async findBySiteId(
    siteId: number,
    options?: Partial<IPatrolTemplateQueryOptions>
  ): Promise<IPaginatedResult<IPatrolTemplate>> {
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
   * Get active templates for a site
   */
  async findActiveBySiteId(
    siteId: number,
    options?: Partial<IPatrolTemplateQueryOptions>
  ): Promise<IPatrolTemplate[]> {
    try {
      return await this.findAll({
        ...options,
        siteId,
        status: PatrolTemplateStatus.ACTIVE,
      }).then((result) => result.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a new template
   */
  async create(templateData: ICreatePatrolTemplateDTO): Promise<IPatrolTemplate> {
    try {
      const dbData = this.mapCreateDataToDB(templateData);
      const model = await models.PatrolTemplate.create(dbData);
      return this.mapToEntity(model);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a new template with checkpoints
   */
  async createWithCheckpoints(
    templateData: ICreatePatrolTemplateDTO,
    checkpointsData: { templateId: number; checkpoints: ICreatePatrolCheckpointDTO[] }
  ): Promise<IPatrolTemplateDetail> {
    try {
      // Create template
      const template = await this.create(templateData);

      // Create checkpoints
      const checkpointPromises = checkpointsData.checkpoints.map((cp) =>
        models.PatrolCheckpoint.create({
          template_id: template.id,
          checkpoint_id: cp.checkpointId,
          sequence_order: cp.sequenceOrder,
          photo_required: cp.requiredPhoto || false,
          notes_required: false,
          is_mandatory: true,
        })
      );

      await Promise.all(checkpointPromises);

      return await this.findByIdWithDetail(template.id) || {
        ...template,
        checkpoints: [],
        totalPointsValue: 0,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing template
   */
  async update(id: number, templateData: IUpdatePatrolTemplateDTO): Promise<IPatrolTemplate | null> {
    try {
      const dbData = this.mapUpdateDataToDB(templateData);
      await models.PatrolTemplate.update(dbData, { where: { id } });

      const updated = await models.PatrolTemplate.findByPk(id);
      return updated ? this.mapToEntity(updated) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a template
   */
  async delete(id: number): Promise<boolean> {
    try {
      // Check if template has active runs
      const activeRunCount = await models.PatrolRun.count({
        where: {
          template_id: id,
          status: ['scheduled', 'in_progress', 'paused'],
        },
      });

      if (activeRunCount > 0) {
        throw new PatrolTemplateRepositoryError(
          PatrolTemplateRepositoryErrorCode.CANNOT_DELETE_TEMPLATE_WITH_ACTIVE_RUNS,
          `Cannot delete template with ${activeRunCount} active patrol runs.`
        );
      }

      const deletedCount = await models.PatrolTemplate.destroy({ where: { id } });
      return deletedCount > 0;
    } catch (error) {
      if (error instanceof PatrolTemplateRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Archive a template
   */
  async archive(id: number): Promise<boolean> {
    try {
      const [updatedCount] = await models.PatrolTemplate.update(
        { status: 'archived' },
        { where: { id } }
      );
      return updatedCount > 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Duplicate a template
   */
  async duplicate(id: number, newName: string, createdById: number): Promise<IPatrolTemplateDetail> {
    try {
      const original = await models.PatrolTemplate.findByPk(id);

      if (!original) {
        throw new PatrolTemplateRepositoryError(
          PatrolTemplateRepositoryErrorCode.TEMPLATE_NOT_FOUND,
          `Template with ID ${id} not found`
        );
      }

      // Create new template
      const newTemplate = await models.PatrolTemplate.create({
        site_id: original.site_id,
        name: newName,
        description: original.description,
        type: original.type,
        status: 'draft',
        estimated_duration_minutes: original.estimated_duration_minutes,
        required_guards: original.required_guards,
        created_by: createdById,
        code: `${original.code}_copy_${Date.now()}`,
      });

      // Copy checkpoints
      const originalCheckpoints = await models.PatrolCheckpoint.findAll({
        where: { template_id: id },
        order: [['sequence_order', 'ASC']],
      });

      for (const cp of originalCheckpoints) {
        await models.PatrolCheckpoint.create({
          template_id: newTemplate.id,
          checkpoint_id: cp.checkpoint_id,
          sequence_order: cp.sequence_order,
          photo_required: cp.photo_required,
          notes_required: cp.notes_required,
          is_mandatory: cp.is_mandatory,
          time_limit_seconds: cp.time_limit_seconds,
          special_instructions: cp.special_instructions,
        });
      }

      return await this.findByIdWithDetail(newTemplate.id) || {
        ...this.mapToEntity(newTemplate),
        checkpoints: [],
        totalPointsValue: 0,
      };
    } catch (error) {
      if (error instanceof PatrolTemplateRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Check if template name exists for a site
   */
  async nameExists(siteId: number, name: string, excludeTemplateId?: number): Promise<boolean> {
    try {
      const where: any = {
        site_id: siteId,
        name,
      };

      if (excludeTemplateId) {
        where.id = { [Op.ne]: excludeTemplateId };
      }

      const count = await models.PatrolTemplate.count({ where });
      return count > 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get template count by site
   */
  async countBySite(siteId: number, status?: string): Promise<number> {
    try {
      const where: any = { site_id: siteId };

      if (status) {
        where.status = this.mapStatusToDB(status as PatrolTemplateStatus);
      }

      return await models.PatrolTemplate.count({ where });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get templates by required role level
   */
  async findByRequiredRole(
    requiredRole: string,
    options?: Partial<IPatrolTemplateQueryOptions>
  ): Promise<IPatrolTemplate[]> {
    try {
      return await this.findAll({
        ...options,
        requiredRole: requiredRole as any,
      }).then((result) => result.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Add checkpoint to template
   */
  async addCheckpoint(
    templateId: number,
    checkpointData: {
      checkpointId: number;
      sequenceOrder: number;
      requiredPhoto?: boolean;
      timeWindowStart?: string;
      timeWindowEnd?: string;
      pointsValue?: number;
    }
  ): Promise<IPatrolTemplateDetail> {
    try {
      // Check if checkpoint is already in template
      const existing = await models.PatrolCheckpoint.findOne({
        where: {
          template_id: templateId,
          checkpoint_id: checkpointData.checkpointId,
        },
      });

      if (existing) {
        throw new PatrolTemplateRepositoryError(
          PatrolTemplateRepositoryErrorCode.CHECKPOINT_ALREADY_IN_TEMPLATE,
          'Checkpoint is already in this template'
        );
      }

      // Add the checkpoint
      await models.PatrolCheckpoint.create({
        template_id: templateId,
        checkpoint_id: checkpointData.checkpointId,
        sequence_order: checkpointData.sequenceOrder,
        photo_required: checkpointData.requiredPhoto || false,
        is_mandatory: true,
      });

      return await this.findByIdWithDetail(templateId) || {
        id: templateId,
        siteId: 0,
        name: '',
        estimatedDuration: 0,
        maxCompletionTime: 0,
        requiredRole: 'guard',
        status: PatrolTemplateStatus.INACTIVE,
        createdById: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        checkpoints: [],
        totalPointsValue: 0,
      };
    } catch (error) {
      if (error instanceof PatrolTemplateRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Remove checkpoint from template
   */
  async removeCheckpoint(templateId: number, checkpointId: number): Promise<IPatrolTemplateDetail> {
    try {
      await models.PatrolCheckpoint.destroy({
        where: {
          template_id: templateId,
          checkpoint_id: checkpointId,
        },
      });

      // Reorder remaining checkpoints
      const remainingCheckpoints = await models.PatrolCheckpoint.findAll({
        where: { template_id: templateId },
        order: [['sequence_order', 'ASC']],
      });

      for (let i = 0; i < remainingCheckpoints.length; i++) {
        await models.PatrolCheckpoint.update(
          { sequence_order: i },
          { where: { id: remainingCheckpoints[i].id } }
        );
      }

      return await this.findByIdWithDetail(templateId) || {
        id: templateId,
        siteId: 0,
        name: '',
        estimatedDuration: 0,
        maxCompletionTime: 0,
        requiredRole: 'guard',
        status: PatrolTemplateStatus.INACTIVE,
        createdById: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        checkpoints: [],
        totalPointsValue: 0,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Reorder checkpoints in a template
   */
  async reorderCheckpoints(
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
   * Get templates created by a user
   */
  async findByCreatedBy(
    createdById: number,
    options?: Partial<IPatrolTemplateQueryOptions>
  ): Promise<IPaginatedResult<IPatrolTemplate>> {
    try {
      return await this.findAll({
        ...options,
        createdById,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate template data before creation
   */
  async validateTemplateData(
    templateData: ICreatePatrolTemplateDTO
  ): Promise<{ isValid: boolean; errors?: string[] }> {
    const errors: string[] = [];

    // Validate duration
    if (templateData.estimatedDuration < 5) {
      errors.push('Estimated duration must be at least 5 minutes');
    }
    if (templateData.estimatedDuration > 480) {
      errors.push('Estimated duration cannot exceed 8 hours');
    }

    // Check if site exists
    const site = await models.Site.findByPk(templateData.siteId);
    if (!site) {
      errors.push('Site not found');
    }

    // Check if name exists for site
    const nameExists = await this.nameExists(
      templateData.siteId,
      templateData.name
    );
    if (nameExists) {
      errors.push('Template name already exists for this site');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  /**
   * Calculate total points for a template
   */
  async calculateTotalPoints(templateId: number): Promise<number> {
    try {
      const checkpoints = await models.PatrolCheckpoint.findAll({
        where: { template_id: templateId },
      });

      // Default 10 points per checkpoint
      return checkpoints.length * 10;
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export default SequelizePatrolTemplateRepository;
