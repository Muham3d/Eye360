/**
 * Patrol Run Domain Entity
 *
 * Represents an execution of a patrol template by a guard.
 * Tracks the progress, status, and completion metrics of a patrol.
 *
 * @module core/domain/entities
 */

import { GeoJSONPoint } from '../types/geojson.js';

/**
 * Patrol Run Status Enum
 */
export enum PatrolRunStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  MISSED = 'missed',
  ABANDONED = 'abandoned',
}

/**
 * Patrol Run Domain Entity
 */
export interface IPatrolRun {
  id: number;
  templateId: number;
  guardId: number;
  startTime?: Date;
  endTime?: Date;
  scheduledDate: Date;
  status: PatrolRunStatus;
  completionPercentage: number;
  missedCheckpointsCount: number;
  totalScore: number;
  startLocation?: GeoJSONPoint;
  endLocation?: GeoJSONPoint;
  notes?: string;
  abandonedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Patrol Run Creation DTO
 */
export interface ICreatePatrolRunDTO {
  templateId: number;
  guardId: number;
  scheduledDate: Date;
  startLocation?: GeoJSONPoint;
}

/**
 * Patrol Run Update DTO
 */
export interface IUpdatePatrolRunDTO {
  startTime?: Date;
  endTime?: Date;
  status?: PatrolRunStatus;
  completionPercentage?: number;
  missedCheckpointsCount?: number;
  totalScore?: number;
  endLocation?: GeoJSONPoint;
  notes?: string;
  abandonedReason?: string;
}

/**
 * Patrol Run Query Options
 */
export interface IPatrolRunQueryOptions {
  templateId?: number;
  guardId?: number;
  status?: PatrolRunStatus;
  scheduledDateStart?: Date;
  scheduledDateEnd?: Date;
  siteId?: number;
  page?: number;
  limit?: number;
  sortBy?: 'id' | 'scheduledDate' | 'startTime' | 'completionPercentage' | 'totalScore';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Patrol Run Detail
 * Includes template and checkpoint information
 */
export interface IPatrolRunDetail extends IPatrolRun {
  templateName: string;
  siteId: number;
  siteName: string;
  guardName: string;
  estimatedDuration: number;
  maxCompletionTime: number;
  checkpoints: IPatrolCheckpointLog[];
}

/**
 * Patrol Run Statistics
 * Aggregated statistics for patrol runs
 */
export interface IPatrolRunStatistics {
  totalRuns: number;
  completedRuns: number;
  missedRuns: number;
  abandonedRuns: number;
  averageCompletionPercentage: number;
  averageScore: number;
  averageDuration: number; // minutes
  averageCheckpointsMissed: number;
}

/**
 * Patrol Run Performance Summary
 * Performance summary for a guard or site over a time period
 */
export interface IPatrolRunPerformanceSummary {
  period: {
    start: Date;
    end: Date;
  };
  totalRuns: number;
  completedRuns: number;
  completionRate: number; // percentage
  averageScore: number;
  averageCompletionTime: number; // minutes
  bestRun: {
    id: number;
    score: number;
    completedAt: Date;
  };
  worstRun: {
    id: number;
    score: number;
    completedAt: Date;
  };
  missedCheckpointsCount: number;
  totalCheckpointsCount: number;
}

/**
 * Import from related entities
 */
import { IPatrolCheckpointLog } from './PatrolCheckpointLog.js';
