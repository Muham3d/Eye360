/**
 * Migration: Create Express Session Table
 *
 * Creates the Sessions table for express-session with connect-session-sequelize.
 * This stores server-side session data for web authentication.
 *
 * @type {import('sequelize-cli').Migration}
 */
module.exports = {
  /**
   * Run the migration - creates Sessions table
   */
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Create Sessions table for express-session
      await queryInterface.createTable('Sessions', {
        sid: {
          type: Sequelize.STRING(36),
          primaryKey: true,
          allowNull: false,
          comment: 'Session ID (UUID)',
        },
        expires: {
          type: Sequelize.DATE,
          allowNull: false,
          comment: 'Session expiration timestamp',
        },
        data: {
          type: Sequelize.TEXT('medium'),
          allowNull: true,
          comment: 'Session data (JSON serialized)',
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
      }, {
        transaction,
        tableName: 'Sessions',
        // Use InnoDB for MySQL, default for others
        engine: 'InnoDB',
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      });

      // Create index on expires for automatic cleanup
      await queryInterface.addIndex('Sessions', ['expires'], {
        name: 'idx_sessions_expires',
        transaction,
      });

      await transaction.commit();
      console.log('Sessions table migration completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Sessions table migration failed:', error);
      throw error;
    }
  },

  /**
   * Reverse the migration - drops Sessions table
   */
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable('Sessions', { transaction });
      await transaction.commit();
      console.log('Sessions table rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Sessions table rollback failed:', error);
      throw error;
    }
  },
};
