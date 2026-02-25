/**
 * Incident Model
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { Sequelize } from 'sequelize';

export enum IncidentStatus {
  NEW = 'new',
  INVESTIGATING = 'investigating',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum IncidentPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum IncidentType {
  SECURITY = 'security',
  SAFETY = 'safety',
  MAINTENANCE = 'maintenance',
  MEDICAL = 'medical',
  OTHER = 'other',
}

interface IncidentAttributes {
  id: number;
  site_id: number;
  reported_by: number;
  assigned_to: number | null;
  title: string;
  description: string;
  type: string;
  priority: string;
  status: string;
  location: any | null;
  patrol_run_id: number | null;
  resolved_at: Date | null;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface IncidentCreationAttributes extends Optional<IncidentAttributes, 'id' | 'assigned_to' | 'location' | 'patrol_run_id' | 'resolved_at' | 'closed_at' | 'created_at' | 'updated_at'> {}

class Incident extends Model<IncidentAttributes, IncidentCreationAttributes> implements IncidentAttributes {
  public id!: number;
  public site_id!: number;
  public reported_by!: number;
  public assigned_to!: number | null;
  public title!: string;
  public description!: string;
  public type!: string;
  public priority!: string;
  public status!: string;
  public location!: any | null;
  public patrol_run_id!: number | null;
  public resolved_at!: Date | null;
  public closed_at!: Date | null;
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
      reported_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      assigned_to: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('security', 'safety', 'maintenance', 'medical', 'other'),
        allowNull: false,
        defaultValue: 'other',
      },
      priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
        allowNull: false,
        defaultValue: 'medium',
      },
      status: {
        type: DataTypes.ENUM('new', 'investigating', 'resolved', 'closed'),
        allowNull: false,
        defaultValue: 'new',
      },
      location: {
        type: DataTypes.GEOMETRY('POINT', 4326),
        allowNull: true,
      },
      patrol_run_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      resolved_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      closed_at: {
        type: DataTypes.DATE,
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
      tableName: 'incidents',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    });
  }

  static associate(models: any) {
    Incident.belongsTo(models.Site, { foreignKey: 'site_id', as: 'site' });
    Incident.belongsTo(models.User, { foreignKey: 'reported_by', as: 'reporter' });
    Incident.belongsTo(models.User, { foreignKey: 'assigned_to', as: 'assignee' });
    Incident.belongsTo(models.PatrolRun, { foreignKey: 'patrol_run_id', as: 'patrol_run' });
    Incident.hasMany(models.IncidentEvidence, { foreignKey: 'incident_id', as: 'evidence' });
    Incident.hasMany(models.IncidentComment, { foreignKey: 'incident_id', as: 'comments' });
  }
}

export default Incident;
