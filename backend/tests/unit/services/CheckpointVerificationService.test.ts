/**
 * CheckpointVerificationService Unit Tests
 *
 * Tests for physical checkpoint verification logic including:
 * - GPS proximity validation
 * - NFC tag verification
 * - QR code validation
 * - Anti-cheat (Velocity check)
 * - Temporal validation
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { CheckpointVerificationService } from '../../../src/core/services/CheckpointVerificationService.js';
import { GeofenceService } from '../../../src/core/services/GeofenceService.js';
import type { ICheckpointRepository } from '../../../src/core/domain/repositories/ICheckpointRepository.js';
import type { IPatrolCheckpointLogRepository } from '../../../src/core/domain/repositories/IPatrolCheckpointLogRepository.js';

describe('CheckpointVerificationService', () => {
  let service: CheckpointVerificationService;
  let mockCheckpointRepo: jest.Mocked<ICheckpointRepository>;
  let mockCheckpointLogRepo: jest.Mocked<IPatrolCheckpointLogRepository>;
  let geofenceService: GeofenceService;

  beforeEach(() => {
    mockCheckpointRepo = {
      findById: jest.fn(),
    } as any;

    mockCheckpointLogRepo = {
      findLatestVerified: jest.fn(),
    } as any;

    geofenceService = new GeofenceService();

    service = new CheckpointVerificationService(
      mockCheckpointRepo,
      mockCheckpointLogRepo,
      geofenceService
    );
  });

  describe('verifyCheckpoint', () => {
    const checkpoint = {
      id: 100,
      latitude: 37.77,
      longitude: -122.41,
      nfc_tag_id: 'NFC_123',
      qr_code_data: 'QR_ABC',
      allowed_distance_meters: 50
    };

    const validLocation = {
      latitude: 37.7701,
      longitude: -122.4101,
      accuracy: 5
    };

    it('should verify GPS checkpoint successfully', async () => {
      mockCheckpointRepo.findById.mockResolvedValue(checkpoint as any);
      mockCheckpointLogRepo.findLatestVerified.mockResolvedValue(null);

      const result = await service.verifyCheckpoint({
        patrolRunId: 1,
        checkpointId: 100,
        verificationType: 'gps',
        location: validLocation,
        timestamp: new Date()
      });

      expect(result.isValid).toBe(true);
      expect(result.trustScore).toBe(100);
    });

    it('should verify NFC checkpoint successfully', async () => {
      mockCheckpointRepo.findById.mockResolvedValue(checkpoint as any);
      mockCheckpointLogRepo.findLatestVerified.mockResolvedValue(null);

      const result = await service.verifyCheckpoint({
        patrolRunId: 1,
        checkpointId: 100,
        verificationType: 'nfc',
        payload: 'NFC_123',
        location: validLocation,
        timestamp: new Date()
      });

      expect(result.isValid).toBe(true);
    });

    it('should fail if too far from checkpoint', async () => {
      mockCheckpointRepo.findById.mockResolvedValue(checkpoint as any);

      const result = await service.verifyCheckpoint({
        patrolRunId: 1,
        checkpointId: 100,
        verificationType: 'gps',
        location: { latitude: 37.80, longitude: -122.41, accuracy: 5 }, // Far away
        timestamp: new Date()
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('Proximity failed'));
    });

    it('should fail if NFC tag mismatches', async () => {
      mockCheckpointRepo.findById.mockResolvedValue(checkpoint as any);

      const result = await service.verifyCheckpoint({
        patrolRunId: 1,
        checkpointId: 100,
        verificationType: 'nfc',
        payload: 'WRONG_TAG',
        location: validLocation,
        timestamp: new Date()
      });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('NFC tag mismatch');
    });

    it('should deduct trust score for low accuracy GPS', async () => {
      mockCheckpointRepo.findById.mockResolvedValue(checkpoint as any);

      const result = await service.verifyCheckpoint({
        patrolRunId: 1,
        checkpointId: 100,
        verificationType: 'gps',
        location: { ...validLocation, accuracy: 15 },
        timestamp: new Date()
      });

      expect(result.isValid).toBe(true);
      expect(result.trustScore).toBeLessThan(100);
      expect(result.warnings).toContain(expect.stringContaining('Degraded GPS accuracy'));
    });

    it('should detect suspicious velocity (teleportation)', async () => {
      mockCheckpointRepo.findById.mockImplementation((id) => {
        if (id === 100) return Promise.resolve(checkpoint as any);
        if (id === 99) return Promise.resolve({ ...checkpoint, id: 99, latitude: 37.80 } as any); // Far away
        return Promise.resolve(null);
      });

      // Last scan was 10 seconds ago at a checkpoint 3km away
      mockCheckpointLogRepo.findLatestVerified.mockResolvedValue({
        checkpointId: 99,
        verifiedAt: new Date(Date.now() - 10000)
      } as any);

      const result = await service.verifyCheckpoint({
        patrolRunId: 1,
        checkpointId: 100,
        verificationType: 'gps',
        location: validLocation,
        timestamp: new Date()
      });

      expect(result.isValid).toBe(false); // Rejected due to impossible speed
      expect(result.trustScore).toBeLessThan(50);
      expect(result.errors).toContain(expect.stringContaining('teleportation detected'));
    });

    it('should deduct trust score for delayed synchronization', async () => {
      mockCheckpointRepo.findById.mockResolvedValue(checkpoint as any);

      const result = await service.verifyCheckpoint({
        patrolRunId: 1,
        checkpointId: 100,
        verificationType: 'gps',
        location: validLocation,
        timestamp: new Date(Date.now() - 40 * 60000) // 40 minutes old
      });

      expect(result.isValid).toBe(true);
      expect(result.trustScore).toBeLessThan(80);
      expect(result.warnings).toContain(expect.stringContaining('Delayed synchronization'));
    });
  });
});
