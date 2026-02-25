/**
 * Location History Domain Entity
 *
 * Represents a batched GPS location update from a guard.
 * Used for tracking patrol paths and storing historical location data.
 *
 * @module core/domain/entities
 */

import { GPSLocation } from '../value-objects/GPSLocation.js';

/**
 * Location Batch Status
 */
export enum LocationBatchStatus {
  PENDING = 'pending',
  PROCESSED = 'processed',
  ARCHIVED = 'archived',
}

/**
 * Location History Domain Entity
 * Represents a single GPS location point in a guard's history
 */
export interface ILocationHistory {
  id: number;
  guardId: number;
  location: GPSLocation;
  accuracy?: number;
  speed?: number; // m/s
  bearing?: number; // degrees
  altitude?: number; // meters
  batteryLevel?: number; // percentage
  isActiveShift: boolean;
  activePatrolRunId?: number;
  batchId?: string; // For grouping location updates
  status: LocationBatchStatus;
  receivedAt: Date;
  createdAt: Date;
}

/**
 * Create Location History DTO
 */
export interface ICreateLocationHistoryDTO {
  guardId: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  bearing?: number;
  altitude?: number;
  batteryLevel?: number;
  isActiveShift: boolean;
  activePatrolRunId?: number;
  batchId?: string;
}

/**
 * Location Batch DTO
 * Used for receiving multiple location points at once
 */
export interface ILocationBatchDTO {
  guardId: number;
  batchId: string;
  locations: Array<{
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    bearing?: number;
    altitude?: number;
    batteryLevel?: number;
    timestamp: Date;
  }>;
  isActiveShift: boolean;
  activePatrolRunId?: number;
}

/**
 * Location Query Options
 */
export interface ILocationQueryOptions {
  guardId?: number;
  patrolRunId?: number;
  startDate?: Date;
  endDate?: Date;
  batchId?: string;
  limit?: number;
  sortBy?: 'createdAt' | 'receivedAt';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Location Statistics
 */
export interface ILocationStatistics {
  totalPoints: number;
  averageAccuracy: number; // meters
  coverageDistance: number; // meters (total path length)
  activeGuards: number;
  averagePointsPerGuard: number;
}
