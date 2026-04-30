/**
 * Audit Log Repository Interface
 *
 * Defines the contract for audit log data access.
 *
 * @module core/domain/repositories
 */

import { AuditLog, IAuditLogFilters, IAuditLogSummary } from '../entities/AuditLog.js';

/**
 * Audit Log Repository Interface
 */
export interface IAuditLogRepository {
  /**
   * Create a new audit log entry
   */
  create(entry: AuditLog): Promise<AuditLog>;

  /**
   * Find audit log by ID
   */
  findById(id: number): Promise<AuditLog | null>;

  /**
   * Find audit logs with filters
   */
  findMany(filters: IAuditLogFilters): Promise<{
    data: AuditLog[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;

  /**
   * Find audit logs by user ID
   */
  findByUserId(userId: number, limit?: number): Promise<AuditLog[]>;

  /**
   * Find audit logs by entity
   */
  findByEntity(entityType: string, entityId: number, limit?: number): Promise<AuditLog[]>;

  /**
   * Get audit log summary statistics
   */
  getSummary(filters: Omit<IAuditLogFilters, 'page' | 'limit'>): Promise<IAuditLogSummary>;

  /**
   * Delete audit logs older than specified date
   */
  deleteOlderThan(date: Date): Promise<number>;
}

export default IAuditLogRepository;
