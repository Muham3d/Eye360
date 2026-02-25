/**
 * RealTimeService Unit Tests
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { RealTimeService } from '../../../src/core/services/RealTimeService.js';
import { GeofenceService } from '../../../src/core/services/GeofenceService.js';

describe('RealTimeService', () => {
  let service: RealTimeService;
  let geofenceService: GeofenceService;

  beforeEach(() => {
    geofenceService = new GeofenceService();
    service = new RealTimeService(geofenceService);
  });

  it('should track active guards', async () => {
    const update = {
      userId: 1,
      latitude: 37.77,
      longitude: -122.41,
      timestamp: new Date()
    };

    // Mock IO broadcast
    const mockEmit = jest.fn();
    (global as any).getIoInstance = () => ({
      of: () => ({
        to: () => ({
          emit: mockEmit
        })
      })
    });

    await service.handleLocationUpdate(update);
    expect(service.getActiveGuards()).toHaveLength(1);
  });

  it('should remove guards on disconnect', () => {
    service.handleLocationUpdate({ userId: 1, latitude: 0, longitude: 0, timestamp: new Date() });
    service.removeGuard(1);
    expect(service.getActiveGuards()).toHaveLength(0);
  });
});
