/**
 * Core Services Index
 *
 * Exports all service modules from the core layer.
 *
 * @module core/services
 */

// Authentication Services
export { JWTService, initializeJWTService, getJWTService } from './JWTService.js';
export { PasswordService, initializePasswordService, getPasswordService } from './PasswordService.js';
export { SessionService, initializeSessionService, getSessionService } from './SessionService.js';
export { AuthService, initializeAuthService, getAuthService } from './AuthService.js';

// Re-export types
export type {
  JWTPayload,
  TokenPair,
  TokenVerificationResult,
} from './JWTService.js';

export type {
  PasswordValidationResult,
} from './PasswordService.js';

export type {
  SessionValidationResult,
  SessionCreationOptions,
} from './SessionService.js';

export type {
  LoginCredentials,
  RegisterData,
  MobileLoginResult,
  WebLoginResult,
  TokenRefreshResult,
  PasswordResetRequestResult,
  PasswordResetResult,
  UserProfileResult,
} from './AuthService.js';

// User Management Services
export {
  UserService,
  initializeUserService,
  getUserService,
} from './UserService.js';

export {
  PermissionService,
  initializePermissionService,
  getPermissionService,
} from './PermissionService.js';

export {
  RoleService,
  initializeRoleService,
  getRoleService,
} from './RoleService.js';

// Re-export User Management Service types
export type {
  UserStatistics,
  CreateUserOptions,
  UpdateUserOptions,
  UserListOptions,
  RoleChangeResult,
  StatusChangeResult,
} from './UserService.js';

export type {
  PermissionCheckResult,
  UserPermissionsSummary,
  PermissionMatrixEntry,
} from './PermissionService.js';

export type {
  RoleDetails,
  RoleHierarchyInfo,
  RoleValidationResult,
  RoleComparisonResult,
  RoleSummary,
} from './RoleService.js';

// Geofencing Service
export {
  GeofenceService,
  initializeGeofenceService,
  getGeofenceService,
  DEFAULT_GEOFENCE_CONFIG,
} from './GeofenceService.js';

// Checkpoint Verification Service
export {
  CheckpointVerificationService,
  initializeCheckpointVerificationService,
  getCheckpointVerificationService,
} from './CheckpointVerificationService.js';

export type {
  ICheckpointVerificationData,
  IVerificationResult,
} from './CheckpointVerificationService.js';

export type {
  IGeofenceConfig,
  ILocationValidationResult,
  ICheckpointValidationResult,
  IGeofenceBreachEvent,
  IBufferZoneResult,
} from './GeofenceService.js';

// Patrol execution routes
export {
  PatrolExecutionService,
  initializePatrolExecutionService,
  getPatrolExecutionService,
} from './PatrolExecutionService.js';

// Site and Checkpoint Services
export {
  SiteService,
  initializeSiteService,
  getSiteService,
} from './SiteService.js';

export {
  CheckpointService,
  initializeCheckpointService,
  getCheckpointService,
} from './CheckpointService.js';

export {
  PatrolTemplateService,
  initializePatrolTemplateService,
  getPatrolTemplateService,
} from './PatrolTemplateService.js';

export {
  RealTimeService,
  initializeRealTimeService,
  getRealTimeService,
} from './RealTimeService.js';

export {
  IncidentService,
  initializeIncidentService,
  getIncidentService,
} from './IncidentService.js';

export {
  ShiftService,
  initializeShiftService,
  getShiftService,
} from './ShiftService.js';

export {
  ReportService,
  initializeReportService,
  getReportService,
} from './ReportService.js';

// File Storage Service (Phase 4)
export {
  FileStorageService,
  initializeFileStorageService,
  getFileStorageService,
} from './FileStorageService.js';

// PTT Notification Service (Phase 4)
export {
  PTTNotificationService,
  initializePTTNotificationService,
  getPTTNotificationService,
} from './PTTNotificationService.js';
