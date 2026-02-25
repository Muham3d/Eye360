/**
 * GeofenceBoundary Value Object
 *
 * Immutable value object representing a geofence boundary with validation.
 *
 * @module core/domain/value-objects
 */

import { GeoJSONPolygon, IGPSLocation } from '../types/geojson.js';

/**
 * Geofence Validation Constants
 */
export const GEOFENCE_CONSTANTS = {
  MIN_AREA_METERS: 100, // Minimum area for a valid geofence (100 m²)
  MAX_AREA_METERS: 10000000, // Maximum area for a valid geofence (10 km²)
  MIN_COORDINATES: 4, // Minimum coordinates in a polygon (closed ring)
  MAX_COORDINATES: 1000, // Maximum coordinates in a polygon
  MIN_HOLE_COORDINATES: 4, // Minimum coordinates in a hole
  DEFAULT_BUFFER_METERS: 50, // Default buffer distance
} as const;

/**
 * GeofenceBoundary Value Object
 * Immutable class representing a validated geofence boundary
 */
export class GeofenceBoundary {
  readonly polygon: GeoJSONPolygon;
  readonly buffer: number; // meters

  private constructor(polygon: GeoJSONPolygon, buffer: number) {
    this.polygon = polygon;
    this.buffer = buffer;

    // Deep freeze to make immutable
    Object.freeze(this);
    Object.freeze(this.polygon);
    this.polygon.coordinates.forEach(ring => Object.freeze(ring));
  }

  /**
   * Create a new GeofenceBoundary after validation
   * @param polygon - GeoJSON polygon
   * @param buffer - Buffer distance in meters
   * @returns GeofenceBoundary instance
   * @throws Error if validation fails
   */
  static create(polygon: GeoJSONPolygon, buffer: number = GEOFENCE_CONSTANTS.DEFAULT_BUFFER_METERS): GeofenceBoundary {
    const validation = GeofenceBoundary.validate(polygon);
    if (!validation.isValid) {
      throw new Error(`Invalid geofence boundary: ${validation.errors?.join(', ')}`);
    }
    return new GeofenceBoundary(polygon, buffer);
  }

  /**
   * Create a GeofenceBoundary without validation (use with trusted data)
   * @param polygon - GeoJSON polygon
   * @param buffer - Buffer distance in meters
   * @returns GeofenceBoundary instance
   */
  static createUnsafe(polygon: GeoJSONPolygon, buffer: number = GEOFENCE_CONSTANTS.DEFAULT_BUFFER_METERS): GeofenceBoundary {
    return new GeofenceBoundary(polygon, buffer);
  }

  /**
   * Validate a GeoJSON polygon
   * @param polygon - GeoJSON polygon to validate
   * @returns Validation result
   */
  static validate(polygon: GeoJSONPolygon): {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
    area?: number;
    perimeter?: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check polygon structure
    if (!polygon || polygon.type !== 'Polygon') {
      errors.push('Must be a GeoJSON Polygon');
      return { isValid: false, errors };
    }

    if (!Array.isArray(polygon.coordinates) || polygon.coordinates.length === 0) {
      errors.push('Polygon must have at least one ring');
      return { isValid: false, errors };
    }

    // Validate exterior ring
    const exteriorRing = polygon.coordinates[0];
    if (!exteriorRing || !Array.isArray(exteriorRing) || exteriorRing.length < GEOFENCE_CONSTANTS.MIN_COORDINATES) {
      errors.push(`Exterior ring must have at least ${GEOFENCE_CONSTANTS.MIN_COORDINATES} coordinates`);
    } else {
      if (exteriorRing.length > GEOFENCE_CONSTANTS.MAX_COORDINATES) {
        warnings.push(`Exterior ring has many coordinates (${exteriorRing.length}), may impact performance`);
      }

      // Check if exterior ring is closed (first = last)
      const first = exteriorRing[0];
      const last = exteriorRing[exteriorRing.length - 1];
      if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
        errors.push('Exterior ring must be closed (first coordinate must equal last)');
      }

      // Validate exterior ring coordinates
      for (let i = 0; i < exteriorRing.length; i++) {
        const coord = exteriorRing[i];
        if (!Array.isArray(coord) || coord.length < 2) {
          errors.push(`Invalid coordinate at index ${i} in exterior ring`);
        } else {
          const [lon, lat] = coord;
          if (typeof lon !== 'number' || typeof lat !== 'number') {
            errors.push(`Coordinate at index ${i} must have numeric values`);
          } else if (lon < -180 || lon > 180 || lat < -90 || lat > 90) {
            errors.push(`Coordinate at index ${i} is out of valid range`);
          }
        }
      }
    }

    // Validate holes (inner rings)
    for (let i = 1; i < polygon.coordinates.length; i++) {
      const hole = polygon.coordinates[i];
      if (!hole || !Array.isArray(hole) || hole.length < GEOFENCE_CONSTANTS.MIN_HOLE_COORDINATES) {
        errors.push(`Hole at index ${i} must have at least ${GEOFENCE_CONSTANTS.MIN_HOLE_COORDINATES} coordinates`);
      } else {
        // Check if hole is closed
        const holeFirst = hole[0];
        const holeLast = hole[hole.length - 1];
        if (holeFirst && holeLast && (holeFirst[0] !== holeLast[0] || holeFirst[1] !== holeLast[1])) {
          errors.push(`Hole at index ${i} must be closed`);
        }
      }
    }

    // Calculate area and perimeter
    let area = 0;
    let perimeter = 0;

    try {
      area = GeofenceBoundary.calculateArea(polygon);
      perimeter = GeofenceBoundary.calculatePerimeter(polygon);
    } catch (e) {
      // Calculation failed, likely due to invalid polygon
    }

    // Check area constraints
    if (area < GEOFENCE_CONSTANTS.MIN_AREA_METERS) {
      errors.push(`Geofence area too small (${area.toFixed(1)} m² < ${GEOFENCE_CONSTANTS.MIN_AREA_METERS} m²)`);
    }

    if (area > GEOFENCE_CONSTANTS.MAX_AREA_METERS) {
      errors.push(`Geofence area too large (${area.toFixed(1)} m² > ${GEOFENCE_CONSTANTS.MAX_AREA_METERS} m²)`);
    }

    // Check for self-intersection (basic check)
    if (exteriorRing && GeofenceBoundary.hasSelfIntersections(exteriorRing)) {
      errors.push('Exterior ring has self-intersections');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      area,
      perimeter,
    };
  }

  /**
   * Calculate the area of a polygon using the shoelace formula
   * Returns area in square meters (approximate)
   */
  static calculateArea(polygon: GeoJSONPolygon): number {
    const exteriorRing = polygon.coordinates[0];
    if (!exteriorRing || exteriorRing.length < 4) {
      return 0;
    }

    // Calculate area using shoelace formula
    let area = 0;
    for (let i = 0; i < exteriorRing.length - 1; i++) {
      const coord1 = exteriorRing[i];
      const coord2 = exteriorRing[i + 1];
      if (coord1 && coord2) {
        const [x1, y1] = coord1;
        const [x2, y2] = coord2;
        area += x1 * y2 - x2 * y1;
      }
    }

    area = Math.abs(area) / 2;

    // Convert from degrees to square meters (approximate)
    // This is a rough conversion; for accurate results, use a proper geodetic library
    const avgLat = exteriorRing.reduce((sum, coord) => sum + (coord?.[1] || 0), 0) / exteriorRing.length;
    const metersPerDegree = 111320 * Math.cos((avgLat * Math.PI) / 180);
    const areaMeters = area * metersPerDegree * 110540; // 110540 is approx meters per degree of latitude

    return Math.abs(areaMeters);
  }

  /**
   * Calculate the perimeter of a polygon
   * Returns perimeter in meters (approximate)
   */
  static calculatePerimeter(polygon: GeoJSONPolygon): number {
    const exteriorRing = polygon.coordinates[0];
    if (!exteriorRing || exteriorRing.length < 2) {
      return 0;
    }

    let perimeter = 0;

    for (let i = 0; i < exteriorRing.length - 1; i++) {
      const coord1 = exteriorRing[i];
      const coord2 = exteriorRing[i + 1];
      if (!coord1 || !coord2) continue;

      const [lon1, lat1] = coord1;
      const [lon2, lat2] = coord2;

      // Haversine formula for distance
      const R = 6371e3; // Earth radius in meters
      const phi1 = (lat1 * Math.PI) / 180;
      const phi2 = (lat2 * Math.PI) / 180;
      const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
      const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      perimeter += R * c;
    }

    return perimeter;
  }

  /**
   * Basic check for self-intersections in a ring
   * This is a simplified check; for production use a proper geometry library
   */
  static hasSelfIntersections(ring: Array<[number, number] | [number, number, number?]>): boolean {
    if (!ring || ring.length < 4) {
      return false;
    }

    const edges: Array<[[number, number], [number, number]]> = [];

    // Create edges
    for (let i = 0; i < ring.length - 1; i++) {
      const p1 = ring[i];
      const p2 = ring[i + 1];
      if (p1 && p2 && p1.length >= 2 && p2.length >= 2) {
        edges.push([[p1[0], p1[1]], [p2[0], p2[1]]]);
      }
    }

    // Check each pair of edges
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 2; j < edges.length; j++) {
        // Skip adjacent edges
        if (i === 0 && j === edges.length - 1) continue;

        const edge1 = edges[i];
        const edge2 = edges[j];
        if (edge1 && edge2 && GeofenceBoundary.edgesIntersect(edge1[0], edge1[1], edge2[0], edge2[1])) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if two line segments intersect
   */
  static edgesIntersect(
    p1: [number, number],
    p2: [number, number],
    p3: [number, number],
    p4: [number, number]
  ): boolean {
    const ccw = (a: [number, number], b: [number, number], c: [number, number]) => {
      return (c[1] - a[1]) * (b[0] - a[0]) > (b[1] - a[1]) * (c[0] - a[0]);
    };

    return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
  }

  /**
   * Check if a point is inside the geofence (including buffer)
   * Uses ray casting algorithm
   * @param location - GPS location to check
   * @returns True if point is inside (including buffer zone)
   */
  contains(location: IGPSLocation): boolean {
    return this.isPointInPolygon(location.latitude, location.longitude);
  }

  /**
   * Check if a point is inside the polygon (excluding buffer)
   * @param lat - Latitude
   * @param lon - Longitude
   * @returns True if point is inside
   */
  isPointInPolygon(lat: number, lon: number): boolean {
    const exteriorRing = this.polygon.coordinates[0];
    if (!exteriorRing || exteriorRing.length < 4) {
      return false;
    }

    // Ray casting algorithm
    let inside = false;
    for (let i = 0, j = exteriorRing.length - 1; i < exteriorRing.length; j = i++) {
      const coordI = exteriorRing[i];
      const coordJ = exteriorRing[j];
      if (!coordI || !coordJ) continue;

      const [xi, yi] = coordI;
      const [xj, yj] = coordJ;

      const intersect = yi > lat !== yj > lat &&
        lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }

    // If outside exterior ring, not inside
    if (!inside) return false;

    // Check holes (inner rings) - point must NOT be inside any hole
    for (let h = 1; h < this.polygon.coordinates.length; h++) {
      const hole = this.polygon.coordinates[h];
      if (!hole || hole.length < 4) continue;

      let inHole = false;

      for (let i = 0, j = hole.length - 1; i < hole.length; j = i++) {
        const coordI = hole[i];
        const coordJ = hole[j];
        if (!coordI || !coordJ) continue;

        const [xi, yi] = coordI;
        const [xj, yj] = coordJ;

        const intersect = yi > lat !== yj > lat &&
          lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

        if (intersect) inHole = !inHole;
      }

      if (inHole) return false; // Point is in a hole, so not in polygon
    }

    return true;
  }

  /**
   * Calculate the distance from a point to the geofence boundary
   * @param location - GPS location
   * @returns Distance in meters (negative if inside, positive if outside)
   */
  distanceToBoundary(location: IGPSLocation): number {
    const exteriorRing = this.polygon.coordinates[0];
    if (!exteriorRing || exteriorRing.length < 2) {
      return 0;
    }

    if (this.contains(location)) {
      // Point is inside, find minimum distance to any edge
      let minDistance = Infinity;

      for (let i = 0; i < exteriorRing.length - 1; i++) {
        const coord1 = exteriorRing[i];
        const coord2 = exteriorRing[i + 1];
        if (!coord1 || !coord2) continue;

        const [lon1, lat1] = coord1;
        const [lon2, lat2] = coord2;
        const distance = this.pointToSegmentDistance(
          location.latitude,
          location.longitude,
          lat1,
          lon1,
          lat2,
          lon2
        );
        minDistance = Math.min(minDistance, distance);
      }

      return -minDistance; // Negative for inside
    } else {
      // Point is outside, find minimum distance to any edge or vertex
      let minDistance = Infinity;

      // Check vertices
      for (const coord of exteriorRing) {
        if (!coord) continue;
        const [lon, lat] = coord;
        const distance = this.haversineDistance(location.latitude, location.longitude, lat, lon);
        minDistance = Math.min(minDistance, distance);
      }

      // Check edges
      for (let i = 0; i < exteriorRing.length - 1; i++) {
        const coord1 = exteriorRing[i];
        const coord2 = exteriorRing[i + 1];
        if (!coord1 || !coord2) continue;

        const [lon1, lat1] = coord1;
        const [lon2, lat2] = coord2;
        const distance = this.pointToSegmentDistance(
          location.latitude,
          location.longitude,
          lat1,
          lon1,
          lat2,
          lon2
        );
        minDistance = Math.min(minDistance, distance);
      }

      return minDistance; // Positive for outside
    }
  }

  /**
   * Calculate distance from point to line segment
   */
  private pointToSegmentDistance(
    lat: number,
    lon: number,
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth radius in meters

    // Convert to radians
    const phi = (lat * Math.PI) / 180;
    const lambda = (lon * Math.PI) / 180;
    const phi1 = (lat1 * Math.PI) / 180;
    const lambda1 = (lon1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const lambda2 = (lon2 * Math.PI) / 180;

    // Vector calculations on unit sphere
    const x = Math.cos(phi) * Math.cos(lambda);
    const y = Math.cos(phi) * Math.sin(lambda);
    const z = Math.sin(phi);

    const x1 = Math.cos(phi1) * Math.cos(lambda1);
    const y1 = Math.cos(phi1) * Math.sin(lambda1);
    const z1 = Math.sin(phi1);

    const x2 = Math.cos(phi2) * Math.cos(lambda2);
    const y2 = Math.cos(phi2) * Math.sin(lambda2);
    const z2 = Math.sin(phi2);

    // Project point onto line
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;

    const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy + (z - z1) * dz) / (dx * dx + dy * dy + dz * dz)));

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
   * Haversine distance between two points
   */
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if a location is within the buffer zone of the geofence
   * @param location - GPS location
   * @returns True if within buffer (inside or near boundary)
   */
  isWithinBuffer(location: IGPSLocation): boolean {
    const distance = Math.abs(this.distanceToBoundary(location));
    return distance <= this.buffer;
  }

  /**
   * Convert to plain object
   * @returns Plain object representation
   */
  toJSON(): { polygon: GeoJSONPolygon; buffer: number } {
    return {
      polygon: this.polygon,
      buffer: this.buffer,
    };
  }
}
