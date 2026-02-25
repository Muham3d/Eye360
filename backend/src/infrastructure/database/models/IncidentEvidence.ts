/**
 * Incident Evidence Model
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { Sequelize } from 'sequelize';

interface IncidentEvidenceAttributes {
  id: number;
  incident_id: number;
  file_path: string;
  file_type: string;
  caption: string | null;
  created_at: Date;
}

interface IncidentEvidenceCreationAttributes extends Optional<IncidentEvidenceAttributes, 'id' | 'caption' | 'created_at'> {}

class IncidentEvidence extends Model<IncidentEvidenceAttributes, IncidentEvidenceCreationAttributes> implements IncidentEvidenceAttributes {
  public id!: number;
  public incident_id!: number;
  public file_path!: string;
  public file_type!: string;
  public caption!: string | null;
  public readonly created_at!: Date;

  static init(sequelize: Sequelize) {
    return super.init.call(this, {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      incident_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      file_path: {
        type: DataTypes.STRING(500),
        allowNull: false,
      },
      file_type: {
        type: DataTypes.ENUM('image', 'video', 'audio'),
        allowNull: false,
      },
      caption: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    }, {
      sequelize,
      tableName: 'incident_evidence',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    });
  }

  static associate(models: any) {
    IncidentEvidence.belongsTo(models.Incident, { foreignKey: 'incident_id', as: 'incident' });
  }
}

export default IncidentEvidence;
