/**
 * Not Found Error
 *
 * Thrown when a requested resource cannot be found.
 *
 * @module core/domain/errors
 */

import { AppError } from './AppError.js';

/**
 * Not found error class
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  /**
   * The type of resource that was not found
   */
  public readonly resourceType: string;

  /**
   * The identifier that was used to search
   */
  public readonly resourceId?: string;

  constructor(
    message: string,
    resourceType: string = 'Resource',
    resourceId?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      404,
      'NOT_FOUND',
      true,
      { ...context, resourceType, resourceId }
    );

    this.resourceType = resourceType;
    this.resourceId = resourceId;
    this.name = 'NotFoundError';
  }

  /**
   * Create a not found error for a specific resource
   */
  static forResource(
    resourceType: string,
    resourceId: string | number
  ): NotFoundError {
    return new NotFoundError(
      `${resourceType} with id '${resourceId}' not found`,
      resourceType,
      String(resourceId)
    );
  }

  /**
   * Create a not found error for a user
   */
  static forUser(userId: string | number): NotFoundError {
    return NotFoundError.forResource('User', userId);
  }

  /**
   * Create a not found error for a site
   */
  static forSite(siteId: string | number): NotFoundError {
    return NotFoundError.forResource('Site', siteId);
  }

  /**
   * Create a not found error for a checkpoint
   */
  static forCheckpoint(checkpointId: string | number): NotFoundError {
    return NotFoundError.forResource('Checkpoint', checkpointId);
  }

  /**
   * Create a not found error for a patrol
   */
  static forPatrol(patrolId: string | number): NotFoundError {
    return NotFoundError.forResource('Patrol', patrolId);
  }

  /**
   * Create a not found error for an incident
   */
  static forIncident(incidentId: string | number): NotFoundError {
    return NotFoundError.forResource('Incident', incidentId);
  }
}
