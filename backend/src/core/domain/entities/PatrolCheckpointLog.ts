/**
 * Patrol Checkpoint Log Domain Entity
 *
 * Records each checkpoint verification during a patrol run.
 * Contains GPS location, verification method, and evidence.
 *
 * @module core/domain/entities
 */

import { GeoJSONPoint } from '../types/geojson.js';

// Import VerificationType from Checkpoint entity instead of redefining
import { VerificationType } from './Checkpoint.js';

/**
 * Patrol Checkpoint Log Status Enum
 */
export enum PatrolCheckpointLogStatus {
  VERIFIED = 'verified',
  MISSED = 'missed',
  SKIPPED = 'skipped',
}

/**
 * Verification Metadata
 * Additional metadata about the verification process
 */
export interface IVerificationMetadata {
  deviceInfo?: {
    model: string;
    os: string;
    appVersion: string;
  };
  gpsMetadata?: {
    accuracy: number; // meters
    altitude?: number; // meters
    speed?: number; // m/s
    heading?: number; // degrees
    satelliteCount?: number;
  };
  nfcMetadata?: {
    tagId: string;
    tagType: string;
  };
  qrMetadata?: {
    scanDuration: number; // milliseconds
    codeFormat: string;
  };
  photoMetadata?: {
    fileSize: number; // bytes
    resolution: string;
    format: string;
  };
}

/**
 * Patrol Checkpoint Log Domain Entity
 */
export interface IPatrolCheckpointLog {
  id: number;
  patrolRunId: number;
  checkpointId: number;
  verifiedAt?: Date;
  verificationType?: VerificationType;
  location?: GeoJSONPoint;
  gpsAccuracy?: number; // meters
  photoEvidence?: string; // URL to stored photo
  notes?: string;
  status: PatrolCheckpointLogStatus;
  verificationMetadata?: IVerificationMetadata;
  skippedReason?: string;
  missedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Patrol Checkpoint Log Creation DTO
 */
export interface ICreatePatrolCheckpointLogDTO {
  patrolRunId: number;
  checkpointId: number;
  verifiedAt?: Date;
  verificationType?: VerificationType;
  location?: GeoJSONPoint;
  gpsAccuracy?: number;
  photoEvidence?: string;
  notes?: string;
  status?: PatrolCheckpointLogStatus;
  verificationMetadata?: IVerificationMetadata;
  skippedReason?: string;
  missedReason?: string;
}

/**
 * Patrol Checkpoint Log Update DTO
 */
export interface IUpdatePatrolCheckpointLogDTO {
  verifiedAt?: Date;
  verificationType?: VerificationType;
  location?: GeoJSONPoint;
  gpsAccuracy?: number;
  photoEvidence?: string;
  notes?: string;
  status?: PatrolCheckpointLogStatus;
  verificationMetadata?: IVerificationMetadata;
  skippedReason?: string;
  missedReason?: string;
}

/**
 * Patrol Checkpoint Log Query Options
 */
export interface IPatrolCheckpointLogQueryOptions {
  patrolRunId?: number;
  checkpointId?: number;
  status?: PatrolCheckpointLogStatus;
  verificationType?: VerificationType;
  verifiedAfter?: Date;
  verifiedBefore?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'id' | 'verifiedAt' | 'createdAt';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Patrol Checkpoint Log Detail
 * Includes checkpoint information
 */
export interface IPatrolCheckpointLogDetail extends IPatrolCheckpointLog {
  checkpointName: string;
  checkpointDescription?: string;
  siteId: number;
  siteName: string;
  expectedLocation: {
    latitude: number;
    longitude: number;
  };
  distanceFromExpected?: number; // meters
  isWithinTolerance: boolean;
}

/**
 * Patrol Checkpoint Log Summary
 * Summary of checkpoint logs for a patrol run
 */
export interface IPatrolCheckpointLogSummary {
  patrolRunId: number;
  totalCheckpoints: number;
  verifiedCheckpoints: number;
  missedCheckpoints: number;
  skippedCheckpoints: number;
  averageVerificationTime: number; // minutes
  fastestCheckpoint: {
    name: string;
    verifiedAt: Date;
  };
  slowestCheckpoint: {
    name: string;
    verifiedAt: Date;
  };
  totalScore: number;
}
