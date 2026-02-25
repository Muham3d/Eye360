/**
 * PatrolCheckpoint Model
 * Join table linking PatrolTemplates to Checkpoints with sequence order
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { Sequelize } from 'sequelize';

// TypeScript interface for PatrolCheckpoint attributes
interface PatrolCheckpointAttributes {
  id: number;
  template_id: number;
  checkpoint_id: number;
  sequence_order: number;
  is_mandatory: boolean;
  time_limit_seconds: number | null;
  notes_required: boolean;
  photo_required: boolean;
  special_instructions: string | null;
  created_at: Date;
  updated_at: Date;
}

// TypeScript interface for PatrolCheckpoint creation attributes
interface PatrolCheckpointCreationAttributes extends Optional<PatrolCheckpointAttributes, 'id' | 'created_at' | 'updated_at' | 'time_limit_seconds' | 'notes_required' | 'photo_required' | 'special_instructions'> {}

/**
 * PatrolCheckpoint Model Definition
 * Defines the sequence of checkpoints within a patrol template
 */
class PatrolCheckpoint extends Model<PatrolCheckpointAttributes, PatrolCheckpointCreationAttributes> implements PatrolCheckpointAttributes {
  public id!: number;
  public template_id!: number;
  public checkpoint_id!: number;
  public sequence_order!: number;
  public is_mandatory!: boolean;
  public time_limit_seconds!: number | null;
  public notes_required!: boolean;
  public photo_required!: boolean;
  public special_instructions!: string | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  /**
   * Initialize the PatrolCheckpoint model
   */
  static init(sequelize: Sequelize) {
    return super.init.call(this, {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      template_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'patrol_templates',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to patrol_templates table',
      },
      checkpoint_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'checkpoints',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to checkpoints table',
      },
      sequence_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: {
            args: [0],
            msg: 'Sequence order cannot be negative',
          },
        },
        comment: 'Order in which checkpoint should be visited (0 = first)',
      },
      is_mandatory: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether checkpoint must be completed',
      },
      time_limit_seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        validate: {
          min: {
            args: [30],
            msg: 'Time limit must be at least 30 seconds',
          },
          max: {
            args: [3600],
            msg: 'Time limit cannot exceed 1 hour',
          },
        },
        comment: 'Maximum time allowed at this checkpoint (optional)',
      },
      notes_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether guard must enter notes at this checkpoint',
      },
      photo_required: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether guard must take photo at this checkpoint',
      },
      special_instructions: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Special instructions for this checkpoint',
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
      tableName: 'patrol_checkpoints',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          name: 'idx_patrol_checkpoints_template_id',
          fields: ['template_id'],
        },
        {
          name: 'idx_patrol_checkpoints_checkpoint_id',
          fields: ['checkpoint_id'],
        },
        {
          name: 'idx_patrol_checkpoints_template_sequence',
          fields: ['template_id', 'sequence_order'],
          unique: true,
        },
        // Composite unique index for template + checkpoint
        {
          name: 'idx_patrol_checkpoints_template_checkpoint',
          unique: true,
          fields: ['template_id', 'checkpoint_id'],
        },
      ],
    });
  }

  /**
   * Define model associations
   */
  static associate(models: any) {
    // PatrolCheckpoint belongs to PatrolTemplate
    PatrolCheckpoint.belongsTo(models.PatrolTemplate, {
      foreignKey: 'template_id',
      as: 'template',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // PatrolCheckpoint belongs to Checkpoint
    PatrolCheckpoint.belongsTo(models.Checkpoint, {
      foreignKey: 'checkpoint_id',
      as: 'checkpoint',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // PatrolCheckpoint has many PatrolCheckpointLogs
    PatrolCheckpoint.hasMany(models.PatrolCheckpointLog, {
      foreignKey: 'patrol_checkpoint_id',
      as: 'logs',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  }

  /**
   * Check if this checkpoint has a time limit
   */
  hasTimeLimit(): boolean {
    return this.time_limit_seconds !== null && this.time_limit_seconds > 0;
  }

  /**
   * Get time limit in minutes
   */
  getTimeLimitMinutes(): number | null {
    if (!this.time_limit_seconds) {
      return null;
    }
    return Math.ceil(this.time_limit_seconds / 60);
  }
}

export default PatrolCheckpoint;
