/**
 * PatrolTemplate Model
 * Defines reusable patrol routes with sequenced checkpoints
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { Sequelize } from 'sequelize';

// Enum for patrol type
export enum PatrolType {
  ROUTINE = 'routine',
  EMERGENCY = 'emergency',
  SPECIAL = 'special',
  TRAINING = 'training',
}

// Enum for patrol priority
export enum PatrolPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

// Enum for template status
export enum TemplateStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

// TypeScript interface for PatrolTemplate attributes
interface PatrolTemplateAttributes {
  id: number;
  site_id: number;
  name: string;
  code: string;
  description: string | null;
  type: string;
  priority: string;
  status: string;
  estimated_duration_minutes: number;
  required_guards: number;
  is_time_restricted: boolean;
  allowed_start_time: string | null;
  allowed_end_time: string | null;
  allowed_days: string | null;
  require_photo_evidence: boolean;
  require_checkpoint_notes: boolean;
  max_deviation_meters: number;
  created_by: number;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// TypeScript interface for PatrolTemplate creation attributes
interface PatrolTemplateCreationAttributes extends Optional<PatrolTemplateAttributes, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'description' | 'allowed_start_time' | 'allowed_end_time' | 'allowed_days'> {}

/**
 * PatrolTemplate Model Definition
 * Stores predefined patrol routes with checkpoint sequences
 */
class PatrolTemplate extends Model<PatrolTemplateAttributes, PatrolTemplateCreationAttributes> implements PatrolTemplateAttributes {
  public id!: number;
  public site_id!: number;
  public name!: string;
  public code!: string;
  public description!: string | null;
  public type!: string;
  public priority!: string;
  public status!: string;
  public estimated_duration_minutes!: number;
  public required_guards!: number;
  public is_time_restricted!: boolean;
  public allowed_start_time!: string | null;
  public allowed_end_time!: string | null;
  public allowed_days!: string | null;
  public require_photo_evidence!: boolean;
  public require_checkpoint_notes!: boolean;
  public max_deviation_meters!: number;
  public created_by!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  /**
   * Initialize the PatrolTemplate model
   */
  static init(sequelize: Sequelize) {
    return super.init.call(this, {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      site_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'sites',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to sites table',
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Template name cannot be empty',
          },
          len: {
            args: [1, 255],
            msg: 'Template name must be between 1 and 255 characters',
          },
        },
        comment: 'Human-readable template name',
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Template code cannot be empty',
          },
          is: {
            args: /^[A-Z0-9_-]+$/i,
            msg: 'Template code must contain only letters, numbers, hyphens, and underscores',
          },
        },
        comment: 'Unique template identifier',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Detailed template description',
      },
      type: {
        type: DataTypes.ENUM('routine', 'emergency', 'special', 'training'),
        allowNull: false,
        defaultValue: 'routine',
        comment: 'Type of patrol',
      },
      priority: {
        type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
        allowNull: false,
        defaultValue: 'normal',
        comment: 'Patrol priority level',
      },
      status: {
        type: DataTypes.ENUM('draft', 'active', 'inactive', 'archived'),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'Template status',
      },
      estimated_duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
        validate: {
          min: {
            args: [5],
            msg: 'Estimated duration must be at least 5 minutes',
          },
          max: {
            args: [480],
            msg: 'Estimated duration cannot exceed 8 hours',
          },
        },
        comment: 'Estimated time to complete patrol (minutes)',
      },
      required_guards: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: {
            args: [1],
            msg: 'At least 1 guard is required',
          },
          max: {
            args: [10],
            msg: 'Cannot exceed 10 guards per patrol',
          },
        },
        comment: 'Number of guards required for this patrol',
      },
      is_time_restricted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether patrol can only be done during specific hours',
      },
      allowed_start_time: {
        type: DataTypes.STRING(5),
        allowNull: true,
        defaultValue: null,
        validate: {
          is: {
            args: /^([01]\d|2[0-3]):([0-5]\d)$/,
            msg: 'Must be in HH:MM format (24-hour)',
          },
        },
        comment: 'Earliest allowed start time (HH:MM)',
      },
      allowed_end_time: {
        type: DataTypes.STRING(5),
        allowNull: true,
        defaultValue: null,
        validate: {
          is: {
            args: /^([01]\d|2[0-3]):([0-5]\d)$/,
            msg: 'Must be in HH:MM format (24-hour)',
          },
        },
        comment: 'Latest allowed start time (HH:MM)',
      },
      allowed_days: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: null,
        comment: 'Comma-separated allowed days (e.g., "1,2,3,4,5" for weekdays)',
      },
      require_photo_evidence: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether photo evidence is required at checkpoints',
      },
      require_checkpoint_notes: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether notes are required at checkpoints',
      },
      max_deviation_meters: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 50,
        validate: {
          min: {
            args: [0],
            msg: 'Max deviation cannot be negative',
          },
          max: {
            args: [200],
            msg: 'Max deviation cannot exceed 200 meters',
          },
        },
        comment: 'Maximum allowed GPS deviation from route (meters)',
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'User who created this template',
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
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Soft delete timestamp (null if not deleted)',
      },
    }, {
      sequelize,
      tableName: 'patrol_templates',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      paranoid: true,
      deletedAt: 'deleted_at',
      defaultScope: {
        where: {
          deleted_at: null,
        },
      },
      scopes: {
        active: {
          where: {
            status: 'active',
          },
        },
        draft: {
          where: {
            status: 'draft',
          },
        },
        bySite: (siteId: number) => ({
          where: {
            site_id: siteId,
          },
        }),
        byType: (type: string) => ({
          where: {
            type: type,
          },
        }),
      },
      indexes: [
        {
          name: 'idx_patrol_templates_site_id',
          fields: ['site_id'],
        },
        {
          name: 'idx_patrol_templates_code',
          fields: ['code'],
        },
        {
          name: 'idx_patrol_templates_status',
          fields: ['status'],
        },
        {
          name: 'idx_patrol_templates_type',
          fields: ['type'],
        },
        {
          name: 'idx_patrol_templates_created_by',
          fields: ['created_by'],
        },
        {
          name: 'idx_patrol_templates_deleted_at',
          fields: ['deleted_at'],
        },
        {
          name: 'idx_patrol_templates_site_status',
          fields: ['site_id', 'status'],
        },
      ],
    });
  }

  /**
   * Define model associations
   */
  static associate(models: any) {
    // PatrolTemplate belongs to Site
    PatrolTemplate.belongsTo(models.Site, {
      foreignKey: 'site_id',
      as: 'site',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // PatrolTemplate belongs to User (creator)
    PatrolTemplate.belongsTo(models.User, {
      foreignKey: 'created_by',
      as: 'creator',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    // PatrolTemplate has many PatrolCheckpoints
    PatrolTemplate.hasMany(models.PatrolCheckpoint, {
      foreignKey: 'template_id',
      as: 'patrol_checkpoints',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // PatrolTemplate has many PatrolRuns
    PatrolTemplate.hasMany(models.PatrolRun, {
      foreignKey: 'template_id',
      as: 'patrol_runs',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  }

  /**
   * Check if template is active
   */
  isActive(): boolean {
    return this.status === 'active';
  }

  /**
   * Check if template can be scheduled now
   */
  canBeScheduledNow(): boolean {
    if (!this.isActive() || !this.is_time_restricted) {
      return this.isActive();
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentMinutes = currentHour * 60 + currentMinute;
    const currentDay = now.getDay(); // 0 = Sunday, 6 = Saturday

    // Check day restrictions
    if (this.allowed_days) {
      const allowedDays = this.allowed_days.split(',').map(Number);
      if (!allowedDays.includes(currentDay)) {
        return false;
      }
    }

    // Check time restrictions
    if (this.allowed_start_time && this.allowed_end_time) {
      const parseTime = (time: string): number => {
        const [hour, minute] = time.split(':').map(Number);
        return hour * 60 + minute;
      };

      const startMinutes = parseTime(this.allowed_start_time);
      const endMinutes = parseTime(this.allowed_end_time);

      // Handle overnight time ranges
      if (endMinutes < startMinutes) {
        return currentMinutes >= startMinutes || currentMinutes < endMinutes;
      }

      return currentMinutes >= startMinutes && currentMinutes < endMinutes;
    }

    return true;
  }

  /**
   * Parse allowed days array
   */
  getAllowedDays(): number[] | null {
    if (!this.allowed_days) {
      return null;
    }
    return this.allowed_days.split(',').map(Number);
  }
}

export default PatrolTemplate;
