/**
 * IPatrolTemplateRepository Interface
 *
 * Domain-level repository interface for Patrol Template operations.
 *
 * @module core/domain/repositories
 */

import {
  IPatrolTemplate,
  IPatrolTemplateDetail,
  ICreatePatrolTemplateDTO,
  IUpdatePatrolTemplateDTO,
  IPatrolTemplateQueryOptions,
} from '../entities/PatrolTemplate.js';
import { IBulkCreatePatrolCheckpointsDTO } from '../entities/PatrolCheckpoint.js';
import { IPaginatedResult } from './IUserRepository.js';

/**
 * IPatrolTemplateRepository Interface
 * Defines all patrol template-related data operations
 */
export interface IPatrolTemplateRepository {
  /**
   * Find a template by ID
   * @param id - Template ID
   * @param options - Query options
   * @returns Template or null if not found
   */
  findById(id: number, options?: Partial<IPatrolTemplateQueryOptions>): Promise<IPatrolTemplate | null>;

  /**
   * Find a template by ID with checkpoints
   * @param id - Template ID
   * @param options - Query options
   * @returns Template detail or null if not found
   */
  findByIdWithDetail(id: number, options?: Partial<IPatrolTemplateQueryOptions>): Promise<IPatrolTemplateDetail | null>;

  /**
   * Get all templates with filtering and pagination
   * @param options - Query options
   * @returns Paginated list of templates
   */
  findAll(options?: IPatrolTemplateQueryOptions): Promise<IPaginatedResult<IPatrolTemplate>>;

  /**
   * Get all templates for a site
   * @param siteId - Site ID
   * @param options - Query options
   * @returns Paginated list of templates
   */
  findBySiteId(siteId: number, options?: Partial<IPatrolTemplateQueryOptions>): Promise<IPaginatedResult<IPatrolTemplate>>;

  /**
   * Get active templates for a site
   * @param siteId - Site ID
   * @param options - Query options
   * @returns List of active templates
   */
  findActiveBySiteId(siteId: number, options?: Partial<IPatrolTemplateQueryOptions>): Promise<IPatrolTemplate[]>;

  /**
   * Create a new template
   * @param templateData - Template creation data
   * @returns Created template
   */
  create(templateData: ICreatePatrolTemplateDTO): Promise<IPatrolTemplate>;

  /**
   * Create a new template with checkpoints
   * @param templateData - Template creation data
   * @param checkpointsData - Checkpoints data
   * @returns Created template detail
   */
  createWithCheckpoints(
    templateData: ICreatePatrolTemplateDTO,
    checkpointsData: IBulkCreatePatrolCheckpointsDTO
  ): Promise<IPatrolTemplateDetail>;

  /**
   * Update an existing template
   * @param id - Template ID
   * @param templateData - Template update data
   * @returns Updated template or null if not found
   */
  update(id: number, templateData: IUpdatePatrolTemplateDTO): Promise<IPatrolTemplate | null>;

  /**
   * Delete a template
   * @param id - Template ID
   * @returns True if deleted, false if not found
   */
  delete(id: number): Promise<boolean>;

  /**
   * Archive a template
   * @param id - Template ID
   * @returns True if archived
   */
  archive(id: number): Promise<boolean>;

  /**
   * Duplicate a template
   * @param id - Template ID to duplicate
   * @param newName - Name for the duplicated template
   * @param createdById - User ID creating the duplicate
   * @returns Duplicated template
   */
  duplicate(id: number, newName: string, createdById: number): Promise<IPatrolTemplateDetail>;

  /**
   * Check if template name exists for a site
   * @param siteId - Site ID
   * @param name - Template name
   * @param excludeTemplateId - Template ID to exclude (for updates)
   * @returns True if name exists
   */
  nameExists(siteId: number, name: string, excludeTemplateId?: number): Promise<boolean>;

  /**
   * Get template count by site
   * @param siteId - Site ID
   * @param status - Optional status filter
   * @returns Count of templates
   */
  countBySite(siteId: number, status?: string): Promise<number>;

  /**
   * Get templates by required role level
   * @param requiredRole - Required role level
   * @param options - Query options
   * @returns List of templates
   */
  findByRequiredRole(
    requiredRole: string,
    options?: Partial<IPatrolTemplateQueryOptions>
  ): Promise<IPatrolTemplate[]>;

  /**
   * Add checkpoint to template
   * @param templateId - Template ID
   * @param checkpointData - Checkpoint data
   * @returns Created checkpoint
   */
  addCheckpoint(templateId: number, checkpointData: {
    checkpointId: number;
    sequenceOrder: number;
    requiredPhoto?: boolean;
    timeWindowStart?: string;
    timeWindowEnd?: string;
    pointsValue?: number;
  }): Promise<IPatrolTemplateDetail>;

  /**
   * Remove checkpoint from template
   * @param templateId - Template ID
   * @param checkpointId - Checkpoint ID to remove
   * @returns Updated template
   */
  removeCheckpoint(templateId: number, checkpointId: number): Promise<IPatrolTemplateDetail>;

  /**
   * Reorder checkpoints in a template
   * @param templateId - Template ID
   * @param checkpointOrders - Array of {checkpointId, sequenceOrder}
   * @returns True if reordered successfully
   */
  reorderCheckpoints(
    templateId: number,
    checkpointOrders: Array<{ checkpointId: number; sequenceOrder: number }>
  ): Promise<boolean>;

  /**
   * Get templates created by a user
   * @param createdById - User ID
   * @param options - Query options
   * @returns Paginated list of templates
   */
  findByCreatedBy(
    createdById: number,
    options?: Partial<IPatrolTemplateQueryOptions>
  ): Promise<IPaginatedResult<IPatrolTemplate>>;

  /**
   * Validate template data before creation
   * @param templateData - Template data to validate
   * @returns Validation result with errors if any
   */
  validateTemplateData(templateData: ICreatePatrolTemplateDTO): Promise<{
    isValid: boolean;
    errors?: string[];
  }>;

  /**
   * Calculate total points for a template
   * @param templateId - Template ID
   * @returns Total points value
   */
  calculateTotalPoints(templateId: number): Promise<number>;
}

/**
 * IPatrolTemplateRepositoryErrorCode
 * Error codes for repository operations
 */
export enum PatrolTemplateRepositoryErrorCode {
  TEMPLATE_NOT_FOUND = 'TEMPLATE_NOT_FOUND',
  NAME_ALREADY_EXISTS = 'NAME_ALREADY_EXISTS',
  INVALID_DURATION = 'INVALID_DURATION',
  INVALID_TIME_WINDOW = 'INVALID_TIME_WINDOW',
  CHECKPOINT_NOT_FOUND = 'CHECKPOINT_NOT_FOUND',
  CHECKPOINT_ALREADY_IN_TEMPLATE = 'CHECKPOINT_ALREADY_IN_TEMPLATE',
  INVALID_SEQUENCE_ORDER = 'INVALID_SEQUENCE_ORDER',
  CANNOT_DELETE_TEMPLATE_WITH_ACTIVE_RUNS = 'CANNOT_DELETE_TEMPLATE_WITH_ACTIVE_RUNS',
  INVALID_REQUIRED_ROLE = 'INVALID_REQUIRED_ROLE',
}

/**
 * PatrolTemplateRepositoryError
 * Custom error class for repository operations
 */
export class PatrolTemplateRepositoryError extends Error {
  public readonly code: PatrolTemplateRepositoryErrorCode;
  public readonly details?: unknown;

  constructor(code: PatrolTemplateRepositoryErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'PatrolTemplateRepositoryError';
    this.code = code;
    this.details = details;
  }
}
