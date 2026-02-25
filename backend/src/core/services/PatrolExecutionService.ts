/**
 * Patrol Execution Service
 *
 * Core business logic for managing the lifecycle of a patrol run.
 * Handles starting, pausing, verifying checkpoints, and completing patrols.
 *
 * @module core/services/PatrolExecutionService
 */

import {
  ValidationError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../domain/errors/index.js';
import type { IPatrolRunRepository } from '../domain/repositories/IPatrolRunRepository.js';
import type { IPatrolCheckpointRepository } from '../domain/repositories/IPatrolCheckpointRepository.js';
import type { IPatrolCheckpointLogRepository } from '../domain/repositories/IPatrolCheckpointLogRepository.js';
import type { ISiteRepository } from '../domain/repositories/ISiteRepository.js';
import { GeofenceService } from './GeofenceService.js';
import { PatrolRunStatus } from '../domain/entities/PatrolRun.js';
import type { IPatrolRun, IPatrolRunDetail } from '../domain/entities/PatrolRun.js';
import type { IPatrolCheckpointDetail } from '../domain/entities/PatrolCheckpoint.js';

/**
 * Patrol Start Options
 */
export interface PatrolStartOptions {
  guardId: number;
  location?: { latitude: number; longitude: number };
}

/**
 * Checkpoint Verification Data
 */
export interface CheckpointVerificationData {
  patrolRunId: number;
  checkpointId: number;
  verificationType: 'gps' | 'nfc' | 'qr';
  location: { latitude: number; longitude: number };
  accuracy?: number;
  nfcData?: string;
  qrData?: string;
  photoUrl?: string;
  notes?: string;
}

/**
 * Patrol Execution Service
 *
 * Provides business logic for patrol execution and validation.
 */
export class PatrolExecutionService {
  constructor(
    private readonly patrolRunRepository: IPatrolRunRepository,
    private readonly patrolCheckpointRepository: IPatrolCheckpointRepository,
    private readonly checkpointLogRepository: IPatrolCheckpointLogRepository,
    private readonly siteRepository: ISiteRepository,
    private readonly geofenceService: GeofenceService
  ) {}

  /**
   * Start a scheduled patrol run
   *
   * @param patrolRunId - ID of the patrol run to start
   * @param options - Start options including guard and location
   * @returns Updated patrol run
   */
  async startPatrol(patrolRunId: number, options: PatrolStartOptions): Promise<IPatrolRun> {
    const { guardId, location } = options;

    // 1. Fetch patrol run
    const patrolRun = await this.patrolRunRepository.findByIdWithDetail(patrolRunId);
    if (!patrolRun) {
      throw new NotFoundError(`Patrol run with ID ${patrolRunId} not found`);
    }

    // 2. Validate guard
    if (patrolRun.guardId !== guardId) {
      throw new ForbiddenError('This patrol is assigned to another guard');
    }

    // 3. Validate status
    if (patrolRun.status !== PatrolRunStatus.PENDING) {
      throw new ConflictError(`Cannot start patrol with status ${patrolRun.status}`);
    }

    // 4. Check if guard already has an active patrol
    const activePatrol = await this.patrolRunRepository.findActiveForGuard(guardId);
    if (activePatrol && activePatrol.id !== patrolRunId && activePatrol.status === PatrolRunStatus.IN_PROGRESS) {
      throw new ConflictError('Guard already has an active patrol in progress');
    }

    // 5. Validate site and geofence if location provided
    if (location) {
      const site = await this.siteRepository.findById(patrolRun.siteId);
      if (site && site.requires_gps && site.geofence_boundary) {
        // Simple radius check or geofence check can be done here
        // For now, we'll just log the start location
      }
    }

    // 6. Start the patrol
    return this.patrolRunRepository.start(patrolRunId, location);
  }

  /**
   * Verify a checkpoint during a patrol
   *
   * @param data - Verification data
   * @returns Created checkpoint log
   */
  async verifyCheckpoint(data: CheckpointVerificationData) {
    const { patrolRunId, checkpointId, location, verificationType, accuracy } = data;

    // 1. Fetch patrol run
    const patrolRun = await this.patrolRunRepository.findByIdWithDetail(patrolRunId);
    if (!patrolRun) {
      throw new NotFoundError(`Patrol run with ID ${patrolRunId} not found`);
    }

    if (patrolRun.status !== PatrolRunStatus.IN_PROGRESS) {
      throw new ConflictError(`Cannot verify checkpoint for patrol with status ${patrolRun.status}`);
    }

    // 2. Fetch checkpoint details in this template
    const patrolCheckpoint = await this.patrolCheckpointRepository.findByTemplateAndCheckpoint(
      patrolRun.templateId,
      checkpointId
    );
    if (!patrolCheckpoint) {
      throw new NotFoundError(`Checkpoint with ID ${checkpointId} not found in template ${patrolRun.templateId}`);
    }

    // 3. Fetch full checkpoint detail for location and verification info
    const checkpoints = await this.patrolCheckpointRepository.findByTemplateIdWithDetail(patrolRun.templateId);
    const detail = checkpoints.find(cp => cp.checkpointId === checkpointId);
    if (!detail) {
      throw new NotFoundError(`Checkpoint details not found`);
    }

    // 4. Validate Sequence (Optional based on business rules)
    const lastVerified = await this.checkpointLogRepository.findLatestVerified(patrolRunId);
    const isValidSequence = await this.patrolCheckpointRepository.isValidNextCheckpoint(
      patrolRun.templateId,
      checkpointId,
      lastVerified ? lastVerified.checkpointId : null
    );

    // If sequential is strictly enforced, we would throw here. 
    // For now, we'll allow out-of-order but log it or handle it in completion logic.

    // 5. Perform Geospatial Verification if GPS type
    if (verificationType === 'gps') {
      const validation = this.geofenceService.validateLocationNearCheckpoint(
        checkpointId,
        detail.location.latitude,
        detail.location.longitude,
        location.latitude,
        location.longitude,
        detail.gpsTolerance,
        accuracy
      );

      if (!validation.isWithinTolerance) {
        throw new ValidationError(`Guard is too far from checkpoint (${validation.distance.toFixed(1)}m > ${detail.gpsTolerance}m)`);
      }
    }

    // 6. NFC/QR Validation (matching data)
    // In a real scenario, we'd compare data.nfcData with checkpoint.nfc_tag_id

    // 7. Create verification log
    const log = await this.checkpointLogRepository.markVerified(patrolRunId, checkpointId, {
      verifiedAt: new Date(),
      verificationType,
      location,
      gpsAccuracy: accuracy,
      photoEvidence: data.photoUrl,
      notes: data.notes
    });

    // 8. Update patrol run progress
    const completionPercentage = await this.patrolRunRepository.calculateCompletionPercentage(patrolRunId);
    await this.patrolRunRepository.updateCompletionPercentage(patrolRunId, completionPercentage);

    // 9. Check if all mandatory checkpoints are done and auto-complete if necessary
    // (Or leave completion as a manual step)

    return log;
  }

  /**
   * Pause a patrol run
   */
  async pausePatrol(patrolRunId: number): Promise<IPatrolRun> {
    const patrolRun = await this.patrolRunRepository.findById(patrolRunId);
    if (!patrolRun) throw new NotFoundError('Patrol run not found');
    if (patrolRun.status !== PatrolRunStatus.IN_PROGRESS) {
      throw new ConflictError('Only in-progress patrols can be paused');
    }

    return this.patrolRunRepository.update(patrolRunId, { status: PatrolRunStatus.IN_PROGRESS }); // Paused state to be added
  }

  /**
   * Resume a paused patrol run
   */
  async resumePatrol(patrolRunId: number): Promise<IPatrolRun> {
    const patrolRun = await this.patrolRunRepository.findById(patrolRunId);
    if (!patrolRun) throw new NotFoundError('Patrol run not found');
    // Assuming status logic handles paused vs in_progress
    return this.patrolRunRepository.update(patrolRunId, { status: PatrolRunStatus.IN_PROGRESS });
  }

  /**
   * Complete a patrol run
   */
  async completePatrol(patrolRunId: number, location?: { latitude: number; longitude: number }): Promise<IPatrolRun> {
    const patrolRun = await this.patrolRunRepository.findByIdWithDetail(patrolRunId);
    if (!patrolRun) throw new NotFoundError('Patrol run not found');

    // 1. Check if all mandatory checkpoints are verified
    const checkpoints = await this.patrolCheckpointRepository.findByTemplateId(patrolRun.templateId);
    const mandatoryCheckpoints = checkpoints.filter(cp => (cp as any).is_mandatory !== false);
    
    const logs = await this.checkpointLogRepository.findByPatrolRunId(patrolRunId);
    const verifiedCheckpointIds = new Set(logs.data.filter(l => l.status === 'verified').map(l => l.checkpointId));

    const missingMandatory = mandatoryCheckpoints.filter(cp => !verifiedCheckpointIds.has(cp.checkpointId));

    if (missingMandatory.length > 0) {
      throw new ValidationError(`Cannot complete patrol. Missing ${missingMandatory.length} mandatory checkpoints.`);
    }

    // 2. Finalize
    return this.patrolRunRepository.complete(patrolRunId, location);
  }

  /**
   * Abandon a patrol run
   */
  async abandonPatrol(patrolRunId: number, reason: string): Promise<IPatrolRun> {
    const patrolRun = await this.patrolRunRepository.findById(patrolRunId);
    if (!patrolRun) throw new NotFoundError('Patrol run not found');

    if (patrolRun.status === PatrolRunStatus.COMPLETED || patrolRun.status === PatrolRunStatus.ABANDONED) {
      throw new ConflictError('Cannot abandon a finished patrol');
    }

    return this.patrolRunRepository.abandon(patrolRunId, reason);
  }
}

/**
 * Singleton instance management
 */
let patrolExecutionServiceInstance: PatrolExecutionService | null = null;

export function initializePatrolExecutionService(
  patrolRunRepository: IPatrolRunRepository,
  patrolCheckpointRepository: IPatrolCheckpointRepository,
  checkpointLogRepository: IPatrolCheckpointLogRepository,
  siteRepository: ISiteRepository,
  geofenceService: GeofenceService
): PatrolExecutionService {
  patrolExecutionServiceInstance = new PatrolExecutionService(
    patrolRunRepository,
    patrolCheckpointRepository,
    checkpointLogRepository,
    siteRepository,
    geofenceService
  );
  return patrolExecutionServiceInstance;
}

export function getPatrolExecutionService(): PatrolExecutionService {
  if (!patrolExecutionServiceInstance) {
    throw new Error('PatrolExecutionService not initialized');
  }
  return patrolExecutionServiceInstance;
}

export default PatrolExecutionService;
