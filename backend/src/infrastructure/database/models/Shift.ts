/**
 * Shift Model
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { Sequelize } from 'sequelize';

export enum ShiftStatus {
  SCHEDULED = 'scheduled',
  CLOCKED_IN = 'clocked_in',
  CLOCKED_OUT = 'clocked_out',
  MISSED = 'missed',
  CANCELLED = 'cancelled',
}

export enum ShiftType {
  REGULAR = 'regular',
  OVERTIME = 'overtime',
  EMERGENCY = 'emergency',
  TRAINING = 'training',
}

interface ShiftAttributes {
  id: number;
  site_id: number;
  guard_id: number;
  status: string;
  type: string;
  scheduled_start: Date;
  scheduled_end: Date;
  actual_start: Date | null;
  actual_end: Date | null;
  clock_in_location: any | null;
  clock_out_location: any | null;
  notes: string | null;
  missed_reason: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ShiftCreationAttributes extends Optional<ShiftAttributes, 'id' | 'actual_start' | 'actual_end' | 'clock_in_location' | 'clock_out_location' | 'notes' | 'missed_reason' | 'created_at' | 'updated_at'> {}

class Shift extends Model<ShiftAttributes, ShiftCreationAttributes> implements ShiftAttributes {
  public id!: number;
  public site_id!: number;
  public guard_id!: number;
  public status!: string;
  public type!: string;
  public scheduled_start!: Date;
  public scheduled_end!: Date;
  public actual_start!: Date | null;
  public actual_end!: Date | null;
  public clock_in_location!: any | null;
  public clock_out_location!: any | null;
  public notes!: string | null;
  public missed_reason!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  static init(sequelize: Sequelize) {
    return super.init.call(this, {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      site_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      guard_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('scheduled', 'clocked_in', 'clocked_out', 'missed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      type: {
        type: DataTypes.ENUM('regular', 'overtime', 'emergency', 'training'),
        allowNull: false,
        defaultValue: 'regular',
      },
      scheduled_start: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      scheduled_end: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      actual_start: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      actual_end: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      clock_in_location: {
        type: DataTypes.GEOMETRY('POINT', 4326),
        allowNull: true,
      },
      clock_out_location: {
        type: DataTypes.GEOMETRY('POINT', 4326),
        allowNull: true,
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      missed_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    }, {
      sequelize,
      tableName: 'shifts',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    });
  }

  static associate(models: any) {
    Shift.belongsTo(models.Site, { foreignKey: 'site_id', as: 'site' });
    Shift.belongsTo(models.User, { foreignKey: 'guard_id', as: 'guard' });
  }
}

export default Shift;
