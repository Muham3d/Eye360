/**
 * Migration: Create Real-time Tracking Schema
 * Creates tables for SOS alerts and location history.
 *
 * @type {import('sequelize-cli').Migration}
 */
export default {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'sos_alerts',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
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
          },
          latitude: {
            type: Sequelize.DECIMAL(10, 8),
            allowNull: false,
          },
          longitude: {
            type: Sequelize.DECIMAL(11, 8),
            allowNull: false,
          },
          accuracy: {
            type: Sequelize.DECIMAL(8, 2),
            allowNull: true,
          },
          status: {
            type: Sequelize.ENUM(
              'triggered',
              'acknowledged',
              'dispatched',
              'resolved',
              'false_alarm'
            ),
            allowNull: false,
            defaultValue: 'triggered',
          },
          priority: {
            type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
            allowNull: false,
            defaultValue: 'high',
          },
          message: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          acknowledged_by_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          acknowledged_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          dispatched_to_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          dispatched_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          resolved_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          resolution_notes: {
            type: Sequelize.TEXT,
            allowNull: true,
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
        },
        { transaction }
      );

      await queryInterface.addIndex('sos_alerts', ['guard_id'], {
        name: 'idx_sos_alerts_guard_id',
        transaction,
      });
      await queryInterface.addIndex('sos_alerts', ['status'], {
        name: 'idx_sos_alerts_status',
        transaction,
      });
      await queryInterface.addIndex('sos_alerts', ['priority'], {
        name: 'idx_sos_alerts_priority',
        transaction,
      });
      await queryInterface.addIndex('sos_alerts', ['created_at'], {
        name: 'idx_sos_alerts_created_at',
        transaction,
      });

      await queryInterface.createTable(
        'location_history',
        {
          id: {
            type: Sequelize.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          guard_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: 'users',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          latitude: {
            type: Sequelize.DECIMAL(10, 8),
            allowNull: false,
          },
          longitude: {
            type: Sequelize.DECIMAL(11, 8),
            allowNull: false,
          },
          accuracy: {
            type: Sequelize.DECIMAL(8, 2),
            allowNull: true,
          },
          speed: {
            type: Sequelize.DECIMAL(8, 2),
            allowNull: true,
          },
          bearing: {
            type: Sequelize.DECIMAL(6, 2),
            allowNull: true,
          },
          altitude: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true,
          },
          battery_level: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          is_active_shift: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          active_patrol_run_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: {
              model: 'patrol_runs',
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          batch_id: {
            type: Sequelize.STRING(50),
            allowNull: true,
          },
          status: {
            type: Sequelize.ENUM('pending', 'processed', 'archived'),
            allowNull: false,
            defaultValue: 'processed',
          },
          received_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
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
        },
        { transaction }
      );

      await queryInterface.addIndex('location_history', ['guard_id'], {
        name: 'idx_location_history_guard_id',
        transaction,
      });
      await queryInterface.addIndex('location_history', ['batch_id'], {
        name: 'idx_location_history_batch_id',
        transaction,
      });
      await queryInterface.addIndex('location_history', ['active_patrol_run_id'], {
        name: 'idx_location_history_active_patrol_run_id',
        transaction,
      });
      await queryInterface.addIndex('location_history', ['received_at'], {
        name: 'idx_location_history_received_at',
        transaction,
      });
      await queryInterface.addIndex('location_history', ['status'], {
        name: 'idx_location_history_status',
        transaction,
      });
      await queryInterface.addIndex('location_history', ['guard_id', 'received_at'], {
        name: 'idx_guard_time',
        transaction,
      });
      await queryInterface.addIndex(
        'location_history',
        ['guard_id', 'is_active_shift', 'received_at'],
        {
          name: 'idx_location_history_guard_shift_time',
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('location_history', { transaction });
      await queryInterface.dropTable('sos_alerts', { transaction });

      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_location_history_status;', {
        transaction,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_sos_alerts_status;', {
        transaction,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_sos_alerts_priority;', {
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
