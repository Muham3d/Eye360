/**
 * Sequelize Checkpoint Repository
 *
 * Implements the ICheckpointRepository interface using Sequelize ORM with PostGIS
 * for geospatial queries on checkpoint locations.
 *
 * @module infrastructure/database/repositories
 */

import { Transaction, literal, Op, fn, col } from 'sequelize';
import {
  ICheckpoint,
  ICreateCheckpointDTO,
  IUpdateCheckpointDTO,
  ICheckpointQueryOptions,
  ICheckpointVerificationRequest,
  ICheckpointVerificationResult,
  VerificationType,
  CheckpointStatus,
} from '../../../core/domain/entities/Checkpoint.js';
import { GeoJSONPoint } from '../../../core/domain/types/geojson.js';
import { IPaginatedResult } from '../../../core/domain/repositories/IUserRepository.js';
import {
  ICheckpointRepository,
  CheckpointRepositoryError,
  CheckpointRepositoryErrorCode,
} from '../../../core/domain/repositories/ICheckpointRepository.js';
import { BaseRepository, QueryOptions } from './BaseRepository.js';
import models from '../models/index.js';

/**
 * Checkpoint Model Type
 */
type CheckpointModel = ReturnType<typeof models.Checkpoint>;

/**
 * Sequelize Checkpoint Repository
 *
 * Implements checkpoint data access with PostGIS geospatial support.
 */
export class SequelizeCheckpointRepository extends BaseRepository<CheckpointModel>
  implements ICheckpointRepository {

  /**
   * Get the Sequelize Checkpoint model
   */
  protected getModel(): CheckpointModel {
    return models.Checkpoint;
  }

  /**
   * Map Sequelize model to domain entity
   */
  private mapToEntity(model: CheckpointModel): ICheckpoint {
    // Determine verification type based on available codes
    let verificationType: VerificationType = VerificationType.GPS;
    if (model.nfc_tag_id) {
      verificationType = VerificationType.NFC;
    } else if (model.qr_code_data) {
      verificationType = VerificationType.QR;
    }

    return {
      id: model.id,
      siteId: model.site_id,
      name: model.name,
      description: model.description ?? undefined,
      location: {
        type: 'Point',
        coordinates: [model.longitude, model.latitude],
      },
      verificationType,
      nfcCode: model.nfc_tag_id ?? undefined,
      qrCode: model.qr_code_data ?? undefined,
      gpsTolerance: 100, // Default - could be site-specific
      orderIndex: model.order_index,
      status: this.mapStatusFromDB(model.status),
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    };
  }

  /**
   * Map domain status to database enum
   */
  private mapStatusToDB(status: CheckpointStatus): string {
    const statusMap: Record<CheckpointStatus, string> = {
      [CheckpointStatus.ACTIVE]: 'active',
      [CheckpointStatus.INACTIVE]: 'inactive',
      [CheckpointStatus.MAINTENANCE]: 'under_maintenance',
      [CheckpointStatus.REMOVED]: 'removed',
    };
    return statusMap[status] || 'active';
  }

  /**
   * Map database status to domain enum
   */
  private mapStatusFromDB(status: string): CheckpointStatus {
    const statusMap: Record<string, CheckpointStatus> = {
      'active': CheckpointStatus.ACTIVE,
      'inactive': CheckpointStatus.INACTIVE,
      'under_maintenance': CheckpointStatus.MAINTENANCE,
      'removed': CheckpointStatus.REMOVED,
    };
    return statusMap[status] || CheckpointStatus.ACTIVE;
  }

  /**
   * Map verification type string to enum
   */
  private mapVerificationTypeFromDB(type: string): VerificationType {
    const typeMap: Record<string, VerificationType> = {
      'nfc': VerificationType.NFC,
      'qr': VerificationType.QR,
      'gps': VerificationType.GPS,
    };
    return typeMap[type] || VerificationType.GPS;
  }

  /**
   * Map DTO to database creation attributes
   */
  private mapCreateDataToDB(data: ICreateCheckpointDTO): any {
    return {
      site_id: data.siteId,
      name: data.name,
      description: data.description ?? null,
      latitude: data.location.coordinates[1],
      longitude: data.location.coordinates[0],
      // PostGIS point will be set by model hook
      nfc_tag_id: data.nfcCode ?? null,
      qr_code_data: data.qrCode ?? null,
      order_index: data.orderIndex ?? 0,
      status: data.status ? this.mapStatusToDB(data.status) : 'active',
      code: data.name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50),
    };
  }

  /**
   * Map DTO to database update attributes
   */
  private mapUpdateDataToDB(data: IUpdateCheckpointDTO): any {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.location !== undefined) {
      updateData.latitude = data.location.coordinates[1];
      updateData.longitude = data.location.coordinates[0];
    }
    if (data.verificationType !== undefined) {
      // Note: This doesn't directly set verification_type in DB
      // as the DB uses nfc_tag_id and qr_code_data to determine type
    }
    if (data.nfcCode !== undefined) updateData.nfc_tag_id = data.nfcCode;
    if (data.qrCode !== undefined) updateData.qr_code_data = data.qrCode;
    if (data.gpsTolerance !== undefined) {
      // This would need to be stored in a separate column or use site default
    }
    if (data.orderIndex !== undefined) updateData.order_index = data.orderIndex;
    if (data.status !== undefined) updateData.status = this.mapStatusToDB(data.status);

    return updateData;
  }

  /**
   * Find a checkpoint by ID
   */
  async findById(id: number, options?: Partial<ICheckpointQueryOptions>): Promise<ICheckpoint | null> {
    try {
      const findOptions: any = {
        where: { id },
      };

      if (options?.siteId) {
        findOptions.where.site_id = options.siteId;
      }

      const model = await models.Checkpoint.findOne(findOptions);
      return model ? this.mapToEntity(model) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find a checkpoint by NFC code
   */
  async findByNfcCode(nfcCode: string, options?: Partial<ICheckpointQueryOptions>): Promise<ICheckpoint | null> {
    try {
      const findOptions: any = {
        where: { nfc_tag_id: nfcCode },
      };

      if (options?.siteId) {
        findOptions.where.site_id = options.siteId;
      }

      if (options?.status) {
        findOptions.where.status = this.mapStatusToDB(options.status);
      }

      const model = await models.Checkpoint.findOne(findOptions);
      return model ? this.mapToEntity(model) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find a checkpoint by QR code
   */
  async findByQrCode(qrCode: string, options?: Partial<ICheckpointQueryOptions>): Promise<ICheckpoint | null> {
    try {
      const findOptions: any = {
        where: { qr_code_data: qrCode },
      };

      if (options?.siteId) {
        findOptions.where.site_id = options.siteId;
      }

      if (options?.status) {
        findOptions.where.status = this.mapStatusToDB(options.status);
      }

      const model = await models.Checkpoint.findOne(findOptions);
      return model ? this.mapToEntity(model) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all checkpoints with filtering and pagination
   */
  async findAll(options?: ICheckpointQueryOptions): Promise<IPaginatedResult<ICheckpoint>> {
    try {
      const queryOptions: QueryOptions = {
        page: options?.page,
        limit: options?.limit,
        sortBy: options?.sortBy || 'orderIndex',
        sortOrder: options?.sortOrder || 'ASC',
      };

      const where: any = {};

      if (options?.siteId) {
        where.site_id = options.siteId;
      }

      if (options?.status) {
        where.status = this.mapStatusToDB(options.status);
      }

      if (options?.verificationType) {
        // Map verification type to appropriate field
        if (options.verificationType === VerificationType.NFC) {
          where.nfc_tag_id = { [Op.ne]: null };
        } else if (options.verificationType === VerificationType.QR) {
          where.qr_code_data = { [Op.ne]: null };
        } else if (options.verificationType === VerificationType.GPS) {
          where[Op.and] = [
            { nfc_tag_id: null },
            { qr_code_data: null },
          ];
        }
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
   * Get all checkpoints for a site
   */
  async findBySiteId(
    siteId: number,
    options?: Partial<ICheckpointQueryOptions>
  ): Promise<IPaginatedResult<ICheckpoint>> {
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
   * Create a new checkpoint
   */
  async create(checkpointData: ICreateCheckpointDTO): Promise<ICheckpoint> {
    try {
      const dbData = this.mapCreateDataToDB(checkpointData);
      const model = await models.Checkpoint.create(dbData);
      return this.mapToEntity(model);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing checkpoint
   */
  async update(id: number, checkpointData: IUpdateCheckpointDTO): Promise<ICheckpoint | null> {
    try {
      const dbData = this.mapUpdateDataToDB(checkpointData);
      await models.Checkpoint.update(dbData, { where: { id } });

      const updated = await models.Checkpoint.findByPk(id);
      return updated ? this.mapToEntity(updated) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a checkpoint
   */
  async delete(id: number): Promise<boolean> {
    try {
      // Check if checkpoint is used in any templates
      const usageCount = await models.PatrolCheckpoint.count({
        where: { checkpoint_id: id },
      });

      if (usageCount > 0) {
        throw new CheckpointRepositoryError(
          CheckpointRepositoryErrorCode.CANNOT_DELETE_CHECKPOINT_IN_TEMPLATE,
          `Cannot delete checkpoint that is used in ${usageCount} patrol template(s).`
        );
      }

      const deletedCount = await models.Checkpoint.destroy({ where: { id } });
      return deletedCount > 0;
    } catch (error) {
      if (error instanceof CheckpointRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Verify a checkpoint check-in
   */
  async verifyCheckpoint(request: ICheckpointVerificationRequest): Promise<ICheckpointVerificationResult> {
    try {
      const checkpoint = await models.Checkpoint.findByPk(request.checkpointId);

      if (!checkpoint) {
        return {
          success: false,
          isValid: false,
          errors: ['Checkpoint not found'],
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];
      let isValid = true;
      let distance: number | undefined;

      // Get site's allowed distance
      const site = await models.Site.findByPk(checkpoint.site_id);
      const allowedDistance = site?.allowed_distance_meters || 100;

      // Verify based on type
      switch (request.verificationType) {
        case VerificationType.NFC:
          if (!checkpoint.nfc_tag_id) {
            errors.push('This checkpoint does not support NFC verification');
            isValid = false;
          } else if (request.verificationCode !== checkpoint.nfc_tag_id) {
            errors.push('Invalid NFC code');
            isValid = false;
          }
          break;

        case VerificationType.QR:
          if (!checkpoint.qr_code_data) {
            errors.push('This checkpoint does not support QR verification');
            isValid = false;
          } else if (request.verificationCode !== checkpoint.qr_code_data) {
            errors.push('Invalid QR code');
            isValid = false;
          }
          break;

        case VerificationType.GPS:
          // Calculate distance using PostGIS
          const [distanceResult] = await models.sequelize.query(`
            SELECT ST_Distance(
              ST_SetSRID(ST_MakePoint(checkpoint.longitude, checkpoint.latitude)::geography, 4326),
              ST_SetSRID(ST_MakePoint(:lon, :lat)::geography, 4326)
            ) as distance_m
            FROM checkpoints AS checkpoint
            WHERE checkpoint.id = :id
          `, {
            replacements: {
              id: request.checkpointId,
              lon: request.location.coordinates[0],
              lat: request.location.coordinates[1],
            },
            type: 'SELECT',
          });

          distance = distanceResult?.distance_m ? Math.round(parseFloat(distanceResult.distance_m)) : 0;

          if (distance > allowedDistance) {
            errors.push(`Location outside allowed tolerance (${distance}m > ${allowedDistance}m)`);
            isValid = false;
          }

          // Check GPS accuracy
          if (request.gpsAccuracy && request.gpsAccuracy > 50) {
            warnings.push(`GPS accuracy is poor (${request.gpsAccuracy}m)`);
          }
          break;

        default:
          errors.push(`Unsupported verification type: ${request.verificationType}`);
          isValid = false;
      }

      // Check photo requirement if needed
      const checkpointInTemplate = await models.PatrolCheckpoint.findOne({
        where: { checkpoint_id: request.checkpointId },
        limit: 1,
      });

      if (checkpointInTemplate?.photo_required && !request.photoEvidence) {
        errors.push('Photo evidence is required for this checkpoint');
        isValid = false;
      }

      return {
        success: true,
        isValid,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        distance,
        accuracy: request.gpsAccuracy,
      };
    } catch (error) {
      return {
        success: false,
        isValid: false,
        errors: [(error as Error).message],
      };
    }
  }

  /**
   * Check if NFC code already exists
   */
  async nfcCodeExists(nfcCode: string, excludeCheckpointId?: number): Promise<boolean> {
    try {
      const where: any = { nfc_tag_id: nfcCode };

      if (excludeCheckpointId) {
        where.id = { [Op.ne]: excludeCheckpointId };
      }

      const count = await models.Checkpoint.count({ where });
      return count > 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if QR code already exists
   */
  async qrCodeExists(qrCode: string, excludeCheckpointId?: number): Promise<boolean> {
    try {
      const where: any = { qr_code_data: qrCode };

      if (excludeCheckpointId) {
        where.id = { [Op.ne]: excludeCheckpointId };
      }

      const count = await models.Checkpoint.count({ where });
      return count > 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get checkpoints by verification type
   */
  async findByVerificationType(
    verificationType: string,
    options?: Partial<ICheckpointQueryOptions>
  ): Promise<ICheckpoint[]> {
    try {
      return await this.findAll({
        ...options,
        verificationType: this.mapVerificationTypeFromDB(verificationType),
      }).then((result) => result.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get active checkpoints for a site
   */
  async findActiveBySiteId(
    siteId: number,
    options?: Partial<ICheckpointQueryOptions>
  ): Promise<ICheckpoint[]> {
    try {
      return await this.findAll({
        ...options,
        siteId,
        status: CheckpointStatus.ACTIVE,
      }).then((result) => result.data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Reorder checkpoints within a site
   */
  async reorderCheckpoints(
    siteId: number,
    checkpointOrders: Array<{ id: number; orderIndex: number }>
  ): Promise<boolean> {
    try {
      // Use bulk update with individual hooks
      for (const item of checkpointOrders) {
        await models.Checkpoint.update(
          { order_index: item.orderIndex },
          { where: { id: item.id, site_id: siteId } }
        );
      }
      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Generate a unique QR code for a checkpoint
   */
  async generateQrCode(checkpointId: number): Promise<string> {
    try {
      const checkpoint = await models.Checkpoint.findByPk(checkpointId);

      if (!checkpoint) {
        throw new CheckpointRepositoryError(
          CheckpointRepositoryErrorCode.CHECKPOINT_NOT_FOUND,
          `Checkpoint with ID ${checkpointId} not found`
        );
      }

      // Generate unique QR code: CP-{checkpointId}-{timestamp}-{random}
      const qrCode = `CP-${checkpointId}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      await models.Checkpoint.update(
        { qr_code_data: qrCode },
        { where: { id: checkpointId } }
      );

      return qrCode;
    } catch (error) {
      if (error instanceof CheckpointRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Generate a unique NFC code for a checkpoint
   */
  async generateNfcCode(checkpointId: number): Promise<string> {
    try {
      const checkpoint = await models.Checkpoint.findByPk(checkpointId);

      if (!checkpoint) {
        throw new CheckpointRepositoryError(
          CheckpointRepositoryErrorCode.CHECKPOINT_NOT_FOUND,
          `Checkpoint with ID ${checkpointId} not found`
        );
      }

      // Generate unique NFC code: NFC-{checkpointId}-{timestamp}-{random}
      const nfcCode = `NFC-${checkpointId}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      await models.Checkpoint.update(
        { nfc_tag_id: nfcCode },
        { where: { id: checkpointId } }
      );

      return nfcCode;
    } catch (error) {
      if (error instanceof CheckpointRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Get checkpoint count by site
   */
  async countBySite(siteId: number, status?: string): Promise<number> {
    try {
      const where: any = { site_id: siteId };

      if (status) {
        where.status = this.mapStatusToDB(status as CheckpointStatus);
      }

      return await models.Checkpoint.count({ where });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Bulk update checkpoint order indexes
   */
  async bulkUpdateOrderIndex(
    updates: Array<{ id: number; orderIndex: number }>
  ): Promise<boolean> {
    try {
      for (const item of updates) {
        await models.Checkpoint.update(
          { order_index: item.orderIndex },
          { where: { id: item.id } }
        );
      }
      return true;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find checkpoints within radius of a point
   */
  async findWithinRadius(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    options?: Partial<ICheckpointQueryOptions>
  ): Promise<ICheckpoint[]> {
    try {
      const where: any = {};

      if (options?.siteId) {
        where.site_id = options.siteId;
      }

      if (options?.status) {
        where.status = this.mapStatusToDB(options.status);
      }

      // Use PostGIS ST_DWithin
      const checkpoints = await models.Checkpoint.findAll({
        where: {
          ...where,
          [Op.and]: literal(`
            ST_DWithin(
              location,
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326),
              ${radiusMeters}
            )
          `),
        },
        order: [
          [literal(`
            ST_Distance(
              location,
              ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)
            )
          `), 'ASC'],
        ],
      });

      return checkpoints.map((cp) => this.mapToEntity(cp));
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export default SequelizeCheckpointRepository;
