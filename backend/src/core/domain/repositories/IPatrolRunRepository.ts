/**
 * IPatrolRunRepository Interface
 *
 * Domain-level repository interface for Patrol Run operations.
 *
 * @module core/domain/repositories
 */

import {
  IPatrolRun,
  IPatrolRunDetail,
  ICreatePatrolRunDTO,
  IUpdatePatrolRunDTO,
  IPatrolRunQueryOptions,
  IPatrolRunStatistics,
  IPatrolRunPerformanceSummary,
} from '../entities/PatrolRun.js';
import { IPaginatedResult } from './IUserRepository.js';

/**
 * IPatrolRunRepository Interface
 * Defines all patrol run-related data operations
 */
export interface IPatrolRunRepository {
  /**
   * Find a patrol run by ID
   * @param id - Patrol run ID
   * @param options - Query options
   * @returns Patrol run or null if not found
   */
  findById(id: number, options?: Partial<IPatrolRunQueryOptions>): Promise<IPatrolRun | null>;

  /**
   * Find a patrol run by ID with full detail
   * @param id - Patrol run ID
   * @param options - Query options
   * @returns Patrol run detail or null if not found
   */
  findByIdWithDetail(id: number, options?: Partial<IPatrolRunQueryOptions>): Promise<IPatrolRunDetail | null>;

  /**
   * Get all patrol runs with filtering and pagination
   * @param options - Query options
   * @returns Paginated list of patrol runs
   */
  findAll(options?: IPatrolRunQueryOptions): Promise<IPaginatedResult<IPatrolRun>>;

  /**
   * Get patrol runs for a template
   * @param templateId - Template ID
   * @param options - Query options
   * @returns Paginated list of patrol runs
   */
  findByTemplateId(templateId: number, options?: Partial<IPatrolRunQueryOptions>): Promise<IPaginatedResult<IPatrolRun>>;

  /**
   * Get patrol runs for a guard
   * @param guardId - Guard user ID
   * @param options - Query options
   * @returns Paginated list of patrol runs
   */
  findByGuardId(guardId: number, options?: Partial<IPatrolRunQueryOptions>): Promise<IPaginatedResult<IPatrolRun>>;

  /**
   * Get patrol runs for a site
   * @param siteId - Site ID
   * @param options - Query options
   * @returns Paginated list of patrol runs
   */
  findBySiteId(siteId: number, options?: Partial<IPatrolRunQueryOptions>): Promise<IPaginatedResult<IPatrolRun>>;

  /**
   * Get scheduled patrol runs for a date range
   * @param startDate - Start date
   * @param endDate - End date
   * @param options - Query options
   * @returns Paginated list of patrol runs
   */
  findByScheduledDateRange(
    startDate: Date,
    endDate: Date,
    options?: Partial<IPatrolRunQueryOptions>
  ): Promise<IPaginatedResult<IPatrolRun>>;

  /**
   * Get patrol runs by status
   * @param status - Patrol run status
   * @param options - Query options
   * @returns List of patrol runs
   */
  findByStatus(status: string, options?: Partial<IPatrolRunQueryOptions>): Promise<IPatrolRun[]>;

  /**
   * Create a new patrol run
   * @param runData - Patrol run creation data
   * @returns Created patrol run
   */
  create(runData: ICreatePatrolRunDTO): Promise<IPatrolRun>;

  /**
   * Update an existing patrol run
   * @param id - Patrol run ID
   * @param runData - Patrol run update data
   * @returns Updated patrol run or null if not found
   */
  update(id: number, runData: IUpdatePatrolRunDTO): Promise<IPatrolRun | null>;

  /**
   * Delete a patrol run
   * @param id - Patrol run ID
   * @returns True if deleted, false if not found
   */
  delete(id: number): Promise<boolean>;

  /**
   * Start a patrol run
   * @param id - Patrol run ID
   * @param startLocation - GPS location where patrol started
   * @returns Updated patrol run
   */
  start(id: number, startLocation?: { latitude: number; longitude: number }): Promise<IPatrolRun>;

  /**
   * Complete a patrol run
   * @param id - Patrol run ID
   * @param endLocation - GPS location where patrol ended
   * @param notes - Optional notes
   * @returns Updated patrol run
   */
  complete(id: number, endLocation?: { latitude: number; longitude: number }, notes?: string): Promise<IPatrolRun>;

  /**
   * Abandon a patrol run
   * @param id - Patrol run ID
   * @param reason - Reason for abandoning
   * @returns Updated patrol run
   */
  abandon(id: number, reason: string): Promise<IPatrolRun>;

  /**
   * Mark a patrol run as missed
   * @param id - Patrol run ID
   * @returns Updated patrol run
   */
  markMissed(id: number): Promise<IPatrolRun>;

  /**
   * Update completion percentage
   * @param id - Patrol run ID
   * @param percentage - Completion percentage (0-100)
   * @returns Updated patrol run
   */
  updateCompletionPercentage(id: number, percentage: number): Promise<IPatrolRun>;

  /**
   * Update total score
   * @param id - Patrol run ID
   * @param score - Total score
   * @returns Updated patrol run
   */
  updateScore(id: number, score: number): Promise<IPatrolRun>;

  /**
   * Increment missed checkpoints count
   * @param id - Patrol run ID
   * @returns Updated patrol run
   */
  incrementMissedCheckpoints(id: number): Promise<IPatrolRun>;

  /**
   * Get active patrol run for a guard
   * @param guardId - Guard user ID
   * @returns Active patrol run or null
   */
  findActiveForGuard(guardId: number): Promise<IPatrolRun | null>;

  /**
   * Get statistics for patrol runs
   * @param options - Query options for filtering
   * @returns Patrol run statistics
   */
  getStatistics(options?: Partial<IPatrolRunQueryOptions>): Promise<IPatrolRunStatistics>;

  /**
   * Get performance summary for a guard
   * @param guardId - Guard user ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Performance summary
   */
  getGuardPerformanceSummary(
    guardId: number,
    startDate: Date,
    endDate: Date
  ): Promise<IPatrolRunPerformanceSummary>;

  /**
   * Get performance summary for a site
   * @param siteId - Site ID
   * @param startDate - Start date
   * @param endDate - End date
   * @returns Performance summary
   */
  getSitePerformanceSummary(
    siteId: number,
    startDate: Date,
    endDate: Date
  ): Promise<IPatrolRunPerformanceSummary>;

  /**
   * Get missed patrol runs for a date range
   * @param startDate - Start date
   * @param endDate - End date
   * @param options - Query options
   * @returns List of missed patrol runs
   */
  findMissed(startDate: Date, endDate: Date, options?: Partial<IPatrolRunQueryOptions>): Promise<IPatrolRun[]>;

  /**
   * Get patrol runs that need to be marked as missed
   * (scheduled date has passed and status is still pending)
   * @returns List of patrol runs to mark as missed
   */
  findShouldMarkMissed(): Promise<IPatrolRun[]>;

  /**
   * Calculate completion percentage for a patrol run
   * @param id - Patrol run ID
   * @returns Completion percentage
   */
  calculateCompletionPercentage(id: number): Promise<number>;

  /**
   * Calculate total score for a patrol run
   * @param id - Patrol run ID
   * @returns Total score
   */
  calculateScore(id: number): Promise<number>;

  /**
   * Get patrol run count by status
   * @param status - Patrol run status
   * @param options - Additional filter options
   * @returns Count of patrol runs
   */
  countByStatus(status: string, options?: Partial<IPatrolRunQueryOptions>): Promise<number>;

  /**
   * Archive old completed or missed patrols
   * @param daysToKeep - Number of days to keep records
   * @returns Number of archived records
   */
  archiveOldRecords(daysToKeep: number): Promise<number>;
}

/**
 * IPatrolRunRepositoryErrorCode
 * Error codes for repository operations
 */
export enum PatrolRunRepositoryErrorCode {
  PATROL_RUN_NOT_FOUND = 'PATROL_RUN_NOT_FOUND',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  ALREADY_STARTED = 'ALREADY_STARTED',
  ALREADY_COMPLETED = 'ALREADY_COMPLETED',
  CANNOT_START_NOT_PENDING = 'CANNOT_START_NOT_PENDING',
  CANNOT_COMPLETE_NOT_IN_PROGRESS = 'CANNOT_COMPLETE_NOT_IN_PROGRESS',
  GUARD_HAS_ACTIVE_PATROL = 'GUARD_HAS_ACTIVE_PATROL',
  INVALID_COMPLETION_PERCENTAGE = 'INVALID_COMPLETION_PERCENTAGE',
  INVALID_SCORE = 'INVALID_SCORE',
}

/**
 * PatrolRunRepositoryError
 * Custom error class for repository operations
 */
export class PatrolRunRepositoryError extends Error {
  public readonly code: PatrolRunRepositoryErrorCode;
  public readonly details?: unknown;

  constructor(code: PatrolRunRepositoryErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'PatrolRunRepositoryError';
    this.code = code;
    this.details = details;
  }
}
