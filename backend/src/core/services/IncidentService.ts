/**
 * Incident Service
 *
 * Core business logic for incident management.
 * Handles incident workflow, evidence, comments, and notifications.
 *
 * @module core/services
 */

import { ValidationError, NotFoundError, ForbiddenError } from '../domain/errors/index.js';
import type {
  IIncident,
  ICreateIncidentDTO,
  IUpdateIncidentDTO,
  IIncidentQueryOptions,
  IIncidentStatistics,
  IPaginatedIncidents,
  ICreateEvidenceDTO,
  ICreateCommentDTO,
  IncidentStatus,
  IncidentPriority,
} from '../domain/entities/index.js';
import type { IIncidentRepository } from '../domain/repositories/IIncidentRepository.js';
import { RealTimeService } from './RealTimeService.js';
import { FileStorageService } from './FileStorageService.js';
import { config } from '../../infrastructure/config/env.js';
import logger from '../../infrastructure/config/logger.js';

interface EscalationConfig {
  criticalMinutes: number;
  highMinutes: number;
  mediumMinutes: number;
}

const DEFAULT_ESCALATION: EscalationConfig = {
  criticalMinutes: config.business.incidentEscalationCriticalMinutes,
  highMinutes: config.business.incidentEscalationHighMinutes,
  mediumMinutes: config.business.incidentEscalationMediumMinutes,
};

/**
 * Incident Service Class
 */
export class IncidentService {
  constructor(
    private readonly incidentRepository: IIncidentRepository,
    private readonly realTimeService: RealTimeService,
    private readonly fileStorageService: FileStorageService
  ) {}

  /**
   * Create a new incident
   */
  async createIncident(data: ICreateIncidentDTO): Promise<IIncident> {
    // Validation
    if (!data.title || data.title.trim().length === 0) {
      throw new ValidationError('Title is required');
    }
    if (!data.description || data.description.trim().length === 0) {
      throw new ValidationError('Description is required');
    }
    if (!data.siteId) {
      throw new ValidationError('Site ID is required');
    }

    // Create incident
    const incident = await this.incidentRepository.create({
      ...data,
      priority: data.priority || IncidentPriority.MEDIUM,
      status: IncidentStatus.NEW,
    });

    // Notify supervisors via real-time service
    this.notifyIncidentCreated(incident);

    logger.info(`Incident created: ID ${incident.id} - ${incident.title}`);
    return incident;
  }

  /**
   * Get incident by ID with full details
   */
  async getIncident(id: number): Promise<IIncident> {
    const incident = await this.incidentRepository.findById(id);
    if (!incident) {
      throw new NotFoundError(`Incident with ID ${id} not found`);
    }
    return incident;
  }

  /**
   * Update incident status (workflow transition)
   */
  async updateStatus(
    id: number,
    status: IncidentStatus,
    userId: number,
    reason?: string
  ): Promise<IIncident> {
    const incident = await this.getIncident(id);

    // Validate workflow transition
    const validTransitions: Record<IncidentStatus, IncidentStatus[]> = {
      [IncidentStatus.NEW]: [IncidentStatus.INVESTIGATING, IncidentStatus.RESOLVED, IncidentStatus.CLOSED],
      [IncidentStatus.INVESTIGATING]: [IncidentStatus.RESOLVED, IncidentStatus.CLOSED],
      [IncidentStatus.RESOLVED]: [IncidentStatus.CLOSED],
      [IncidentStatus.CLOSED]: [],
    };

    const allowedStatuses = validTransitions[incident.status as IncidentStatus];
    if (!allowedStatuses.includes(status)) {
      throw new ValidationError(
        `Cannot transition from ${incident.status} to ${status}. Allowed: ${allowedStatuses.join(', ')}`
      );
    }

    // Update incident
    const updateData: any = { status };
    if (status === IncidentStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
      updateData.resolvedBy = userId;
    }
    if (status === IncidentStatus.CLOSED) {
      updateData.closedAt = new Date();
      updateData.closedBy = userId;
    }

    const updated = await this.incidentRepository.update(id, updateData);

    // Add comment about status change
    await this.incidentRepository.addComment(id, userId, `Status changed to ${status}${reason ? ': ' + reason : ''}`);

    // Notify about status change
    this.notifyIncidentUpdated(updated);

    logger.info(`Incident ${id} status changed to ${status} by user ${userId}`);
    return updated!;
  }

  /**
   * Assign incident to a user
   */
  async assignIncident(id: number, assigneeId: number, userId: number): Promise<IIncident> {
    const incident = await this.getIncident(id);

    if (incident.status === IncidentStatus.CLOSED) {
      throw new ValidationError('Cannot assign a closed incident');
    }

    const updated = await this.incidentRepository.update(id, { assignedTo: assigneeId });
    await this.incidentRepository.addComment(id, userId, `Incident assigned to user ${assigneeId}`);

    // Notify assignee
    this.notifyIncidentAssigned(updated, assigneeId);

    logger.info(`Incident ${id} assigned to user ${assigneeId}`);
    return updated!;
  }

  /**
   * Add comment to incident
   */
  async addComment(id: number, dto: ICreateCommentDTO): Promise<void> {
    const incident = await this.getIncident(id);

    if (!dto.comment || dto.comment.trim().length === 0) {
      throw new ValidationError('Comment cannot be empty');
    }

    await this.incidentRepository.addComment(id, dto.userId, dto.comment.trim());

    // Notify about new comment
    this.notifyIncidentCommentAdded(incident);

    logger.info(`Comment added to incident ${id} by user ${dto.userId}`);
  }

  /**
   * Add evidence to incident (file upload)
   */
  async addEvidence(id: number, dto: ICreateEvidenceDTO & { base64Data?: string }): Promise<void> {
    const incident = await this.getIncident(id);

    if (incident.status === IncidentStatus.CLOSED) {
      throw new ValidationError('Cannot add evidence to a closed incident');
    }

    // If base64 data provided, process it
    let filePath = dto.filePath;
    if (dto.base64Data) {
      const uploadResult = await this.fileStorageService.uploadFromBase64(
        dto.base64Data,
        `evidence_${id}`,
        dto.fileType
      );
      filePath = uploadResult.filePath;
    }

    await this.incidentRepository.addEvidence(id, {
      filePath,
      fileType: dto.fileType,
      fileSize: dto.fileSize,
      caption: dto.caption,
      uploadedBy: dto.uploadedBy,
    });

    logger.info(`Evidence added to incident ${id} (${dto.fileType})`);
  }

  /**
   * List incidents with filters and pagination
   */
  async listIncidents(options: IIncidentQueryOptions = {}): Promise<IPaginatedIncidents> {
    return await this.incidentRepository.findAll(options);
  }

  /**
   * Get incident statistics
   */
  async getStatistics(): Promise<IIncidentStatistics> {
    return await this.incidentRepository.getStatistics();
  }

  /**
   * Search incidents
   */
  async searchIncidents(query: string, options: IIncidentQueryOptions = {}): Promise<IPaginatedIncidents> {
    return await this.incidentRepository.search(query, options);
  }

  /**
   * Delete evidence
   */
  async deleteEvidence(incidentId: number, evidenceId: number, userId: number): Promise<void> {
    const incident = await this.getIncident(incidentId);

    if (incident.status === IncidentStatus.CLOSED) {
      throw new ValidationError('Cannot delete evidence from a closed incident');
    }

    await this.incidentRepository.deleteEvidence(incidentId, evidenceId, userId);
    logger.info(`Evidence ${evidenceId} deleted from incident ${incidentId}`);
  }

  /**
   * Get incidents by site
   */
  async getIncidentsBySite(siteId: number): Promise<IIncident[]> {
    return await this.incidentRepository.findBySite(siteId);
  }

  /**
   * Get incidents assigned to user
   */
  async getIncidentsByAssignee(userId: number): Promise<IIncident[]> {
    return await this.incidentRepository.findByAssignee(userId);
  }

  /**
   * Get incidents reported by user
   */
  async getIncidentsByReporter(userId: number): Promise<IIncident[]> {
    return await this.incidentRepository.findByReporter(userId);
  }

  /**
   * Get incidents requiring escalation
   * Called periodically by background job
   */
  async getEscalatableIncidents(): Promise<IIncident[]> {
    const openIncidents = await this.incidentRepository.findAll({
      status: [IncidentStatus.NEW, IncidentStatus.INVESTIGATING] as any,
      limit: 100,
    });

    const now = new Date();
    return openIncidents.data.filter((incident) => {
      const created = new Date(incident.createdAt);
      const minutesSinceCreation = (now.getTime() - created.getTime()) / 60000;
      const threshold = this.getEscalationThreshold(incident.priority as IncidentPriority);
      return minutesSinceCreation >= threshold;
    });
  }

  /**
   * Run escalation check — escalate overdue incidents
   */
  async runEscalationCheck(): Promise<number> {
    const escalatable = await this.getEscalatableIncidents();
    let escalated = 0;

    for (const incident of escalatable) {
      try {
        if (incident.status === IncidentStatus.NEW) {
          await this.incidentRepository.update(incident.id, {
            status: IncidentStatus.INVESTIGATING,
          });
          await this.incidentRepository.addComment(
            incident.id,
            0,
            `Auto-escalated: no response within ${this.getEscalationThreshold(incident.priority as IncidentPriority)} minutes`
          );
          this.notifyIncidentEscalated(incident);
          escalated++;
        }
      } catch (error) {
        logger.warn(`Failed to escalate incident ${incident.id}:`, error);
      }
    }

    if (escalated > 0) {
      logger.info(`Auto-escalated ${escalated} incidents`);
    }
    return escalated;
  }

  private getEscalationThreshold(priority: IncidentPriority): number {
    switch (priority) {
      case IncidentPriority.CRITICAL: return DEFAULT_ESCALATION.criticalMinutes;
      case IncidentPriority.HIGH: return DEFAULT_ESCALATION.highMinutes;
      case IncidentPriority.MEDIUM: return DEFAULT_ESCALATION.mediumMinutes;
      default: return DEFAULT_ESCALATION.mediumMinutes;
    }
  }

  private notifyIncidentEscalated(incident: IIncident): void {
    logger.warn(`ESCALATION: Incident ${incident.id} (${incident.priority}) auto-escalated`);
  }

  /**
   * Bulk update incident status
   */
  async bulkUpdateStatus(ids: number[], status: IncidentStatus, userId: number): Promise<number> {
    let updated = 0;

    for (const id of ids) {
      try {
        await this.updateStatus(id, status, userId);
        updated++;
      } catch (error) {
        logger.warn(`Failed to update incident ${id}:`, error);
      }
    }

    return updated;
  }

  /**
   * Notify supervisors about new incident
   */
  private notifyIncidentCreated(incident: IIncident): void {
    // Would use WebSocket to notify supervisors
    // This is integrated with RealTimeService
    logger.info(`Notification: New incident ${incident.id} created`);
  }

  /**
   * Notify about incident update
   */
  private notifyIncidentUpdated(incident: IIncident): void {
    logger.info(`Notification: Incident ${incident.id} updated to ${incident.status}`);
  }

  /**
   * Notify about incident assignment
   */
  private notifyIncidentAssigned(incident: IIncident, assigneeId: number): void {
    logger.info(`Notification: Incident ${incident.id} assigned to user ${assigneeId}`);
  }

  /**
   * Notify about new comment
   */
  private notifyIncidentCommentAdded(incident: IIncident): void {
    logger.info(`Notification: New comment on incident ${incident.id}`);
  }
}

/**
 * Singleton instance management
 */
let incidentServiceInstance: IncidentService | null = null;

export function initializeIncidentService(
  repo: IIncidentRepository,
  rt: RealTimeService,
  fs: FileStorageService
): IncidentService {
  incidentServiceInstance = new IncidentService(repo, rt, fs);
  return incidentServiceInstance;
}

export function getIncidentService(): IncidentService {
  if (!incidentServiceInstance) {
    throw new Error('IncidentService not initialized');
  }
  return incidentServiceInstance;
}

export default IncidentService;
