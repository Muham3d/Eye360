/**
 * Checkpoint Verification Service
 *
 * specialized service for validating physical checkpoints using NFC, QR codes, and GPS.
 * Includes security measures and anti-cheat algorithms to prevent tampering.
 *
 * @module core/services/CheckpointVerificationService
 */

import {
  ValidationError,
  NotFoundError,
  ConflictError,
} from '../domain/errors/index.js';
import type { ICheckpointRepository } from '../domain/repositories/ICheckpointRepository.js';
import type { IPatrolCheckpointLogRepository } from '../domain/repositories/IPatrolCheckpointLogRepository.js';
import { GeofenceService } from './GeofenceService.js';

/**
 * Verification Input Data
 */
export interface ICheckpointVerificationData {
  patrolRunId: number;
  checkpointId: number;
  verificationType: 'gps' | 'nfc' | 'qr';
  payload?: string; // NFC UID or QR data
  location: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  timestamp: Date;
  nonce?: string;
}

/**
 * Verification Result
 */
export interface IVerificationResult {
  isValid: boolean;
  trustScore: number; // 0-100
  distanceToTarget: number;
  errors?: string[];
  warnings?: string[];
  metadata?: {
    velocity?: number;
    accuracyUsed?: number;
  };
}

/**
 * Checkpoint Verification Service
 */
export class CheckpointVerificationService {
  private readonly MAX_VELOCITY_MPS = 15; // 15 m/s approx 54 km/h (interior limit)
  private readonly MIN_TRUST_SCORE = 80;

  constructor(
    private readonly checkpointRepository: ICheckpointRepository,
    private readonly checkpointLogRepository: IPatrolCheckpointLogRepository,
    private readonly geofenceService: GeofenceService
  ) {}

  /**
   * Verify a checkpoint physical presence
   *
   * @param data - Scanned verification data
   * @returns Verification result with trust score
   */
  async verifyCheckpoint(data: ICheckpointVerificationData): Promise<IVerificationResult> {
    const { checkpointId, verificationType, payload, location, timestamp } = data;
    const errors: string[] = [];
    const warnings: string[] = [];
    let trustScore = 100;

    // 1. Fetch checkpoint definition
    const checkpoint = await this.checkpointRepository.findById(checkpointId);
    if (!checkpoint) {
      throw new NotFoundError(`Checkpoint with ID ${checkpointId} not found`);
    }

    // 2. Proximity Check (Mandatory for all types)
    const distance = this.geofenceService.calculateDistance(
      location.latitude,
      location.longitude,
      checkpoint.latitude,
      checkpoint.longitude
    );

    const allowedDistance = (checkpoint as any).allowed_distance_meters || 50;
    const effectiveAccuracy = location.accuracy || 10;

    if (distance > (allowedDistance + effectiveAccuracy)) {
      errors.push(`Proximity failed: Guard is ${distance.toFixed(1)}m from checkpoint (Limit: ${allowedDistance}m)`);
    }

    if (effectiveAccuracy > 10) {
      trustScore -= 10;
      warnings.push(`Degraded GPS accuracy: ${effectiveAccuracy.toFixed(1)}m`);
    }

    if (distance > allowedDistance * 0.8) {
      trustScore -= 5;
      warnings.push(`Near boundary: ${distance.toFixed(1)}m`);
    }

    // 3. Payload Validation (NFC/QR)
    if (verificationType === 'nfc') {
      if (!checkpoint.nfc_tag_id) {
        errors.push('Checkpoint does not support NFC verification');
      } else if (payload !== checkpoint.nfc_tag_id) {
        errors.push('NFC tag mismatch');
      }
    } else if (verificationType === 'qr') {
      if (!checkpoint.qr_code_data) {
        errors.push('Checkpoint does not support QR verification');
      } else if (payload !== checkpoint.qr_code_data) {
        errors.push('QR code data mismatch');
      }
    }

    // 4. Anti-Cheat: Velocity Check
    const velocityResult = await this.checkVelocity(data, checkpoint);
    if (velocityResult.isSuspicious) {
      trustScore -= 50;
      warnings.push(`Suspicious velocity detected: ${velocityResult.velocity.toFixed(2)} m/s`);
      if (velocityResult.velocity > this.MAX_VELOCITY_MPS * 2) {
        errors.push('Verification rejected due to impossible travel speed (teleportation detected)');
      }
    }

    // 5. Temporal Check (Max 30 min sync delay)
    const now = new Date();
    const ageMinutes = (now.getTime() - timestamp.getTime()) / 60000;
    if (ageMinutes > 30) {
      trustScore -= 30;
      warnings.push('Delayed synchronization: Data is over 30 minutes old');
    }

    return {
      isValid: errors.length === 0,
      trustScore: Math.max(0, trustScore),
      distanceToTarget: distance,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      metadata: {
        velocity: velocityResult.velocity,
        accuracyUsed: effectiveAccuracy
      }
    };
  }

  /**
   * Calculate velocity between this and previous scan
   */
  private async checkVelocity(data: ICheckpointVerificationData, currentCheckpoint: any) {
    const lastLog = await this.checkpointLogRepository.findLatestVerified(data.patrolRunId);
    if (!lastLog || !lastLog.verifiedAt) {
      return { isSuspicious: false, velocity: 0 };
    }

    // Calculate time difference
    const timeDiffSeconds = (data.timestamp.getTime() - lastLog.verifiedAt.getTime()) / 1000;
    if (timeDiffSeconds <= 0) return { isSuspicious: true, velocity: Infinity };

    // Calculate distance between checkpoints
    const lastCheckpoint = await this.checkpointRepository.findById(lastLog.checkpointId);
    if (!lastCheckpoint) return { isSuspicious: false, velocity: 0 };

    const distance = this.geofenceService.calculateDistance(
      lastCheckpoint.latitude,
      lastCheckpoint.longitude,
      currentCheckpoint.latitude,
      currentCheckpoint.longitude
    );

    const velocity = distance / timeDiffSeconds;

    return {
      isSuspicious: velocity > this.MAX_VELOCITY_MPS,
      velocity
    };
  }
}

/**
 * Singleton instance management
 */
let instance: CheckpointVerificationService | null = null;

export function initializeCheckpointVerificationService(
  checkpointRepository: ICheckpointRepository,
  checkpointLogRepository: IPatrolCheckpointLogRepository,
  geofenceService: GeofenceService
): CheckpointVerificationService {
  instance = new CheckpointVerificationService(
    checkpointRepository,
    checkpointLogRepository,
    geofenceService
  );
  return instance;
}

export function getCheckpointVerificationService(): CheckpointVerificationService {
  if (!instance) {
    throw new Error('CheckpointVerificationService not initialized');
  }
  return instance;
}

export default CheckpointVerificationService;
