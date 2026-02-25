/**
 * Site Domain Entity
 *
 * Represents a physical location where security patrols are conducted.
 * Sites have geofence boundaries for GPS-based clock-in/out validation.
 *
 * @module core/domain/entities
 */

import { GeoJSONPolygon } from '../types/geojson.js';

/**
 * Site Status Enum
 * Represents the operational status of a site
 */
export enum SiteStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UNDER_MAINTENANCE = 'under_maintenance',
  ARCHIVED = 'archived',
}

/**
 * Site Domain Entity
 * Pure domain entity without database-specific annotations
 */
export interface ISite {
  id: number;
  name: string;
  description?: string;
  address?: string;
  geofenceBoundary: GeoJSONPolygon;
  geofenceBuffer: number; // meters
  timezone: string;
  status: SiteStatus;
  createdById: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Site Creation DTO
 * Data required to create a new site
 */
export interface ICreateSiteDTO {
  name: string;
  description?: string;
  address?: string;
  geofenceBoundary: GeoJSONPolygon;
  geofenceBuffer?: number;
  timezone?: string;
  status?: SiteStatus;
  createdById: number;
}

/**
 * Site Update DTO
 * Data that can be updated on a site
 */
export interface IUpdateSiteDTO {
  name?: string;
  description?: string;
  address?: string;
  geofenceBoundary?: GeoJSONPolygon;
  geofenceBuffer?: number;
  timezone?: string;
  status?: SiteStatus;
}

/**
 * Site Query Options
 * Filters and pagination options for site queries
 */
export interface ISiteQueryOptions {
  status?: SiteStatus;
  createdById?: number;
  search?: string; // Search by name or address
  page?: number;
  limit?: number;
  sortBy?: 'id' | 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Site Statistics
 * Aggregated statistics for a site
 */
export interface ISiteStatistics {
  siteId: number;
  checkpointCount: number;
  activeTemplateCount: number;
  activeGuardCount: number;
  totalPatrolsToday: number;
  completedPatrolsToday: number;
  missedPatrolsToday: number;
  averageCompletionTime: number; // minutes
}

/**
 * Geofence Validation Result
 * Result of geofence boundary validation
 */
export interface IGeofenceValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  area?: number; // square meters
  perimeter?: number; // meters
}

/**
 * Point in Geofence Result
 * Result of checking if a point is within a geofence
 */
export interface IPointInGeofenceResult {
  isInside: boolean;
  distanceToBoundary?: number; // meters, negative if inside
  nearestBoundaryPoint?: {
    latitude: number;
    longitude: number;
  };
}
