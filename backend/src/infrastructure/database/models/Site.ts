/**
 * Site Model
 * Represents patrol sites with geofence boundaries for GPS validation
 */

import { DataTypes, Model, Optional } from 'sequelize';
import { Sequelize } from 'sequelize';

// Enum for site status
export enum SiteStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  UNDER_MAINTENANCE = 'under_maintenance',
  ARCHIVED = 'archived',
}

// Enum for geofence types
export enum GeofenceType {
  POLYGON = 'polygon',
  CIRCLE = 'circle',
  RECTANGLE = 'rectangle',
}

// TypeScript interface for Site attributes
interface SiteAttributes {
  id: number;
  name: string;
  code: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  geofence_type: string;
  geofence_boundary: string | null;
  geofence_radius_meters: number | null;
  status: string;
  requires_nfc: boolean;
  requires_qr: boolean;
  requires_gps: boolean;
  allowed_distance_meters: number;
  timezone: string;
  operating_hours_start: string | null;
  operating_hours_end: string | null;
  is_24_7: boolean;
  client_id: number | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// TypeScript interface for Site creation attributes
interface SiteCreationAttributes extends Optional<SiteAttributes, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'description' | 'address' | 'city' | 'state' | 'country' | 'postal_code' | 'latitude' | 'longitude' | 'geofence_boundary' | 'geofence_radius_meters' | 'operating_hours_start' | 'operating_hours_end' | 'client_id'> {}

/**
 * Site Model Definition
 * Stores patrol site information with geospatial boundaries
 */
class Site extends Model<SiteAttributes, SiteCreationAttributes> implements SiteAttributes {
  public id!: number;
  public name!: string;
  public code!: string;
  public description!: string | null;
  public address!: string | null;
  public city!: string | null;
  public state!: string | null;
  public country!: string | null;
  public postal_code!: string | null;
  public latitude!: number | null;
  public longitude!: number | null;
  public geofence_type!: string;
  public geofence_boundary!: string | null;
  public geofence_radius_meters!: number | null;
  public status!: string;
  public requires_nfc!: boolean;
  public requires_qr!: boolean;
  public requires_gps!: boolean;
  public allowed_distance_meters!: number;
  public timezone!: string;
  public operating_hours_start!: string | null;
  public operating_hours_end!: string | null;
  public is_24_7!: boolean;
  public client_id!: number | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  /**
   * Initialize the Site model
   */
  static init(sequelize: Sequelize) {
    return super.init.call(this, {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Site name cannot be empty',
          },
          len: {
            args: [1, 255],
            msg: 'Site name must be between 1 and 255 characters',
          },
        },
        comment: 'Human-readable site name',
      },
      code: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: 'Site code cannot be empty',
          },
          is: {
            args: /^[A-Z0-9_-]+$/i,
            msg: 'Site code must contain only letters, numbers, hyphens, and underscores',
          },
        },
        comment: 'Unique site identifier code',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Detailed site description',
      },
      address: {
        type: DataTypes.STRING(500),
        allowNull: true,
        defaultValue: null,
        comment: 'Street address',
      },
      city: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: null,
        comment: 'City name',
      },
      state: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: null,
        comment: 'State or province',
      },
      country: {
        type: DataTypes.STRING(100),
        allowNull: true,
        defaultValue: null,
        comment: 'Country name',
      },
      postal_code: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: null,
        comment: 'Postal or ZIP code',
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
        comment: 'Site center latitude (decimal degrees)',
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
        comment: 'Site center longitude (decimal degrees)',
      },
      geofence_type: {
        type: DataTypes.ENUM('polygon', 'circle', 'rectangle'),
        allowNull: false,
        defaultValue: 'circle',
        comment: 'Type of geofence boundary',
      },
      geofence_boundary: {
        type: DataTypes.GEOMETRY('POLYGON', 4326),
        allowNull: true,
        defaultValue: null,
        comment: 'Geofence boundary polygon (PostGIS GEOMETRY, SRID 4326)',
      },
      geofence_radius_meters: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        validate: {
          min: {
            args: [1],
            msg: 'Geofence radius must be at least 1 meter',
          },
          max: {
            args: [10000],
            msg: 'Geofence radius cannot exceed 10km',
          },
        },
        comment: 'Radius for circle-type geofences (meters)',
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'under_maintenance', 'archived'),
        allowNull: false,
        defaultValue: 'active',
        comment: 'Site operational status',
      },
      requires_nfc: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether NFC verification is required at this site',
      },
      requires_qr: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether QR code verification is required at this site',
      },
      requires_gps: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether GPS validation is required at this site',
      },
      allowed_distance_meters: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 100,
        validate: {
          min: {
            args: [0],
            msg: 'Allowed distance cannot be negative',
          },
          max: {
            args: [500],
            msg: 'Allowed distance cannot exceed 500 meters',
          },
        },
        comment: 'Maximum distance from checkpoint for GPS validation (meters)',
      },
      timezone: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'UTC',
        validate: {
          is: {
            args: /^[A-Za-z]+(?:\/[A-Za-z_]+)?$/,
            msg: 'Must be a valid timezone (e.g., UTC, America/New_York)',
          },
        },
        comment: 'Site timezone for shift scheduling',
      },
      operating_hours_start: {
        type: DataTypes.STRING(5),
        allowNull: true,
        defaultValue: null,
        validate: {
          is: {
            args: /^([01]\d|2[0-3]):([0-5]\d)$/,
            msg: 'Must be in HH:MM format (24-hour)',
          },
        },
        comment: 'Site opening time (HH:MM format)',
      },
      operating_hours_end: {
        type: DataTypes.STRING(5),
        allowNull: true,
        defaultValue: null,
        validate: {
          is: {
            args: /^([01]\d|2[0-3]):([0-5]\d)$/,
            msg: 'Must be in HH:MM format (24-hour)',
          },
        },
        comment: 'Site closing time (HH:MM format)',
      },
      is_24_7: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether site operates 24/7',
      },
      client_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Foreign key to clients table (for multi-tenant support)',
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
      tableName: 'sites',
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
        inactive: {
          where: {
            status: 'inactive',
          },
        },
        withDeleted: {
          where: {},
        },
      },
      indexes: [
        {
          name: 'idx_sites_code',
          unique: true,
          fields: ['code'],
        },
        {
          name: 'idx_sites_status',
          fields: ['status'],
        },
        {
          name: 'idx_sites_client_id',
          fields: ['client_id'],
        },
        {
          name: 'idx_sites_deleted_at',
          fields: ['deleted_at'],
        },
        {
          name: 'idx_sites_location',
          fields: ['latitude', 'longitude'],
        },
        // PostGIS GiST index for geofence_boundary
        {
          name: 'idx_sites_geofence_boundary',
          using: 'GIST',
          fields: ['geofence_boundary'],
        },
      ],
    });
  }

  /**
   * Define model associations
   */
  static associate(models: any) {
    // Site has many Checkpoints
    Site.hasMany(models.Checkpoint, {
      foreignKey: 'site_id',
      as: 'checkpoints',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // Site has many PatrolTemplates
    Site.hasMany(models.PatrolTemplate, {
      foreignKey: 'site_id',
      as: 'patrol_templates',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // Site has many PatrolRuns
    Site.hasMany(models.PatrolRun, {
      foreignKey: 'site_id',
      as: 'patrol_runs',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // Site belongs to Client (if multi-tenant)
    if (models.Client) {
      Site.belongsTo(models.Client, {
        foreignKey: 'client_id',
        as: 'client',
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }
  }

  /**
   * Check if site is currently within operating hours
   */
  isWithinOperatingHours(): boolean {
    if (this.is_24_7) {
      return true;
    }

    if (!this.operating_hours_start || !this.operating_hours_end) {
      return true; // No restrictions if hours not set
    }

    // Get current time in site's timezone
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      timeZone: this.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    };
    const currentTime = new Intl.DateTimeFormat('en-US', options).format(now);
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);

    const parseTime = (time: string): number => {
      const [hour, minute] = time.split(':').map(Number);
      return hour * 60 + minute;
    };

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = parseTime(this.operating_hours_start);
    const endMinutes = parseTime(this.operating_hours_end);

    // Handle overnight shifts (e.g., 22:00 to 06:00)
    if (endMinutes < startMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * Check if site accepts GPS verification
   */
  acceptsGPS(): boolean {
    return this.requires_gps && this.status === 'active';
  }

  /**
   * Check if site accepts NFC verification
   */
  acceptsNFC(): boolean {
    return this.requires_nfc && this.status === 'active';
  }

  /**
   * Check if site accepts QR verification
   */
  acceptsQR(): boolean {
    return this.requires_qr && this.status === 'active';
  }
}

export default Site;
