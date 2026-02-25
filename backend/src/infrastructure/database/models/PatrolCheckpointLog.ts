/**
 * PatrolCheckpointLog Model
 * Records checkpoint completion during patrol runs with GPS validation
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { Sequelize } from 'sequelize';

// Enum for verification status
export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  MANUALLY_APPROVED = 'manually_approved',
}

// Enum for verification methods
export enum VerificationMethod {
  GPS = 'gps',
  NFC = 'nfc',
  QR_CODE = 'qr_code',
  MANUAL = 'manual',
  PHOTO_ONLY = 'photo_only',
}

// TypeScript interface for PatrolCheckpointLog attributes
interface PatrolCheckpointLogAttributes {
  id: number;
  patrol_run_id: number;
  patrol_checkpoint_id: number;
  checkpoint_id: number;
  sequence_order: number;
  status: string;
  verified_at: Date | null;
  verification_method: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy_meters: number | null;
  distance_from_checkpoint: number | null;
  is_within_tolerance: boolean | null;
  nfc_tag_id: string | null;
  qr_code_data: string | null;
  photo_evidence_urls: string[] | null;
  notes: string | null;
  time_spent_seconds: number | null;
  attempted_at: Date | null;
  failed_reason: string | null;
  manually_approved_by: number | null;
  manually_approved_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// TypeScript interface for PatrolCheckpointLog creation attributes
interface PatrolCheckpointLogCreationAttributes extends Optional<PatrolCheckpointLogAttributes, 'id' | 'created_at' | 'updated_at' | 'verified_at' | 'verification_method' | 'location' | 'latitude' | 'longitude' | 'accuracy_meters' | 'distance_from_checkpoint' | 'is_within_tolerance' | 'nfc_tag_id' | 'qr_code_data' | 'photo_evidence_urls' | 'notes' | 'time_spent_seconds' | 'attempted_at' | 'failed_reason' | 'manually_approved_by' | 'manually_approved_at'> {}

/**
 * PatrolCheckpointLog Model Definition
 * Stores checkpoint completion logs with GPS verification data
 */
class PatrolCheckpointLog extends Model<PatrolCheckpointLogAttributes, PatrolCheckpointLogCreationAttributes> implements PatrolCheckpointLogAttributes {
  public id!: number;
  public patrol_run_id!: number;
  public patrol_checkpoint_id!: number;
  public checkpoint_id!: number;
  public sequence_order!: number;
  public status!: string;
  public verified_at!: Date | null;
  public verification_method!: string | null;
  public location!: string | null;
  public latitude!: number | null;
  public longitude!: number | null;
  public accuracy_meters!: number | null;
  public distance_from_checkpoint!: number | null;
  public is_within_tolerance!: boolean | null;
  public nfc_tag_id!: string | null;
  public qr_code_data!: string | null;
  public photo_evidence_urls!: string[] | null;
  public notes!: string | null;
  public time_spent_seconds!: number | null;
  public attempted_at!: Date | null;
  public failed_reason!: string | null;
  public manually_approved_by!: number | null;
  public manually_approved_at!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  /**
   * Initialize the PatrolCheckpointLog model
   */
  static init(sequelize: Sequelize) {
    return super.init.call(this, {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      patrol_run_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'patrol_runs',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to patrol_runs table',
      },
      patrol_checkpoint_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'patrol_checkpoints',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'Foreign key to patrol_checkpoints table',
      },
      checkpoint_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'checkpoints',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'Foreign key to checkpoints table',
      },
      sequence_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Order in which checkpoint was visited',
      },
      status: {
        type: DataTypes.ENUM('pending', 'verified', 'failed', 'skipped', 'manually_approved'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Verification status',
      },
      verified_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Timestamp when checkpoint was verified',
      },
      verification_method: {
        type: DataTypes.ENUM('gps', 'nfc', 'qr_code', 'manual', 'photo_only'),
        allowNull: true,
        defaultValue: null,
        comment: 'Method used for verification',
      },
      location: {
        type: DataTypes.GEOMETRY('POINT', 4326),
        allowNull: true,
        defaultValue: null,
        comment: 'GPS location at time of verification (PostGIS POINT, SRID 4326)',
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: true,
        defaultValue: null,
        validate: {
          min: {
            args: [-90],
            msg: 'Latitude must be between -90 and 90',
          },
          max: {
            args: [90],
            msg: 'Latitude must be between -90 and 90',
          },
        },
        comment: 'Reported latitude (decimal degrees)',
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: true,
        defaultValue: null,
        validate: {
          min: {
            args: [-180],
            msg: 'Longitude must be between -180 and 180',
          },
          max: {
            args: [180],
            msg: 'Longitude must be between -180 and 180',
          },
        },
        comment: 'Reported longitude (decimal degrees)',
      },
      accuracy_meters: {
        type: DataTypes.DECIMAL(8, 2),
        allowNull: true,
        defaultValue: null,
        validate: {
          min: {
            args: [0],
            msg: 'GPS accuracy cannot be negative',
          },
        },
        comment: 'GPS accuracy in meters',
      },
      distance_from_checkpoint: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
        validate: {
          min: {
            args: [0],
            msg: 'Distance cannot be negative',
          },
        },
        comment: 'Calculated distance from actual checkpoint location (meters)',
      },
      is_within_tolerance: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: null,
        comment: 'Whether location was within allowed tolerance',
      },
      nfc_tag_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: 'NFC tag ID used for verification',
      },
      qr_code_data: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: 'QR code data used for verification',
      },
      photo_evidence_urls: {
        type: DataTypes.ARRAY(DataTypes.STRING(500)),
        allowNull: true,
        defaultValue: null,
        comment: 'Array of photo evidence URLs',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Guard notes about this checkpoint',
      },
      time_spent_seconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        validate: {
          min: {
            args: [0],
            msg: 'Time spent cannot be negative',
          },
        },
        comment: 'Time spent at this checkpoint (seconds)',
      },
      attempted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'First attempt timestamp',
      },
      failed_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Reason for verification failure',
      },
      manually_approved_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who manually approved this checkpoint',
      },
      manually_approved_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Timestamp of manual approval',
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
      tableName: 'patrol_checkpoint_logs',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      scopes: {
        verified: {
          where: {
            status: 'verified',
          },
        },
        failed: {
          where: {
            status: 'failed',
          },
        },
        byPatrolRun: (patrolRunId: number) => ({
          where: {
            patrol_run_id: patrolRunId,
          },
        }),
        byCheckpoint: (checkpointId: number) => ({
          where: {
            checkpoint_id: checkpointId,
          },
        }),
      },
      indexes: [
        {
          name: 'idx_patrol_checkpoint_logs_patrol_run_id',
          fields: ['patrol_run_id'],
        },
        {
          name: 'idx_patrol_checkpoint_logs_patrol_checkpoint_id',
          fields: ['patrol_checkpoint_id'],
        },
        {
          name: 'idx_patrol_checkpoint_logs_checkpoint_id',
          fields: ['checkpoint_id'],
        },
        {
          name: 'idx_patrol_checkpoint_logs_status',
          fields: ['status'],
        },
        {
          name: 'idx_patrol_checkpoint_logs_verified_at',
          fields: ['verified_at'],
        },
        {
          name: 'idx_patrol_checkpoint_logs_manually_approved_by',
          fields: ['manually_approved_by'],
        },
        // Composite indexes
        {
          name: 'idx_patrol_checkpoint_logs_run_sequence',
          fields: ['patrol_run_id', 'sequence_order'],
        },
        {
          name: 'idx_patrol_checkpoint_logs_run_status',
          fields: ['patrol_run_id', 'status'],
        },
        // PostGIS GiST index for location
        {
          name: 'idx_patrol_checkpoint_logs_location',
          using: 'GIST',
          fields: ['location'],
        },
      ],
      hooks: {
        beforeSave: (log) => {
          // Update location point from lat/lng
          if ((log.changed('latitude') || log.changed('longitude')) && log.latitude && log.longitude) {
            const point = {
              type: 'Point',
              coordinates: [log.longitude, log.latitude],
              crs: { type: 'name', properties: { name: 'EPSG:4326' } },
            };
            log.setDataValue('location', point);
          }
        },
      },
    });
  }

  /**
   * Define model associations
   */
  static associate(models: any) {
    // PatrolCheckpointLog belongs to PatrolRun
    PatrolCheckpointLog.belongsTo(models.PatrolRun, {
      foreignKey: 'patrol_run_id',
      as: 'patrol_run',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // PatrolCheckpointLog belongs to PatrolCheckpoint
    PatrolCheckpointLog.belongsTo(models.PatrolCheckpoint, {
      foreignKey: 'patrol_checkpoint_id',
      as: 'patrol_checkpoint',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // PatrolCheckpointLog belongs to Checkpoint
    PatrolCheckpointLog.belongsTo(models.Checkpoint, {
      foreignKey: 'checkpoint_id',
      as: 'checkpoint',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    // PatrolCheckpointLog belongs to User (manual approver)
    PatrolCheckpointLog.belongsTo(models.User, {
      foreignKey: 'manually_approved_by',
      as: 'approver',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  }

  /**
   * Check if checkpoint was verified
   */
  isVerified(): boolean {
    return this.status === 'verified' || this.status === 'manually_approved';
  }

  /**
   * Check if checkpoint was verified by GPS
   */
  isGPSVerified(): boolean {
    return this.verification_method === 'gps' && this.is_within_tolerance === true;
  }

  /**
   * Check if checkpoint was verified by NFC
   */
  isNFCVerified(): boolean {
    return this.verification_method === 'nfc' && this.nfc_tag_id !== null;
  }

  /**
   * Check if checkpoint was verified by QR
   */
  isQRVerified(): boolean {
    return this.verification_method === 'qr_code' && this.qr_code_data !== null;
  }

  /**
   * Check if checkpoint was manually approved
   */
  isManuallyApproved(): boolean {
    return this.status === 'manually_approved';
  }

  /**
   * Get time spent at checkpoint in minutes
   */
  getTimeSpentMinutes(): number | null {
    if (!this.time_spent_seconds) {
      return null;
    }
    return Math.round(this.time_spent_seconds / 60);
  }

  /**
   * Get coordinates as object
   */
  getCoordinates(): { latitude: number; longitude: number } | null {
    if (!this.latitude || !this.longitude) {
      return null;
    }
    return {
      latitude: parseFloat(this.latitude as unknown as string),
      longitude: parseFloat(this.longitude as unknown as string),
    };
  }

  /**
   * Mark as verified
   */
  markAsVerified(method: VerificationMethod, withinTolerance: boolean): void {
    this.status = 'verified';
    this.verification_method = method;
    this.is_within_tolerance = withinTolerance;
    this.verified_at = new Date();
  }

  /**
   * Mark as failed
   */
  markAsFailed(reason: string): void {
    this.status = 'failed';
    this.failed_reason = reason;
    this.attempted_at = new Date();
  }

  /**
   * Mark as manually approved
   */
  markAsManuallyApproved(approverId: number): void {
    this.status = 'manually_approved';
    this.manually_approved_by = approverId;
    this.manually_approved_at = new Date();
  }

  /**
   * Mark as skipped
   */
  markAsSkipped(): void {
    this.status = 'skipped';
  }
}

export default PatrolCheckpointLog;
