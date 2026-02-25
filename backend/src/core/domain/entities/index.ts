/**
 * Domain Entities Index
 *
 * Exports all domain entity classes.
 *
 * @module core/domain/entities
 */

// Site Entity
export * from './Site.js';

// Checkpoint Entity
export * from './Checkpoint.js';

// Patrol Template Entity
export * from './PatrolTemplate.js';

// Patrol Checkpoint Entity (join table)
export * from './PatrolCheckpoint.js';

// Patrol Run Entity
export * from './PatrolRun.js';

// Patrol Checkpoint Log Entity
export * from './PatrolCheckpointLog.js';

// SOS Alert Entity (Phase 3 - Real-time Command & SOS)
export * from './SOSAlert.js';

// Location History Entity (Phase 3 - Real-time tracking)
export * from './LocationHistory.js';

// Incident Entity (Phase 4 - Incidents & Communication)
export * from './Incident.js';
