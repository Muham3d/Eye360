/**
 * Sequelize Site Repository
 *
 * Implements the ISiteRepository interface using Sequelize ORM with PostGIS
 * for geospatial queries on site geofences.
 *
 * @module infrastructure/database/repositories
 */

import { Transaction, literal, fn, col, Op } from 'sequelize';
import {
  ISite,
  ICreateSiteDTO,
  IUpdateSiteDTO,
  ISiteQueryOptions,
  ISiteStatistics,
  IGeofenceValidationResult,
  IPointInGeofenceResult,
  IGPSLocation,
} from '../../../core/domain/entities/Site.js';
import { SiteStatus } from '../../../core/domain/entities/Site.js';
import { GeoJSONPolygon, GeoJSONPoint } from '../../../core/domain/types/geojson.js';
import { IPaginatedResult } from '../../../core/domain/repositories/IUserRepository.js';
import {
  ISiteRepository,
  SiteRepositoryError,
  SiteRepositoryErrorCode,
} from '../../../core/domain/repositories/ISiteRepository.js';
import { BaseRepository, QueryOptions, PaginatedResult } from './BaseRepository.js';
import models from '../models/index.js';

/**
 * Site Model Type
 */
type SiteModel = ReturnType<typeof models.Site>;

/**
 * Sequelize Site Repository
 *
 * Implements site data access with PostGIS geospatial support.
 */
export class SequelizeSiteRepository extends BaseRepository<SiteModel>
  implements ISiteRepository {

  /**
   * Get the Sequelize Site model
   */
  protected getModel(): SiteModel {
    return models.Site;
  }

  /**
   * Map Sequelize model to domain entity
   */
  private mapToEntity(model: SiteModel): ISite {
    // Parse geofence boundary from database if it exists
    let geofenceBoundary: GeoJSONPolygon = {
      type: 'Polygon',
      coordinates: [],
    };

    if (model.dataValues.geofence_boundary) {
      try {
        if (typeof model.dataValues.geofence_boundary === 'string') {
          geofenceBoundary = JSON.parse(model.dataValues.geofence_boundary);
        } else {
          geofenceBoundary = model.dataValues.geofence_boundary;
        }
      } catch (error) {
        // If parsing fails, use default empty polygon
        console.warn('Failed to parse geofence_boundary:', error);
      }
    }

    return {
      id: model.id,
      name: model.name,
      description: model.description ?? undefined,
      address: model.address ?? undefined,
      geofenceBoundary,
      geofenceBuffer: model.allowed_distance_meters || 100,
      timezone: model.timezone,
      status: this.mapStatusFromDB(model.status),
      createdById: 1, // Default value - not in current schema
      createdAt: model.created_at,
      updatedAt: model.updated_at,
    };
  }

  /**
   * Map domain status to database enum
   */
  private mapStatusToDB(status: SiteStatus): string {
    const statusMap: Record<SiteStatus, string> = {
      [SiteStatus.ACTIVE]: 'active',
      [SiteStatus.INACTIVE]: 'inactive',
      [SiteStatus.UNDER_MAINTENANCE]: 'under_maintenance',
      [SiteStatus.ARCHIVED]: 'archived',
    };
    return statusMap[status] || 'active';
  }

  /**
   * Map database status to domain enum
   */
  private mapStatusFromDB(status: string): SiteStatus {
    const statusMap: Record<string, SiteStatus> = {
      'active': SiteStatus.ACTIVE,
      'inactive': SiteStatus.INACTIVE,
      'under_maintenance': SiteStatus.UNDER_MAINTENANCE,
      'archived': SiteStatus.ARCHIVED,
    };
    return statusMap[status] || SiteStatus.ACTIVE;
  }

  /**
   * Map DTO to database creation attributes
   */
  private mapCreateDataToDB(data: ICreateSiteDTO): any {
    return {
      name: data.name,
      description: data.description ?? null,
      address: data.address ?? null,
      geofence_boundary: data.geofenceBoundary ? JSON.stringify(data.geofenceBoundary) : null,
      allowed_distance_meters: data.geofenceBuffer ?? 100,
      timezone: data.timezone ?? 'UTC',
      status: data.status ? this.mapStatusToDB(data.status) : 'active',
      // Generate a code from name if not provided
      code: data.name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 50),
    };
  }

  /**
   * Map DTO to database update attributes
   */
  private mapUpdateDataToDB(data: IUpdateSiteDTO): any {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.geofenceBoundary !== undefined) {
      updateData.geofence_boundary = JSON.stringify(data.geofenceBoundary);
    }
    if (data.geofenceBuffer !== undefined) updateData.allowed_distance_meters = data.geofenceBuffer;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;
    if (data.status !== undefined) updateData.status = this.mapStatusToDB(data.status);

    return updateData;
  }

  /**
   * Find a site by ID
   */
  async findById(id: number, options?: Partial<ISiteQueryOptions>): Promise<ISite | null> {
    try {
      const model = await this.findByPK(id, options);
      return model ? this.mapToEntity(model) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find by primary key (internal helper)
   */
  private async findByPK(id: number, options?: Partial<ISiteQueryOptions>): Promise<SiteModel | null> {
    const findOptions: any = {
      where: { id },
    };

    if (options?.search) {
      findOptions.where = {
        ...findOptions.where,
        [Op.or]: [
          { name: { [Op.iLike]: `%${options.search}%` } },
          { address: { [Op.iLike]: `%${options.search}%` } },
        ],
      };
    }

    return await models.Site.findOne(findOptions);
  }

  /**
   * Find a site by name
   */
  async findByName(name: string, options?: Partial<ISiteQueryOptions>): Promise<ISite | null> {
    try {
      const model = await models.Site.findOne({
        where: { name },
      });
      return model ? this.mapToEntity(model) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get all sites with filtering and pagination
   */
  async findAll(options?: ISiteQueryOptions): Promise<IPaginatedResult<ISite>> {
    try {
      const queryOptions: QueryOptions = {
        page: options?.page,
        limit: options?.limit,
        sortBy: options?.sortBy || 'name',
        sortOrder: options?.sortOrder || 'ASC',
      };

      const where: any = {};

      if (options?.status) {
        where.status = this.mapStatusToDB(options.status);
      }

      if (options?.search) {
        where[Op.or] = [
          { name: { [Op.iLike]: `%${options.search}%` } },
          { address: { [Op.iLike]: `%${options.search}%` } },
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
   * Create a new site
   */
  async create(siteData: ICreateSiteDTO): Promise<ISite> {
    try {
      const dbData = this.mapCreateDataToDB(siteData);
      const model = await models.Site.create(dbData);
      return this.mapToEntity(model);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing site
   */
  async update(id: number, siteData: IUpdateSiteDTO): Promise<ISite | null> {
    try {
      const dbData = this.mapUpdateDataToDB(siteData);
      const model = await this.update(id, dbData);

      if (!model) {
        return null;
      }

      // Fetch fresh data
      const updated = await models.Site.findByPk(id);
      return updated ? this.mapToEntity(updated) : null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a site (soft delete)
   */
  async delete(id: number): Promise<boolean> {
    try {
      // Check if site has checkpoints
      const checkpointCount = await models.Checkpoint.count({
        where: { site_id: id },
      });

      if (checkpointCount > 0) {
        throw new SiteRepositoryError(
          SiteRepositoryErrorCode.CANNOT_DELETE_SITE_WITH_CHECKPOINTS,
          `Cannot delete site with ${checkpointCount} checkpoints. Remove checkpoints first.`
        );
      }

      // Check if site has active patrol runs
      const activeRunCount = await models.PatrolRun.count({
        where: {
          site_id: id,
          status: ['scheduled', 'in_progress', 'paused'],
        },
      });

      if (activeRunCount > 0) {
        throw new SiteRepositoryError(
          SiteRepositoryErrorCode.CANNOT_DELETE_SITE_WITH_ACTIVE_PATROLS,
          `Cannot delete site with ${activeRunCount} active patrol runs.`
        );
      }

      return await this.delete(id);
    } catch (error) {
      if (error instanceof SiteRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Check if a site name already exists
   */
  async nameExists(name: string, excludeSiteId?: number): Promise<boolean> {
    try {
      const where: any = { name };

      if (excludeSiteId) {
        where.id = { [Op.ne]: excludeSiteId };
      }

      const count = await models.Site.count({ where });
      return count > 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get statistics for a site
   */
  async getStatistics(siteId: number): Promise<ISiteStatistics> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      const [checkpointCount, activeTemplateCount, activeGuardCount, patrolsToday] =
        await Promise.all([
          models.Checkpoint.count({
            where: {
              site_id: siteId,
              status: 'active',
            },
          }),
          models.PatrolTemplate.count({
            where: {
              site_id: siteId,
              status: 'active',
            },
          }),
          // Count guards assigned to this site today
          models.PatrolRun.count({
            where: {
              site_id: siteId,
              scheduled_start: {
                [Op.gte]: today,
                [Op.lte]: endOfDay,
              },
            },
            distinct: true,
            col: 'guard_id',
          }),
          models.PatrolRun.count({
            where: {
              site_id: siteId,
              scheduled_start: {
                [Op.gte]: today,
                [Op.lte]: endOfDay,
              },
            },
          }),
        ]);

      const completedPatrolsToday = await models.PatrolRun.count({
        where: {
          site_id: siteId,
          scheduled_start: {
            [Op.gte]: today,
            [Op.lte]: endOfDay,
          },
          status: 'completed',
        },
      });

      const missedPatrolsToday = await models.PatrolRun.count({
        where: {
          site_id: siteId,
          scheduled_start: {
            [Op.gte]: today,
            [Op.lte]: endOfDay,
          },
          status: ['missed', 'abandoned', 'failed'],
        },
      });

      // Calculate average completion time
      const completedRuns = await models.PatrolRun.findAll({
        where: {
          site_id: siteId,
          status: 'completed',
          actual_start: { [Op.ne]: null },
          actual_end: { [Op.ne]: null },
        },
        limit: 100,
        order: [['actual_start', 'DESC']],
      });

      let averageCompletionTime = 0;
      if (completedRuns.length > 0) {
        const totalTime = completedRuns.reduce((sum, run) => {
          if (run.actual_start && run.actual_end) {
            return sum + (new Date(run.actual_end).getTime() - new Date(run.actual_start).getTime());
          }
          return sum;
        }, 0);
        averageCompletionTime = totalTime / completedRuns.length / 60000; // Convert to minutes
      }

      return {
        siteId,
        checkpointCount,
        activeTemplateCount,
        activeGuardCount,
        totalPatrolsToday: patrolsToday,
        completedPatrolsToday,
        missedPatrolsToday,
        averageCompletionTime: Math.round(averageCompletionTime),
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Validate a geofence boundary using PostGIS
   */
  async validateGeofence(boundary: object): Promise<IGeofenceValidationResult> {
    try {
      // Use PostGIS ST_IsValid to check if the polygon is valid
      const [result] = await models.sequelize.query(`
        SELECT
          ST_IsValid(ST_GeomFromGeoJSON(:geojson)) as is_valid,
          ST_IsValidReason(ST_GeomFromGeoJSON(:geojson)) as reason,
          ST_Area(ST_GeomFromGeoJSON(:geojson)::geography) as area_sqm,
          ST_Perimeter(ST_GeomFromGeoJSON(:geojson)::geography) as perimeter_m
      `, {
        replacements: { geojson: JSON.stringify(boundary) },
        type: 'SELECT',
      });

      const isValid = result.is_valid === true;
      const errors: string[] = [];

      if (!isValid) {
        errors.push(result.reason || 'Invalid geofence boundary');
      }

      // Check minimum area (100 sq meters)
      const minArea = 100;
      if (result.area_sqm < minArea) {
        errors.push(`Geofence area (${Math.round(result.area_sqm)}m²) is too small. Minimum is ${minArea}m².`);
      }

      // Check maximum area (10 sq km)
      const maxArea = 10000000;
      if (result.area_sqm > maxArea) {
        errors.push(`Geofence area (${Math.round(result.area_sqm)}m²) is too large. Maximum is ${maxArea}m².`);
      }

      return {
        isValid: isValid && errors.length === 0,
        errors: errors.length > 0 ? errors : undefined,
        area: result.area_sqm ? Math.round(result.area_sqm) : undefined,
        perimeter: result.perimeter_m ? Math.round(result.perimeter_m) : undefined,
      };
    } catch (error) {
      return {
        isValid: false,
        errors: ['Failed to validate geofence: ' + (error as Error).message],
      };
    }
  }

  /**
   * Check if a GPS location is within a site's geofence
   */
  async isLocationInGeofence(
    siteId: number,
    location: IGPSLocation
  ): Promise<IPointInGeofenceResult> {
    try {
      const site = await models.Site.findByPk(siteId);

      if (!site) {
        throw new SiteRepositoryError(
          SiteRepositoryErrorCode.SITE_NOT_FOUND,
          `Site with ID ${siteId} not found`
        );
      }

      // Create point from location
      const point = {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      };

      // Use PostGIS to check if point is within geofence
      const [result] = await models.sequelize.query(`
        SELECT
          ST_Contains(
            COALESCE(geofence_boundary,
              ST_Buffer(ST_MakePoint(longitude, latitude)::geography, allowed_distance_meters)::geometry
            ),
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)
          ) as is_inside,
          ST_Distance(
            COALESCE(geofence_boundary,
              ST_Buffer(ST_MakePoint(longitude, latitude)::geography, allowed_distance_meters)::geometry
            )::geography,
            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
          ) as distance_m
      `, {
        replacements: {
          lon: location.longitude,
          lat: location.latitude,
        },
        type: 'SELECT',
      });

      const isInside = result.is_inside === true || result.distance_m <= 0;

      // Get nearest point on boundary (simplified - actual implementation would use more complex query)
      let nearestBoundaryPoint: { latitude: number; longitude: number } | undefined;

      return {
        isInside,
        distanceToBoundary: result.distance_m ? parseFloat(result.distance_m) : 0,
        nearestBoundaryPoint,
      };
    } catch (error) {
      if (error instanceof SiteRepositoryError) {
        throw error;
      }
      throw this.handleError(error);
    }
  }

  /**
   * Find all sites where a location is within the geofence
   */
  async findSitesByLocation(
    location: IGPSLocation,
    options?: Partial<ISiteQueryOptions>
  ): Promise<ISite[]> {
    try {
      const queryOptions: any = {
        where: {
          status: 'active',
        },
      };

      if (options?.status) {
        queryOptions.where.status = this.mapStatusToDB(options.status);
      }

      // Use PostGIS to find sites containing the point
      const sites = await models.Site.findAll({
        ...queryOptions,
        where: {
          ...queryOptions.where,
          [Op.and]: literal(`
            ST_Contains(
              COALESCE(geofence_boundary,
                ST_Buffer(ST_MakePoint(longitude, latitude)::geography, allowed_distance_meters)::geometry
              ),
              ST_SetSRID(ST_MakePoint(${location.longitude}, ${location.latitude}), 4326)
            )
          `),
        },
      });

      return sites.map((site) => this.mapToEntity(site));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find nearby sites within a radius
   */
  async findNearbySites(
    location: IGPSLocation,
    radiusMeters: number,
    options?: Partial<ISiteQueryOptions>
  ): Promise<ISite[]> {
    try {
      const queryOptions: any = {
        where: {
          status: 'active',
        },
      };

      if (options?.status) {
        queryOptions.where.status = this.mapStatusToDB(options.status);
      }

      // Use PostGIS ST_DWithin to find sites within radius
      const sites = await models.Site.findAll({
        ...queryOptions,
        where: {
          ...queryOptions.where,
          [Op.and]: literal(`
            ST_DWithin(
              ST_MakePoint(longitude, latitude)::geography,
              ST_MakePoint(${location.longitude}, ${location.latitude})::geography,
              ${radiusMeters}
            )
          `),
        },
        order: [
          [literal(`ST_Distance(
            ST_MakePoint(longitude, latitude)::geography,
            ST_MakePoint(${location.longitude}, ${location.latitude})::geography
          )`), 'ASC'],
        ],
      });

      return sites.map((site) => this.mapToEntity(site));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get sites created by a specific user
   */
  async findByCreatedBy(
    createdById: number,
    options?: Partial<ISiteQueryOptions>
  ): Promise<IPaginatedResult<ISite>> {
    try {
      // Note: The current schema doesn't have created_by for sites
      // This is a placeholder implementation
      const queryOptions: QueryOptions = {
        page: options?.page,
        limit: options?.limit,
        sortBy: options?.sortBy || 'name',
        sortOrder: options?.sortOrder || 'ASC',
        where: {}, // Would add created_by filter if schema supported it
      };

      if (options?.status) {
        (queryOptions.where as any).status = this.mapStatusToDB(options.status);
      }

      if (options?.search) {
        (queryOptions.where as any)[Op.or] = [
          { name: { [Op.iLike]: `%${options.search}%` } },
          { address: { [Op.iLike]: `%${options.search}%` } },
        ];
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
   * Get active sites
   */
  async findActive(options?: Partial<ISiteQueryOptions>): Promise<ISite[]> {
    try {
      const sites = await models.Site.findAll({
        where: {
          status: 'active',
        },
        order: [['name', 'ASC']],
      });

      return sites.map((site) => this.mapToEntity(site));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Archive a site
   */
  async archive(id: number): Promise<boolean> {
    try {
      const [updatedCount] = await models.Site.update(
        { status: 'archived' },
        { where: { id } }
      );
      return updatedCount > 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Calculate the area of a geofence
   */
  async calculateGeofenceArea(boundary: object): Promise<number> {
    try {
      const [result] = await models.sequelize.query(`
        SELECT ST_Area(ST_GeomFromGeoJSON(:geojson)::geography) as area_sqm
      `, {
        replacements: { geojson: JSON.stringify(boundary) },
        type: 'SELECT',
      });

      return Math.round(result.area_sqm || 0);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Calculate the perimeter of a geofence
   */
  async calculateGeofencePerimeter(boundary: object): Promise<number> {
    try {
      const [result] = await models.sequelize.query(`
        SELECT ST_Perimeter(ST_GeomFromGeoJSON(:geojson)::geography) as perimeter_m
      `, {
        replacements: { geojson: JSON.stringify(boundary) },
        type: 'SELECT',
      });

      return Math.round(result.perimeter_m || 0);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get checkpoints for a site
   */
  async getCheckpoints(siteId: number): Promise<any[]> {
    try {
      const checkpoints = await models.Checkpoint.findAll({
        where: {
          site_id: siteId,
          status: 'active',
        },
        order: [['order_index', 'ASC']],
      });

      return checkpoints.map((cp) => ({
        id: cp.id,
        siteId: cp.site_id,
        name: cp.name,
        description: cp.description ?? undefined,
        location: {
          type: 'Point',
          coordinates: [cp.longitude, cp.latitude],
        },
        verificationType: cp.nfc_tag_id ? 'nfc' : cp.qr_code_data ? 'qr' : 'gps',
        nfcCode: cp.nfc_tag_id ?? undefined,
        qrCode: cp.qr_code_data ?? undefined,
        gpsTolerance: 100, // Default - could be site-specific
        orderIndex: cp.order_index,
        status: cp.status,
        createdAt: cp.created_at,
        updatedAt: cp.updated_at,
      }));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get patrol templates for a site
   */
  async getPatrolTemplates(siteId: number): Promise<any[]> {
    try {
      const templates = await models.PatrolTemplate.findAll({
        where: {
          site_id: siteId,
          status: 'active',
        },
        order: [['name', 'ASC']],
      });

      return templates.map((tpl) => ({
        id: tpl.id,
        siteId: tpl.site_id,
        name: tpl.name,
        description: tpl.description ?? undefined,
        estimatedDuration: tpl.estimated_duration_minutes,
        maxCompletionTime: tpl.estimated_duration_minutes * 2, // Default calculation
        requiredRole: 'guard', // Default - could be template-specific
        status: tpl.status,
        createdById: tpl.created_by,
        createdAt: tpl.created_at,
        updatedAt: tpl.updated_at,
      }));
    } catch (error) {
      throw this.handleError(error);
    }
  }
}

export default SequelizeSiteRepository;
