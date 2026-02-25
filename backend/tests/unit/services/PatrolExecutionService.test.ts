/**
 * PatrolExecutionService Unit Tests
 *
 * Tests for patrol execution lifecycle including starting, 
 * checkpoint verification, and completion.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PatrolExecutionService } from '../../../src/core/services/PatrolExecutionService.js';
import { GeofenceService } from '../../../src/core/services/GeofenceService.js';
import { PatrolRunStatus } from '../../../src/core/domain/entities/PatrolRun.js';
import type { IPatrolRunRepository } from '../../../src/core/domain/repositories/IPatrolRunRepository.js';
import type { IPatrolCheckpointRepository } from '../../../src/core/domain/repositories/IPatrolCheckpointRepository.js';
import type { IPatrolCheckpointLogRepository } from '../../../src/core/domain/repositories/IPatrolCheckpointLogRepository.js';
import type { ISiteRepository } from '../../../src/core/domain/repositories/ISiteRepository.js';

describe('PatrolExecutionService', () => {
  let service: PatrolExecutionService;
  let mockPatrolRunRepo: jest.Mocked<IPatrolRunRepository>;
  let mockPatrolCheckpointRepo: jest.Mocked<IPatrolCheckpointRepository>;
  let mockCheckpointLogRepo: jest.Mocked<IPatrolCheckpointLogRepository>;
  let mockSiteRepo: jest.Mocked<ISiteRepository>;
  let geofenceService: GeofenceService;

  beforeEach(() => {
    mockPatrolRunRepo = {
      findById: jest.fn(),
      findByIdWithDetail: jest.fn(),
      findActiveForGuard: jest.fn(),
      start: jest.fn(),
      complete: jest.fn(),
      abandon: jest.fn(),
      update: jest.fn(),
      calculateCompletionPercentage: jest.fn(),
      updateCompletionPercentage: jest.fn(),
    } as any;

    mockPatrolCheckpointRepo = {
      findByTemplateAndCheckpoint: jest.fn(),
      findByTemplateIdWithDetail: jest.fn(),
      findByTemplateId: jest.fn(),
      isValidNextCheckpoint: jest.fn(),
    } as any;

    mockCheckpointLogRepo = {
      findLatestVerified: jest.fn(),
      markVerified: jest.fn(),
      findByPatrolRunId: jest.fn(),
    } as any;

    mockSiteRepo = {
      findById: jest.fn(),
    } as any;

    geofenceService = new GeofenceService();

    service = new PatrolExecutionService(
      mockPatrolRunRepo,
      mockPatrolCheckpointRepo,
      mockCheckpointLogRepo,
      mockSiteRepo,
      geofenceService
    );
  });

  describe('startPatrol', () => {
    it('should start a patrol successfully', async () => {
      const patrolRun = { id: 1, guardId: 10, status: PatrolRunStatus.PENDING, siteId: 1 };
      mockPatrolRunRepo.findByIdWithDetail.mockResolvedValue(patrolRun as any);
      mockPatrolRunRepo.findActiveForGuard.mockResolvedValue(null);
      mockPatrolRunRepo.start.mockResolvedValue({ ...patrolRun, status: PatrolRunStatus.IN_PROGRESS } as any);

      const result = await service.startPatrol(1, { guardId: 10 });

      expect(result.status).toBe(PatrolRunStatus.IN_PROGRESS);
      expect(mockPatrolRunRepo.start).toHaveBeenCalledWith(1, undefined);
    });

    it('should throw NotFoundError if patrol run does not exist', async () => {
      mockPatrolRunRepo.findByIdWithDetail.mockResolvedValue(null);

      await expect(service.startPatrol(999, { guardId: 10 }))
        .rejects.toThrow('Patrol run with ID 999 not found');
    });

    it('should throw ForbiddenError if guard is not assigned', async () => {
      mockPatrolRunRepo.findByIdWithDetail.mockResolvedValue({ id: 1, guardId: 11, status: PatrolRunStatus.PENDING } as any);

      await expect(service.startPatrol(1, { guardId: 10 }))
        .rejects.toThrow('This patrol is assigned to another guard');
    });

    it('should throw ConflictError if patrol is not pending', async () => {
      mockPatrolRunRepo.findByIdWithDetail.mockResolvedValue({ id: 1, guardId: 10, status: PatrolRunStatus.IN_PROGRESS } as any);

      await expect(service.startPatrol(1, { guardId: 10 }))
        .rejects.toThrow('Cannot start patrol with status in_progress');
    });
  });

  describe('verifyCheckpoint', () => {
    const patrolRun = { id: 1, templateId: 5, status: PatrolRunStatus.IN_PROGRESS };
    const checkpointDetail = {
      checkpointId: 100,
      location: { latitude: 37.77, longitude: -122.41 },
      gpsTolerance: 50
    };

    beforeEach(() => {
      mockPatrolRunRepo.findByIdWithDetail.mockResolvedValue(patrolRun as any);
      mockPatrolCheckpointRepo.findByTemplateAndCheckpoint.mockResolvedValue({} as any);
      mockPatrolCheckpointRepo.findByTemplateIdWithDetail.mockResolvedValue([checkpointDetail] as any);
      mockCheckpointLogRepo.findLatestVerified.mockResolvedValue(null);
      mockPatrolCheckpointRepo.isValidNextCheckpoint.mockResolvedValue(true);
      mockCheckpointLogRepo.markVerified.mockResolvedValue({ id: 500 } as any);
      mockPatrolRunRepo.calculateCompletionPercentage.mockResolvedValue(10);
    });

    it('should verify checkpoint successfully with valid GPS', async () => {
      const result = await service.verifyCheckpoint({
        patrolRunId: 1,
        checkpointId: 100,
        verificationType: 'gps',
        location: { latitude: 37.7701, longitude: -122.4101 }, // Within 50m
        accuracy: 10
      });

      expect(result.id).toBe(500);
      expect(mockCheckpointLogRepo.markVerified).toHaveBeenCalled();
      expect(mockPatrolRunRepo.updateCompletionPercentage).toHaveBeenCalledWith(1, 10);
    });

    it('should throw ValidationError if GPS is too far', async () => {
      await expect(service.verifyCheckpoint({
        patrolRunId: 1,
        checkpointId: 100,
        verificationType: 'gps',
        location: { latitude: 37.80, longitude: -122.41 }, // Far away
        accuracy: 5
      })).rejects.toThrow('Guard is too far from checkpoint');
    });

    it('should throw ConflictError if patrol is not in progress', async () => {
      mockPatrolRunRepo.findByIdWithDetail.mockResolvedValue({ ...patrolRun, status: PatrolRunStatus.COMPLETED } as any);

      await expect(service.verifyCheckpoint({
        patrolRunId: 1,
        checkpointId: 100,
        verificationType: 'gps',
        location: { latitude: 37.77, longitude: -122.41 }
      })).rejects.toThrow('Cannot verify checkpoint for patrol with status completed');
    });
  });

  describe('completePatrol', () => {
    it('should complete patrol if all mandatory checkpoints are done', async () => {
      const patrolRun = { id: 1, templateId: 5, status: PatrolRunStatus.IN_PROGRESS };
      mockPatrolRunRepo.findByIdWithDetail.mockResolvedValue(patrolRun as any);
      
      mockPatrolCheckpointRepo.findByTemplateId.mockResolvedValue([
        { checkpointId: 101, is_mandatory: true },
        { checkpointId: 102, is_mandatory: false }
      ] as any);

      mockCheckpointLogRepo.findByPatrolRunId.mockResolvedValue({
        data: [{ checkpointId: 101, status: 'verified' }]
      } as any);

      mockPatrolRunRepo.complete.mockResolvedValue({ ...patrolRun, status: PatrolRunStatus.COMPLETED } as any);

      const result = await service.completePatrol(1);

      expect(result.status).toBe(PatrolRunStatus.COMPLETED);
      expect(mockPatrolRunRepo.complete).toHaveBeenCalledWith(1, undefined);
    });

    it('should throw ValidationError if mandatory checkpoints are missing', async () => {
      const patrolRun = { id: 1, templateId: 5, status: PatrolRunStatus.IN_PROGRESS };
      mockPatrolRunRepo.findByIdWithDetail.mockResolvedValue(patrolRun as any);
      
      mockPatrolCheckpointRepo.findByTemplateId.mockResolvedValue([
        { checkpointId: 101, is_mandatory: true }
      ] as any);

      mockCheckpointLogRepo.findByPatrolRunId.mockResolvedValue({
        data: [] // No verified checkpoints
      } as any);

      await expect(service.completePatrol(1))
        .rejects.toThrow('Cannot complete patrol. Missing 1 mandatory checkpoints.');
    });
  });

  describe('abandonPatrol', () => {
    it('should abandon patrol successfully', async () => {
      mockPatrolRunRepo.findById.mockResolvedValue({ id: 1, status: PatrolRunStatus.IN_PROGRESS } as any);
      mockPatrolRunRepo.abandon.mockResolvedValue({ id: 1, status: PatrolRunStatus.ABANDONED } as any);

      const result = await service.abandonPatrol(1, 'Emergency');

      expect(result.status).toBe(PatrolRunStatus.ABANDONED);
      expect(mockPatrolRunRepo.abandon).toHaveBeenCalledWith(1, 'Emergency');
    });

    it('should throw ConflictError if already finished', async () => {
      mockPatrolRunRepo.findById.mockResolvedValue({ id: 1, status: PatrolRunStatus.COMPLETED } as any);

      await expect(service.abandonPatrol(1, 'Reason'))
        .rejects.toThrow('Cannot abandon a finished patrol');
    });
  });
});
