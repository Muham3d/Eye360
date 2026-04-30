/**
 * Audit Log Model
 *
 * Sequelize model for audit log entries.
 *
 * @module infrastructure/database/models
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database.js';
import { setAuditLogModel } from '../repositories/SequelizeAuditLogRepository.js';

/**
 * Audit Log Attributes
 */
interface AuditLogAttributes {
  id: number;
  tenantId: string;
  userId: number;
  userName: string;
  userEmail: string;
  action: string;
  entityType?: string;
  entityId?: number;
  entityName?: string;
  severity: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  details?: string;
  result?: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Audit Log Creation Attributes
 */
type AuditLogCreationAttributes = Optional<AuditLogAttributes, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Audit Log Model Class
 */
export class AuditLogModel extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  declare id: number;
  declare tenantId: string;
  declare userId: number;
  declare userName: string;
  declare userEmail: string;
  declare action: string;
  declare entityType?: string;
  declare entityId?: number;
  declare entityName?: string;
  declare severity: string;
  declare ipAddress?: string;
  declare userAgent?: string;
  declare timestamp: Date;
  declare details?: string;
  declare result?: 'SUCCESS' | 'FAILURE';
  declare errorMessage?: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

// Initialize the model
AuditLogModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tenantId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      index: true,
      comment: 'Tenant identifier for multi-tenancy',
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      index: true,
      comment: 'User who performed the action',
    },
    userName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Name of the user',
    },
    userEmail: {
      type: DataTypes.STRING(255),
      allowNull: false,
      index: true,
      comment: 'Email of the user',
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false,
      index: true,
      comment: 'Action performed (e.g., LOGIN, USER_CREATED)',
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      index: true,
      comment: 'Type of entity affected (e.g., User, Site, Incident)',
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      index: true,
      comment: 'ID of the entity affected',
    },
    entityName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Name of the entity affected',
    },
    severity: {
      type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
      allowNull: false,
      index: true,
      defaultValue: 'MEDIUM',
      comment: 'Severity level of the action',
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      comment: 'IP address of the request',
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'User agent string of the request',
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      index: true,
      comment: 'When the action occurred',
    },
    details: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional details about the action',
    },
    result: {
      type: DataTypes.ENUM('SUCCESS', 'FAILURE'),
      allowNull: true,
      index: true,
      comment: 'Result of the action',
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if the action failed',
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    timestamps: true,
    indexes: [
      // Composite indexes for common queries
      {
        name: 'audit_logs_tenant_timestamp_idx',
        fields: ['tenantId', 'timestamp'],
      },
      {
        name: 'audit_logs_user_timestamp_idx',
        fields: ['userId', 'timestamp'],
      },
      {
        name: 'audit_logs_action_timestamp_idx',
        fields: ['action', 'timestamp'],
      },
      {
        name: 'audit_logs_entity_idx',
        fields: ['entityType', 'entityId'],
      },
      {
        name: 'audit_logs_severity_timestamp_idx',
        fields: ['severity', 'timestamp'],
      },
      {
        name: 'audit_logs_result_timestamp_idx',
        fields: ['result', 'timestamp'],
      },
      // Index for security queries
      {
        name: 'audit_logs_security_idx',
        fields: ['severity', 'timestamp'],
        where: {
          severity: ['CRITICAL', 'HIGH'],
        },
      },
      // Index for cleanup
      {
        name: 'audit_logs_retention_idx',
        fields: ['timestamp'],
      },
    ],
  }
);

// Register the model with the repository
setAuditLogModel(AuditLogModel);

export default AuditLogModel;
