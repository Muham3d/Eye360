/**
 * Checkpoint Model
 * Represents patrol checkpoints with GPS locations and verification methods
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { Sequelize } from 'sequelize';

// Enum for checkpoint type
export enum CheckpointType {
  ENTRY = 'entry',
  EXIT = 'exit',
  INTERIOR = 'interior',
  EXTERIOR = 'exterior',
  PARKING = 'parking',
  SPECIAL = 'special',
  EMERGENCY = 'emergency',
}

// Enum for checkpoint status
export enum CheckpointStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UNDER_MAINTENANCE = 'under_maintenance',
  REMOVED = 'removed',
}

// TypeScript interface for Checkpoint attributes
interface CheckpointAttributes {
  id: number;
  site_id: number;
  name: string;
  code: string;
  description: string | null;
  type: string;
  location: string;
  latitude: number;
  longitude: number;
  altitude: number | null;
  nfc_tag_id: string | null;
  qr_code_data: string | null;
  order_index: number;
  status: string;
  estimated_duration_minutes: number;
  requires_photo: boolean;
  requires_notes: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// TypeScript interface for Checkpoint creation attributes
interface CheckpointCreationAttributes extends Optional<CheckpointAttributes, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'description' | 'altitude' | 'nfc_tag_id' | 'qr_code_data' | 'requires_photo' | 'requires_notes'> {}

/**
 * Checkpoint Model Definition
 * Stores checkpoint information for patrol routes
 */
class Checkpoint extends Model<CheckpointAttributes, CheckpointCreationAttributes> implements CheckpointAttributes {
  public id!: number;
  public site_id!: number;
  public name!: string;
  public code!: string;
  public description!: string | null;
  public type!: string;
  public location!: string;
  public latitude!: number;
  public longitude!: number;
  public altitude!: number | null;
  public nfc_tag_id!: string | null;
  public qr_code_data!: string | null;
  public order_index!: number;
  public status!: string;
  public estimated_duration_minutes!: number;
  public requires_photo!: boolean;
  public requires_notes!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  /**
   * Initialize the Checkpoint model
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
            msg: 'Checkpoint name cannot be empty',
          },
          len: {
            args: [1, 255],
            msg: 'Checkpoint name must be between 1 and 255 characters',
          },
        },
        comment: 'Human-readable checkpoint name',
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Checkpoint code cannot be empty',
          },
          is: {
            args: /^[A-Z0-9_-]+$/i,
            msg: 'Checkpoint code must contain only letters, numbers, hyphens, and underscores',
          },
        },
        comment: 'Unique checkpoint identifier within site',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Detailed checkpoint description',
      },
      type: {
        type: DataTypes.ENUM('entry', 'exit', 'interior', 'exterior', 'parking', 'special', 'emergency'),
        allowNull: false,
        defaultValue: 'interior',
        comment: 'Type of checkpoint location',
      },
      location: {
        type: DataTypes.GEOMETRY('POINT', 4326),
        allowNull: false,
        comment: 'GPS location as PostGIS POINT (SRID 4326)',
      },
      latitude: {
        type: DataTypes.DECIMAL(10, 8),
        allowNull: false,
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
        comment: 'Checkpoint latitude (decimal degrees)',
      },
      longitude: {
        type: DataTypes.DECIMAL(11, 8),
        allowNull: false,
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
        comment: 'Checkpoint longitude (decimal degrees)',
      },
      altitude: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
        comment: 'Altitude in meters (optional)',
      },
      nfc_tag_id: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: 'NFC tag UID for verification',
      },
      qr_code_data: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: 'QR code data for verification',
      },
      order_index: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: 'Order index cannot be negative',
          },
        },
        comment: 'Order index for sequential checkpoints',
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'under_maintenance', 'removed'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Checkpoint operational status',
      },
      estimated_duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        validate: {
          min: {
            args: [1],
            msg: 'Estimated duration must be at least 1 minute',
          },
          max: {
            args: [60],
            msg: 'Estimated duration cannot exceed 60 minutes',
          },
        },
        comment: 'Estimated time to complete checkpoint (minutes)',
      },
      requires_photo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether photo evidence is required',
      },
      requires_notes: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether notes are required',
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
      tableName: 'checkpoints',
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
          name: 'idx_checkpoints_site_id',
          fields: ['site_id'],
        },
        {
          name: 'idx_checkpoints_code',
          fields: ['code'],
        },
        {
          name: 'idx_checkpoints_status',
          fields: ['status'],
        },
        {
          name: 'idx_checkpoints_site_status',
          fields: ['site_id', 'status'],
        },
        {
          name: 'idx_checkpoints_deleted_at',
          fields: ['deleted_at'],
        },
        // PostGIS GiST index for location
        {
          name: 'idx_checkpoints_location',
          using: 'GIST',
          fields: ['location'],
        },
        // Composite index for site + location queries
        {
          name: 'idx_checkpoints_site_location',
          using: 'GIST',
          fields: ['site_id', 'location'],
        },
      ],
      hooks: {
        beforeSave: (checkpoint) => {
          // Update location point from lat/lng
          if (checkpoint.changed('latitude') || checkpoint.changed('longitude')) {
            const point = {
              type: 'Point',
              coordinates: [checkpoint.longitude, checkpoint.latitude],
              crs: { type: 'name', properties: { name: 'EPSG:4326' } },
            };
            checkpoint.setDataValue('location', point);
          }
        },
      },
    });
  }

  /**
   * Define model associations
   */
  static associate(models: any) {
    // Checkpoint belongs to Site
    Checkpoint.belongsTo(models.Site, {
      foreignKey: 'site_id',
      as: 'site',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // Checkpoint has many PatrolCheckpoints
    Checkpoint.hasMany(models.PatrolCheckpoint, {
      foreignKey: 'checkpoint_id',
      as: 'patrol_checkpoints',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // Checkpoint has many PatrolCheckpointLogs
    Checkpoint.hasMany(models.PatrolCheckpointLog, {
      foreignKey: 'checkpoint_id',
      as: 'checkpoint_logs',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  }

  /**
   * Check if checkpoint supports NFC verification
   */
  supportsNFC(): boolean {
    return this.nfc_tag_id !== null && this.status === 'active';
  }

  /**
   * Check if checkpoint supports QR verification
   */
  supportsQR(): boolean {
    return this.qr_code_data !== null && this.status === 'active';
  }

  /**
   * Check if checkpoint supports GPS verification
   */
  supportsGPS(): boolean {
    return this.latitude !== null && this.longitude !== null && this.status === 'active';
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
}

export default Checkpoint;
