/**
 * Migration: Optimize Database Indexes
 * Adds performance indexes for tracking, sync, and real-time operations
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Run the migration - adds optimized indexes
   */
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const dialect = queryInterface.sequelize.getDialect();
      const isPostgres = dialect === 'postgres';

      console.log('Adding optimized database indexes for tracking and sync operations...');

      // =============================================================================
      // TRACKING TABLES INDEXES
      // =============================================================================

      // PatrolRuns - Real-time tracking queries
      console.log('Adding indexes for patrol_runs table...');

      // Index for active patrols lookup (real-time dashboard)
      await queryInterface.addIndex('patrol_runs', ['status', 'scheduled_start'], {
        name: 'idx_patrol_runs_active_status',
        where: {
          status: ['scheduled', 'in_progress', 'paused'],
        },
        transaction,
      });

      // Index for guard's current patrol (tracking)
      await queryInterface.addIndex('patrol_runs', ['guard_id', 'status', 'actual_start'], {
        name: 'idx_patrol_runs_guard_tracking',
        where: {
          status: ['in_progress', 'paused'],
        },
        transaction,
      });

      // Index for time-based queries (reporting)
      await queryInterface.addIndex('patrol_runs', ['actual_start', 'actual_end'], {
        name: 'idx_patrol_runs_execution_time',
        transaction,
      });

      // Index for completion status queries
      await queryInterface.addIndex('patrol_runs', ['completion_percentage', 'status'], {
        name: 'idx_patrol_runs_completion',
        transaction,
      });

      // PatrolCheckpointLogs - Verification tracking
      console.log('Adding indexes for patrol_checkpoint_logs table...');

      // Index for pending verifications (real-time sync)
      await queryInterface.addIndex('patrol_checkpoint_logs', ['patrol_run_id', 'status', 'sequence_order'], {
        name: 'idx_patrol_checkpoint_logs_pending',
        where: {
          status: 'pending',
        },
        transaction,
      });

      // Index for location-based queries (geofencing)
      await queryInterface.addIndex('patrol_checkpoint_logs', ['latitude', 'longitude'], {
        name: 'idx_patrol_checkpoint_logs_coords',
        transaction,
      });

      // Index for failed verifications (alerting)
      await queryInterface.addIndex('patrol_checkpoint_logs', ['status', 'failed_reason'], {
        name: 'idx_patrol_checkpoint_logs_failed',
        where: {
          status: 'failed',
        },
        transaction,
      });

      // =============================================================================
      // INCIDENT TABLES INDEXES
      // =============================================================================

      console.log('Adding indexes for incidents table...');

      // Check if incidents table exists (might be in separate migration)
      const tableExists = await queryInterface.tableExists('incidents');
      if (tableExists) {
        // Index for active incidents (dashboard)
        await queryInterface.addIndex('incidents', ['status', 'priority'], {
          name: 'idx_incidents_active',
          where: {
            status: ['new', 'in_progress', 'assigned'],
          },
          transaction,
        });

        // Index for site-based incident queries
        await queryInterface.addIndex('incidents', ['site_id', 'status'], {
          name: 'idx_incidents_site_status',
          transaction,
        });

        // Index for time-based incident queries
        await queryInterface.addIndex('incidents', ['created_at', 'status'], {
          name: 'idx_incidents_created_status',
          transaction,
        });

        // Index for assigned incidents (guard notifications)
        await queryInterface.addIndex('incidents', ['assigned_to', 'status'], {
          name: 'idx_incidents_assigned',
          transaction,
        });

        // Index for critical incidents (SOS integration)
        await queryInterface.addIndex('incidents', ['priority', 'status'], {
          name: 'idx_incidents_critical',
          where: {
            priority: ['critical', 'urgent'],
          },
          transaction,
        });

        console.log('Incidents indexes added');
      }

      // =============================================================================
      // USER/AUTH TABLES INDEXES
      // =============================================================================

      console.log('Adding indexes for auth-related tables...');

      // Check for sessions table (JWT blacklist)
      const sessionsExists = await queryInterface.tableExists('sessions');
      if (sessionsExists) {
        // Index for token blacklist lookups
        await queryInterface.addIndex('sessions', ['token'], {
          name: 'idx_sessions_token',
          unique: true,
          transaction,
        });

        // Index for expired session cleanup
        await queryInterface.addIndex('sessions', ['expires_at'], {
          name: 'idx_sessions_expires',
          transaction,
        });

        console.log('Sessions indexes added');
      }

      // Users table - guard lookup optimization
      const usersExists = await queryInterface.tableExists('users');
      if (usersExists) {
        // Index for active guards (shift assignment)
        // Skip partial index - SQLite doesn't support WHERE with IN clause for strings
        await queryInterface.addIndex('users', ['role_id', 'status'], {
          name: 'idx_users_role_status',
          transaction,
        });

        console.log('Users indexes added');
      }

      // =============================================================================
      // SHIFT TABLES INDEXES
      // =============================================================================

      console.log('Adding indexes for shifts table...');

      const shiftsExists = await queryInterface.tableExists('shifts');
      if (shiftsExists) {
        // Index for active shifts (real-time tracking)
        await queryInterface.addIndex('shifts', ['guard_id', 'status', 'start_time'], {
          name: 'idx_shifts_guard_active',
          where: {
            status: ['scheduled', 'in_progress'],
          },
          transaction,
        });

        // Index for shift time range queries
        await queryInterface.addIndex('shifts', ['start_time', 'end_time'], {
          name: 'idx_shifts_time_range',
          transaction,
        });

        // Index for site-based shift queries
        await queryInterface.addIndex('shifts', ['site_id', 'start_time'], {
          name: 'idx_shifts_site_time',
          transaction,
        });

        // Index for missed shifts (alerting)
        await queryInterface.addIndex('shifts', ['status', 'start_time'], {
          name: 'idx_shifts_missed',
          where: {
            status: 'missed',
          },
          transaction,
        });

        console.log('Shifts indexes added');
      }

      // =============================================================================
      // SYNC QUEUE INDEXES
      // =============================================================================

      console.log('Adding indexes for sync_queue table...');

      const syncQueueExists = await queryInterface.tableExists('sync_queue');
      if (syncQueueExists) {
        // Index for pending sync items (mobile sync)
        await queryInterface.addIndex('sync_queue', ['status', 'created_at'], {
          name: 'idx_sync_queue_pending',
          where: {
            status: 'pending',
          },
          transaction,
        });

        // Index for user-specific sync queries
        await queryInterface.addIndex('sync_queue', ['user_id', 'status'], {
          name: 'idx_sync_queue_user_status',
          transaction,
        });

        // Index for failed sync items (retry logic)
        await queryInterface.addIndex('sync_queue', ['status', 'retry_count'], {
          name: 'idx_sync_queue_retry',
          where: {
            status: 'failed',
          },
          transaction,
        });

        // Index for sync type queries
        await queryInterface.addIndex('sync_queue', ['entity_type', 'status'], {
          name: 'idx_sync_queue_type_status',
          transaction,
        });

        console.log('Sync queue indexes added');
      }

      // =============================================================================
      // REPORTING INDEXES
      // =============================================================================

      console.log('Adding indexes for report generation...');

      // Composite index for patrol completion reports
      const patrolRunsExists = await queryInterface.tableExists('patrol_runs');
      if (patrolRunsExists) {
        await queryInterface.addIndex('patrol_runs', ['site_id', 'status', 'scheduled_start'], {
          name: 'idx_patrol_runs_site_report',
          transaction,
        });
      }

      // Composite index for guard attendance reports (already covered by shiftsExists check above)
      // Skipping since shifts table doesn't exist yet

      // =============================================================================
      // PARTIAL INDEXES FOR COMMON FILTERS (PostgreSQL only)
      // =============================================================================

      if (isPostgres) {
        console.log('Adding PostgreSQL partial indexes...');

        // Partial index for incomplete checkpoints (performance)
        await queryInterface.sequelize.query(`
          CREATE INDEX IF NOT EXISTS idx_patrol_checkpoint_logs_incomplete
          ON patrol_checkpoint_logs (patrol_run_id, sequence_order)
          WHERE status IN ('pending', 'failed');
        `, { transaction });

        // Partial index for late starts (reporting)
        await queryInterface.sequelize.query(`
          CREATE INDEX IF NOT EXISTS idx_patrol_runs_late
          ON patrol_runs (guard_id, scheduled_start)
          WHERE is_late_start = true;
        `, { transaction });

        // Partial index for high-priority incidents
        if (tableExists) {
          await queryInterface.sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_incidents_high_priority
            ON incidents (site_id, created_at DESC)
            WHERE priority IN ('critical', 'urgent')
              AND status IN ('new', 'in_progress');
          `, { transaction });
        }

        console.log('PostgreSQL partial indexes added');
      }

      // =============================================================================
      // COVERING INDEXES FOR HOT QUERIES
      // =============================================================================

      console.log('Adding covering indexes for hot queries...');

      // Dashboard query: Get active patrols with guard info
      await queryInterface.addIndex('patrol_runs', ['status', 'scheduled_start', 'guard_id', 'site_id'], {
        name: 'idx_patrol_runs_dashboard_covering',
        where: {
          status: ['scheduled', 'in_progress', 'paused'],
        },
        transaction,
      });

      // Mobile sync query: Get pending sync items for user
      if (syncQueueExists) {
        await queryInterface.addIndex('sync_queue', ['user_id', 'status', 'created_at', 'id'], {
          name: 'idx_sync_queue_user_covering',
          where: {
            status: 'pending',
          },
          transaction,
        });
      }

      // =============================================================================
      // STATISTICS UPDATE (PostgreSQL only)
      // =============================================================================

      if (isPostgres) {
        console.log('Updating table statistics...');

        // Update statistics for better query planning
        const tables = [
          'patrol_runs',
          'patrol_checkpoint_logs',
          'patrol_templates',
          'checkpoints',
          'sites',
          'users',
          'shifts',
        ];

        for (const table of tables) {
          try {
            await queryInterface.sequelize.query(`ANALYZE ${table};`, { transaction });
          } catch (error) {
            // Table might not exist yet, skip
            console.log(`Table ${table} not found, skipping ANALYZE`);
          }
        }

        console.log('Table statistics updated');
      }

      await transaction.commit();
      console.log('Database index optimization completed successfully');

      // Print index summary
      console.log('\n=== Index Optimization Summary ===');
      console.log('Tracking tables: Added indexes for real-time patrol tracking');
      console.log('Incident tables: Added indexes for dashboard and alerting');
      console.log('Auth tables: Added indexes for JWT blacklist and guard lookups');
      console.log('Shift tables: Added indexes for shift management and reporting');
      console.log('Sync queue: Added indexes for mobile sync operations');
      console.log('Partial indexes: Added PostgreSQL partial indexes for common filters');
      console.log('====================================\n');

    } catch (error) {
      await transaction.rollback();
      console.error('Index optimization failed:', error);
      throw error;
    }
  },

  /**
   * Reverse the migration - removes optimized indexes
   */
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log('Removing optimized database indexes...');

      // PatrolRuns indexes
      const patrolRunIndexes = [
        'idx_patrol_runs_active_status',
        'idx_patrol_runs_guard_tracking',
        'idx_patrol_runs_execution_time',
        'idx_patrol_runs_completion',
        'idx_patrol_runs_site_report',
        'idx_patrol_runs_late',
        'idx_patrol_runs_dashboard_covering',
      ];

      for (const indexName of patrolRunIndexes) {
        try {
          await queryInterface.removeIndex('patrol_runs', indexName, { transaction });
        } catch (error) {
          console.log(`Index ${indexName} not found, skipping`);
        }
      }

      // PatrolCheckpointLogs indexes
      const checkpointLogIndexes = [
        'idx_patrol_checkpoint_logs_pending',
        'idx_patrol_checkpoint_logs_coords',
        'idx_patrol_checkpoint_logs_failed',
        'idx_patrol_checkpoint_logs_incomplete',
      ];

      for (const indexName of checkpointLogIndexes) {
        try {
          await queryInterface.removeIndex('patrol_checkpoint_logs', indexName, { transaction });
        } catch (error) {
          console.log(`Index ${indexName} not found, skipping`);
        }
      }

      // Incidents indexes
      const incidentIndexes = [
        'idx_incidents_active',
        'idx_incidents_site_status',
        'idx_incidents_created_status',
        'idx_incidents_assigned',
        'idx_incidents_critical',
        'idx_incidents_high_priority',
      ];

      for (const indexName of incidentIndexes) {
        try {
          await queryInterface.removeIndex('incidents', indexName, { transaction });
        } catch (error) {
          console.log(`Index ${indexName} not found, skipping`);
        }
      }

      // Sessions indexes
      const sessionIndexes = [
        'idx_sessions_token',
        'idx_sessions_expires',
      ];

      for (const indexName of sessionIndexes) {
        try {
          await queryInterface.removeIndex('sessions', indexName, { transaction });
        } catch (error) {
          console.log(`Index ${indexName} not found, skipping`);
        }
      }

      // Users indexes
      const userIndexes = [
        'idx_users_role_status',
        'idx_users_site_status',
      ];

      for (const indexName of userIndexes) {
        try {
          await queryInterface.removeIndex('users', indexName, { transaction });
        } catch (error) {
          console.log(`Index ${indexName} not found, skipping`);
        }
      }

      // Shifts indexes
      const shiftIndexes = [
        'idx_shifts_guard_active',
        'idx_shifts_time_range',
        'idx_shifts_site_time',
        'idx_shifts_missed',
        'idx_shifts_guard_report',
      ];

      for (const indexName of shiftIndexes) {
        try {
          await queryInterface.removeIndex('shifts', indexName, { transaction });
        } catch (error) {
          console.log(`Index ${indexName} not found, skipping`);
        }
      }

      // Sync queue indexes
      const syncQueueIndexes = [
        'idx_sync_queue_pending',
        'idx_sync_queue_user_status',
        'idx_sync_queue_retry',
        'idx_sync_queue_type_status',
        'idx_sync_queue_user_covering',
      ];

      for (const indexName of syncQueueIndexes) {
        try {
          await queryInterface.removeIndex('sync_queue', indexName, { transaction });
        } catch (error) {
          console.log(`Index ${indexName} not found, skipping`);
        }
      }

      await transaction.commit();
      console.log('Index optimization rollback completed successfully');

    } catch (error) {
      await transaction.rollback();
      console.error('Index rollback failed:', error);
      throw error;
    }
  },
};
