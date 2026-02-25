/**
 * ICheckpointRepository Interface
 *
 * Domain-level repository interface for Checkpoint operations.
 *
 * @module core/domain/repositories
 */

import {
  ICheckpoint,
  ICreateCheckpointDTO,
  IUpdateCheckpointDTO,
  ICheckpointQueryOptions,
  ICheckpointVerificationRequest,
  ICheckpointVerificationResult,
} from '../entities/Checkpoint.js';
import { IPaginatedResult } from './IUserRepository.js';

/**
 * ICheckpointRepository Interface
 * Defines all checkpoint-related data operations
 */
export interface ICheckpointRepository {
  /**
   * Find a checkpoint by ID
   * @param id - Checkpoint ID
   * @param options - Query options
   * @returns Checkpoint or null if not found
   */
  findById(id: number, options?: Partial<ICheckpointQueryOptions>): Promise<ICheckpoint | null>;

  /**
   * Find a checkpoint by NFC code
   * @param nfcCode - NFC code
   * @param options - Query options
   * @returns Checkpoint or null if not found
   */
  findByNfcCode(nfcCode: string, options?: Partial<ICheckpointQueryOptions>): Promise<ICheckpoint | null>;

  /**
   * Find a checkpoint by QR code
   * @param qrCode - QR code
   * @param options - Query options
   * @returns Checkpoint or null if not found
   */
  findByQrCode(qrCode: string, options?: Partial<ICheckpointQueryOptions>): Promise<ICheckpoint | null>;

  /**
   * Get all checkpoints with filtering and pagination
   * @param options - Query options
   * @returns Paginated list of checkpoints
   */
  findAll(options?: ICheckpointQueryOptions): Promise<IPaginatedResult<ICheckpoint>>;

  /**
   * Get all checkpoints for a site
   * @param siteId - Site ID
   * @param options - Query options
   * @returns Paginated list of checkpoints
   */
  findBySiteId(siteId: number, options?: Partial<ICheckpointQueryOptions>): Promise<IPaginatedResult<ICheckpoint>>;

  /**
   * Create a new checkpoint
   * @param checkpointData - Checkpoint creation data
   * @returns Created checkpoint
   */
  create(checkpointData: ICreateCheckpointDTO): Promise<ICheckpoint>;

  /**
   * Update an existing checkpoint
   * @param id - Checkpoint ID
   * @param checkpointData - Checkpoint update data
   * @returns Updated checkpoint or null if not found
   */
  update(id: number, checkpointData: IUpdateCheckpointDTO): Promise<ICheckpoint | null>;

  /**
   * Delete a checkpoint
   * @param id - Checkpoint ID
   * @returns True if deleted, false if not found
   */
  delete(id: number): Promise<boolean>;

  /**
   * Verify a checkpoint check-in
   * @param request - Verification request data
   * @returns Verification result
   */
  verifyCheckpoint(request: ICheckpointVerificationRequest): Promise<ICheckpointVerificationResult>;

  /**
   * Check if NFC code already exists
   * @param nfcCode - NFC code
   * @param excludeCheckpointId - Checkpoint ID to exclude (for updates)
   * @returns True if code exists
   */
  nfcCodeExists(nfcCode: string, excludeCheckpointId?: number): Promise<boolean>;

  /**
   * Check if QR code already exists
   * @param qrCode - QR code
   * @param excludeCheckpointId - Checkpoint ID to exclude (for updates)
   * @returns True if code exists
   */
  qrCodeExists(qrCode: string, excludeCheckpointId?: number): Promise<boolean>;

  /**
   * Get checkpoints by verification type
   * @param verificationType - Verification type (NFC, QR, GPS)
   * @param options - Query options
   * @returns List of checkpoints
   */
  findByVerificationType(
    verificationType: string,
    options?: Partial<ICheckpointQueryOptions>
  ): Promise<ICheckpoint[]>;

  /**
   * Get active checkpoints for a site
   * @param siteId - Site ID
   * @param options - Query options
   * @returns List of active checkpoints
   */
  findActiveBySiteId(siteId: number, options?: Partial<ICheckpointQueryOptions>): Promise<ICheckpoint[]>;

  /**
   * Reorder checkpoints within a site
   * @param siteId - Site ID
   * @param checkpointOrders - Array of {id, orderIndex}
   * @returns True if reordered successfully
   */
  reorderCheckpoints(siteId: number, checkpointOrders: Array<{ id: number; orderIndex: number }>): Promise<boolean>;

  /**
   * Generate a unique QR code for a checkpoint
   * @param checkpointId - Checkpoint ID
   * @returns Generated QR code
   */
  generateQrCode(checkpointId: number): Promise<string>;

  /**
   * Generate a unique NFC code for a checkpoint
   * @param checkpointId - Checkpoint ID
   * @returns Generated NFC code
   */
  generateNfcCode(checkpointId: number): Promise<string>;

  /**
   * Get checkpoint count by site
   * @param siteId - Site ID
   * @param status - Optional status filter
   * @returns Count of checkpoints
   */
  countBySite(siteId: number, status?: string): Promise<number>;

  /**
   * Bulk update checkpoint order indexes
   * @param updates - Array of {id, orderIndex}
   * @returns True if updated successfully
   */
  bulkUpdateOrderIndex(updates: Array<{ id: number; orderIndex: number }>): Promise<boolean>;
}

/**
 * ICheckpointRepositoryErrorCode
 * Error codes for repository operations
 */
export enum CheckpointRepositoryErrorCode {
  CHECKPOINT_NOT_FOUND = 'CHECKPOINT_NOT_FOUND',
  NFC_CODE_ALREADY_EXISTS = 'NFC_CODE_ALREADY_EXISTS',
  QR_CODE_ALREADY_EXISTS = 'QR_CODE_ALREADY_EXISTS',
  INVALID_VERIFICATION_TYPE = 'INVALID_VERIFICATION_TYPE',
  VERIFICATION_FAILED = 'VERIFICATION_FAILED',
  OUTSIDE_GPS_TOLERANCE = 'OUTSIDE_GPS_TOLERANCE',
  INVALID_GPS_LOCATION = 'INVALID_GPS_LOCATION',
  PHOTO_REQUIRED = 'PHOTO_REQUIRED',
  CANNOT_DELETE_CHECKPOINT_IN_TEMPLATE = 'CANNOT_DELETE_CHECKPOINT_IN_TEMPLATE',
}

/**
 * CheckpointRepositoryError
 * Custom error class for repository operations
 */
export class CheckpointRepositoryError extends Error {
  public readonly code: CheckpointRepositoryErrorCode;
  public readonly details?: unknown;

  constructor(code: CheckpointRepositoryErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'CheckpointRepositoryError';
    this.code = code;
    this.details = details;
  }
}
