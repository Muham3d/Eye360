/**
 * Patrol Checkpoint Domain Entity
 *
 * Join table that associates checkpoints with patrol templates.
 * Defines the sequence and requirements for each checkpoint in a template.
 *
 * @module core/domain/entities
 */

/**
 * Patrol Checkpoint Domain Entity
 * Represents a checkpoint within a patrol template with sequence and requirements
 */
export interface IPatrolCheckpoint {
  id: number;
  templateId: number;
  checkpointId: number;
  sequenceOrder: number; // Must verify in this order
  requiredPhoto: boolean;
  timeWindowStart?: string; // HH:MM format, optional time window start
  timeWindowEnd?: string; // HH:MM format, optional time window end
  pointsValue: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Patrol Checkpoint Creation DTO
 */
export interface ICreatePatrolCheckpointDTO {
  templateId: number;
  checkpointId: number;
  sequenceOrder: number;
  requiredPhoto?: boolean;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  pointsValue?: number;
}

/**
 * Patrol Checkpoint Update DTO
 */
export interface IUpdatePatrolCheckpointDTO {
  sequenceOrder?: number;
  requiredPhoto?: boolean;
  timeWindowStart?: string;
  timeWindowEnd?: string;
  pointsValue?: number;
}

/**
 * Bulk Patrol Checkpoint Creation DTO
 * Used to create all checkpoints for a template at once
 */
export interface IBulkCreatePatrolCheckpointsDTO {
  templateId: number;
  checkpoints: Array<{
    checkpointId: number;
    sequenceOrder: number;
    requiredPhoto?: boolean;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    pointsValue?: number;
  }>;
}

/**
 * Patrol Checkpoint with Details
 * Includes checkpoint information from the joined checkpoint
 */
export interface IPatrolCheckpointDetail extends IPatrolCheckpoint {
  checkpointName: string;
  checkpointDescription?: string;
  verificationType: string; // NFC, QR, GPS
  location: {
    latitude: number;
    longitude: number;
  };
  gpsTolerance: number;
}

/**
 * Time Window Validation Result
 */
export interface ITimeWindowValidationResult {
  isValid: boolean;
  isWithinWindow: boolean;
  windowStart?: string;
  windowEnd?: string;
  currentTime?: string;
  minutesEarly?: number;
  minutesLate?: number;
}
