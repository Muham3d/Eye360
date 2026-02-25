/**
 * Incident Comment Model
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { Sequelize } from 'sequelize';

interface IncidentCommentAttributes {
  id: number;
  incident_id: number;
  user_id: number;
  comment: string;
  created_at: Date;
}

interface IncidentCommentCreationAttributes extends Optional<IncidentCommentAttributes, 'id' | 'created_at'> {}

class IncidentComment extends Model<IncidentCommentAttributes, IncidentCommentCreationAttributes> implements IncidentCommentAttributes {
  public id!: number;
  public incident_id!: number;
  public user_id!: number;
  public comment!: string;
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
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    }, {
      sequelize,
      tableName: 'incident_comments',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
    });
  }

  static associate(models: any) {
    IncidentComment.belongsTo(models.Incident, { foreignKey: 'incident_id', as: 'incident' });
    IncidentComment.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  }
}

export default IncidentComment;
