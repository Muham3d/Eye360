/**
 * Migration: Create Patrol Schema
 * Creates tables for Sites, Checkpoints, Patrol Templates, and Patrol Runs with PostGIS support
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Run the migration - creates all tables
   */
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if using PostgreSQL (enable PostGIS) or SQLite (skip)
      const dialect = queryInterface.sequelize.getDialect();
      const isPostgres = dialect === 'postgres';

      if (isPostgres) {
        // Enable PostGIS extension only for PostgreSQL
        await queryInterface.sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;', { transaction });
        console.log('PostGIS extension enabled');
      } else {
        console.log('SQLite detected - skipping PostGIS extension, using TEXT for geometry columns');
      }

      // Helper function to get geometry column type based on dialect
      const getGeometryType = (type) => {
        return isPostgres ? Sequelize.GEOMETRY(type, 4326) : Sequelize.TEXT;
      };

      // 1. Create Sites table
      await queryInterface.createTable('sites', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Human-readable site name',
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          unique: true,
          comment: 'Unique site identifier code',
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Detailed site description',
        },
        address: {
          type: Sequelize.STRING(500),
          allowNull: true,
          comment: 'Street address',
        },
        city: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'City name',
        },
        state: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'State or province',
        },
        country: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: 'Country name',
        },
        postal_code: {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: 'Postal or ZIP code',
        },
        latitude: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: true,
          comment: 'Site center latitude (decimal degrees)',
        },
        longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: true,
          comment: 'Site center longitude (decimal degrees)',
        },
        geofence_type: {
          type: Sequelize.ENUM('polygon', 'circle', 'rectangle'),
          allowNull: false,
          defaultValue: 'circle',
          comment: 'Type of geofence boundary',
        },
        geofence_boundary: {
          type: getGeometryType('POLYGON'),
          allowNull: true,
          comment: isPostgres
            ? 'Geofence boundary polygon (PostGIS GEOMETRY, SRID 4326)'
            : 'Geofence boundary polygon (GeoJSON TEXT for SQLite)',
        },
        geofence_radius_meters: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Radius for circle-type geofences (meters)',
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'under_maintenance', 'archived'),
          allowNull: false,
          defaultValue: 'active',
          comment: 'Site operational status',
        },
        requires_nfc: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether NFC verification is required at this site',
        },
        requires_qr: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether QR code verification is required at this site',
        },
        requires_gps: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Whether GPS validation is required at this site',
        },
        allowed_distance_meters: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 100,
          comment: 'Maximum distance from checkpoint for GPS validation (meters)',
        },
        timezone: {
          type: Sequelize.STRING(50),
          allowNull: false,
          defaultValue: 'UTC',
          comment: 'Site timezone for shift scheduling',
        },
        operating_hours_start: {
          type: Sequelize.STRING(5),
          allowNull: true,
          comment: 'Site opening time (HH:MM format)',
        },
        operating_hours_end: {
          type: Sequelize.STRING(5),
          allowNull: true,
          comment: 'Site closing time (HH:MM format)',
        },
        is_24_7: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether site operates 24/7',
        },
        client_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Foreign key to clients table (for multi-tenant support)',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Soft delete timestamp (null if not deleted)',
        },
      }, { transaction });

      // Create indexes for sites
      await queryInterface.addIndex('sites', ['code'], {
        name: 'idx_sites_code',
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('sites', ['status'], {
        name: 'idx_sites_status',
        transaction,
      });
      await queryInterface.addIndex('sites', ['client_id'], {
        name: 'idx_sites_client_id',
        transaction,
      });
      await queryInterface.addIndex('sites', ['deleted_at'], {
        name: 'idx_sites_deleted_at',
        transaction,
      });
      await queryInterface.addIndex('sites', ['latitude', 'longitude'], {
        name: 'idx_sites_location',
        transaction,
      });

      // 2. Create Checkpoints table
      await queryInterface.createTable('checkpoints', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        site_id: {
          type: Sequelize.INTEGER,
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
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Human-readable checkpoint name',
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'Unique checkpoint identifier within site',
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Detailed checkpoint description',
        },
        type: {
          type: Sequelize.ENUM('entry', 'exit', 'interior', 'exterior', 'parking', 'special', 'emergency'),
          allowNull: false,
          defaultValue: 'interior',
          comment: 'Type of checkpoint location',
        },
        location: {
          type: getGeometryType('POINT'),
          allowNull: false,
          comment: isPostgres ? 'GPS location as PostGIS POINT (SRID 4326)' : 'GPS location as GeoJSON TEXT',
        },
        latitude: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: false,
          comment: 'Checkpoint latitude (decimal degrees)',
        },
        longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: false,
          comment: 'Checkpoint longitude (decimal degrees)',
        },
        altitude: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Altitude in meters (optional)',
        },
        nfc_tag_id: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'NFC tag UID for verification',
        },
        qr_code_data: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'QR code data for verification',
        },
        order_index: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Order index for sequential checkpoints',
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'under_maintenance', 'removed'),
          allowNull: false,
          defaultValue: 'active',
          comment: 'Checkpoint operational status',
        },
        estimated_duration_minutes: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 5,
          comment: 'Estimated time to complete checkpoint (minutes)',
        },
        requires_photo: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether photo evidence is required',
        },
        requires_notes: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether notes are required',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Soft delete timestamp (null if not deleted)',
        },
      }, { transaction });

      // Create indexes for checkpoints
      await queryInterface.addIndex('checkpoints', ['site_id'], {
        name: 'idx_checkpoints_site_id',
        transaction,
      });
      await queryInterface.addIndex('checkpoints', ['code'], {
        name: 'idx_checkpoints_code',
        transaction,
      });
      await queryInterface.addIndex('checkpoints', ['status'], {
        name: 'idx_checkpoints_status',
        transaction,
      });
      await queryInterface.addIndex('checkpoints', ['site_id', 'status'], {
        name: 'idx_checkpoints_site_status',
        transaction,
      });
      await queryInterface.addIndex('checkpoints', ['deleted_at'], {
        name: 'idx_checkpoints_deleted_at',
        transaction,
      });

      // 3. Create PatrolTemplates table
      await queryInterface.createTable('patrol_templates', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        site_id: {
          type: Sequelize.INTEGER,
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
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Human-readable template name',
        },
        code: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: 'Unique template identifier',
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Detailed template description',
        },
        type: {
          type: Sequelize.ENUM('routine', 'emergency', 'special', 'training'),
          allowNull: false,
          defaultValue: 'routine',
          comment: 'Type of patrol',
        },
        priority: {
          type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
          allowNull: false,
          defaultValue: 'normal',
          comment: 'Patrol priority level',
        },
        status: {
          type: Sequelize.ENUM('draft', 'active', 'inactive', 'archived'),
          allowNull: false,
          defaultValue: 'draft',
          comment: 'Template status',
        },
        estimated_duration_minutes: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 30,
          comment: 'Estimated time to complete patrol (minutes)',
        },
        required_guards: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Number of guards required for this patrol',
        },
        is_time_restricted: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether patrol can only be done during specific hours',
        },
        allowed_start_time: {
          type: Sequelize.STRING(5),
          allowNull: true,
          comment: 'Earliest allowed start time (HH:MM)',
        },
        allowed_end_time: {
          type: Sequelize.STRING(5),
          allowNull: true,
          comment: 'Latest allowed start time (HH:MM)',
        },
        allowed_days: {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: 'Comma-separated allowed days',
        },
        require_photo_evidence: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether photo evidence is required at checkpoints',
        },
        require_checkpoint_notes: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether notes are required at checkpoints',
        },
        max_deviation_meters: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 50,
          comment: 'Maximum allowed GPS deviation from route (meters)',
        },
        created_by: {
          type: Sequelize.INTEGER,
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
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Soft delete timestamp (null if not deleted)',
        },
      }, { transaction });

      // Create indexes for patrol_templates
      await queryInterface.addIndex('patrol_templates', ['site_id'], {
        name: 'idx_patrol_templates_site_id',
        transaction,
      });
      await queryInterface.addIndex('patrol_templates', ['code'], {
        name: 'idx_patrol_templates_code',
        transaction,
      });
      await queryInterface.addIndex('patrol_templates', ['status'], {
        name: 'idx_patrol_templates_status',
        transaction,
      });
      await queryInterface.addIndex('patrol_templates', ['type'], {
        name: 'idx_patrol_templates_type',
        transaction,
      });
      await queryInterface.addIndex('patrol_templates', ['created_by'], {
        name: 'idx_patrol_templates_created_by',
        transaction,
      });
      await queryInterface.addIndex('patrol_templates', ['deleted_at'], {
        name: 'idx_patrol_templates_deleted_at',
        transaction,
      });
      await queryInterface.addIndex('patrol_templates', ['site_id', 'status'], {
        name: 'idx_patrol_templates_site_status',
        transaction,
      });

      // 4. Create PatrolCheckpoints junction table
      await queryInterface.createTable('patrol_checkpoints', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        template_id: {
          type: Sequelize.INTEGER,
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
          type: Sequelize.INTEGER,
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
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Order in which checkpoint should be visited',
        },
        is_mandatory: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Whether checkpoint must be completed',
        },
        time_limit_seconds: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Maximum time allowed at this checkpoint (seconds)',
        },
        notes_required: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether guard must enter notes',
        },
        photo_required: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether guard must take photo',
        },
        special_instructions: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Special instructions for this checkpoint',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      // Create indexes for patrol_checkpoints
      await queryInterface.addIndex('patrol_checkpoints', ['template_id'], {
        name: 'idx_patrol_checkpoints_template_id',
        transaction,
      });
      await queryInterface.addIndex('patrol_checkpoints', ['checkpoint_id'], {
        name: 'idx_patrol_checkpoints_checkpoint_id',
        transaction,
      });
      await queryInterface.addIndex('patrol_checkpoints', ['template_id', 'sequence_order'], {
        name: 'idx_patrol_checkpoints_template_sequence',
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('patrol_checkpoints', ['template_id', 'checkpoint_id'], {
        name: 'idx_patrol_checkpoints_template_checkpoint',
        unique: true,
        transaction,
      });

      // 5. Create PatrolRuns table
      await queryInterface.createTable('patrol_runs', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        template_id: {
          type: Sequelize.INTEGER,
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
          type: Sequelize.INTEGER,
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
          type: Sequelize.INTEGER,
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
          type: Sequelize.ENUM('scheduled', 'in_progress', 'paused', 'completed', 'abandoned', 'failed', 'skipped'),
          allowNull: false,
          defaultValue: 'scheduled',
          comment: 'Current status of the patrol run',
        },
        scheduled_start: {
          type: Sequelize.DATE,
          allowNull: false,
          comment: 'Scheduled start time',
        },
        scheduled_end: {
          type: Sequelize.DATE,
          allowNull: false,
          comment: 'Scheduled end time',
        },
        actual_start: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Actual start time',
        },
        actual_end: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Actual end time',
        },
        start_location: {
          type: getGeometryType('POINT'),
          allowNull: true,
          comment: isPostgres ? 'Starting GPS location (PostGIS POINT, SRID 4326)' : 'Starting GPS location as GeoJSON TEXT',
        },
        end_location: {
          type: getGeometryType('POINT'),
          allowNull: true,
          comment: isPostgres ? 'Ending GPS location (PostGIS POINT, SRID 4326)' : 'Ending GPS location as GeoJSON TEXT',
        },
        total_distance_meters: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Total distance traveled during patrol (meters)',
        },
        completion_percentage: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: false,
          defaultValue: 0,
          comment: 'Percentage of checkpoints completed (0-100)',
        },
        checkpoints_completed: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Number of checkpoints successfully completed',
        },
        checkpoints_total: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Total number of checkpoints in this patrol',
        },
        abandonment_reason: {
          type: Sequelize.ENUM('emergency', 'equipment_failure', 'weather', 'safety_concern', 'site_access_denied', 'shift_ended', 'other'),
          allowNull: true,
          comment: 'Reason for patrol abandonment',
        },
        abandonment_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Additional notes about patrol abandonment',
        },
        supervisor_notes: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Notes from supervisor review',
        },
        is_late_start: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether patrol started after scheduled time',
        },
        is_late_completion: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Whether patrol completed after scheduled time',
        },
        deviation_score: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          comment: 'Route deviation score (higher = more deviation)',
        },
        supervisor_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Supervisor who reviewed this patrol run',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Soft delete timestamp (null if not deleted)',
        },
      }, { transaction });

      // Create indexes for patrol_runs
      await queryInterface.addIndex('patrol_runs', ['template_id'], {
        name: 'idx_patrol_runs_template_id',
        transaction,
      });
      await queryInterface.addIndex('patrol_runs', ['site_id'], {
        name: 'idx_patrol_runs_site_id',
        transaction,
      });
      await queryInterface.addIndex('patrol_runs', ['guard_id'], {
        name: 'idx_patrol_runs_guard_id',
        transaction,
      });
      await queryInterface.addIndex('patrol_runs', ['status'], {
        name: 'idx_patrol_runs_status',
        transaction,
      });
      await queryInterface.addIndex('patrol_runs', ['scheduled_start'], {
        name: 'idx_patrol_runs_scheduled_start',
        transaction,
      });
      await queryInterface.addIndex('patrol_runs', ['supervisor_id'], {
        name: 'idx_patrol_runs_supervisor_id',
        transaction,
      });
      await queryInterface.addIndex('patrol_runs', ['deleted_at'], {
        name: 'idx_patrol_runs_deleted_at',
        transaction,
      });
      await queryInterface.addIndex('patrol_runs', ['guard_id', 'status'], {
        name: 'idx_patrol_runs_guard_status',
        transaction,
      });
      await queryInterface.addIndex('patrol_runs', ['site_id', 'status'], {
        name: 'idx_patrol_runs_site_status',
        transaction,
      });
      await queryInterface.addIndex('patrol_runs', ['scheduled_start', 'scheduled_end'], {
        name: 'idx_patrol_runs_scheduled_range',
        transaction,
      });

      // 6. Create PatrolCheckpointLogs table
      await queryInterface.createTable('patrol_checkpoint_logs', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        patrol_run_id: {
          type: Sequelize.INTEGER,
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
          type: Sequelize.INTEGER,
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
          type: Sequelize.INTEGER,
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
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Order in which checkpoint was visited',
        },
        status: {
          type: Sequelize.ENUM('pending', 'verified', 'failed', 'skipped', 'manually_approved'),
          allowNull: false,
          defaultValue: 'pending',
          comment: 'Verification status',
        },
        verified_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp when checkpoint was verified',
        },
        verification_method: {
          type: Sequelize.ENUM('gps', 'nfc', 'qr_code', 'manual', 'photo_only'),
          allowNull: true,
          comment: 'Method used for verification',
        },
        location: {
          type: getGeometryType('POINT'),
          allowNull: true,
          comment: isPostgres ? 'GPS location at time of verification (PostGIS POINT, SRID 4326)' : 'GPS location as GeoJSON TEXT',
        },
        latitude: {
          type: Sequelize.DECIMAL(10, 8),
          allowNull: true,
          comment: 'Reported latitude (decimal degrees)',
        },
        longitude: {
          type: Sequelize.DECIMAL(11, 8),
          allowNull: true,
          comment: 'Reported longitude (decimal degrees)',
        },
        accuracy_meters: {
          type: Sequelize.DECIMAL(8, 2),
          allowNull: true,
          comment: 'GPS accuracy in meters',
        },
        distance_from_checkpoint: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          comment: 'Calculated distance from actual checkpoint location (meters)',
        },
        is_within_tolerance: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          comment: 'Whether location was within allowed tolerance',
        },
        nfc_tag_id: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'NFC tag ID used for verification',
        },
        qr_code_data: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'QR code data used for verification',
        },
        photo_evidence_urls: {
          type: isPostgres ? Sequelize.ARRAY(Sequelize.STRING(500)) : Sequelize.TEXT,
          allowNull: true,
          comment: isPostgres ? 'Array of photo evidence URLs' : 'JSON array of photo evidence URLs',
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Guard notes about this checkpoint',
        },
        time_spent_seconds: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Time spent at this checkpoint (seconds)',
        },
        attempted_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'First attempt timestamp',
        },
        failed_reason: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Reason for verification failure',
        },
        manually_approved_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'User who manually approved this checkpoint',
        },
        manually_approved_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp of manual approval',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        },
      }, { transaction });

      // Create indexes for patrol_checkpoint_logs
      await queryInterface.addIndex('patrol_checkpoint_logs', ['patrol_run_id'], {
        name: 'idx_patrol_checkpoint_logs_patrol_run_id',
        transaction,
      });
      await queryInterface.addIndex('patrol_checkpoint_logs', ['patrol_checkpoint_id'], {
        name: 'idx_patrol_checkpoint_logs_patrol_checkpoint_id',
        transaction,
      });
      await queryInterface.addIndex('patrol_checkpoint_logs', ['checkpoint_id'], {
        name: 'idx_patrol_checkpoint_logs_checkpoint_id',
        transaction,
      });
      await queryInterface.addIndex('patrol_checkpoint_logs', ['status'], {
        name: 'idx_patrol_checkpoint_logs_status',
        transaction,
      });
      await queryInterface.addIndex('patrol_checkpoint_logs', ['verified_at'], {
        name: 'idx_patrol_checkpoint_logs_verified_at',
        transaction,
      });
      await queryInterface.addIndex('patrol_checkpoint_logs', ['manually_approved_by'], {
        name: 'idx_patrol_checkpoint_logs_manually_approved_by',
        transaction,
      });
      await queryInterface.addIndex('patrol_checkpoint_logs', ['patrol_run_id', 'sequence_order'], {
        name: 'idx_patrol_checkpoint_logs_run_sequence',
        transaction,
      });
      await queryInterface.addIndex('patrol_checkpoint_logs', ['patrol_run_id', 'status'], {
        name: 'idx_patrol_checkpoint_logs_run_status',
        transaction,
      });

      // Create PostGIS GiST indexes for geometry columns (PostgreSQL only)
      if (isPostgres) {
        console.log('Creating PostGIS GiST indexes...');

        await queryInterface.sequelize.query(
          'CREATE INDEX IF NOT EXISTS idx_sites_geofence_boundary ON sites USING GIST (geofence_boundary);',
          { transaction }
        );

        await queryInterface.sequelize.query(
          'CREATE INDEX IF NOT EXISTS idx_checkpoints_location ON checkpoints USING GIST (location);',
          { transaction }
        );

        await queryInterface.sequelize.query(
          'CREATE INDEX IF NOT EXISTS idx_checkpoints_site_location ON checkpoints USING GIST (site_id, location);',
          { transaction }
        );

        await queryInterface.sequelize.query(
          'CREATE INDEX IF NOT EXISTS idx_patrol_runs_start_location ON patrol_runs USING GIST (start_location);',
          { transaction }
        );

        await queryInterface.sequelize.query(
          'CREATE INDEX IF NOT EXISTS idx_patrol_runs_end_location ON patrol_runs USING GIST (end_location);',
          { transaction }
        );

        await queryInterface.sequelize.query(
          'CREATE INDEX IF NOT EXISTS idx_patrol_checkpoint_logs_location ON patrol_checkpoint_logs USING GIST (location);',
          { transaction }
        );

        console.log('PostGIS GiST indexes created');

        // Create helper functions for geospatial calculations
        console.log('Creating PostGIS helper functions...');

        // Function: Calculate distance between two points in meters
        await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION calculate_distance_meters(
          lat1 DECIMAL,
          lng1 DECIMAL,
          lat2 DECIMAL,
          lng2 DECIMAL
        ) RETURNS DECIMAL AS $$
        BEGIN
          RETURN ST_Distance(
            ST_SetSRID(ST_MakePoint(lng1, lat1), 4326)::geography,
            ST_SetSRID(ST_MakePoint(lng2, lat2), 4326)::geography
          );
        END;
        $$ LANGUAGE plpgsql IMMUTABLE;
      `, { transaction });

      // Function: Check if point is within geofence
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION is_within_geofence(
          site_id INTEGER,
          lat DECIMAL,
          lng DECIMAL
        ) RETURNS BOOLEAN AS $$
        DECLARE
          site_geofence GEOMETRY;
          check_point GEOMETRY;
        BEGIN
          SELECT geofence_boundary INTO site_geofence
          FROM sites
          WHERE id = site_id AND geofence_boundary IS NOT NULL;

          IF site_geofence IS NULL THEN
            RETURN TRUE;
          END IF;

          check_point := ST_SetSRID(ST_MakePoint(lng, lat), 4326);
          RETURN ST_Contains(site_geofence, check_point);
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      // Function: Check if point is within distance of checkpoint
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION is_within_checkpoint_tolerance(
          checkpoint_id INTEGER,
          lat DECIMAL,
          lng DECIMAL,
          tolerance_meters INTEGER
        ) RETURNS BOOLEAN AS $$
        DECLARE
          checkpoint_loc GEOMETRY;
          check_point GEOMETRY;
          distance DECIMAL;
        BEGIN
          SELECT location INTO checkpoint_loc
          FROM checkpoints
          WHERE id = checkpoint_id;

          IF checkpoint_loc IS NULL THEN
            RETURN FALSE;
          END IF;

          check_point := ST_SetSRID(ST_MakePoint(lng, lat), 4326);
          distance := ST_Distance(checkpoint_loc::geography, check_point::geography);

          RETURN distance <= tolerance_meters;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      // Function: Get distance from checkpoint in meters
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION get_distance_from_checkpoint(
          checkpoint_id INTEGER,
          lat DECIMAL,
          lng DECIMAL
        ) RETURNS DECIMAL AS $$
        DECLARE
          checkpoint_loc GEOMETRY;
          check_point GEOMETRY;
        BEGIN
          SELECT location INTO checkpoint_loc
          FROM checkpoints
          WHERE id = checkpoint_id;

          IF checkpoint_loc IS NULL THEN
            RETURN NULL;
          END IF;

          check_point := ST_SetSRID(ST_MakePoint(lng, lat), 4326);
          RETURN ST_Distance(checkpoint_loc::geography, check_point::geography);
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      // Function: Find checkpoints within radius
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION find_checkpoints_within_radius(
          center_lat DECIMAL,
          center_lng DECIMAL,
          radius_meters INTEGER
        ) RETURNS TABLE (
          checkpoint_id INTEGER,
          site_id INTEGER,
          name VARCHAR,
          distance_meters DECIMAL
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT
            c.id,
            c.site_id,
            c.name,
            ST_Distance(c.location::geography, ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography) AS distance_meters
          FROM checkpoints c
          WHERE c.location IS NOT NULL
            AND ST_DWithin(
              c.location::geography,
              ST_SetSRID(ST_MakePoint(center_lng, center_lat), 4326)::geography,
              radius_meters
            )
          ORDER BY distance_meters;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

        console.log('PostGIS helper functions created');
      } else {
        console.log('SQLite detected - skipping PostGIS functions (geofence checks will be handled in application code)');
      }

      await transaction.commit();
      console.log('Patrol schema migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Migration failed:', error);
      throw error;
    }
  },

  /**
   * Reverse the migration - drops all tables
   */
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const dialect = queryInterface.sequelize.getDialect();
      const isPostgres = dialect === 'postgres';

      // Drop custom functions (PostgreSQL only)
      if (isPostgres) {
        console.log('Dropping PostGIS helper functions...');
        await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS calculate_distance_meters;', { transaction });
        await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS is_within_geofence;', { transaction });
        await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS is_within_checkpoint_tolerance;', { transaction });
        await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS get_distance_from_checkpoint;', { transaction });
        await queryInterface.sequelize.query('DROP FUNCTION IF EXISTS find_checkpoints_within_radius;', { transaction });
      }

      // Drop tables in reverse order due to foreign key constraints
      await queryInterface.dropTable('patrol_checkpoint_logs', { transaction });
      await queryInterface.dropTable('patrol_runs', { transaction });
      await queryInterface.dropTable('patrol_checkpoints', { transaction });
      await queryInterface.dropTable('patrol_templates', { transaction });
      await queryInterface.dropTable('checkpoints', { transaction });
      await queryInterface.dropTable('sites', { transaction });

      // Drop ENUM types
      console.log('Dropping ENUM types...');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_sites_geofence_type;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_sites_status;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_checkpoints_type;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_checkpoints_status;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_patrol_templates_type;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_patrol_templates_priority;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_patrol_templates_status;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_patrol_runs_status;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_patrol_runs_abandonment_reason;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_patrol_checkpoint_logs_status;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_patrol_checkpoint_logs_verification_method;', { transaction });

      await transaction.commit();
      console.log('Patrol schema rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Rollback failed:', error);
      throw error;
    }
  },
};
