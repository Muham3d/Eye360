/**
 * Incident Domain Entity
 *
 * Represents a security/safety incident reported during patrols.
 * Contains workflow state, evidence, and comments.
 *
 * @module core/domain/entities
 */

import { GPSLocation } from '../value-objects/GPSLocation.js';

/**
 * Incident Status Enum
 */
export enum IncidentStatus {
  NEW = 'new',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

/**
 * Incident Priority Enum
 */
export enum IncidentPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Incident Type Enum
 */
export enum IncidentType {
  SECURITY = 'security',
  SAFETY = 'safety',
  MAINTENANCE = 'maintenance',
  MEDICAL = 'medical',
  OTHER = 'other',
}

/**
 * Incident Domain Entity
 */
export interface IIncident {
  id: number;
  siteId: number;
  reportedBy: number;
  assignedTo?: number;
  title: string;
  description: string;
  type: IncidentType;
  priority: IncidentPriority;
  status: IncidentStatus;
  location?: GPSLocation;
  patrolRunId?: number;
  resolvedAt?: Date;
  resolvedBy?: number;
  closedAt?: Date;
  closedBy?: number;
  createdAt: Date;
  updatedAt: Date;
  // Eager loaded relations
  evidence?: IIncidentEvidence[];
  comments?: IIncidentComment[];
}

/**
 * Create Incident DTO
 */
export interface ICreateIncidentDTO {
  siteId: number;
  reportedBy: number;
  title: string;
  description: string;
  type: IncidentType;
  priority?: IncidentPriority;
  location?: GPSLocation;
  patrolRunId?: number;
}

/**
 * Update Incident DTO
 */
export interface IUpdateIncidentDTO {
  title?: string;
  description?: string;
  type?: IncidentType;
  priority?: IncidentPriority;
  status?: IncidentStatus;
  assignedTo?: number;
  resolvedBy?: number;
  resolvedAt?: Date;
  closedBy?: number;
  closedAt?: Date;
}

/**
 * Incident Query Options
 */
export interface IIncidentQueryOptions {
  siteId?: number;
  reportedBy?: number;
  assignedTo?: number;
  status?: IncidentStatus;
  priority?: IncidentPriority;
  type?: IncidentType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Incident Evidence
 */
export interface IIncidentEvidence {
  id: number;
  incidentId: number;
  filePath: string;
  fileType: 'image' | 'video' | 'audio';
  fileSize?: number;
  caption?: string;
  uploadedBy: number;
  createdAt: Date;
}

/**
 * Create Evidence DTO
 */
export interface ICreateEvidenceDTO {
  filePath: string;
  fileType: 'image' | 'video' | 'audio';
  fileSize?: number;
  caption?: string;
  uploadedBy: number;
}

/**
 * Incident Comment
 */
export interface IIncidentComment {
  id: number;
  incidentId: number;
  userId: number;
  comment: string;
  createdAt: Date;
}

/**
 * Create Comment DTO
 */
export interface ICreateCommentDTO {
  userId: number;
  comment: string;
}

/**
 * Incident Statistics
 */
export interface IIncidentStatistics {
  totalIncidents: number;
  activeIncidents: number;
  byStatus: Record<IncidentStatus, number>;
  byPriority: Record<IncidentPriority, number>;
  byType: Record<IncidentType, number>;
  averageResolutionTime: number; // hours
  resolvedThisWeek: number;
}

/**
 * Paginated Incident Result
 */
export interface IPaginatedIncidents {
  data: IIncident[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
