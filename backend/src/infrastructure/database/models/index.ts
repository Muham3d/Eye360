/**
 * Sequelize Database Models Index
 * Initializes and exports all Sequelize models with associations
 */

import { Sequelize } from 'sequelize';
import config from '../../config/database.js';

// RBAC Models (Phase 1)
import Role from './Role.js';
import Permission from './Permission.js';
import User from './User.js';
import UserSession from './UserSession.js';
import RolePermission from './RolePermission.js';

// Patrol Models (Phase 2)
import Site from './Site.js';
import Checkpoint from './Checkpoint.js';
import PatrolTemplate from './PatrolTemplate.js';
import PatrolCheckpoint from './PatrolCheckpoint.js';
import PatrolRun from './PatrolRun.js';
import PatrolCheckpointLog from './PatrolCheckpointLog.js';

// Incident Models (Phase 4)
import Incident from './Incident.js';
import IncidentEvidence from './IncidentEvidence.js';
import IncidentComment from './IncidentComment.js';

// HR Models (Phase 5)
import Shift from './Shift.js';

// Real-time Models (Phase 3)
import SOSAlertModel, { init as initSOSAlert } from './SOSAlert.js';
import LocationHistoryModel, { init as initLocationHistory } from './LocationHistory.js';

// Initialize Sequelize connection
const dbConfig = config.getCurrentConfig();
const sequelize = new Sequelize(dbConfig);

// Initialize models
const models = {
  // RBAC Models
  Role: Role.init(sequelize),
  Permission: Permission.init(sequelize),
  User: User.init(sequelize),
  UserSession: UserSession.init(sequelize),
  RolePermission: RolePermission.init(sequelize),

  // Patrol Models
  Site: Site.init(sequelize),
  Checkpoint: Checkpoint.init(sequelize),
  PatrolTemplate: PatrolTemplate.init(sequelize),
  PatrolCheckpoint: PatrolCheckpoint.init(sequelize),
  PatrolRun: PatrolRun.init(sequelize),
  PatrolCheckpointLog: PatrolCheckpointLog.init(sequelize),

  // Incident Models
  Incident: Incident.init(sequelize),
  IncidentEvidence: IncidentEvidence.init(sequelize),
  IncidentComment: IncidentComment.init(sequelize),

  // HR Models
  Shift: Shift.init(sequelize),

  // Real-time Models (Phase 3)
  SOSAlert: initSOSAlert(sequelize),
  LocationHistory: initLocationHistory(sequelize),
};

// Define associations
Object.keys(models).forEach((modelName) => {
  if ('associate' in models[modelName]) {
    models[modelName].associate(models);
  }
});

// Export models and sequelize instance
export { sequelize };
export default models;

/**
 * Database Connection Test
 * Call this function to verify database connectivity
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('Unable to connect to the database:', error);
    return false;
  }
};

/**
 * Synchronize all models with database
 * WARNING: Use { force: true } only in development to drop existing tables
 */
export const syncDatabase = async (force = false): Promise<void> => {
  try {
    await sequelize.sync({ force, alter: !force });
    console.log('Database synchronized successfully.');
  } catch (error) {
    console.error('Error synchronizing database:', error);
    throw error;
  }
};
