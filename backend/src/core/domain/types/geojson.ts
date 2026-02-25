/**
 * GeoJSON Type Definitions
 *
 * Type definitions for GeoJSON geometries used throughout the system.
 * Follows the GeoJSON specification (RFC 7946).
 *
 * @module core/domain/types/geojson
 */

/**
 * GeoJSON Position
 * Array of numbers representing coordinates [longitude, latitude, altitude?]
 */
export type GeoJSONPosition = [number, number, number?];

/**
 * GeoJSON Bounding Box
 * Array of numbers representing the west, south, east, north bounds
 */
export type GeoJSONBBox = [number, number, number, number];

/**
 * GeoJSON Point Geometry
 * Represents a single position
 */
export interface GeoJSONPoint {
  type: 'Point';
  coordinates: GeoJSONPosition;
  bbox?: GeoJSONBBox;
}

/**
 * GeoJSON LinearRing
 * Closed line string with 4+ positions (first and last are equivalent)
 */
export type GeoJSONLinearRing = GeoJSONPosition[];

/**
 * GeoJSON Polygon Geometry
 * Represents a polygon with optional holes (inner rings)
 */
export interface GeoJSONPolygon {
  type: 'Polygon';
  coordinates: GeoJSONLinearRing[]; // First ring is exterior, subsequent are holes
  bbox?: GeoJSONBBox;
}

/**
 * GeoJSON MultiPoint Geometry
 * Represents multiple points
 */
export interface GeoJSONMultiPoint {
  type: 'MultiPoint';
  coordinates: GeoJSONPosition[];
  bbox?: GeoJSONBBox;
}

/**
 * GeoJSON LineString Geometry
 * Represents a line with two or more positions
 */
export interface GeoJSONLineString {
  type: 'LineString';
  coordinates: GeoJSONPosition[];
  bbox?: GeoJSONBBox;
}

/**
 * GeoJSON Feature
 * Represents a GeoJSON feature with geometry and properties
 */
export interface GeoJSONFeature<G extends GeoJSONGeometry = GeoJSONGeometry, P = Record<string, unknown>> {
  type: 'Feature';
  geometry: G;
  properties?: P;
  bbox?: GeoJSONBBox;
  id?: string | number;
}

/**
 * GeoJSON Geometry Union
 * Union type of all GeoJSON geometry types
 */
export type GeoJSONGeometry = GeoJSONPoint | GeoJSONPolygon | GeoJSONMultiPoint | GeoJSONLineString;

/**
 * GPS Location
 * Represents a GPS location with accuracy and timestamp
 */
export interface IGPSLocation {
  latitude: number;
  longitude: number;
  accuracy?: number; // meters
  altitude?: number; // meters
  altitudeAccuracy?: number; // meters
  speed?: number; // meters per second
  heading?: number; // degrees from north (0-359)
  timestamp: Date;
}

/**
 * GPS Validation Result
 * Result of GPS location validation
 */
export interface IGPSValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  accuracy?: number; // Actual accuracy in meters
}

/**
 * Distance Result
 * Result of distance calculation between two points
 */
export interface IDistanceResult {
  distance: number; // meters
  bearing: number; // degrees from north (0-359)
}
