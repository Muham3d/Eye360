/**
 * ISiteRepository Interface
 *
 * Domain-level repository interface for Site operations.
 * This interface defines the contract for site data access without
 * depending on any specific database implementation.
 *
 * @module core/domain/repositories
 */

import {
  ISite,
  ICreateSiteDTO,
  IUpdateSiteDTO,
  ISiteQueryOptions,
  ISiteStatistics,
  IGeofenceValidationResult,
  IPointInGeofenceResult,
} from '../entities/Site.js';
import { IGPSLocation } from '../types/geojson.js';
import { IPaginatedResult } from './IUserRepository.js';

/**
 * ISiteRepository Interface
 * Defines all site-related data operations
 */
export interface ISiteRepository {
  /**
   * Find a site by ID
   * @param id - Site ID
   * @param options - Query options
   * @returns Site or null if not found
   */
  findById(id: number, options?: Partial<ISiteQueryOptions>): Promise<ISite | null>;

  /**
   * Find a site by name
   * @param name - Site name
   * @param options - Query options
   * @returns Site or null if not found
   */
  findByName(name: string, options?: Partial<ISiteQueryOptions>): Promise<ISite | null>;

  /**
   * Get all sites with filtering and pagination
   * @param options - Query options
   * @returns Paginated list of sites
   */
  findAll(options?: ISiteQueryOptions): Promise<IPaginatedResult<ISite>>;

  /**
   * Create a new site
   * @param siteData - Site creation data
   * @returns Created site
   */
  create(siteData: ICreateSiteDTO): Promise<ISite>;

  /**
   * Update an existing site
   * @param id - Site ID
   * @param siteData - Site update data
   * @returns Updated site or null if not found
   */
  update(id: number, siteData: IUpdateSiteDTO): Promise<ISite | null>;

  /**
   * Delete a site (soft delete if supported)
   * @param id - Site ID
   * @returns True if deleted, false if not found
   */
  delete(id: number): Promise<boolean>;

  /**
   * Check if a site name already exists
   * @param name - Site name
   * @param excludeSiteId - Site ID to exclude (for updates)
   * @returns True if name exists
   */
  nameExists(name: string, excludeSiteId?: number): Promise<boolean>;

  /**
   * Get statistics for a site
   * @param siteId - Site ID
   * @returns Site statistics
   */
  getStatistics(siteId: number): Promise<ISiteStatistics>;

  /**
   * Validate a geofence boundary
   * @param boundary - GeoJSON polygon to validate
   * @returns Validation result
   */
  validateGeofence(boundary: object): Promise<IGeofenceValidationResult>;

  /**
   * Check if a GPS location is within a site's geofence
   * @param siteId - Site ID
   * @param location - GPS location
   * @returns Point in geofence result
   */
  isLocationInGeofence(siteId: number, location: IGPSLocation): Promise<IPointInGeofenceResult>;

  /**
   * Get all sites where a location is within the geofence
   * @param location - GPS location
   * @param options - Query options
   * @returns List of sites containing the location
   */
  findSitesByLocation(
    location: IGPSLocation,
    options?: Partial<ISiteQueryOptions>
  ): Promise<ISite[]>;

  /**
   * Get sites created by a specific user
   * @param createdById - User ID who created the sites
   * @param options - Query options
   * @returns Paginated list of sites
   */
  findByCreatedBy(
    createdById: number,
    options?: Partial<ISiteQueryOptions>
  ): Promise<IPaginatedResult<ISite>>;

  /**
   * Get active sites
   * @param options - Query options
   * @returns List of active sites
   */
  findActive(options?: Partial<ISiteQueryOptions>): Promise<ISite[]>;

  /**
   * Archive a site
   * @param id - Site ID
   * @returns True if archived
   */
  archive(id: number): Promise<boolean>;

  /**
   * Calculate the area of a geofence
   * @param boundary - GeoJSON polygon
   * @returns Area in square meters
   */
  calculateGeofenceArea(boundary: object): Promise<number>;

  /**
   * Calculate the perimeter of a geofence
   * @param boundary - GeoJSON polygon
   * @returns Perimeter in meters
   */
  calculateGeofencePerimeter(boundary: object): Promise<number>;
}

/**
 * ISiteRepositoryErrorCode
 * Error codes for repository operations
 */
export enum SiteRepositoryErrorCode {
  SITE_NOT_FOUND = 'SITE_NOT_FOUND',
  NAME_ALREADY_EXISTS = 'NAME_ALREADY_EXISTS',
  INVALID_GEOFENCE = 'INVALID_GEOFENCE',
  GEOFENCE_TOO_SMALL = 'GEOFENCE_TOO_SMALL',
  GEOFENCE_TOO_LARGE = 'GEOFENCE_TOO_LARGE',
  GEOFENCE_SELF_INTERSECTS = 'GEOFENCE_SELF_INTERSECTS',
  CANNOT_DELETE_SITE_WITH_CHECKPOINTS = 'CANNOT_DELETE_SITE_WITH_CHECKPOINTS',
  CANNOT_DELETE_SITE_WITH_ACTIVE_PATROLS = 'CANNOT_DELETE_SITE_WITH_ACTIVE_PATROLS',
}

/**
 * SiteRepositoryError
 * Custom error class for repository operations
 */
export class SiteRepositoryError extends Error {
  public readonly code: SiteRepositoryErrorCode;
  public readonly details?: unknown;

  constructor(code: SiteRepositoryErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'SiteRepositoryError';
    this.code = code;
    this.details = details;
  }
}
