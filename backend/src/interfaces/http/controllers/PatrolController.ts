/**
 * Patrol Controller
 *
 * Handles HTTP requests for patrol execution and management.
 * Delegates to PatrolExecutionService and CheckpointVerificationService.
 *
 * @module interfaces/http/controllers
 */

import { Request, Response } from 'express';
import { 
  getPatrolExecutionService, 
  getCheckpointVerificationService 
} from '../../../core/services/index';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/authMiddleware';
import { PatrolRunStatus } from '../../../core/domain/entities/PatrolRun';

/**
 * Patrol Controller Class
 */
export class PatrolController {
  /**
   * GET /api/v1/patrols/active
   * Get the active patrol run for the authenticated guard
   */
  getActivePatrol = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getPatrolExecutionService();
    const guardId = (req as AuthenticatedRequest).user?.id;

    if (!guardId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    // This would ideally be a method in the service
    // For now, we'll assume the service has access to the repository
    const activePatrol = await (service as any).patrolRunRepository.findActiveForGuard(guardId);

    res.status(200).json({
      success: true,
      data: activePatrol,
    });
  });

  /**
   * POST /api/v1/patrols/:id/start
   * Start a scheduled patrol
   */
  startPatrol = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getPatrolExecutionService();
    const { id } = req.params;
    const { location } = req.body;
    const guardId = (req as AuthenticatedRequest).user?.id;

    if (!guardId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const patrolRun = await service.startPatrol(Number(id), {
      guardId,
      location,
    });

    res.status(200).json({
      success: true,
      data: patrolRun,
      message: 'Patrol started successfully',
    });
  });

  /**
   * POST /api/v1/patrols/:id/verify
   * Verify a checkpoint (GPS, NFC, or QR)
   */
  verifyCheckpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const executionService = getPatrolExecutionService();
    const verificationService = getCheckpointVerificationService();
    const { id } = req.params; // patrolRunId
    const { checkpointId, verificationType, payload, location, accuracy, photoUrl, notes } = req.body;

    // 1. Verify with CheckpointVerificationService
    const verificationResult = await verificationService.verifyCheckpoint({
      patrolRunId: Number(id),
      checkpointId: Number(checkpointId),
      verificationType,
      payload,
      location,
      timestamp: new Date(),
    });

    if (!verificationResult.isValid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VERIFY_FAILED',
          message: verificationResult.errors?.[0] || 'Verification failed',
          details: verificationResult,
        },
      });
      return;
    }

    // 2. Log verification via PatrolExecutionService
    const log = await executionService.verifyCheckpoint({
      patrolRunId: Number(id),
      checkpointId: Number(checkpointId),
      verificationType,
      location,
      accuracy,
      photoUrl,
      notes,
    });

    res.status(200).json({
      success: true,
      data: {
        log,
        trustScore: verificationResult.trustScore,
        warnings: verificationResult.warnings,
      },
      message: 'Checkpoint verified successfully',
    });
  });

  /**
   * POST /api/v1/patrols/:id/complete
   * Finalize a patrol run
   */
  completePatrol = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getPatrolExecutionService();
    const { id } = req.params;
    const { location } = req.body;

    const patrolRun = await service.completePatrol(Number(id), location);

    res.status(200).json({
      success: true,
      data: patrolRun,
      message: 'Patrol completed successfully',
    });
  });

  /**
   * POST /api/v1/patrols/:id/abandon
   * Abandon a patrol run
   */
  abandonPatrol = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getPatrolExecutionService();
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({ success: false, message: 'Abandonment reason is required' });
      return;
    }

    const patrolRun = await service.abandonPatrol(Number(id), reason);

    res.status(200).json({
      success: true,
      data: patrolRun,
      message: 'Patrol abandoned',
    });
  });

  /**
   * GET /api/v1/patrols/:id
   * Get patrol run details
   */
  getPatrolDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const service = getPatrolExecutionService();
    const { id } = req.params;

    // Direct access to repo for details (or add method to service)
    const patrolRun = await (service as any).patrolRunRepository.findByIdWithDetail(Number(id));

    if (!patrolRun) {
      res.status(404).json({ success: false, message: 'Patrol run not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: patrolRun,
    });
  });
}

export default new PatrolController();
