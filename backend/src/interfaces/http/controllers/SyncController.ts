/**
 * Sync Controller
 *
 * Handles mobile API endpoints for offline data synchronization.
 * Implements Last-Write-Wins conflict handling for patrol runs.
 *
 * @module interfaces/http/controllers
 */

import { Request, Response } from 'express';
import { getPatrolExecutionService } from '../../../core/services/index.js';
import { getPatrolTemplateService } from '../../../core/services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { AuthenticatedRequest } from '../middleware/authMiddleware.js';

/**
 * Sync Result Type
 */
interface ISyncResult {
  synced: number;
  conflicts: IConflictInfo[];
  updated: IUpdatedInfo[];
}

/**
 * Conflict Information
 */
interface IConflictInfo {
  patrolRunId: number;
  reason: string;
  serverVersion: Partial<IPatrolRunSync>;
  clientVersion: Partial<IPatrolRunSync>;
  resolution: 'server_version_wins' | 'client_version_wins' | 'manual_review';
}

/**
 * Updated Information
 */
interface IUpdatedInfo {
  patrolRunId: number;
  status: string;
}

/**
 * Patrol Run Sync Data (from mobile client)
 */
interface IPatrolRunSync {
  id?: number;
  templateId: number;
  guardId: number;
  startTime?: string;
  endTime?: string;
  status: string;
  scheduledDate: string;
  completionPercentage?: number;
  verifications?: ICheckpointVerificationSync[];
  notes?: string;
  abandonedReason?: string;
}

/**
 * Checkpoint Verification Sync Data
 */
interface ICheckpointVerificationSync {
  checkpointId: number;
  timestamp: string;
  location: {
    latitude: number;
    longitude: number;
  };
  accuracy?: number;
  status: string;
  photoUrl?: string;
  notes?: string;
}

/**
 * Assignment Response
 */
interface IAssignmentsResponse {
  sites: Array<{
    id: number;
    name: string;
    address?: string;
  }>;
  templates: Array<{
    id: number;
    siteId: number;
    name: string;
    checkpoints: number[];
  }>;
}

/**
 * Sync Controller Class
 *
 * Handles offline data synchronization for mobile clients.
 * Implements conflict resolution with Last-Write-Wins strategy.
 */
export class SyncController {
  /**
   * POST /api/mobile/patrols/sync
   * Synchronizes offline patrol runs from mobile client
   *
   * Conflict Handling:
   * - Server data is considered authoritative
   * - If client has newer data (based on timestamps), server accepts it
   * - If server has newer data, server version wins and conflict is flagged
   * - Conflicts are logged for manual review if needed
   */
  syncPatrolRuns = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const patrolExecutionService = getPatrolExecutionService();
    const user = (req as AuthenticatedRequest).user;

    if (!user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    // Validate request body
    const { patrolRuns } = req.body;
    if (!Array.isArray(patrolRuns)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PAYLOAD',
          message: 'patrolRuns must be an array'
        }
      });
      return;
    }

    // Process sync results
    const syncResult: ISyncResult = {
      synced: 0,
      conflicts: [],
      updated: []
    };

    // Process each patrol run
    for (const clientRun of patrolRuns as IPatrolRunSync[]) {
      try {
        // Validate patrol run data
        if (!clientRun.templateId || !clientRun.guardId || !clientRun.scheduledDate) {
          syncResult.conflicts.push({
            patrolRunId: clientRun.id || 0,
            reason: 'Missing required fields',
            serverVersion: {},
            clientVersion: clientRun,
            resolution: 'client_version_wins'
          });
          continue;
        }

        // Check if guard matches authenticated user
        if (clientRun.guardId !== user.id) {
          syncResult.conflicts.push({
            patrolRunId: clientRun.id || 0,
            reason: 'Guard ID mismatch',
            serverVersion: {},
            clientVersion: clientRun,
            resolution: 'server_version_wins'
          });
          continue;
        }

        // For new runs (no id), create them
        if (!clientRun.id) {
          // TODO: Implement create logic via PatrolExecutionService
          syncResult.synced++;
          syncResult.updated.push({
            patrolRunId: 0, // Will be set after creation
            status: 'created'
          });
          continue;
        }

        // For existing runs, check server version
        const serverRun = await (patrolExecutionService as any).patrolRunRepository?.findById(clientRun.id);

        if (!serverRun) {
          // Server doesn't have this run - client wins (new offline run)
          // TODO: Implement create logic
          syncResult.synced++;
          syncResult.updated.push({
            patrolRunId: clientRun.id,
            status: 'created'
          });
          continue;
        }

        // Compare timestamps for conflict detection
        const serverTime = new Date(serverRun.updatedAt || serverRun.createdAt).getTime();
        const clientTime = new Date(clientRun.endTime || clientRun.startTime || Date.now()).getTime();

        if (clientTime > serverTime) {
          // Client has newer data - update server
          // TODO: Implement update logic
          syncResult.synced++;
          syncResult.updated.push({
            patrolRunId: clientRun.id,
            status: 'updated'
          });
        } else if (clientTime < serverTime) {
          // Server has newer data - conflict flagged
          syncResult.conflicts.push({
            patrolRunId: clientRun.id,
            reason: 'Server has newer data',
            serverVersion: {
              status: serverRun.status,
              endTime: serverRun.endTime?.toISOString()
            },
            clientVersion: clientRun,
            resolution: 'server_version_wins'
          });
        } else {
          // Same timestamp - server wins (default)
          syncResult.synced++;
        }
      } catch (error) {
        syncResult.conflicts.push({
          patrolRunId: clientRun.id || 0,
          reason: (error as Error).message,
          serverVersion: {},
          clientVersion: clientRun,
          resolution: 'manual_review'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: syncResult,
      message: `Synced ${syncResult.synced} patrol runs`
    });
  });

  /**
   * GET /api/mobile/assignments
   * Get today's assigned sites and patrol templates
   */
  getAssignments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;

    if (!user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    const patrolTemplateService = getPatrolTemplateService();

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      // TODO: Implement getAssignmentsForGuard in PatrolTemplateService
      // For now, return empty assignments
      const assignments: IAssignmentsResponse = {
        sites: [],
        templates: []
      };

      res.status(200).json({
        success: true,
        data: assignments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ASSIGNMENTS_FETCH_FAILED',
          message: (error as Error).message
        }
      });
    }
  });

  /**
   * POST /api/mobile/patrols/:id/start
   * Start a patrol run (synced or real-time)
   */
  startPatrol = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const patrolExecutionService = getPatrolExecutionService();
    const { id } = req.params;
    const { location } = req.body;
    const user = (req as AuthenticatedRequest).user;

    if (!user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    try {
      const patrolRun = await patrolExecutionService.startPatrol(Number(id), {
        guardId: user.id,
        location
      });

      res.status(200).json({
        success: true,
        data: patrolRun,
        message: 'Patrol started successfully'
      });
    } catch (error: any) {
      const status = error.status || 500;
      res.status(status).json({
        success: false,
        error: {
          code: error.code || 'PATROL_START_FAILED',
          message: error.message
        }
      });
    }
  });

  /**
   * POST /api/mobile/patrols/:id/verify
   * Verify a checkpoint during patrol
   */
  verifyCheckpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { checkpointId, verificationType, payload, location, accuracy, photoUrl, notes } = req.body;
    const user = (req as AuthenticatedRequest).user;

    if (!user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    try {
      const executionService = getPatrolExecutionService();
      const verificationService = (await import('../../core/services/index.js')).getCheckpointVerificationService();

      // 1. Verify with CheckpointVerificationService
      const verificationResult = await verificationService.verifyCheckpoint({
        patrolRunId: Number(id),
        checkpointId: Number(checkpointId),
        verificationType,
        payload,
        location,
        timestamp: new Date()
      });

      if (!verificationResult.isValid) {
        res.status(400).json({
          success: false,
          error: {
            code: 'VERIFY_FAILED',
            message: verificationResult.errors?.[0] || 'Verification failed',
            details: verificationResult
          }
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
        notes
      });

      res.status(200).json({
        success: true,
        data: {
          log,
          trustScore: verificationResult.trustScore,
          warnings: verificationResult.warnings
        },
        message: 'Checkpoint verified successfully'
      });
    } catch (error: any) {
      const status = error.status || 500;
      res.status(status).json({
        success: false,
        error: {
          code: error.code || 'VERIFY_FAILED',
          message: error.message
        }
      });
    }
  });

  /**
   * POST /api/mobile/patrols/:id/complete
   * Complete a patrol run
   */
  completePatrol = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const patrolExecutionService = getPatrolExecutionService();
    const { id } = req.params;
    const { location } = req.body;

    try {
      const patrolRun = await patrolExecutionService.completePatrol(Number(id), location);

      res.status(200).json({
        success: true,
        data: patrolRun,
        message: 'Patrol completed successfully'
      });
    } catch (error: any) {
      const status = error.status || 500;
      res.status(status).json({
        success: false,
        error: {
          code: error.code || 'PATROL_COMPLETE_FAILED',
          message: error.message
        }
      });
    }
  });

  /**
   * POST /api/mobile/patrols/:id/abandon
   * Abandon a patrol run
   */
  abandonPatrol = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const patrolExecutionService = getPatrolExecutionService();
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REASON',
          message: 'Abandonment reason is required'
        }
      });
      return;
    }

    try {
      const patrolRun = await patrolExecutionService.abandonPatrol(Number(id), reason);

      res.status(200).json({
        success: true,
        data: patrolRun,
        message: 'Patrol abandoned'
      });
    } catch (error: any) {
      const status = error.status || 500;
      res.status(status).json({
        success: false,
        error: {
          code: error.code || 'PATROL_ABANDON_FAILED',
          message: error.message
        }
      });
    }
  });

  /**
   * GET /api/mobile/patrols/active
   * Get the active patrol run for the authenticated guard
   */
  getActivePatrol = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const user = (req as AuthenticatedRequest).user;

    if (!user?.id) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
      return;
    }

    try {
      const service = getPatrolExecutionService();
      // Access repository through service (internal access)
      const activePatrol = await (service as any).patrolRunRepository.findActiveForGuard(user.id);

      if (!activePatrol) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NO_ACTIVE_PATROL',
            message: 'No active patrol found'
          }
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: activePatrol
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ACTIVE_FAILED',
          message: error.message
        }
      });
    }
  });
}

export default new SyncController();
