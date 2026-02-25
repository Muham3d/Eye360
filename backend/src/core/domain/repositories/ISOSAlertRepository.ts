/**
 * SOS Alert Repository Interface
 *
 * @module core/domain/repositories
 */

import type {
  ISOSAlert,
  ICreateSOSAlertDTO,
  IAcknowledgeSOSDTO,
  IDispatchSOSDTO,
  IResolveSOSDTO,
  INearbyGuard,
  ISOSStatistics,
} from '../entities/SOSAlert.js';
import { SOSStatus, SOSPriority } from '../entities/SOSAlert.js';

/**
 * SOS Alert Repository Interface
 */
export interface ISOSAlertRepository {
  /**
   * Create a new SOS alert
   */
  create(dto: ICreateSOSAlertDTO): Promise<ISOSAlert>;

  /**
   * Find SOS alert by ID
   */
  findById(id: number): Promise<ISOSAlert | null>;

  /**
   * Find active (unresolved) SOS alerts
   */
  findActive(): Promise<ISOSAlert[]>;

  /**
   * Find SOS alerts by guard
   */
  findByGuardId(guardId: number, limit?: number): Promise<ISOSAlert[]>;

  /**
   * Acknowledge an SOS alert
   */
  acknowledge(id: number, dto: IAcknowledgeSOSDTO): Promise<ISOSAlert>;

  /**
   * Dispatch help to SOS location
   */
  dispatch(id: number, dto: IDispatchSOSDTO): Promise<ISOSAlert>;

  /**
   * Resolve an SOS alert
   */
  resolve(id: number, dto: IResolveSOSDTO): Promise<ISOSAlert>;

  /**
   * Find nearby guards to SOS location
   */
  findNearbyGuards(
    latitude: number,
    longitude: number,
    radiusMeters: number,
    excludeGuardId?: number
  ): Promise<INearbyGuard[]>;

  /**
   * Get SOS statistics
   */
  getStatistics(): Promise<ISOSStatistics>;

  /**
   * Update alert status
   */
  updateStatus(id: number, status: SOSStatus): Promise<ISOSAlert>;

  /**
   * Find recent alerts (for dashboard)
   */
  findRecent(limit: number): Promise<ISOSAlert[]>;
}
