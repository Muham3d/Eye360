/**
 * GeofenceService
 *
 * Core service for geofencing operations including point-in-polygon validation,
 * GPS accuracy filtering, breach detection, and distance calculations.
 *
 * This service is framework-agnostic and contains only pure business logic.
 *
 * @module core/services
 */

import { GeofenceBoundary, GEOFENCE_CONSTANTS } from '../domain/value-objects/GeofenceBoundary.js';
import { GPSLocation, GPS_CONSTANTS } from '../domain/value-objects/GPSLocation.js';
import {
  IGPSLocation,
  IGPSValidationResult,
  IDistanceResult,
  GeoJSONPolygon,
  GeoJSONPosition,
} from '../domain/types/geojson.js';

/**
 * Geofence Validation Configuration
 */
export interface IGeofenceConfig {
  maxAccuracyMeters: number; // Reject GPS with accuracy > this
  warningAccuracyMeters: number; // Warn on accuracy > this
  bufferToleranceMeters: number; // Additional buffer for geofence checks
  enableCaching: boolean; // Cache geofence calculations
}

/**
 * Default geofence configuration
 */
export const DEFAULT_GEOFENCE_CONFIG: IGeofenceConfig = {
  maxAccuracyMeters: 20,
  warningAccuracyMeters: 10,
  bufferToleranceMeters: 5,
  enableCaching: true,
} as const;

/**
 * Location Validation Result
 * Extended result for location validation with geofence info
 */
export interface ILocationValidationResult {
  isValid: boolean;
  isInsideGeofence: boolean;
  isInBufferZone: boolean;
  distanceToBoundary: number; // meters, negative if inside
  errors?: string[];
  warnings?: string[];
  accuracy?: number;
  nearestBoundaryPoint?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * Checkpoint Validation Result
 * Result of validating location near a checkpoint
 */
export interface ICheckpointValidationResult {
  isValid: boolean;
  isWithinTolerance: boolean;
  distance: number; // meters from checkpoint
  accuracy: number; // GPS accuracy
  bearing: number; // degrees to checkpoint
  errors?: string[];
  warnings?: string[];
}

/**
 * Geofence Breach Event
 * Represents a geofence breach detection
 */
export interface IGeofenceBreachEvent {
  siteId: number;
  guardId: number;
  breachType: 'entry' | 'exit';
  location: IGPSLocation;
  timestamp: Date;
  distanceToBoundary: number; // meters
  previousLocation?: IGPSLocation;
}

/**
 * Buffer Zone Result
 * Result of calculating a buffer zone around a polygon
 */
export interface IBufferZoneResult {
  originalPolygon: GeoJSONPolygon;
  bufferedPolygon: GeoJSONPolygon;
  bufferDistance: number; // meters
  areaIncrease: number; // square meters
  isValid: boolean;
  errors?: string[];
}

/**
 * GeofenceService
 *
 * Provides comprehensive geofencing operations:
 * - Point-in-polygon validation using ray-casting algorithm
 * - GPS accuracy filtering and validation
 * - Geofence breach detection
 * - Distance calculations (Haversine formula)
 * - Buffer zone calculations
 */
export class GeofenceService {
  private readonly config: IGeofenceConfig;
  private readonly cache: Map<string, unknown>;
  private readonly guardLocations: Map<number, IGPSLocation>; // Track guard locations for breach detection

  constructor(config: IGeofenceConfig = DEFAULT_GEOFENCE_CONFIG) {
    this.config = config;
    this.cache = new Map();
    this.guardLocations = new Map();
  }

  /**
   * Validate a GPS location with accuracy filtering
   * @param location - Raw GPS location data
   * @returns Validation result
   */
  validateGPSLocation(location: IGPSLocation): IGPSValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate using GPSLocation value object
    const baseValidation = GPSLocation.validate(location);
    if (!baseValidation.isValid) {
      return baseValidation;
    }

    // Add warnings based on accuracy
    if (location.accuracy !== undefined) {
      if (location.accuracy > this.config.maxAccuracyMeters) {
        errors.push(
          `GPS accuracy too low (${location.accuracy.toFixed(1)}m > ${this.config.maxAccuracyMeters}m)`
        );
      } else if (location.accuracy > this.config.warningAccuracyMeters) {
        warnings.push(
          `GPS accuracy degraded (${location.accuracy.toFixed(1)}m > ${this.config.warningAccuracyMeters}m)`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      accuracy: location.accuracy,
    };
  }

  /**
   * Validate if a location is within a site's geofence
   * @param siteId - Site ID
   * @param geofence - Geofence boundary
   * @param latitude - Latitude
   * @param longitude - Longitude
   * @param accuracy - GPS accuracy in meters (optional)
   * @returns Location validation result
   */
  validateLocationInGeofence(
    siteId: number,
    geofence: GeofenceBoundary,
    latitude: number,
    longitude: number,
    accuracy?: number
  ): ILocationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate GPS coordinates
    if (typeof latitude !== 'number' || isNaN(latitude)) {
      errors.push('Latitude must be a valid number');
    }
    if (typeof longitude !== 'number' || isNaN(longitude)) {
      errors.push('Longitude must be a valid number');
    }

    if (latitude < -90 || latitude > 90) {
      errors.push('Latitude must be between -90 and 90');
    }
    if (longitude < -180 || longitude > 180) {
      errors.push('Longitude must be between -180 and 180');
    }

    if (errors.length > 0) {
      return {
        isValid: false,
        isInsideGeofence: false,
        isInBufferZone: false,
        distanceToBoundary: Infinity,
        errors,
      };
    }

    // Validate accuracy if provided
    if (accuracy !== undefined) {
      if (accuracy > this.config.maxAccuracyMeters) {
        errors.push(`GPS accuracy too low (${accuracy.toFixed(1)}m)`);
      } else if (accuracy > this.config.warningAccuracyMeters) {
        warnings.push(`GPS accuracy degraded (${accuracy.toFixed(1)}m)`);
      }
    }

    // Create GPS location object
    const location: IGPSLocation = {
      latitude,
      longitude,
      accuracy,
      timestamp: new Date(),
    };

    // Check if point is in geofence
    const isInsideGeofence = geofence.contains(location);
    const isInBufferZone = geofence.isWithinBuffer(location);
    const distanceToBoundary = geofence.distanceToBoundary(location);

    // Find nearest boundary point
    const nearestBoundaryPoint = this.findNearestBoundaryPoint(geofence, latitude, longitude);

    return {
      isValid: errors.length === 0,
      isInsideGeofence,
      isInBufferZone,
      distanceToBoundary,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      accuracy,
      nearestBoundaryPoint,
    };
  }

  /**
   * Validate if a location is near a checkpoint
   * @param checkpointId - Checkpoint ID
   * @param checkpointLat - Checkpoint latitude
   * @param checkpointLon - Checkpoint longitude
   * @param userLat - User latitude
   * @param userLon - User longitude
   * @param tolerance - Maximum distance in meters (default: checkpoint's tolerance)
   * @param accuracy - GPS accuracy in meters (optional)
   * @returns Checkpoint validation result
   */
  validateLocationNearCheckpoint(
    checkpointId: number,
    checkpointLat: number,
    checkpointLon: number,
    userLat: number,
    userLon: number,
    tolerance: number = 50,
    accuracy?: number
  ): ICheckpointValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate coordinates
    if (typeof checkpointLat !== 'number' || isNaN(checkpointLat) ||
        typeof checkpointLon !== 'number' || isNaN(checkpointLon) ||
        typeof userLat !== 'number' || isNaN(userLat) ||
        typeof userLon !== 'number' || isNaN(userLon)) {
      errors.push('All coordinates must be valid numbers');
      return {
        isValid: false,
        isWithinTolerance: false,
        distance: Infinity,
        accuracy: accuracy ?? 0,
        bearing: 0,
        errors,
      };
    }

    // Validate tolerance
    if (tolerance <= 0) {
      errors.push('Tolerance must be positive');
    }

    // Calculate distance
    const distance = this.calculateDistance(userLat, userLon, checkpointLat, checkpointLon);
    const bearing = this.calculateBearing(userLat, userLon, checkpointLat, checkpointLon);

    // Check if within tolerance
    const effectiveTolerance = tolerance + (accuracy ?? 0);
    const isWithinTolerance = distance <= effectiveTolerance;

    // Validate accuracy
    if (accuracy !== undefined) {
      if (accuracy > this.config.maxAccuracyMeters) {
        errors.push(`GPS accuracy too low (${accuracy.toFixed(1)}m)`);
      } else if (accuracy > this.config.warningAccuracyMeters) {
        warnings.push(`GPS accuracy degraded (${accuracy.toFixed(1)}m)`);
      }
    }

    // Add warning if near boundary
    if (isWithinTolerance && distance > effectiveTolerance * 0.8) {
      warnings.push(`Near tolerance boundary (${distance.toFixed(1)}m of ${effectiveTolerance}m)`);
    }

    return {
      isValid: errors.length === 0,
      isWithinTolerance,
      distance,
      accuracy: accuracy ?? 0,
      bearing,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Calculate the great-circle distance between two points using Haversine formula
   * @param fromLat - Starting latitude
   * @param fromLng - Starting longitude
   * @param toLat - Ending latitude
   * @param toLng - Ending longitude
   * @returns Distance in meters
   */
  calculateDistance(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (fromLat * Math.PI) / 180;
    const phi2 = (toLat * Math.PI) / 180;
    const deltaPhi = ((toLat - fromLat) * Math.PI) / 180;
    const deltaLambda = ((toLng - fromLng) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate the bearing from one point to another
   * @param fromLat - Starting latitude
   * @param fromLng - Starting longitude
   * @param toLat - Ending latitude
   * @param toLng - Ending longitude
   * @returns Bearing in degrees (0-359, where 0 is North)
   */
  calculateBearing(fromLat: number, fromLng: number, toLat: number, toLng: number): number {
    const phi1 = (fromLat * Math.PI) / 180;
    const phi2 = (toLat * Math.PI) / 180;
    const deltaLambda = ((toLng - fromLng) * Math.PI) / 180;

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x =
      Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }

  /**
   * Calculate distance with bearing result
   * @param fromLat - Starting latitude
   * @param fromLng - Starting longitude
   * @param toLat - Ending latitude
   * @param toLng - Ending longitude
   * @returns Distance result with bearing
   */
  calculateDistanceWithBearing(fromLat: number, fromLng: number, toLat: number, toLng: number): IDistanceResult {
    return {
      distance: this.calculateDistance(fromLat, fromLng, toLat, toLng),
      bearing: this.calculateBearing(fromLat, fromLng, toLat, toLng),
    };
  }

  /**
   * Check if a point is inside a polygon using ray-casting algorithm
   * Supports complex polygons with holes
   * @param point - Point to check [longitude, latitude]
   * @param polygon - GeoJSON polygon
   * @returns True if point is inside polygon
   */
  isPointInPolygon(point: GeoJSONPosition, polygon: GeoJSONPolygon): boolean {
    const [lon, lat] = point;
    const exteriorRing = polygon.coordinates[0];

    if (!exteriorRing || exteriorRing.length < 4) {
      return false;
    }

    // Check exterior ring using ray-casting
    let inside = false;
    for (let i = 0, j = exteriorRing.length - 1; i < exteriorRing.length; j = i++) {
      const coordI = exteriorRing[i];
      const coordJ = exteriorRing[j];
      if (!coordI || !coordJ) continue;

      const [xi, yi] = coordI;
      const [xj, yj] = coordJ;

      const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    // If outside exterior ring, not inside
    if (!inside) return false;

    // Check holes (inner rings) - point must NOT be inside any hole
    for (let h = 1; h < polygon.coordinates.length; h++) {
      const hole = polygon.coordinates[h];
      if (!hole || hole.length < 4) continue;

      let inHole = false;

      for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
        const coordI = hole[i];
        const coordJ = hole[j];
        if (!coordI || !coordJ) continue;

        const [xi, yi] = coordI;
        const [xj, yj] = coordJ;

        const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

        if (intersect) inHole = !inHole;
      }

      if (inHole) return false; // Point is in a hole
    }

    return true;
  }

  /**
   * Calculate a buffer zone around a polygon
   * Creates a new polygon that is buffered by the specified distance
   * @param polygon - Original GeoJSON polygon
   * @param bufferMeters - Buffer distance in meters
   * @returns Buffer zone result
   */
  calculateBufferZone(polygon: GeoJSONPolygon, bufferMeters: number): IBufferZoneResult {
    const errors: string[] = [];

    if (bufferMeters < 0) {
      errors.push('Buffer distance must be non-negative');
      return {
        originalPolygon: polygon,
        bufferedPolygon: polygon,
        bufferDistance: bufferMeters,
        areaIncrease: 0,
        isValid: false,
        errors,
      };
    }

    const originalArea = GeofenceBoundary.calculateArea(polygon);

    // Create buffered polygon using offset calculation
    const bufferedPolygon = this.offsetPolygon(polygon, bufferMeters);

    if (!bufferedPolygon) {
      errors.push('Failed to calculate buffered polygon');
      return {
        originalPolygon: polygon,
        bufferedPolygon: polygon,
        bufferDistance: bufferMeters,
        areaIncrease: 0,
        isValid: false,
        errors,
      };
    }

    const bufferedArea = GeofenceBoundary.calculateArea(bufferedPolygon);
    const areaIncrease = bufferedArea - originalArea;

    return {
      originalPolygon: polygon,
      bufferedPolygon,
      bufferDistance: bufferMeters,
      areaIncrease,
      isValid: true,
    };
  }

  /**
   * Offset a polygon by a specified distance (for buffer zone calculation)
   * @param polygon - Original polygon
   * @param offsetMeters - Offset distance in meters
   * @returns Offset polygon or null if failed
   */
  private offsetPolygon(polygon: GeoJSONPolygon, offsetMeters: number): GeoJSONPolygon | null {
    try {
      const offsetCoordinates: GeoJSONPosition[][] = [];

      for (let ringIndex = 0; ringIndex < polygon.coordinates.length; ringIndex++) {
        const ring = polygon.coordinates[ringIndex];
        if (!ring) continue;

        const offsetRing: GeoJSONPosition[] = [];

        for (let i = 0; i < ring.length - 1; i++) {
          const current = ring[i];
          const next = ring[i + 1];
          if (!current || !next) continue;

          // Calculate offset for each vertex
          const offsetPoint = this.calculateOffsetPoint(current, next, ring, i, offsetMeters);
          offsetRing.push(offsetPoint);
        }

        // Close the ring
        if (offsetRing.length > 0) {
          offsetRing.push([...offsetRing[0]]);
        }

        offsetCoordinates.push(offsetRing);
      }

      return {
        type: 'Polygon',
        coordinates: offsetCoordinates,
      };
    } catch {
      return null;
    }
  }

  /**
   * Calculate an offset point for polygon buffering
   * @param current - Current vertex
   * @param next - Next vertex
   * @param ring - Complete ring
   * @param index - Current vertex index
   * @param offsetMeters - Offset distance in meters
   * @returns Offset point
   */
  private calculateOffsetPoint(
    current: GeoJSONPosition,
    next: GeoJSONPosition,
    ring: GeoJSONPosition[],
    index: number,
    offsetMeters: number
  ): GeoJSONPosition {
    const [lon, lat] = current;

    // Get previous and next vertices
    const prev = ring[index > 0 ? index - 1 : ring.length - 2];
    if (!prev) return [lon, lat];

    // Calculate average latitude for meter conversion
    const avgLat = (lat + prev[1] + next[1]) / 3;
    const metersPerDegLat = 111320;
    const metersPerDegLon = 111320 * Math.cos((avgLat * Math.PI) / 180);

    // Calculate normal vectors
    const dx1 = lon - prev[0];
    const dy1 = lat - prev[1];
    const dx2 = next[0] - lon;
    const dy2 = next[1] - lat;

    // Calculate bisector direction
    const bisectorX = dx1 / Math.sqrt(dx1 * dx1 + dy1 * dy1) + dx2 / Math.sqrt(dx2 * dx2 + dy2 * dy2);
    const bisectorY = dy1 / Math.sqrt(dx1 * dx1 + dy1 * dy1) + dy2 / Math.sqrt(dx2 * dx2 + dy2 * dy2);

    const bisectorLength = Math.sqrt(bisectorX * bisectorX + bisectorY * bisectorY);
    if (bisectorLength === 0) return [lon, lat];

    // Normalize and scale
    const offsetLon = lon + (bisectorX / bisectorLength) * (offsetMeters / metersPerDegLon);
    const offsetLat = lat + (bisectorY / bisectorLength) * (offsetMeters / metersPerDegLat);

    return [offsetLon, offsetLat];
  }

  /**
   * Detect geofence breach for a guard
   * Compares current location with previous location to detect entry/exit
   * @param siteId - Site ID
   * @param geofence - Geofence boundary
   * @param guardId - Guard ID
   * @param currentLocation - Current GPS location
   * @returns Breach event if detected, null otherwise
   */
  detectGeofenceBreach(
    siteId: number,
    geofence: GeofenceBoundary,
    guardId: number,
    currentLocation: IGPSLocation
  ): IGeofenceBreachEvent | null {
    // Validate current location
    const validation = this.validateGPSLocation(currentLocation);
    if (!validation.isValid) {
      return null;
    }

    // Get previous location
    const previousLocation = this.guardLocations.get(guardId);

    // Update current location
    this.guardLocations.set(guardId, currentLocation);

    // If no previous location, can't detect breach
    if (!previousLocation) {
      return null;
    }

    // Check previous and current states
    const wasInside = geofence.contains(previousLocation);
    const isInside = geofence.contains(currentLocation);

    // Detect exit breach
    if (wasInside && !isInside) {
      return {
        siteId,
        guardId,
        breachType: 'exit',
        location: currentLocation,
        timestamp: new Date(),
        distanceToBoundary: geofence.distanceToBoundary(currentLocation),
        previousLocation,
      };
    }

    // Detect entry breach
    if (!wasInside && isInside) {
      return {
        siteId,
        guardId,
        breachType: 'entry',
        location: currentLocation,
        timestamp: new Date(),
        distanceToBoundary: geofence.distanceToBoundary(currentLocation),
        previousLocation,
      };
    }

    return null;
  }

  /**
   * Find the nearest point on a geofence boundary
   * @param geofence - Geofence boundary
   * @param lat - Latitude
   * @param lon - Longitude
   * @returns Nearest boundary point
   */
  findNearestBoundaryPoint(
    geofence: GeofenceBoundary,
    lat: number,
    lon: number
  ): { latitude: number; longitude: number } | undefined {
    const exteriorRing = geofence.polygon.coordinates[0];
    if (!exteriorRing || exteriorRing.length < 2) {
      return undefined;
    }

    let minDistance = Infinity;
    let nearestPoint: { latitude: number; longitude: number } | undefined;

    // Check vertices
    for (const coord of exteriorRing) {
      if (!coord) continue;
      const [coordLon, coordLat] = coord;
      const distance = this.calculateDistance(lat, lon, coordLat, coordLon);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = { latitude: coordLat, longitude: coordLon };
      }
    }

    return nearestPoint;
  }

  /**
   * Calculate distance from a point to the nearest edge of a polygon
   * @param lat - Latitude
   * @param lon - Longitude
   * @param polygon - GeoJSON polygon
   * @returns Distance in meters
   */
  calculateDistanceToPolygonEdge(lat: number, lon: number, polygon: GeoJSONPolygon): number {
    const exteriorRing = polygon.coordinates[0];
    if (!exteriorRing || exteriorRing.length < 2) {
      return 0;
    }

    let minDistance = Infinity;

    // Check vertices
    for (const coord of exteriorRing) {
      if (!coord) continue;
      const [coordLon, coordLat] = coord;
      const distance = this.calculateDistance(lat, lon, coordLat, coordLon);
      minDistance = Math.min(minDistance, distance);
    }

    // Check edges
    for (let i = 0; i < exteriorRing.length - 1; i++) {
      const coord1 = exteriorRing[i];
      const coord2 = exteriorRing[i + 1];
      if (!coord1 || !coord2) continue;

      const [lon1, lat1] = coord1;
      const [lon2, lat2] = coord2;
      const distance = this.pointToSegmentDistance(lat, lon, lat1, lon1, lat2, lon2);
      minDistance = Math.min(minDistance, distance);
    }

    return minDistance;
  }

  /**
   * Calculate distance from point to line segment
   * @param lat - Point latitude
   * @param lon - Point longitude
   * @param lat1 - Segment start latitude
   * @param lon1 - Segment start longitude
   * @param lat2 - Segment end latitude
   * @param lon2 - Segment end longitude
   * @returns Distance in meters
   */
  private pointToSegmentDistance(
    lat: number,
    lon: number,
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    // Use spherical geometry for point-to-segment distance
    const R = 6371e3; // Earth radius in meters

    const phi = (lat * Math.PI) / 180;
    const lambda = (lon * Math.PI) / 180;
    const phi1 = (lat1 * Math.PI) / 180;
    const lambda1 = (lon1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const lambda2 = (lon2 * Math.PI) / 180;

    // Convert to Cartesian coordinates on unit sphere
    const x = Math.cos(phi) * Math.cos(lambda);
    const y = Math.cos(phi) * Math.sin(lambda);
    const z = Math.sin(phi);

    const x1 = Math.cos(phi1) * Math.cos(lambda1);
    const y1 = Math.cos(phi1) * Math.sin(lambda1);
    const z1 = Math.sin(phi1);

    const x2 = Math.cos(phi2) * Math.cos(lambda2);
    const y2 = Math.cos(phi2) * Math.sin(lambda2);
    const z2 = Math.sin(phi2);

    // Segment vector
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;

    const segmentLengthSquared = dx * dx + dy * dy + dz * dz;

    // Project point onto line
    let t = 0;
    if (segmentLengthSquared > 0) {
      t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy + (z - z1) * dz) / segmentLengthSquared));
    }

    // Closest point on segment
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    const closestZ = z1 + t * dz;

    // Angle between point and closest point
    const dotProduct = x * closestX + y * closestY + z * closestZ;
    const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));

    return R * angle;
  }

  /**
   * Check if a polygon has self-intersections
   * @param polygon - GeoJSON polygon
   * @returns True if polygon has self-intersections
   */
  hasSelfIntersections(polygon: GeoJSONPolygon): boolean {
    return GeofenceBoundary.hasSelfIntersections(polygon.coordinates[0]);
  }

  /**
   * Calculate the area of a polygon
   * @param polygon - GeoJSON polygon
   * @returns Area in square meters
   */
  calculatePolygonArea(polygon: GeoJSONPolygon): number {
    return GeofenceBoundary.calculateArea(polygon);
  }

  /**
   * Calculate the perimeter of a polygon
   * @param polygon - GeoJSON polygon
   * @returns Perimeter in meters
   */
  calculatePolygonPerimeter(polygon: GeoJSONPolygon): number {
    return GeofenceBoundary.calculatePerimeter(polygon);
  }

  /**
   * Validate a GeoJSON polygon
   * @param polygon - GeoJSON polygon to validate
   * @returns Validation result
   */
  validatePolygon(polygon: GeoJSONPolygon): {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
    area?: number;
    perimeter?: number;
  } {
    return GeofenceBoundary.validate(polygon);
  }

  /**
   * Clear tracked guard locations (useful for testing or reset)
   */
  clearGuardLocations(): void {
    this.guardLocations.clear();
  }

  /**
   * Remove a specific guard's tracked location
   * @param guardId - Guard ID to remove
   */
  removeGuardLocation(guardId: number): void {
    this.guardLocations.delete(guardId);
  }

  /**
   * Get a guard's last known location
   * @param guardId - Guard ID
   * @returns Last known location or undefined
   */
  getGuardLocation(guardId: number): IGPSLocation | undefined {
    return this.guardLocations.get(guardId);
  }

  /**
   * Clear the calculation cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get the current configuration
   * @returns Current geofence configuration
   */
  getConfig(): IGeofenceConfig {
    return { ...this.config };
  }

  /**
   * Update the configuration
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<IGeofenceConfig>): void {
    Object.assign(this.config, config);
  }
}

/**
 * Service singleton instance
 */
let geofenceServiceInstance: GeofenceService | null = null;

/**
 * Initialize the GeofenceService singleton
 * @param config - Optional configuration
 * @returns GeofenceService instance
 */
export function initializeGeofenceService(config?: IGeofenceConfig): GeofenceService {
  if (!geofenceServiceInstance) {
    geofenceServiceInstance = new GeofenceService(config);
  }
  return geofenceServiceInstance;
}

/**
 * Get the GeofenceService singleton instance
 * @returns GeofenceService instance or throws if not initialized
 */
export function getGeofenceService(): GeofenceService {
  if (!geofenceServiceInstance) {
    throw new Error('GeofenceService not initialized. Call initializeGeofenceService first.');
  }
  return geofenceServiceInstance;
}
