/**
 * Location History Sequelize Model
 *
 * @module infrastructure/database/models
 */

import { Model, DataTypes, Sequelize } from 'sequelize';
import { LocationBatchStatus } from '../../../core/domain/entities/LocationHistory.js';

/**
 * Location History Model Definition
 */
export class LocationHistoryModel extends Model {
  public id!: number;
  public guardId!: number;
  public latitude!: number;
  public longitude!: number;
  public accuracy?: number;
  public speed?: number; // m/s
  public bearing?: number; // degrees
  public altitude?: number; // meters
  public batteryLevel?: number; // percentage
  public isActiveShift!: boolean;
  public activePatrolRunId?: number;
  public batchId?: string;
  public status!: LocationBatchStatus;
  public receivedAt!: Date;
  public createdAt!: Date;
  public readonly updatedAt!: Date;
}

/**
 * Initialize Location History Model
 */
export function init(sequelize: Sequelize): typeof LocationHistoryModel {
  LocationHistoryModel.init(
    {
      id: {
        type: DataTypes.BIGINT,
        primaryKey: true,
        autoIncrement: true,
      },
      guardId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE', // Clean up location history when guard is deleted
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false,
      },
      accuracy: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        comment: 'GPS accuracy in meters',
      },
      speed: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        comment: 'Speed in meters per second',
      },
      bearing: {
        type: DataTypes.DECIMAL(6, 2),
        allowNull: true,
        comment: 'Direction in degrees (0-359)',
      },
      altitude: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Altitude in meters',
      },
      batteryLevel: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Battery level percentage (0-100)',
      },
      isActiveShift: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      activePatrolRunId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'patrol_runs',
          key: 'id',
        },
      },
      batchId: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'Batch ID for grouping location updates',
      },
      status: {
        type: DataTypes.ENUM(...Object.values(LocationBatchStatus)),
        allowNull: false,
        defaultValue: LocationBatchStatus.PROCESSED,
      },
      receivedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the location was received by the server',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      tableName: 'location_history',
      timestamps: true,
      indexes: [
        {
          fields: ['guardId'],
        },
        {
          fields: ['batchId'],
        },
        {
          fields: ['activePatrolRunId'],
        },
        {
          fields: ['receivedAt'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['guardId', 'receivedAt'],
          name: 'idx_guard_time',
        },
        // Composite index for time-series queries
        {
          fields: ['guardId', 'isActiveShift', 'receivedAt'],
        },
      ],
    }
  );

  return LocationHistoryModel;
}

export default LocationHistoryModel;
