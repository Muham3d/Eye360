/**
 * Audit Service
 *
 * Handles audit logging for security-sensitive actions.
 * Provides methods to record, retrieve, and analyze audit trails.
 *
 * @module core/services
 */

import { AuditLog, AuditAction, AuditSeverity, IAuditLogFilters, IAuditLogSummary } from '../domain/entities/AuditLog.js';
import logger from '../../infrastructure/config/logger.js';

/**
 * Audit Log Repository Interface
 */
export interface IAuditLogRepository {
  create(entry: AuditLog): Promise<AuditLog>;
  findById(id: number): Promise<AuditLog | null>;
  findMany(filters: IAuditLogFilters): Promise<{ data: AuditLog[]; total: number; page: number; limit: number; totalPages: number }>;
  findByUserId(userId: number, limit?: number): Promise<AuditLog[]>;
  findByEntity(entityType: string, entityId: number, limit?: number): Promise<AuditLog[]>;
  getSummary(filters: Omit<IAuditLogFilters, 'page' | 'limit'>): Promise<IAuditLogSummary>;
  deleteOlderThan(date: Date): Promise<number>;
}

/**
 * Audit Context for Request Tracking
 */
export interface IAuditContext {
  tenantId: string;
  userId: number;
  userName: string;
  userEmail: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Audit Options
 */
export interface IAuditOptions {
  entityType?: string;
  entityId?: number;
  entityName?: string;
  details?: Record<string, any>;
  severity?: AuditSeverity;
}

/**
 * Audit Service Class
 */
export class AuditService {
  private repository: IAuditLogRepository;

  constructor(repository: IAuditLogRepository) {
    this.repository = repository;
  }

  /**
   * Log a successful action
   */
  async logSuccess(
    context: IAuditContext,
    action: AuditAction,
    options?: IAuditOptions
  ): Promise<AuditLog> {
    const entry = AuditLog.fromRequest({
      tenantId: context.tenantId,
      userId: context.userId,
      userName: context.userName,
      userEmail: context.userEmail,
      action,
      entityType: options?.entityType,
      entityId: options?.entityId,
      entityName: options?.entityName,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: options?.details,
      result: 'SUCCESS',
      severity: options?.severity,
    });

    const saved = await this.repository.create(entry);

    // Log critical/high severity actions
    if (saved.severity === AuditSeverity.CRITICAL || saved.severity === AuditSeverity.HIGH) {
      logger.warn(`[AUDIT] ${saved.action} by ${saved.userName} (${saved.userEmail}) - ${saved.severity}`, {
        auditLog: saved.toJSON(),
      });
    }

    return saved;
  }

  /**
   * Log a failed action
   */
  async logFailure(
    context: IAuditContext,
    action: AuditAction,
    errorMessage: string,
    options?: IAuditOptions
  ): Promise<AuditLog> {
    const entry = AuditLog.fromRequest({
      tenantId: context.tenantId,
      userId: context.userId,
      userName: context.userName,
      userEmail: context.userEmail,
      action,
      entityType: options?.entityType,
      entityId: options?.entityId,
      entityName: options?.entityName,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      details: options?.details,
      result: 'FAILURE',
      errorMessage,
      severity: options?.severity || AuditSeverity.MEDIUM,
    });

    const saved = await this.repository.create(entry);

    // Always log failed actions
    logger.warn(`[AUDIT] Failed ${saved.action} by ${saved.userName} (${saved.userEmail}): ${errorMessage}`, {
      auditLog: saved.toJSON(),
    });

    return saved;
  }

  /**
   * Log authentication event
   */
  async logAuth(
    context: IAuditContext,
    action: AuditAction.LOGIN | AuditAction.LOGOUT | AuditAction.LOGIN_FAILED,
    success: boolean,
    errorMessage?: string
  ): Promise<AuditLog> {
    return success
      ? this.logSuccess(context, action)
      : this.logFailure(context, action, errorMessage || 'Authentication failed');
  }

  /**
   * Log CRUD operations on entities
   */
  async logCRUD(
    context: IAuditContext,
    action: AuditAction,
    entityType: string,
    entityId: number,
    entityName?: string,
    details?: Record<string, any>
  ): Promise<AuditLog> {
    return this.logSuccess(context, action, {
      entityType,
      entityId,
      entityName,
      details,
    });
  }

  /**
   * Get audit log by ID
   */
  async getById(id: number): Promise<AuditLog | null> {
    return this.repository.findById(id);
  }

  /**
   * Query audit logs with filters
   */
  async query(filters: IAuditLogFilters): Promise<{
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.repository.findMany(filters);
  }

  /**
   * Get audit logs for a specific user
   */
  async getUserHistory(
    userId: number,
    limit: number = 100
  ): Promise<AuditLog[]> {
    return this.repository.findByUserId(userId, limit);
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityHistory(
    entityType: string,
    entityId: number,
    limit: number = 100
  ): Promise<AuditLog[]> {
    return this.repository.findByEntity(entityType, entityId, limit);
  }

  /**
   * Get audit log summary
   */
  async getSummary(filters?: Omit<IAuditLogFilters, 'page' | 'limit'>): Promise<IAuditLogSummary> {
    return this.repository.getSummary(filters || {});
  }

  /**
   * Get failed login attempts for a user
   */
  async getFailedLoginAttempts(
    userEmail: string,
    sinceMinutes: number = 15
  ): Promise<AuditLog[]> {
    const since = new Date();
    since.setMinutes(since.getMinutes() - sinceMinutes);

    const result = await this.repository.findMany({
      action: AuditAction.LOGIN_FAILED,
      startDate: since,
      limit: 100,
    });

    // Filter by user email in results
    return result.data.filter(log => log.userEmail === userEmail);
  }

  /**
   * Check if user account should be locked due to too many failed attempts
   */
  async shouldLockAccount(userEmail: string, maxAttempts: number = 5): Promise<boolean> {
    const failedAttempts = await this.getFailedLoginAttempts(userEmail, 15);
    return failedAttempts.length >= maxAttempts;
  }

  /**
   * Get recent security-relevant events
   */
  async getSecurityEvents(
    tenantId: string,
    hours: number = 24
  ): Promise<{
    critical: AuditLog[];
    high: AuditLog[];
    total: number;
  }> {
    const since = new Date();
    since.setHours(since.getHours() - hours);

    const [criticalResult, highResult] = await Promise.all([
      this.repository.findMany({
        tenantId,
        severity: AuditSeverity.CRITICAL,
        startDate: since,
        limit: 50,
      }),
      this.repository.findMany({
        tenantId,
        severity: AuditSeverity.HIGH,
        startDate: since,
        limit: 100,
      }),
    ]);

    return {
      critical: criticalResult.data,
      high: highResult.data,
      total: criticalResult.data.length + highResult.data.length,
    };
  }

  /**
   * Generate compliance report for date range
   */
  async getComplianceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalActions: number;
    actionsByType: Record<string, number>;
    actionsByUser: Array<{ userName: string; count: number }>;
    failedActions: number;
    securityEvents: number;
  }> {
    const result = await this.repository.findMany({
      tenantId,
      startDate,
      endDate,
      limit: 100000, // Large limit for reporting
    });

    const actionsByType: Record<string, number> = {};
    const actionsByUserMap = new Map<string, number>();
    let failedActions = 0;
    let securityEvents = 0;

    for (const log of result.data) {
      // Count by action type
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1;

      // Count by user
      actionsByUserMap.set(log.userName, (actionsByUserMap.get(log.userName) || 0) + 1);

      // Count failures
      if (log.result === 'FAILURE') {
        failedActions++;
      }

      // Count security events (critical/high)
      if (log.severity === AuditSeverity.CRITICAL || log.severity === AuditSeverity.HIGH) {
        securityEvents++;
      }
    }

    const actionsByUser = Array.from(actionsByUserMap.entries())
      .map(([userName, count]) => ({ userName, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalActions: result.total,
      actionsByType,
      actionsByUser,
      failedActions,
      securityEvents,
    };
  }

  /**
   * Clean up old audit logs
   */
  async cleanup(retentionDays: number = 365): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deletedCount = await this.repository.deleteOlderThan(cutoffDate);

    if (deletedCount > 0) {
      logger.info(`[AUDIT] Cleaned up ${deletedCount} audit log entries older than ${retentionDays} days`);
    }

    return deletedCount;
  }
}

/**
 * Singleton instance management
 */
let auditServiceInstance: AuditService | null = null;

export function initializeAuditService(repository: IAuditLogRepository): AuditService {
  auditServiceInstance = new AuditService(repository);
  logger.info('AuditService initialized');
  return auditServiceInstance;
}

export function getAuditService(): AuditService {
  if (!auditServiceInstance) {
    throw new Error('AuditService not initialized');
  }
  return auditServiceInstance;
}

export default AuditService;
