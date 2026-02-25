/**
 * Real-time Service
 *
 * Core service for handling real-time events like location updates and SOS alerts.
 * Bridges the gap between WebSocket infrastructure and business logic.
 * Persists data to database for tracking and reporting.
 *
 * @module core/services/RealTimeService
 */

import { getIoInstance, WS_EVENTS, WS_NAMESPACES } from '../../infrastructure/websocket/WebSocketServer.js';
import { GeofenceService } from './GeofenceService.js';
import type { ISOSAlertRepository } from '../domain/repositories/ISOSAlertRepository.js';
import type { ILocationHistoryRepository } from '../domain/repositories/ILocationHistoryRepository.js';
import type { ICreateSOSAlertDTO, ICreateLocationHistoryDTO } from '../domain/entities/index.js';
import logger from '../../infrastructure/config/logger.js';

export interface ILocationUpdate {
  userId: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  bearing?: number;
  altitude?: number;
  batteryLevel?: number;
  timestamp: Date;
  activePatrolId?: number;
  isActiveShift?: boolean;
}

export interface ISOSAlertInput {
  userId: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
  message?: string;
  priority?: string;
}

/**
 * Real-time Service Class
 */
export class RealTimeService {
  private readonly activeGuards: Map<number, ILocationUpdate> = new Map();

  constructor(
    private readonly geofenceService: GeofenceService,
    private readonly sosAlertRepository: ISOSAlertRepository,
    private readonly locationHistoryRepository: ILocationHistoryRepository
  ) {}

  /**
   * Handle incoming location update from a guard
   * Persists to database and broadcasts to supervisors
   */
  async handleLocationUpdate(update: ILocationUpdate): Promise<void> {
    // 1. Validate GPS data
    const validation = this.geofenceService.validateGPSLocation({
      latitude: update.latitude,
      longitude: update.longitude,
      accuracy: update.accuracy,
      timestamp: update.timestamp,
    });

    if (!validation.isValid) {
      logger.warn(`Rejected invalid location update from user ${update.userId}`);
      return;
    }

    // 2. Update local cache of active guards
    this.activeGuards.set(update.userId, update);

    // 3. Persist to database (async, don't wait)
    this.persistLocationUpdate(update).catch(error => {
      logger.error('Failed to persist location update:', error);
    });

    // 4. Broadcast to supervisors
    const io = getIoInstance();
    io.of(WS_NAMESPACES.SUPERVISORS).to('command_center').emit(WS_EVENTS.GUARD_TRACKING, {
      userId: update.userId,
      latitude: update.latitude,
      longitude: update.longitude,
      accuracy: update.accuracy,
      speed: update.speed,
      bearing: update.bearing,
      batteryLevel: update.batteryLevel,
      status: 'online',
      timestamp: update.timestamp,
    });

    logger.debug(`Location update broadcasted for user ${update.userId}`);
  }

  /**
   * Handle incoming SOS alert
   * Persists to database and broadcasts to supervisors and nearby guards
   */
  async handleSOSAlert(alert: ISOSAlertInput): Promise<void> {
    logger.error(`🚨 SOS ALERT received from user ${alert.userId} at ${alert.latitude}, ${alert.longitude}`);

    // 1. Persist to database
    const createDTO: ICreateSOSAlertDTO = {
      guardId: alert.userId,
      latitude: alert.latitude,
      longitude: alert.longitude,
      accuracy: alert.accuracy,
      message: alert.message,
      priority: alert.priority as any,
    };

    const savedAlert = await this.sosAlertRepository.create(createDTO);
    logger.info(`SOS Alert persisted with ID: ${savedAlert.id}`);

    // 2. Broadcast to ALL supervisors with high priority
    const io = getIoInstance();
    io.of(WS_NAMESPACES.SUPERVISORS).to('command_center').emit(WS_EVENTS.SOS_BROADCAST, {
      alertId: savedAlert.id,
      userId: alert.userId,
      latitude: alert.latitude,
      longitude: alert.longitude,
      timestamp: alert.timestamp,
      message: alert.message || 'EMERGENCY: SOS Triggered',
      priority: savedAlert.priority,
    });

    // 3. Broadcast to nearby guards (optional feature)
    // Find guards within 500m using repository
    const nearbyGuards = await this.sosAlertRepository.findNearbyGuards(
      alert.latitude,
      alert.longitude,
      500,
      alert.userId
    );

    nearbyGuards.forEach(guard => {
      io.of(WS_NAMESPACES.GUARDS).to(`guard:${guard.guardId}`).emit(WS_EVENTS.ALERT_NOTIFICATION, {
        type: 'nearby_sos',
        message: 'A guard nearby has triggered an SOS!',
        location: { latitude: alert.latitude, longitude: alert.longitude },
        distance: guard.distance,
      });
    });

    logger.info(`SOS broadcast to ${nearbyGuards.length} nearby guards`);
  }

  /**
   * Get all currently online/active guards
   */
  getActiveGuards() {
    return Array.from(this.activeGuards.values());
  }

  /**
   * Get active guards from database (more accurate)
   */
  async getActiveGuardsFromDB() {
    const guardLocations = await this.locationHistoryRepository.findActiveGuardsLocations();
    return Array.from(guardLocations.values());
  }

  /**
   * Clear a guard when they disconnect
   */
  removeGuard(userId: number) {
    this.activeGuards.delete(userId);
  }

  /**
   * Persist location update to database
   */
  private async persistLocationUpdate(update: ILocationUpdate): Promise<void> {
    const dto: ICreateLocationHistoryDTO = {
      guardId: update.userId,
      latitude: update.latitude,
      longitude: update.longitude,
      accuracy: update.accuracy,
      speed: update.speed,
      bearing: update.bearing,
      altitude: update.altitude,
      batteryLevel: update.batteryLevel,
      isActiveShift: update.isActiveShift ?? true,
      activePatrolRunId: update.activePatrolId,
    };

    await this.locationHistoryRepository.create(dto);
  }

  /**
   * Get location statistics
   */
  async getLocationStatistics() {
    return await this.locationHistoryRepository.getStatistics();
  }

  /**
   * Get SOS statistics
   */
  async getSOSStatistics() {
    return await this.sosAlertRepository.getStatistics();
  }
}

let instance: RealTimeService | null = null;

export function initializeRealTimeService(
  geofenceService: GeofenceService,
  sosAlertRepository: ISOSAlertRepository,
  locationHistoryRepository: ILocationHistoryRepository
): RealTimeService {
  instance = new RealTimeService(
    geofenceService,
    sosAlertRepository,
    locationHistoryRepository
  );
  return instance;
}

export function getRealTimeService(): RealTimeService {
  if (!instance) throw new Error('RealTimeService not initialized');
  return instance;
}

export default RealTimeService;
