/**
 * GeofenceService Unit Tests
 *
 * Tests for the geofencing service including:
 * - Point-in-polygon validation
 * - GPS accuracy filtering
 * - Geofence breach detection
 * - Distance calculations
 * - Buffer zone calculations
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  GeofenceService,
  initializeGeofenceService,
  getGeofenceService,
  DEFAULT_GEOFENCE_CONFIG,
  type IGeofenceConfig,
} from '../../../src/core/services/GeofenceService.js';
import { GeofenceBoundary } from '../../../src/core/domain/value-objects/GeofenceBoundary.js';
import type { GeoJSONPolygon, IGPSLocation } from '../../../src/core/domain/types/geojson.js';

describe('GeofenceService', () => {
  let service: GeofenceService;
  let testGeofence: GeofenceBoundary;
  let testPolygon: GeoJSONPolygon;

  beforeEach(() => {
    service = new GeofenceService(DEFAULT_GEOFENCE_CONFIG);

    // Create a simple rectangular test polygon around San Francisco
    testPolygon = {
      type: 'Polygon',
      coordinates: [
        [
          [-122.42, 37.77], // Southwest corner
          [-122.40, 37.77], // Southeast corner
          [-122.40, 37.79], // Northeast corner
          [-122.42, 37.79], // Northwest corner
          [-122.42, 37.77], // Close the ring
        ],
      ],
    };

    testGeofence = GeofenceBoundary.create(testPolygon, 50);
  });

  afterEach(() => {
    service.clearCache();
    service.clearGuardLocations();
  });

  describe('Singleton Pattern', () => {
    test('should initialize singleton service', () => {
      const instance = initializeGeofenceService();
      expect(instance).toBeInstanceOf(GeofenceService);
    });

    test('should return same instance on subsequent calls', () => {
      const instance1 = initializeGeofenceService();
      const instance2 = getGeofenceService();
      expect(instance1).toBe(instance2);
    });

    test('should throw when getting service before initialization', () => {
      // Clear the global instance
      (global as unknown as { geofenceServiceInstance: null }).geofenceServiceInstance = null;
      expect(() => getGeofenceService()).toThrow('GeofenceService not initialized');
    });
  });

  describe('Configuration', () => {
    test('should use default configuration', () => {
      expect(service.getConfig()).toEqual(DEFAULT_GEOFENCE_CONFIG);
    });

    test('should allow custom configuration', () => {
      const customConfig: IGeofenceConfig = {
        maxAccuracyMeters: 30,
        warningAccuracyMeters: 15,
        bufferToleranceMeters: 10,
        enableCaching: false,
      };
      const customService = new GeofenceService(customConfig);
      expect(customService.getConfig()).toEqual(customConfig);
    });

    test('should update configuration', () => {
      service.updateConfig({ maxAccuracyMeters: 50 });
      expect(service.getConfig().maxAccuracyMeters).toBe(50);
    });
  });

  describe('GPS Location Validation', () => {
    test('should validate valid GPS location', () => {
      const location: IGPSLocation = {
        latitude: 37.78,
        longitude: -122.41,
        accuracy: 10,
        timestamp: new Date(),
      };

      const result = service.validateGPSLocation(location);

      expect(result.isValid).toBe(true);
      expect(result.accuracy).toBe(10);
      expect(result.errors).toBeUndefined();
    });

    test('should reject GPS with low accuracy', () => {
      const location: IGPSLocation = {
        latitude: 37.78,
        longitude: -122.41,
        accuracy: 25,
        timestamp: new Date(),
      };

      const result = service.validateGPSLocation(location);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('GPS accuracy too low (25.0m > 20.0m)');
    });

    test('should warn on degraded accuracy', () => {
      const location: IGPSLocation = {
        latitude: 37.78,
        longitude: -122.41,
        accuracy: 12,
        timestamp: new Date(),
      };

      const result = service.validateGPSLocation(location);

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('GPS accuracy degraded (12.0m > 10.0m)');
    });

    test('should reject invalid latitude', () => {
      const location: IGPSLocation = {
        latitude: 95,
        longitude: -122.41,
        timestamp: new Date(),
      };

      const result = service.validateGPSLocation(location);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should reject invalid longitude', () => {
      const location: IGPSLocation = {
        latitude: 37.78,
        longitude: -185,
        timestamp: new Date(),
      };

      const result = service.validateGPSLocation(location);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe('Location in Geofence Validation', () => {
    test('should validate location inside geofence', () => {
      const result = service.validateLocationInGeofence(
        1,
        testGeofence,
        37.78, // Inside polygon
        -122.41,
        10
      );

      expect(result.isValid).toBe(true);
      expect(result.isInsideGeofence).toBe(true);
      expect(result.distanceToBoundary).toBeLessThan(0); // Negative for inside
    });

    test('should validate location outside geofence', () => {
      const result = service.validateLocationInGeofence(
        1,
        testGeofence,
        37.80, // Outside polygon (north)
        -122.41,
        10
      );

      expect(result.isValid).toBe(true);
      expect(result.isInsideGeofence).toBe(false);
      expect(result.distanceToBoundary).toBeGreaterThan(0); // Positive for outside
    });

    test('should detect buffer zone', () => {
      const result = service.validateLocationInGeofence(
        1,
        testGeofence,
        37.78,
        -122.41,
        10
      );

      expect(result.isInBufferZone).toBeDefined();
    });

    test('should provide nearest boundary point', () => {
      const result = service.validateLocationInGeofence(
        1,
        testGeofence,
        37.78,
        -122.41,
        10
      );

      expect(result.nearestBoundaryPoint).toBeDefined();
      expect(result.nearestBoundaryPoint?.latitude).toBeDefined();
      expect(result.nearestBoundaryPoint?.longitude).toBeDefined();
    });

    test('should reject invalid coordinates', () => {
      const result = service.validateLocationInGeofence(
        1,
        testGeofence,
        NaN,
        -122.41,
        10
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Latitude must be a valid number');
    });
  });

  describe('Checkpoint Validation', () => {
    test('should validate location near checkpoint', () => {
      const result = service.validateLocationNearCheckpoint(
        1,
        37.78,
        -122.41,
        37.7801, // ~11 meters away
        -122.4101,
        50, // 50 meter tolerance
        10
      );

      expect(result.isValid).toBe(true);
      expect(result.isWithinTolerance).toBe(true);
      expect(result.distance).toBeLessThan(50);
    });

    test('should reject location outside tolerance', () => {
      const result = service.validateLocationNearCheckpoint(
        1,
        37.78,
        -122.41,
        37.79, // ~1100 meters away
        -122.42,
        50, // 50 meter tolerance
        10
      );

      expect(result.isValid).toBe(true);
      expect(result.isWithinTolerance).toBe(false);
      expect(result.distance).toBeGreaterThan(50);
    });

    test('should account for GPS accuracy in tolerance', () => {
      const result = service.validateLocationNearCheckpoint(
        1,
        37.78,
        -122.41,
        37.7801,
        -122.4101,
        5, // 5 meter tolerance
        15 // 15 meter accuracy
      );

      // Effective tolerance = 5 + 15 = 20 meters
      expect(result.isWithinTolerance).toBe(true);
    });

    test('should warn near tolerance boundary', () => {
      // Create a location that's within tolerance but close to the edge
      const result = service.validateLocationNearCheckpoint(
        1,
        37.78,
        -122.41,
        37.78015, // ~17 meters away
        -122.41015,
        20, // 20 meter tolerance
        1 // 1 meter accuracy
      );

      expect(result.warnings).toContain('Near tolerance boundary');
    });

    test('should calculate bearing to checkpoint', () => {
      const result = service.validateLocationNearCheckpoint(
        1,
        37.78,
        -122.41,
        37.7801,
        -122.4101,
        50,
        10
      );

      expect(result.bearing).toBeGreaterThanOrEqual(0);
      expect(result.bearing).toBeLessThan(360);
    });
  });

  describe('Distance Calculations', () => {
    test('should calculate Haversine distance correctly', () => {
      // San Francisco to New York (approximately)
      const distance = service.calculateDistance(37.7749, -122.4194, 40.7128, -74.0060);

      // Should be approximately 4,130 km
      expect(distance).toBeGreaterThan(4_100_000);
      expect(distance).toBeLessThan(4_200_000);
    });

    test('should calculate short distances accurately', () => {
      // Two points ~100 meters apart
      const distance = service.calculateDistance(37.7749, -122.4194, 37.7758, -122.4185);

      expect(distance).toBeGreaterThan(90);
      expect(distance).toBeLessThan(110);
    });

    test('should calculate bearing correctly', () => {
      // Eastward direction
      const bearing = service.calculateBearing(37.7749, -122.4194, 37.7749, -122.4184);

      expect(bearing).toBeGreaterThan(80);
      expect(bearing).toBeLessThan(100); // Approximately East (90 degrees)
    });

    test('should calculate distance with bearing', () => {
      const result = service.calculateDistanceWithBearing(
        37.7749,
        -122.4194,
        37.7758,
        -122.4185
      );

      expect(result.distance).toBeDefined();
      expect(result.bearing).toBeDefined();
      expect(result.distance).toBeGreaterThan(0);
      expect(result.bearing).toBeGreaterThanOrEqual(0);
      expect(result.bearing).toBeLessThan(360);
    });

    test('should return zero for same point', () => {
      const distance = service.calculateDistance(37.7749, -122.4194, 37.7749, -122.4194);
      expect(distance).toBe(0);
    });
  });

  describe('Point in Polygon', () => {
    test('should detect point inside simple polygon', () => {
      const point: GeoJSONPosition = [-122.41, 37.78];
      const isInside = service.isPointInPolygon(point, testPolygon);

      expect(isInside).toBe(true);
    });

    test('should detect point outside simple polygon', () => {
      const point: GeoJSONPosition = [-122.41, 37.80]; // North of polygon
      const isInside = service.isPointInPolygon(point, testPolygon);

      expect(isInside).toBe(false);
    });

    test('should handle polygon with holes', () => {
      const polygonWithHole: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [
          // Exterior ring
          [
            [-122.42, 37.77],
            [-122.40, 37.77],
            [-122.40, 37.79],
            [-122.42, 37.79],
            [-122.42, 37.77],
          ],
          // Hole
          [
            [-122.412, 37.775],
            [-122.408, 37.775],
            [-122.408, 37.785],
            [-122.412, 37.785],
            [-122.412, 37.775],
          ],
        ],
      };

      const pointInHole: GeoJSONPosition = [-122.41, 37.78];
      const isInside = service.isPointInPolygon(pointInHole, polygonWithHole);

      expect(isInside).toBe(false); // Point is in the hole
    });

    test('should detect point outside exterior but inside hole', () => {
      const pointOutside: GeoJSONPosition = [-122.415, 37.78];
      const isInside = service.isPointInPolygon(pointOutside, testPolygon);

      expect(isInside).toBe(true); // Inside exterior ring
    });
  });

  describe('Buffer Zone Calculations', () => {
    test('should calculate buffer zone', () => {
      const result = service.calculateBufferZone(testPolygon, 100);

      expect(result.isValid).toBe(true);
      expect(result.bufferDistance).toBe(100);
      expect(result.areaIncrease).toBeGreaterThan(0);
      expect(result.bufferedPolygon).toBeDefined();
    });

    test('should reject negative buffer distance', () => {
      const result = service.calculateBufferZone(testPolygon, -10);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Buffer distance must be non-negative');
    });

    test('should increase area with positive buffer', () => {
      const result = service.calculateBufferZone(testPolygon, 50);

      const originalArea = service.calculatePolygonArea(testPolygon);
      const bufferedArea = service.calculatePolygonArea(result.bufferedPolygon);

      expect(bufferedArea).toBeGreaterThan(originalArea);
    });
  });

  describe('Geofence Breach Detection', () => {
    test('should detect exit breach', () => {
      const guardId = 1;
      const siteId = 1;

      // First location - inside geofence
      const insideLocation: IGPSLocation = {
        latitude: 37.78,
        longitude: -122.41,
        accuracy: 10,
        timestamp: new Date(),
      };

      // Initialize guard location
      service.detectGeofenceBreach(siteId, testGeofence, guardId, insideLocation);

      // Second location - outside geofence
      const outsideLocation: IGPSLocation = {
        latitude: 37.80,
        longitude: -122.41,
        accuracy: 10,
        timestamp: new Date(Date.now() + 1000),
      };

      const breach = service.detectGeofenceBreach(siteId, testGeofence, guardId, outsideLocation);

      expect(breach).toBeDefined();
      expect(breach?.breachType).toBe('exit');
      expect(breach?.guardId).toBe(guardId);
      expect(breach?.siteId).toBe(siteId);
    });

    test('should detect entry breach', () => {
      const guardId = 2;
      const siteId = 1;

      // First location - outside geofence
      const outsideLocation: IGPSLocation = {
        latitude: 37.80,
        longitude: -122.41,
        accuracy: 10,
        timestamp: new Date(),
      };

      // Initialize guard location
      service.detectGeofenceBreach(siteId, testGeofence, guardId, outsideLocation);

      // Second location - inside geofence
      const insideLocation: IGPSLocation = {
        latitude: 37.78,
        longitude: -122.41,
        accuracy: 10,
        timestamp: new Date(Date.now() + 1000),
      };

      const breach = service.detectGeofenceBreach(siteId, testGeofence, guardId, insideLocation);

      expect(breach).toBeDefined();
      expect(breach?.breachType).toBe('entry');
    });

    test('should not detect breach when staying inside', () => {
      const guardId = 3;
      const siteId = 1;

      const location1: IGPSLocation = {
        latitude: 37.78,
        longitude: -122.41,
        accuracy: 10,
        timestamp: new Date(),
      };

      service.detectGeofenceBreach(siteId, testGeofence, guardId, location1);

      const location2: IGPSLocation = {
        latitude: 37.781,
        longitude: -122.411,
        accuracy: 10,
        timestamp: new Date(Date.now() + 1000),
      };

      const breach = service.detectGeofenceBreach(siteId, testGeofence, guardId, location2);

      expect(breach).toBeNull();
    });

    test('should not detect breach on first location', () => {
      const guardId = 4;
      const siteId = 1;

      const location: IGPSLocation = {
        latitude: 37.78,
        longitude: -122.41,
        accuracy: 10,
        timestamp: new Date(),
      };

      const breach = service.detectGeofenceBreach(siteId, testGeofence, guardId, location);

      expect(breach).toBeNull();
    });

    test('should ignore low accuracy locations for breach detection', () => {
      const guardId = 5;
      const siteId = 1;

      const insideLocation: IGPSLocation = {
        latitude: 37.78,
        longitude: -122.41,
        accuracy: 10,
        timestamp: new Date(),
      };

      service.detectGeofenceBreach(siteId, testGeofence, guardId, insideLocation);

      const lowAccuracyLocation: IGPSLocation = {
        latitude: 37.80,
        longitude: -122.41,
        accuracy: 25, // Too low
        timestamp: new Date(Date.now() + 1000),
      };

      const breach = service.detectGeofenceBreach(siteId, testGeofence, guardId, lowAccuracyLocation);

      expect(breach).toBeNull();
    });
  });

  describe('Guard Location Tracking', () => {
    test('should track guard locations', () => {
      const guardId = 1;
      const location: IGPSLocation = {
        latitude: 37.78,
        longitude: -122.41,
        accuracy: 10,
        timestamp: new Date(),
      };

      // Simulate breach detection which tracks location
      service.detectGeofenceBreach(1, testGeofence, guardId, location);

      const tracked = service.getGuardLocation(guardId);
      expect(tracked).toEqual(location);
    });

    test('should remove guard location', () => {
      const guardId = 1;
      const location: IGPSLocation = {
        latitude: 37.78,
        longitude: -122.41,
        accuracy: 10,
        timestamp: new Date(),
      };

      service.detectGeofenceBreach(1, testGeofence, guardId, location);
      service.removeGuardLocation(guardId);

      const tracked = service.getGuardLocation(guardId);
      expect(tracked).toBeUndefined();
    });

    test('should clear all guard locations', () => {
      const location: IGPSLocation = {
        latitude: 37.78,
        longitude: -122.41,
        accuracy: 10,
        timestamp: new Date(),
      };

      service.detectGeofenceBreach(1, testGeofence, 1, location);
      service.detectGeofenceBreach(1, testGeofence, 2, location);

      service.clearGuardLocations();

      expect(service.getGuardLocation(1)).toBeUndefined();
      expect(service.getGuardLocation(2)).toBeUndefined();
    });
  });

  describe('Polygon Validation', () => {
    test('should validate valid polygon', () => {
      const result = service.validatePolygon(testPolygon);

      expect(result.isValid).toBe(true);
      expect(result.errors).toBeUndefined();
      expect(result.area).toBeDefined();
      expect(result.perimeter).toBeDefined();
    });

    test('should detect invalid polygon structure', () => {
      const invalidPolygon = {
        type: 'Invalid' as const,
        coordinates: [],
      };

      const result = service.validatePolygon(invalidPolygon as GeoJSONPolygon);

      expect(result.isValid).toBe(false);
      expect(result.errors).toBeDefined();
    });

    test('should detect unclosed polygon', () => {
      const unclosedPolygon: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [-122.42, 37.77],
            [-122.40, 37.77],
            [-122.40, 37.79],
            [-122.42, 37.79],
            // Missing closing point
          ],
        ],
      };

      const result = service.validatePolygon(unclosedPolygon);

      expect(result.isValid).toBe(false);
    });
  });

  describe('Polygon Calculations', () => {
    test('should calculate polygon area', () => {
      const area = service.calculatePolygonArea(testPolygon);

      expect(area).toBeGreaterThan(0);
      expect(area).toBeLessThan(10_000_000); // Less than max area
    });

    test('should calculate polygon perimeter', () => {
      const perimeter = service.calculatePolygonPerimeter(testPolygon);

      expect(perimeter).toBeGreaterThan(0);
    });

    test('should detect self-intersections', () => {
      // Create a self-intersecting polygon (bowtie shape)
      const selfIntersecting: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [
          [
            [0, 0],
            [2, 2],
            [2, 0],
            [0, 2],
            [0, 0],
          ],
        ],
      };

      const hasIntersections = service.hasSelfIntersections(selfIntersecting);
      expect(hasIntersections).toBe(true);
    });
  });

  describe('Distance to Polygon Edge', () => {
    test('should calculate distance to edge', () => {
      const distance = service.calculateDistanceToPolygonEdge(
        37.775, // Just outside polygon
        -122.415,
        testPolygon
      );

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1000); // Should be relatively close
    });

    test('should return zero for polygon with no edges', () => {
      const invalidPolygon: GeoJSONPolygon = {
        type: 'Polygon',
        coordinates: [[]],
      };

      const distance = service.calculateDistanceToPolygonEdge(37.78, -122.41, invalidPolygon);
      expect(distance).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle poles (north pole)', () => {
      const distance = service.calculateDistance(89.999, 0, 90, 0);
      expect(distance).toBeLessThan(200); // Should be very close
    });

    test('should handle poles (south pole)', () => {
      const distance = service.calculateDistance(-89.999, 0, -90, 0);
      expect(distance).toBeLessThan(200);
    });

    test('should handle antipodal points', () => {
      const distance = service.calculateDistance(0, 0, 0, 180);
      // Half Earth's circumference ~20,000 km
      expect(distance).toBeGreaterThan(19_000_000);
      expect(distance).toBeLessThan(21_000_000);
    });

    test('should handle date line crossing', () => {
      const distance = service.calculateDistance(37.77, 179.9, 37.77, -179.9);
      expect(distance).toBeLessThan(50_000); // Should be close across date line
    });
  });
});
