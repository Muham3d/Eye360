/**
 * IPatrolCheckpointLogRepository Interface
 *
 * Domain-level repository interface for Patrol Checkpoint Log operations.
 *
 * @module core/domain/repositories
 */

import {
  IPatrolCheckpointLog,
  IPatrolCheckpointLogDetail,
  ICreatePatrolCheckpointLogDTO,
  IUpdatePatrolCheckpointLogDTO,
  IPatrolCheckpointLogQueryOptions,
  IPatrolCheckpointLogSummary,
} from '../entities/PatrolCheckpointLog.js';
import { IPaginatedResult } from './IUserRepository.js';

/**
 * IPatrolCheckpointLogRepository Interface
 * Defines all patrol checkpoint log-related data operations
 */
export interface IPatrolCheckpointLogRepository {
  /**
   * Find a checkpoint log by ID
   * @param id - Checkpoint log ID
   * @returns Checkpoint log or null if not found
   */
  findById(id: number): Promise<IPatrolCheckpointLog | null>;

  /**
   * Find a checkpoint log by ID with detail
   * @param id - Checkpoint log ID
   * @returns Checkpoint log detail or null if not found
   */
  findByIdWithDetail(id: number): Promise<IPatrolCheckpointLogDetail | null>;

  /**
   * Get all checkpoint logs with filtering and pagination
   * @param options - Query options
   * @returns Paginated list of checkpoint logs
   */
  findAll(options?: IPatrolCheckpointLogQueryOptions): Promise<IPaginatedResult<IPatrolCheckpointLog>>;

  /**
   * Get checkpoint logs for a patrol run
   * @param patrolRunId - Patrol run ID
   * @param options - Query options
   * @returns Paginated list of checkpoint logs
   */
  findByPatrolRunId(
    patrolRunId: number,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPaginatedResult<IPatrolCheckpointLog>>;

  /**
   * Get checkpoint logs for a specific checkpoint
   * @param checkpointId - Checkpoint ID
   * @param options - Query options
   * @returns Paginated list of checkpoint logs
   */
  findByCheckpointId(
    checkpointId: number,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPaginatedResult<IPatrolCheckpointLog>>;

  /**
   * Get checkpoint logs for a patrol run with detail
   * @param patrolRunId - Patrol run ID
   * @param options - Query options
   * @returns List of checkpoint log details ordered by verification time
   */
  findByPatrolRunIdWithDetail(
    patrolRunId: number,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPatrolCheckpointLogDetail[]>;

  /**
   * Create a new checkpoint log
   * @param logData - Checkpoint log creation data
   * @returns Created checkpoint log
   */
  create(logData: ICreatePatrolCheckpointLogDTO): Promise<IPatrolCheckpointLog>;

  /**
   * Update an existing checkpoint log
   * @param id - Checkpoint log ID
   * @param logData - Checkpoint log update data
   * @returns Updated checkpoint log or null if not found
   */
  update(id: number, logData: IUpdatePatrolCheckpointLogDTO): Promise<IPatrolCheckpointLog | null>;

  /**
   * Delete a checkpoint log
   * @param id - Checkpoint log ID
   * @returns True if deleted, false if not found
   */
  delete(id: number): Promise<boolean>;

  /**
   * Get the latest checkpoint log for a patrol run and checkpoint
   * @param patrolRunId - Patrol run ID
   * @param checkpointId - Checkpoint ID
   * @returns Latest checkpoint log or null
   */
  findLatest(patrolRunId: number, checkpointId: number): Promise<IPatrolCheckpointLog | null>;

  /**
   * Get the latest verified checkpoint for a patrol run
   * @param patrolRunId - Patrol run ID
   * @returns Latest verified checkpoint log or null
   */
  findLatestVerified(patrolRunId: number): Promise<IPatrolCheckpointLog | null>;

  /**
   * Get checkpoint log summary for a patrol run
   * @param patrolRunId - Patrol run ID
   * @returns Checkpoint log summary
   */
  getSummary(patrolRunId: number): Promise<IPatrolCheckpointLogSummary>;

  /**
   * Mark a checkpoint as verified
   * @param patrolRunId - Patrol run ID
   * @param checkpointId - Checkpoint ID
   * @param verificationData - Verification details
   * @returns Created checkpoint log
   */
  markVerified(
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
  ): Promise<IPatrolCheckpointLog>;

  /**
   * Mark a checkpoint as missed
   * @param patrolRunId - Patrol run ID
   * @param checkpointId - Checkpoint ID
   * @param reason - Reason for missing
   * @returns Created or updated checkpoint log
   */
  markMissed(patrolRunId: number, checkpointId: number, reason?: string): Promise<IPatrolCheckpointLog>;

  /**
   * Mark a checkpoint as skipped
   * @param patrolRunId - Patrol run ID
   * @param checkpointId - Checkpoint ID
   * @param reason - Reason for skipping
   * @returns Created or updated checkpoint log
   */
  markSkipped(patrolRunId: number, checkpointId: number, reason?: string): Promise<IPatrolCheckpointLog>;

  /**
   * Get verified checkpoint logs within a time range
   * @param startDate - Start date
   * @param endDate - End date
   * @param options - Additional query options
   * @returns List of checkpoint logs
   */
  findVerifiedInTimeRange(
    startDate: Date,
    endDate: Date,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPatrolCheckpointLog[]>;

  /**
   * Get checkpoint logs by verification type
   * @param verificationType - Verification type
   * @param options - Query options
   * @returns List of checkpoint logs
   */
  findByVerificationType(
    verificationType: string,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPatrolCheckpointLog[]>;

  /**
   * Get checkpoint count by status for a patrol run
   * @param patrolRunId - Patrol run ID
   * @param status - Checkpoint log status
   * @returns Count of checkpoint logs
   */
  countByStatus(patrolRunId: number, status: string): Promise<number>;

  /**
   * Get all checkpoint logs for a checkpoint
   * @param checkpointId - Checkpoint ID
   * @param options - Query options
   * @returns Paginated list of checkpoint logs
   */
  findByCheckpoint(
    checkpointId: number,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPaginatedResult<IPatrolCheckpointLog>>;

  /**
   * Get checkpoint logs with photos
   * @param patrolRunId - Patrol run ID
   * @returns List of checkpoint logs with photos
   */
  findWithPhotos(patrolRunId: number): Promise<IPatrolCheckpointLog[]>;

  /**
   * Get checkpoint verification history
   * @param checkpointId - Checkpoint ID
   * @param startDate - Start date
   * @param endDate - End date
   * @param options - Query options
   * @returns Paginated list of checkpoint logs
   */
  getVerificationHistory(
    checkpointId: number,
    startDate: Date,
    endDate: Date,
    options?: Partial<IPatrolCheckpointLogQueryOptions>
  ): Promise<IPaginatedResult<IPatrolCheckpointLog>>;

  /**
   * Delete all checkpoint logs for a patrol run
   * @param patrolRunId - Patrol run ID
   * @returns Number of deleted logs
   */
  deleteByPatrolRunId(patrolRunId: number): Promise<number>;

  /**
   * Calculate average verification time for checkpoints
   * @param patrolRunId - Patrol run ID
   * @returns Average verification time in minutes
   */
  calculateAverageVerificationTime(patrolRunId: number): Promise<number>;
}

/**
 * IPatrolCheckpointLogRepositoryErrorCode
 * Error codes for repository operations
 */
export enum PatrolCheckpointLogRepositoryErrorCode {
  CHECKPOINT_LOG_NOT_FOUND = 'CHECKPOINT_LOG_NOT_FOUND',
  ALREADY_VERIFIED = 'ALREADY_VERIFIED',
  INVALID_VERIFICATION_TYPE = 'INVALID_VERIFICATION_TYPE',
  INVALID_GPS_LOCATION = 'INVALID_GPS_LOCATION',
  PHOTO_REQUIRED = 'PHOTO_REQUIRED',
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
}

/**
 * PatrolCheckpointLogRepositoryError
 * Custom error class for repository operations
 */
export class PatrolCheckpointLogRepositoryError extends Error {
  public readonly code: PatrolCheckpointLogRepositoryErrorCode;
  public readonly details?: unknown;

  constructor(code: PatrolCheckpointLogRepositoryErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'PatrolCheckpointLogRepositoryError';
    this.code = code;
    this.details = details;
  }
}
