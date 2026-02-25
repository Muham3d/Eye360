/**
 * SOS Alert Sequelize Model
 *
 * @module infrastructure/database/models
 */

import { Model, DataTypes, Sequelize } from 'sequelize';
import { SOSStatus, SOSPriority } from '../../../core/domain/entities/SOSAlert.js';

/**
 * SOS Alert Model Definition
 */
export class SOSAlertModel extends Model {
  public id!: number;
  public guardId!: number;
  public latitude!: number;
  public longitude!: number;
  public accuracy?: number;
  public status!: SOSStatus;
  public priority!: SOSPriority;
  public message?: string;
  public acknowledgedById?: number;
  public acknowledgedAt?: Date;
  public dispatchedToId?: number;
  public dispatchedAt?: Date;
  public resolvedAt?: Date;
  public resolutionNotes?: string;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Timestamps for tracking
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

/**
 * Initialize SOS Alert Model
 */
export function init(sequelize: Sequelize): typeof SOSAlertModel {
  SOSAlertModel.init(
    {
      id: {
        type: DataTypes.INTEGER,
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
        onDelete: 'SET NULL', // Keep SOS record even if guard is deleted
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
      status: {
        type: DataTypes.ENUM(...Object.values(SOSStatus)),
        allowNull: false,
        defaultValue: SOSStatus.TRIGGERED,
      },
      priority: {
        type: DataTypes.ENUM(...Object.values(SOSPriority)),
        allowNull: false,
        defaultValue: SOSPriority.HIGH,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      acknowledgedById: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      acknowledgedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      dispatchedToId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      dispatchedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      resolutionNotes: {
        type: DataTypes.TEXT,
        allowNull: true,
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
      tableName: 'sos_alerts',
      timestamps: true,
      indexes: [
        {
          fields: ['guardId'],
        },
        {
          fields: ['status'],
        },
        {
          fields: ['priority'],
        },
        {
          fields: ['createdAt'],
        },
      ],
    }
  );

  return SOSAlertModel;
}

export default SOSAlertModel;
