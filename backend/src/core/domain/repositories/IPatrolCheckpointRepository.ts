/**
 * IPatrolCheckpointRepository Interface
 *
 * Domain-level repository interface for Patrol Checkpoint operations.
 * Handles the join table between templates and checkpoints.
 *
 * @module core/domain/repositories
 */

import {
  IPatrolCheckpoint,
  IPatrolCheckpointDetail,
  ICreatePatrolCheckpointDTO,
  IUpdatePatrolCheckpointDTO,
  IBulkCreatePatrolCheckpointsDTO,
  ITimeWindowValidationResult,
} from '../entities/PatrolCheckpoint.js';

/**
 * IPatrolCheckpointRepository Interface
 * Defines all patrol checkpoint-related data operations
 */
export interface IPatrolCheckpointRepository {
  /**
   * Find a patrol checkpoint by ID
   * @param id - Patrol checkpoint ID
   * @returns Patrol checkpoint or null if not found
   */
  findById(id: number): Promise<IPatrolCheckpoint | null>;

  /**
   * Find patrol checkpoints by template ID
   * @param templateId - Template ID
   * @returns List of patrol checkpoints ordered by sequence
   */
  findByTemplateId(templateId: number): Promise<IPatrolCheckpoint[]>;

  /**
   * Find patrol checkpoints by template ID with details
   * @param templateId - Template ID
   * @returns List of patrol checkpoint details ordered by sequence
   */
  findByTemplateIdWithDetail(templateId: number): Promise<IPatrolCheckpointDetail[]>;

  /**
   * Find a specific checkpoint in a template
   * @param templateId - Template ID
   * @param checkpointId - Checkpoint ID
   * @returns Patrol checkpoint or null if not found
   */
  findByTemplateAndCheckpoint(templateId: number, checkpointId: number): Promise<IPatrolCheckpoint | null>;

  /**
   * Create a new patrol checkpoint
   * @param checkpointData - Patrol checkpoint creation data
   * @returns Created patrol checkpoint
   */
  create(checkpointData: ICreatePatrolCheckpointDTO): Promise<IPatrolCheckpoint>;

  /**
   * Bulk create patrol checkpoints for a template
   * @param data - Bulk creation data
   * @returns List of created patrol checkpoints
   */
  bulkCreate(data: IBulkCreatePatrolCheckpointsDTO): Promise<IPatrolCheckpoint[]>;

  /**
   * Update an existing patrol checkpoint
   * @param id - Patrol checkpoint ID
   * @param checkpointData - Patrol checkpoint update data
   * @returns Updated patrol checkpoint or null if not found
   */
  update(id: number, checkpointData: IUpdatePatrolCheckpointDTO): Promise<IPatrolCheckpoint | null>;

  /**
   * Delete a patrol checkpoint
   * @param id - Patrol checkpoint ID
   * @returns True if deleted, false if not found
   */
  delete(id: number): Promise<boolean>;

  /**
   * Delete all checkpoints for a template
   * @param templateId - Template ID
   * @returns Number of deleted checkpoints
   */
  deleteByTemplateId(templateId: number): Promise<number>;

  /**
   * Update sequence order for checkpoints in a template
   * @param templateId - Template ID
   * @param checkpointOrders - Array of {checkpointId, sequenceOrder}
   * @returns True if updated successfully
   */
  updateSequenceOrder(
    templateId: number,
    checkpointOrders: Array<{ checkpointId: number; sequenceOrder: number }>
  ): Promise<boolean>;

  /**
   * Get the next sequence order for a template
   * @param templateId - Template ID
   * @returns Next sequence order number
   */
  getNextSequenceOrder(templateId: number): Promise<number>;

  /**
   * Get checkpoint count for a template
   * @param templateId - Template ID
   * @returns Count of checkpoints
   */
  countByTemplate(templateId: number): Promise<number>;

  /**
   * Validate time window for a checkpoint
   * @param patrolCheckpointId - Patrol checkpoint ID
   * @param verificationTime - Time to validate against the time window
   * @returns Time window validation result
   */
  validateTimeWindow(patrolCheckpointId: number, verificationTime: Date): Promise<ITimeWindowValidationResult>;

  /**
   * Get checkpoints by sequence order range
   * @param templateId - Template ID
   * @param startOrder - Start sequence order
   * @param endOrder - End sequence order
   * @returns List of checkpoints in the range
   */
  findBySequenceRange(
    templateId: number,
    startOrder: number,
    endOrder: number
  ): Promise<IPatrolCheckpoint[]>;

  /**
   * Check if checkpoint is in valid sequence
   * @param templateId - Template ID
   * @param checkpointId - Checkpoint ID
   * @param lastVerifiedCheckpointId - Last verified checkpoint ID
   * @returns True if checkpoint is next in sequence
   */
  isValidNextCheckpoint(
    templateId: number,
    checkpointId: number,
    lastVerifiedCheckpointId: number | null
  ): Promise<boolean>;

  /**
   * Get total points value for a template
   * @param templateId - Template ID
   * @returns Total points value
   */
  getTotalPoints(templateId: number): Promise<number>;

  /**
   * Duplicate checkpoints from one template to another
   * @param sourceTemplateId - Source template ID
   * @param targetTemplateId - Target template ID
   * @returns List of created checkpoints
   */
  duplicateCheckpoints(sourceTemplateId: number, targetTemplateId: number): Promise<IPatrolCheckpoint[]>;
}

/**
 * IPatrolCheckpointRepositoryErrorCode
 * Error codes for repository operations
 */
export enum PatrolCheckpointRepositoryErrorCode {
  PATROL_CHECKPOINT_NOT_FOUND = 'PATROL_CHECKPOINT_NOT_FOUND',
  INVALID_SEQUENCE_ORDER = 'INVALID_SEQUENCE_ORDER',
  DUPLICATE_SEQUENCE_ORDER = 'DUPLICATE_SEQUENCE_ORDER',
  INVALID_TIME_WINDOW = 'INVALID_TIME_WINDOW',
  CHECKPOINT_NOT_IN_TEMPLATE = 'CHECKPOINT_NOT_IN_TEMPLATE',
  INVALID_SEQUENCE = 'INVALID_SEQUENCE',
}

/**
 * PatrolCheckpointRepositoryError
 * Custom error class for repository operations
 */
export class PatrolCheckpointRepositoryError extends Error {
  public readonly code: PatrolCheckpointRepositoryErrorCode;
  public readonly details?: unknown;

  constructor(code: PatrolCheckpointRepositoryErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'PatrolCheckpointRepositoryError';
    this.code = code;
    this.details = details;
  }
}
