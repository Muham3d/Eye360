/**
 * Location History Repository Interface
 *
 * @module core/domain/repositories
 */

import type {
  ILocationHistory,
  ICreateLocationHistoryDTO,
  ILocationBatchDTO,
  ILocationQueryOptions,
  ILocationStatistics,
} from '../entities/LocationHistory.js';

/**
 * Location History Repository Interface
 */
export interface ILocationHistoryRepository {
  /**
   * Create a single location record
   */
  create(dto: ICreateLocationHistoryDTO): Promise<ILocationHistory>;

  /**
   * Create multiple location records (batch insert)
   */
  createBatch(dto: ILocationBatchDTO): Promise<number>;

  /**
   * Find location history by guard ID
   */
  findByGuardId(guardId: number, options?: ILocationQueryOptions): Promise<ILocationHistory[]>;

  /**
   * Find location history by patrol run
   */
  findByPatrolRunId(patrolRunId: number): Promise<ILocationHistory[]>;

  /**
   * Find latest location for a guard
   */
  findLatestByGuardId(guardId: number): Promise<ILocationHistory | null>;

  /**
   * Find all active guards' latest locations
   */
  findActiveGuardsLocations(): Promise<Map<number, ILocationHistory>>;

  /**
   * Get location statistics
   */
  getStatistics(): Promise<ILocationStatistics>;

  /**
   * Archive old location records
   */
  archiveOldRecords(daysToKeep: number): Promise<number>;

  /**
   * Delete old location records
   */
  deleteOldRecords(daysToKeep: number): Promise<number>;

  /**
   * Get count of location points for a time range
   */
  countByDateRange(startDate: Date, endDate: Date): Promise<number>;
}
