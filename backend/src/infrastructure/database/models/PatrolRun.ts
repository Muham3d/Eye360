/**
 * PatrolRun Model
 * Records execution of patrol templates by guards
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { Sequelize } from 'sequelize';

// Enum for patrol run status
export enum PatrolRunStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
  FAILED = 'failed',
  SKIPPED = 'skipped',
}

// Enum for abandonment reasons
export enum AbandonmentReason {
  EMERGENCY = 'emergency',
  EQUIPMENT_FAILURE = 'equipment_failure',
  WEATHER = 'weather',
  SAFETY_CONCERN = 'safety_concern',
  SITE_ACCESS_DENIED = 'site_access_denied',
  SHIFT_ENDED = 'shift_ended',
  OTHER = 'other',
}

// TypeScript interface for PatrolRun attributes
interface PatrolRunAttributes {
  id: number;
  template_id: number;
  site_id: number;
  guard_id: number;
  status: string;
  scheduled_start: Date;
  scheduled_end: Date;
  actual_start: Date | null;
  actual_end: Date | null;
  start_location: string | null;
  end_location: string | null;
  total_distance_meters: number | null;
  completion_percentage: number;
  checkpoints_completed: number;
  checkpoints_total: number;
  abandonment_reason: string | null;
  abandonment_notes: string | null;
  supervisor_notes: string | null;
  is_late_start: boolean;
  is_late_completion: boolean;
  deviation_score: number | null;
  supervisor_id: number | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// TypeScript interface for PatrolRun creation attributes
interface PatrolRunCreationAttributes extends Optional<PatrolRunAttributes, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'actual_start' | 'actual_end' | 'start_location' | 'end_location' | 'total_distance_meters' | 'completion_percentage' | 'checkpoints_completed' | 'abandonment_reason' | 'abandonment_notes' | 'supervisor_notes' | 'is_late_start' | 'is_late_completion' | 'deviation_score' | 'supervisor_id'> {}

/**
 * PatrolRun Model Definition
 * Stores execution records of patrol runs
 */
class PatrolRun extends Model<PatrolRunAttributes, PatrolRunCreationAttributes> implements PatrolRunAttributes {
  public id!: number;
  public template_id!: number;
  public site_id!: number;
  public guard_id!: number;
  public status!: string;
  public scheduled_start!: Date;
  public scheduled_end!: Date;
  public actual_start!: Date | null;
  public actual_end!: Date | null;
  public start_location!: string | null;
  public end_location!: string | null;
  public total_distance_meters!: number | null;
  public completion_percentage!: number;
  public checkpoints_completed!: number;
  public checkpoints_total!: number;
  public abandonment_reason!: string | null;
  public abandonment_notes!: string | null;
  public supervisor_notes!: string | null;
  public is_late_start!: boolean;
  public is_late_completion!: boolean;
  public deviation_score!: number | null;
  public supervisor_id!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  /**
   * Initialize the PatrolRun model
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
        onDelete: 'RESTRICT',
        comment: 'Foreign key to patrol_templates table',
      },
      site_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'sites',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Foreign key to sites table',
      },
      guard_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Foreign key to users table (guard)',
      },
      status: {
        type: DataTypes.ENUM('scheduled', 'in_progress', 'paused', 'completed', 'abandoned', 'failed', 'skipped'),
        allowNull: false,
        defaultValue: 'scheduled',
        comment: 'Current status of the patrol run',
      },
      scheduled_start: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Scheduled start time',
      },
      scheduled_end: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Scheduled end time',
      },
      actual_start: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Actual start time',
      },
      actual_end: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Actual end time',
      },
      start_location: {
        type: DataTypes.GEOMETRY('POINT', 4326),
        allowNull: true,
        defaultValue: null,
        comment: 'Starting GPS location (PostGIS POINT, SRID 4326)',
      },
      end_location: {
        type: DataTypes.GEOMETRY('POINT', 4326),
        allowNull: true,
        defaultValue: null,
        comment: 'Ending GPS location (PostGIS POINT, SRID 4326)',
      },
      total_distance_meters: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        validate: {
          min: {
            args: [0],
            msg: 'Total distance cannot be negative',
          },
        },
        comment: 'Total distance traveled during patrol (meters)',
      },
      completion_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: 'Completion percentage cannot be negative',
          },
          max: {
            args: [100],
            msg: 'Completion percentage cannot exceed 100',
          },
        },
        comment: 'Percentage of checkpoints completed (0-100)',
      },
      checkpoints_completed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: 'Checkpoints completed cannot be negative',
          },
        },
        comment: 'Number of checkpoints successfully completed',
      },
      checkpoints_total: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [1],
            msg: 'At least 1 checkpoint must be defined',
          },
        },
        comment: 'Total number of checkpoints in this patrol',
      },
      abandonment_reason: {
        type: DataTypes.ENUM('emergency', 'equipment_failure', 'weather', 'safety_concern', 'site_access_denied', 'shift_ended', 'other'),
        allowNull: true,
        defaultValue: null,
        comment: 'Reason for patrol abandonment (if applicable)',
      },
      abandonment_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Additional notes about patrol abandonment',
      },
      supervisor_notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Notes from supervisor review',
      },
      is_late_start: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether patrol started after scheduled time',
      },
      is_late_completion: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether patrol completed after scheduled time',
      },
      deviation_score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true,
        defaultValue: null,
        validate: {
          min: {
            args: [0],
            msg: 'Deviation score cannot be negative',
          },
          max: {
            args: [100],
            msg: 'Deviation score cannot exceed 100',
          },
        },
        comment: 'Route deviation score (higher = more deviation)',
      },
      supervisor_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Supervisor who reviewed this patrol run',
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
      tableName: 'patrol_runs',
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
            status: ['scheduled', 'in_progress', 'paused'],
          },
        },
        completed: {
          where: {
            status: 'completed',
          },
        },
        byGuard: (guardId: number) => ({
          where: {
            guard_id: guardId,
          },
        }),
        bySite: (siteId: number) => ({
          where: {
            site_id: siteId,
          },
        }),
        byStatus: (status: string) => ({
          where: {
            status: status,
          },
        }),
        byDateRange: (startDate: Date, endDate: Date) => ({
          where: {
            scheduled_start: {
              [Sequelize.Op.gte]: startDate,
              [Sequelize.Op.lte]: endDate,
            },
          },
        }),
      },
      indexes: [
        {
          name: 'idx_patrol_runs_template_id',
          fields: ['template_id'],
        },
        {
          name: 'idx_patrol_runs_site_id',
          fields: ['site_id'],
        },
        {
          name: 'idx_patrol_runs_guard_id',
          fields: ['guard_id'],
        },
        {
          name: 'idx_patrol_runs_status',
          fields: ['status'],
        },
        {
          name: 'idx_patrol_runs_scheduled_start',
          fields: ['scheduled_start'],
        },
        {
          name: 'idx_patrol_runs_supervisor_id',
          fields: ['supervisor_id'],
        },
        {
          name: 'idx_patrol_runs_deleted_at',
          fields: ['deleted_at'],
        },
        // Composite indexes for common queries
        {
          name: 'idx_patrol_runs_guard_status',
          fields: ['guard_id', 'status'],
        },
        {
          name: 'idx_patrol_runs_site_status',
          fields: ['site_id', 'status'],
        },
        {
          name: 'idx_patrol_runs_scheduled_range',
          fields: ['scheduled_start', 'scheduled_end'],
        },
        // PostGIS GiST indexes
        {
          name: 'idx_patrol_runs_start_location',
          using: 'GIST',
          fields: ['start_location'],
        },
        {
          name: 'idx_patrol_runs_end_location',
          using: 'GIST',
          fields: ['end_location'],
        },
      ],
    });
  }

  /**
   * Define model associations
   */
  static associate(models: any) {
    // PatrolRun belongs to PatrolTemplate
    PatrolRun.belongsTo(models.PatrolTemplate, {
      foreignKey: 'template_id',
      as: 'template',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    // PatrolRun belongs to Site
    PatrolRun.belongsTo(models.Site, {
      foreignKey: 'site_id',
      as: 'site',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    // PatrolRun belongs to User (guard)
    PatrolRun.belongsTo(models.User, {
      foreignKey: 'guard_id',
      as: 'guard',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    // PatrolRun belongs to User (supervisor)
    PatrolRun.belongsTo(models.User, {
      foreignKey: 'supervisor_id',
      as: 'supervisor',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    // PatrolRun has many PatrolCheckpointLogs
    PatrolRun.hasMany(models.PatrolCheckpointLog, {
      foreignKey: 'patrol_run_id',
      as: 'checkpoint_logs',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  }

  /**
   * Check if patrol is currently active
   */
  isActive(): boolean {
    return ['scheduled', 'in_progress', 'paused'].includes(this.status);
  }

  /**
   * Check if patrol is completed
   */
  isCompleted(): boolean {
    return this.status === 'completed';
  }

  /**
   * Check if patrol was abandoned or failed
   */
  isFailed(): boolean {
    return ['abandoned', 'failed'].includes(this.status);
  }

  /**
   * Calculate duration in minutes
   */
  getDurationMinutes(): number | null {
    if (!this.actual_start || !this.actual_end) {
      return null;
    }
    const start = new Date(this.actual_start).getTime();
    const end = new Date(this.actual_end).getTime();
    return Math.round((end - start) / 60000); // Convert to minutes
  }

  /**
   * Check if patrol was late to start
   */
  isLateToStart(): boolean {
    if (!this.actual_start) {
      return false;
    }
    return new Date(this.actual_start) > new Date(this.scheduled_start);
  }

  /**
   * Check if patrol completed late
   */
  isLateToComplete(): boolean {
    if (!this.actual_end) {
      return false;
    }
    return new Date(this.actual_end) > new Date(this.scheduled_end);
  }

  /**
   * Get completion percentage as number
   */
  getCompletionPercentage(): number {
    return parseFloat(this.completion_percentage as unknown as string);
  }

  /**
   * Update completion statistics
   */
  updateCompletionStats(completed: number, total: number): void {
    this.checkpoints_completed = completed;
    this.checkpoints_total = total;
    this.completion_percentage = total > 0 ? (completed / total) * 100 : 0;

    // Auto-update status if all checkpoints completed
    if (completed >= total && this.status === 'in_progress') {
      this.status = 'completed';
      this.actual_end = new Date();
    }
  }
}

export default PatrolRun;
