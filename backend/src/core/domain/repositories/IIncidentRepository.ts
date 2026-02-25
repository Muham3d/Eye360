/**
 * IIncidentRepository Interface
 *
 * @module core/domain/repositories
 */

import type {
  IIncident,
  ICreateIncidentDTO,
  IUpdateIncidentDTO,
  IIncidentQueryOptions,
  IIncidentStatistics,
  IPaginatedIncidents,
  ICreateEvidenceDTO,
  ICreateCommentDTO,
} from '../entities/Incident.js';

/**
 * Incident Repository Interface
 */
export interface IIncidentRepository {
  /**
   * Find incident by ID with all relations
   */
  findById(id: number): Promise<IIncident | null>;

  /**
   * Find all incidents with filtering and pagination
   */
  findAll(options: IIncidentQueryOptions): Promise<IPaginatedIncidents>;

  /**
   * Search incidents by text query
   */
  search(query: string, options?: IIncidentQueryOptions): Promise<IPaginatedIncidents>;

  /**
   * Create a new incident
   */
  create(data: ICreateIncidentDTO): Promise<IIncident>;

  /**
   * Update incident
   */
  update(id: number, data: IUpdateIncidentDTO): Promise<IIncident | null>;

  /**
   * Delete incident
   */
  delete(id: number): Promise<boolean>;

  /**
   * Add evidence to incident
   */
  addEvidence(incidentId: number, data: ICreateEvidenceDTO): Promise<void>;

  /**
   * Delete evidence from incident
   */
  deleteEvidence(incidentId: number, evidenceId: number, userId: number): Promise<void>;

  /**
   * Add comment to incident
   */
  addComment(incidentId: number, userId: number, comment: string): Promise<void>;

  /**
   * Get comments for incident
   */
  getComments(incidentId: number): Promise<any[]>;

  /**
   * Get evidence for incident
   */
  getEvidence(incidentId: number): Promise<any[]>;

  /**
   * Find incidents by site
   */
  findBySite(siteId: number): Promise<IIncident[]>;

  /**
   * Find incidents by reporter
   */
  findByReporter(userId: number): Promise<IIncident[]>;

  /**
   * Find incidents by assignee
   */
  findByAssignee(userId: number): Promise<IIncident[]>;

  /**
   * Get incident statistics
   */
  getStatistics(): Promise<IIncidentStatistics>;

  /**
   * Count incidents by status
   */
  countByStatus(): Promise<Record<string, number>>;

  /**
   * Count incidents by priority
   */
  countByPriority(): Promise<Record<string, number>>;
}
