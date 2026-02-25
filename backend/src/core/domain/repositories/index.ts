/**
 * Domain Repositories Index
 *
 * Exports all repository interfaces.
 *
 * @module core/domain/repositories
 */

// User Repository
export * from './IUserRepository.js';

// Site Repository
export * from './ISiteRepository.js';

// Checkpoint Repository
export * from './ICheckpointRepository.js';

// Patrol Template Repository
export * from './IPatrolTemplateRepository.js';

// Patrol Checkpoint Repository
export * from './IPatrolCheckpointRepository.js';

// Patrol Run Repository
export * from './IPatrolRunRepository.js';

// Patrol Checkpoint Log Repository
export * from './IPatrolCheckpointLogRepository.js';

// Shift Repository (Phase 5)
export * from './IShiftRepository.js';

// Incident Repository (Phase 4)
export * from './IIncidentRepository.js';

// SOS Alert Repository (Phase 3 - Real-time)
export * from './ISOSAlertRepository.js';

// Location History Repository (Phase 3 - Real-time)
export * from './ILocationHistoryRepository.js';
