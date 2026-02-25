/**
 * SOS Alert Domain Entity
 *
 * Represents an emergency SOS/Panic alert triggered by a guard.
 * Contains location, timestamp, status, and dispatch information.
 *
 * @module core/domain/entities
 */

import { GPSLocation } from '../value-objects/GPSLocation.js';

/**
 * SOS Alert Status
 */
export enum SOSStatus {
  TRIGGERED = 'triggered',
  ACKNOWLEDGED = 'acknowledged',
  DISPATCHED = 'dispatched',
  RESOLVED = 'resolved',
  FALSE_ALARM = 'false_alarm',
}

/**
 * SOS Alert Priority
 */
export enum SOSPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * SOS Alert Domain Entity
 */
export interface ISOSAlert {
  id: number;
  guardId: number;
  location: GPSLocation;
  status: SOSStatus;
  priority: SOSPriority;
  message?: string;
  acknowledgedById?: number;
  acknowledgedAt?: Date;
  dispatchedToId?: number;
  dispatchedAt?: Date;
  resolvedAt?: Date;
  resolutionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create SOS Alert DTO
 */
export interface ICreateSOSAlertDTO {
  guardId: number;
  latitude: number;
  longitude: number;
  accuracy?: number;
  message?: string;
  priority?: SOSPriority;
}

/**
 * Acknowledge SOS DTO
 */
export interface IAcknowledgeSOSDTO {
  acknowledgedById: number;
}

/**
 * Dispatch SOS DTO
 */
export interface IDispatchSOSDTO {
  dispatchedToId: number;
}

/**
 * Resolve SOS DTO
 */
export interface IResolveSOSDTO {
  resolvedById: number;
  status: SOSStatus.RESOLVED | SOSStatus.FALSE_ALARM;
  resolutionNotes?: string;
}

/**
 * Nearby Guard for SOS
 */
export interface INearbyGuard {
  guardId: number;
  guardName: string;
  distance: number; // meters from SOS location
  lastLocation: GPSLocation;
  lastSeen: Date;
}

/**
 * SOS Alert Statistics
 */
export interface ISOSStatistics {
  totalAlerts: number;
  activeAlerts: number;
  resolvedToday: number;
  averageResponseTime: number; // minutes
  falseAlarmRate: number; // percentage
}
