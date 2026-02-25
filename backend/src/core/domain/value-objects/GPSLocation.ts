/**
 * GPSLocation Value Object
 *
 * Immutable value object representing a GPS location with validation.
 *
 * @module core/domain/value-objects
 */

import { IGPSLocation, IGPSValidationResult } from '../types/geojson.js';

/**
 * GPS Validation Constants
 */
export const GPS_CONSTANTS = {
  MAX_ACCURACY_METERS: 20, // Reject locations with accuracy > 20 meters
  MAX_SPEED_MS: 50, // Max 50 m/s (~180 km/h) - reject if moving too fast
  MAX_ALTITUDE_METERS: 9000, // Max altitude (Mount Everest is ~8849m)
  MIN_ALTITUDE_METERS: -500, // Dead Sea is ~-430m
  MAX_FUTURE_SECONDS: 5, // Reject timestamps more than 5 seconds in the future
  MAX_STALE_SECONDS: 300, // Reject timestamps more than 5 minutes old
  MIN_LATITUDE: -90,
  MAX_LATITUDE: 90,
  MIN_LONGITUDE: -180,
  MAX_LONGITUDE: 180,
} as const;

/**
 * GPSLocation Value Object
 * Immutable class representing a validated GPS location
 */
export class GPSLocation implements IGPSLocation {
  readonly latitude: number;
  readonly longitude: number;
  readonly accuracy?: number;
  readonly altitude?: number;
  readonly altitudeAccuracy?: number;
  readonly speed?: number;
  readonly heading?: number;
  readonly timestamp: Date;

  private constructor(data: IGPSLocation) {
    this.latitude = data.latitude;
    this.longitude = data.longitude;
    this.accuracy = data.accuracy;
    this.altitude = data.altitude;
    this.altitudeAccuracy = data.altitudeAccuracy;
    this.speed = data.speed;
    this.heading = data.heading;
    this.timestamp = new Date(data.timestamp);

    // Freeze to make immutable
    Object.freeze(this);
  }

  /**
   * Create a new GPSLocation after validation
   * @param data - Raw GPS location data
   * @returns GPSLocation instance
   * @throws Error if validation fails
   */
  static create(data: IGPSLocation): GPSLocation {
    const validation = GPSLocation.validate(data);
    if (!validation.isValid) {
      throw new Error(`Invalid GPS location: ${validation.errors?.join(', ')}`);
    }
    return new GPSLocation(data);
  }

  /**
   * Create a GPSLocation without validation (use with trusted data)
   * @param data - Raw GPS location data
   * @returns GPSLocation instance
   */
  static createUnsafe(data: IGPSLocation): GPSLocation {
    return new GPSLocation(data);
  }

  /**
   * Validate GPS location data
   * @param data - GPS location data to validate
   * @returns Validation result
   */
  static validate(data: IGPSLocation): IGPSValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate latitude
    if (typeof data.latitude !== 'number' || isNaN(data.latitude)) {
      errors.push('Latitude must be a valid number');
    } else if (data.latitude < GPS_CONSTANTS.MIN_LATITUDE || data.latitude > GPS_CONSTANTS.MAX_LATITUDE) {
      errors.push(`Latitude must be between ${GPS_CONSTANTS.MIN_LATITUDE} and ${GPS_CONSTANTS.MAX_LATITUDE}`);
    }

    // Validate longitude
    if (typeof data.longitude !== 'number' || isNaN(data.longitude)) {
      errors.push('Longitude must be a valid number');
    } else if (data.longitude < GPS_CONSTANTS.MIN_LONGITUDE || data.longitude > GPS_CONSTANTS.MAX_LONGITUDE) {
      errors.push(`Longitude must be between ${GPS_CONSTANTS.MIN_LONGITUDE} and ${GPS_CONSTANTS.MAX_LONGITUDE}`);
    }

    // Validate timestamp
    const now = Date.now();
    const timestampTime = new Date(data.timestamp).getTime();
    const ageSeconds = (now - timestampTime) / 1000;

    if (isNaN(timestampTime)) {
      errors.push('Timestamp must be a valid date');
    } else if (ageSeconds < -GPS_CONSTANTS.MAX_FUTURE_SECONDS) {
      errors.push(`Timestamp is too far in the future (${Math.abs(ageSeconds).toFixed(1)}s)`);
    } else if (ageSeconds > GPS_CONSTANTS.MAX_STALE_SECONDS) {
      warnings.push(`Timestamp is stale (${ageSeconds.toFixed(1)}s old)`);
    }

    // Validate accuracy
    if (data.accuracy !== undefined) {
      if (typeof data.accuracy !== 'number' || data.accuracy < 0) {
        errors.push('Accuracy must be a non-negative number');
      } else if (data.accuracy > GPS_CONSTANTS.MAX_ACCURACY_METERS) {
        errors.push(`GPS accuracy too low (${data.accuracy.toFixed(1)}m > ${GPS_CONSTANTS.MAX_ACCURACY_METERS}m)`);
      }
    }

    // Validate altitude
    if (data.altitude !== undefined) {
      if (typeof data.altitude !== 'number' || isNaN(data.altitude)) {
        errors.push('Altitude must be a valid number');
      } else if (data.altitude < GPS_CONSTANTS.MIN_ALTITUDE_METERS || data.altitude > GPS_CONSTANTS.MAX_ALTITUDE_METERS) {
        warnings.push(`Altitude outside expected range (${data.altitude}m)`);
      }
    }

    // Validate speed
    if (data.speed !== undefined) {
      if (typeof data.speed !== 'number' || data.speed < 0) {
        errors.push('Speed must be a non-negative number');
      } else if (data.speed > GPS_CONSTANTS.MAX_SPEED_MS) {
        errors.push(`Speed too high (${data.speed.toFixed(1)}m/s > ${GPS_CONSTANTS.MAX_SPEED_MS}m/s)`);
      }
    }

    // Validate heading
    if (data.heading !== undefined) {
      if (typeof data.heading !== 'number' || data.heading < 0 || data.heading >= 360) {
        errors.push('Heading must be between 0 and 359 degrees');
      }
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      accuracy: data.accuracy,
    };
  }

  /**
   * Calculate distance to another GPS location using Haversine formula
   * @param other - Other GPS location
   * @returns Distance in meters
   */
  distanceTo(other: IGPSLocation): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (this.latitude * Math.PI) / 180;
    const phi2 = (other.latitude * Math.PI) / 180;
    const deltaPhi = ((other.latitude - this.latitude) * Math.PI) / 180;
    const deltaLambda = ((other.longitude - this.longitude) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate bearing to another GPS location
   * @param other - Other GPS location
   * @returns Bearing in degrees (0-359, where 0 is North)
   */
  bearingTo(other: IGPSLocation): number {
    const phi1 = (this.latitude * Math.PI) / 180;
    const phi2 = (other.latitude * Math.PI) / 180;
    const deltaLambda = ((other.longitude - this.longitude) * Math.PI) / 180;

    const y = Math.sin(deltaLambda) * Math.cos(phi2);
    const x =
      Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
  }

  /**
   * Check if this location is within a certain distance of another
   * @param other - Other GPS location
   * @param maxDistance - Maximum distance in meters
   * @returns True if within distance
   */
  isWithinDistanceOf(other: IGPSLocation, maxDistance: number): boolean {
    return this.distanceTo(other) <= maxDistance;
  }

  /**
   * Convert to GeoJSON Point format
   * @returns GeoJSON Point
   */
  toGeoJSON(): { type: 'Point'; coordinates: [number, number] } {
    return {
      type: 'Point',
      coordinates: [this.longitude, this.latitude],
    };
  }

  /**
   * Convert to plain object
   * @returns Plain object representation
   */
  toJSON(): IGPSLocation {
    return {
      latitude: this.latitude,
      longitude: this.longitude,
      accuracy: this.accuracy,
      altitude: this.altitude,
      altitudeAccuracy: this.altitudeAccuracy,
      speed: this.speed,
      heading: this.heading,
      timestamp: new Date(this.timestamp),
    };
  }

  /**
   * Check if two GPS locations are approximately equal
   * @param other - Other GPS location
   * @param tolerance - Tolerance in meters (default: 1 meter)
   * @returns True if approximately equal
   */
  equals(other: IGPSLocation, tolerance: number = 1): boolean {
    return this.isWithinDistanceOf(other, tolerance);
  }
}

/**
 * GPSAccuracy Value Object
 * Represents GPS accuracy level
 */
export class GPSAccuracy {
  readonly value: number; // meters
  readonly level: 'excellent' | 'good' | 'fair' | 'poor';

  private constructor(value: number) {
    this.value = value;
    this.level = this.classifyLevel(value);
    Object.freeze(this);
  }

  private classifyLevel(accuracy: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (accuracy <= 5) return 'excellent';
    if (accuracy <= 10) return 'good';
    if (accuracy <= 15) return 'fair';
    return 'poor';
  }

  static create(value: number): GPSAccuracy {
    if (value < 0) {
      throw new Error('Accuracy must be non-negative');
    }
    return new GPSAccuracy(value);
  }

  isAcceptable(): boolean {
    return this.value <= GPS_CONSTANTS.MAX_ACCURACY_METERS;
  }
}
