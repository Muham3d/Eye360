/**
 * Migration: Add Version Field to Users Table
 *
 * Adds optimistic locking support to prevent concurrent edit conflicts.
 *
 * @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Optimistic locking version counter',
    });

    // Initialize existing rows with version 0
    await queryInterface.sequelize.query(
      "UPDATE users SET version = 0 WHERE version IS NULL"
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'version');
  },
};
