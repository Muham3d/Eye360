/**
 * Migration: Create incidents schema
 * Creates incidents, incident_comments, and incident_evidence tables.
 *
 * @type {import('sequelize-cli').Migration}
 */
export default {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.createTable(
        'incidents',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          site_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'sites', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          reported_by: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          assigned_to: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          title: {
            type: Sequelize.STRING(255),
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          type: {
            type: Sequelize.ENUM('security', 'safety', 'maintenance', 'medical', 'other'),
            allowNull: false,
            defaultValue: 'other',
          },
          priority: {
            type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
            allowNull: false,
            defaultValue: 'medium',
          },
          status: {
            type: Sequelize.ENUM('new', 'investigating', 'resolved', 'closed'),
            allowNull: false,
            defaultValue: 'new',
          },
          location: {
            type: Sequelize.JSON,
            allowNull: true,
          },
          patrol_run_id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'patrol_runs', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          resolved_at: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          closed_at: {
            type: Sequelize.DATE,
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

      await queryInterface.addIndex('incidents', ['site_id'], {
        name: 'idx_incidents_site_id',
        transaction,
      });
      await queryInterface.addIndex('incidents', ['reported_by'], {
        name: 'idx_incidents_reported_by',
        transaction,
      });
      await queryInterface.addIndex('incidents', ['assigned_to'], {
        name: 'idx_incidents_assigned_to',
        transaction,
      });
      await queryInterface.addIndex('incidents', ['status'], {
        name: 'idx_incidents_status',
        transaction,
      });
      await queryInterface.addIndex('incidents', ['priority'], {
        name: 'idx_incidents_priority',
        transaction,
      });
      await queryInterface.addIndex('incidents', ['created_at'], {
        name: 'idx_incidents_created_at',
        transaction,
      });

      await queryInterface.createTable(
        'incident_comments',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          incident_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'incidents', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          user_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          comment: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('incident_comments', ['incident_id'], {
        name: 'idx_incident_comments_incident_id',
        transaction,
      });
      await queryInterface.addIndex('incident_comments', ['created_at'], {
        name: 'idx_incident_comments_created_at',
        transaction,
      });

      await queryInterface.createTable(
        'incident_evidence',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          incident_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'incidents', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          file_path: {
            type: Sequelize.STRING(500),
            allowNull: false,
          },
          file_type: {
            type: Sequelize.ENUM('image', 'video', 'audio'),
            allowNull: false,
          },
          caption: {
            type: Sequelize.STRING(255),
            allowNull: true,
          },
          created_at: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex('incident_evidence', ['incident_id'], {
        name: 'idx_incident_evidence_incident_id',
        transaction,
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('incident_evidence', { transaction });
      await queryInterface.dropTable('incident_comments', { transaction });
      await queryInterface.dropTable('incidents', { transaction });

      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_incidents_type;', {
        transaction,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_incidents_priority;', {
        transaction,
      });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_incidents_status;', {
        transaction,
      });
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS enum_incident_evidence_file_type;',
        {
          transaction,
        }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
