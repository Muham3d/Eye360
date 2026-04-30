/**
 * Audit Log Entity
 *
 * Tracks security-sensitive actions for compliance and forensic analysis.
 * Records who did what, when, and from where.
 *
 * @module core/domain/entities
 */

/**
 * Audit Action Types
 */
export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',

  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  ROLE_REVOKED = 'ROLE_REVOKED',

  // Site Management
  SITE_CREATED = 'SITE_CREATED',
  SITE_UPDATED = 'SITE_UPDATED',
  SITE_DELETED = 'SITE_DELETED',
  CHECKPOINT_CREATED = 'CHECKPOINT_CREATED',
  CHECKPOINT_UPDATED = 'CHECKPOINT_UPDATED',
  CHECKPOINT_DELETED = 'CHECKPOINT_DELETED',

  // Patrol Management
  PATROL_TEMPLATE_CREATED = 'PATROL_TEMPLATE_CREATED',
  PATROL_TEMPLATE_UPDATED = 'PATROL_TEMPLATE_UPDATED',
  PATROL_TEMPLATE_DELETED = 'PATROL_TEMPLATE_DELETED',
  PATROL_RUN_STARTED = 'PATROL_RUN_STARTED',
  PATROL_RUN_COMPLETED = 'PATROL_RUN_COMPLETED',
  PATROL_RUN_MISSED = 'PATROL_RUN_MISSED',

  // Incident Management
  INCIDENT_CREATED = 'INCIDENT_CREATED',
  INCIDENT_UPDATED = 'INCIDENT_UPDATED',
  INCIDENT_RESOLVED = 'INCIDENT_RESOLVED',
  INCIDENT_EVIDENCE_ADDED = 'INCIDENT_EVIDENCE_ADDED',

  // Real-time Events
  SOS_ALERT = 'SOS_ALERT',
  SOS_ALERT_CLEARED = 'SOS_ALERT_CLEARED',
  LOCATION_UPDATE = 'LOCATION_UPDATE',

  // Shift Management
  SHIFT_STARTED = 'SHIFT_STARTED',
  SHIFT_ENDED = 'SHIFT_ENDED',
  CLOCK_IN = 'CLOCK_IN',
  CLOCK_OUT = 'CLOCK_OUT',

  // Reporting
  REPORT_GENERATED = 'REPORT_GENERATED',
  REPORT_DOWNLOADED = 'REPORT_DOWNLOADED',
  REPORT_DELETED = 'REPORT_DELETED',

  // System
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  SETTINGS_CHANGED = 'SETTINGS_CHANGED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  PERMISSION_REVOKED = 'PERMISSION_REVOKED',
}

/**
 * Audit Severity Levels
 */
export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Audit Log Entry Interface
 */
export interface IAuditLogEntry {
  id?: number;
  tenantId: string;
  userId: number;
  userName: string;
  userEmail: string;
  action: AuditAction;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  severity: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  details?: Record<string, any>;
  result?: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
}

/**
 * Audit Log Filter Options
 */
export interface IAuditLogFilters {
  tenantId?: string;
  userId?: number;
  action?: AuditAction;
  entityType?: string;
  entityId?: number;
  severity?: AuditSeverity;
  result?: 'SUCCESS' | 'FAILURE';
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

/**
 * Audit Log Summary
 */
export interface IAuditLogSummary {
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  criticalActions: number;
  topActions: Array<{ action: string; count: number }>;
  topUsers: Array<{ userId: number; userName: string; count: number }>;
}

/**
 * Audit Log Entity Class
 */
export class AuditLog {
  id?: number;
  tenantId: string;
  userId: number;
  userName: string;
  userEmail: string;
  action: AuditAction;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  severity: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  details?: Record<string, any>;
  result?: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;

  constructor(data: IAuditLogEntry) {
    this.id = data.id;
    this.tenantId = data.tenantId;
    this.userId = data.userId;
    this.userName = data.userName;
    this.userEmail = data.userEmail;
    this.action = data.action;
    this.entityType = data.entityType;
    this.entityId = data.entityId;
    this.entityName = data.entityName;
    this.severity = data.severity;
    this.ipAddress = data.ipAddress;
    this.userAgent = data.userAgent;
    this.timestamp = data.timestamp || new Date();
    this.details = data.details;
    this.result = data.result || 'SUCCESS';
    this.errorMessage = data.errorMessage;
  }

  /**
   * Determine severity based on action type
   */
  static getSeverityForAction(action: AuditAction): AuditSeverity {
    const criticalActions = [
      AuditAction.USER_DELETED,
      AuditAction.SITE_DELETED,
      AuditAction.SOS_ALERT,
      AuditAction.PERMISSION_GRANTED,
      AuditAction.PERMISSION_REVOKED,
    ];

    const highActions = [
      AuditAction.USER_CREATED,
      AuditAction.ROLE_ASSIGNED,
      AuditAction.ROLE_REVOKED,
      AuditAction.PATROL_RUN_MISSED,
      AuditAction.INCIDENT_CREATED,
    ];

    if (criticalActions.includes(action)) {
      return AuditSeverity.CRITICAL;
    }
    if (highActions.includes(action)) {
      return AuditSeverity.HIGH;
    }
    return AuditSeverity.MEDIUM;
  }

  /**
   * Create audit entry from request context
   */
  static fromRequest(data: {
    tenantId: string;
    userId: number;
    userName: string;
    userEmail: string;
    action: AuditAction;
    entityType?: string;
    entityId?: number;
    entityName?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
    result?: 'SUCCESS' | 'FAILURE';
    errorMessage?: string;
  }): AuditLog {
    return new AuditLog({
      ...data,
      severity: AuditLog.getSeverityForAction(data.action),
      timestamp: new Date(),
    });
  }

  /**
   * Convert to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      tenantId: this.tenantId,
      userId: this.userId,
      userName: this.userName,
      userEmail: this.userEmail,
      action: this.action,
      entityType: this.entityType,
      entityId: this.entityId,
      entityName: this.entityName,
      severity: this.severity,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      result: this.result,
      errorMessage: this.errorMessage,
    };
  }
}

export default AuditLog;
