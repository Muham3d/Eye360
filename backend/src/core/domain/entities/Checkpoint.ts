/**
 * Checkpoint Domain Entity
 *
 * Represents a verification point within a site where guards must check in.
 * Checkpoints can be verified via NFC, QR code, or GPS location.
 *
 * @module core/domain/entities
 */

import { GeoJSONPoint } from '../types/geojson.js';

/**
 * Verification Type Enum
 * Methods available for verifying checkpoint arrival
 */
export enum VerificationType {
  NFC = 'nfc',
  QR = 'qr',
  GPS = 'gps',
}

/**
 * Checkpoint Status Enum
 */
export enum CheckpointStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  REMOVED = 'removed',
}

/**
 * Checkpoint Domain Entity
 */
export interface ICheckpoint {
  id: number;
  siteId: number;
  name: string;
  description?: string;
  location: GeoJSONPoint;
  verificationType: VerificationType;
  nfcCode?: string;
  qrCode?: string;
  gpsTolerance: number; // meters
  orderIndex: number;
  status: CheckpointStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Checkpoint Creation DTO
 */
export interface ICreateCheckpointDTO {
  siteId: number;
  name: string;
  description?: string;
  location: GeoJSONPoint;
  verificationType: VerificationType;
  nfcCode?: string;
  qrCode?: string;
  gpsTolerance?: number;
  orderIndex?: number;
  status?: CheckpointStatus;
}

/**
 * Checkpoint Update DTO
 */
export interface IUpdateCheckpointDTO {
  name?: string;
  description?: string;
  location?: GeoJSONPoint;
  verificationType?: VerificationType;
  nfcCode?: string;
  qrCode?: string;
  gpsTolerance?: number;
  orderIndex?: number;
  status?: CheckpointStatus;
}

/**
 * Checkpoint Query Options
 */
export interface ICheckpointQueryOptions {
  siteId?: number;
  verificationType?: VerificationType;
  status?: CheckpointStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: 'id' | 'name' | 'orderIndex' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Checkpoint Verification Request
 * Data sent when verifying a checkpoint
 */
export interface ICheckpointVerificationRequest {
  checkpointId: number;
  patrolRunId: number;
  verificationType: VerificationType;
  location: GeoJSONPoint;
  gpsAccuracy?: number;
  photoEvidence?: string; // Base64 or URL
  verificationCode?: string; // NFC code or scanned QR content
  notes?: string;
  verifiedAt: Date;
}

/**
 * Checkpoint Verification Result
 * Result of a checkpoint verification attempt
 */
export interface ICheckpointVerificationResult {
  success: boolean;
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  distance?: number; // meters from actual checkpoint location
  accuracy?: number; // GPS accuracy in meters
}
