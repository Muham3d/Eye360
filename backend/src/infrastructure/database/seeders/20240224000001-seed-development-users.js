/**
 * Development Seeder: Seed Test Users
 * Creates test users for each role for development/testing purposes
 *
 * IMPORTANT: This seeder should ONLY be used in development environments
 *
 * @type {import('sequelize-cli').Seeder}
 */
import bcrypt from 'bcrypt';

/**
 * Default test credentials
 * All test users use the same password for easy testing during development
 */
const DEFAULT_PASSWORD = 'TestPassword123!';
const SALT_ROUNDS = 10;

/**
 * Test users data
 */
const testUsers = [
  {
    email: 'admin@patrolmanager.local',
    first_name: 'System',
    last_name: 'Administrator',
    phone: '+1-555-0100',
    role_name: 'Admin',
    status: 'active',
  },
  {
    email: 'manager@patrolmanager.local',
    first_name: 'Site',
    last_name: 'Manager',
    phone: '+1-555-0200',
    role_name: 'Manager',
    status: 'active',
  },
  {
    email: 'supervisor@patrolmanager.local',
    first_name: 'Patrol',
    last_name: 'Supervisor',
    phone: '+1-555-0300',
    role_name: 'Supervisor',
    status: 'active',
  },
  {
    email: 'guard@patrolmanager.local',
    first_name: 'Security',
    last_name: 'Guard',
    phone: '+1-555-0400',
    role_name: 'Guard',
    status: 'active',
  },
  {
    email: 'inactive.guard@patrolmanager.local',
    first_name: 'Inactive',
    last_name: 'Guard',
    phone: '+1-555-0401',
    role_name: 'Guard',
    status: 'inactive',
  },
  {
    email: 'suspended.guard@patrolmanager.local',
    first_name: 'Suspended',
    last_name: 'Guard',
    phone: '+1-555-0402',
    role_name: 'Guard',
    status: 'suspended',
  },
];

/**
 * Additional test users for various scenarios
 */
const additionalTestUsers = [
  {
    email: 'john.guard@patrolmanager.local',
    first_name: 'John',
    last_name: 'Smith',
    phone: '+1-555-0410',
    role_name: 'Guard',
    status: 'active',
  },
  {
    email: 'jane.guard@patrolmanager.local',
    first_name: 'Jane',
    last_name: 'Doe',
    phone: '+1-555-0411',
    role_name: 'Guard',
    status: 'active',
  },
  {
    email: 'bob.supervisor@patrolmanager.local',
    first_name: 'Bob',
    last_name: 'Johnson',
    phone: '+1-555-0310',
    role_name: 'Supervisor',
    status: 'active',
  },
  {
    email: 'alice.manager@patrolmanager.local',
    first_name: 'Alice',
    last_name: 'Williams',
    phone: '+1-555-0210',
    role_name: 'Manager',
    status: 'active',
  },
];

export default {
  /**
   * Run the seeder
   */
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Verify this is a development environment
      const nodeEnv = process.env.NODE_ENV || 'development';
      if (nodeEnv === 'production') {
        throw new Error('Development seeder cannot be run in production environment!');
      }

      console.log('[DEV SEEDER] Starting development user seeding...');
      console.log('[DEV SEEDER] WARNING: This should only be used in development!');

      // Fetch roles to get role IDs
      const roles = await queryInterface.sequelize.query(
        'SELECT id, name FROM roles ORDER BY level',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );

      const roleMap = Object.fromEntries(roles.map(r => [r.name, r.id]));

      // Verify all required roles exist
      const requiredRoles = ['Admin', 'Manager', 'Supervisor', 'Guard'];
      for (const roleName of requiredRoles) {
        if (!roleMap[roleName]) {
          throw new Error(`Required role '${roleName}' not found. Run RBAC seeder first.`);
        }
      }

      // Generate password hash
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS);

      // Prepare user records
      const allTestUsers = [...testUsers, ...additionalTestUsers];
      const now = new Date();

      const userRecords = allTestUsers.map(user => ({
        email: user.email,
        password_hash: passwordHash,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        status: user.status,
        role_id: roleMap[user.role_name],
        last_login_at: null,
        password_changed_at: now,
        failed_login_attempts: 0,
        account_locked_until: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      }));

      // Insert users
      const insertedUsers = await queryInterface.bulkInsert(
        'users',
        userRecords,
        { transaction, returning: true }
      );

      await transaction.commit();

      console.log(`[DEV SEEDER] Successfully created ${insertedUsers.length} test users`);
      console.log('[DEV SEEDER] Default password for all test users:', DEFAULT_PASSWORD);
      console.log('[DEV SEEDER] Test user accounts:');

      // Log user credentials summary
      for (const user of testUsers) {
        console.log(`  - ${user.email} (${user.role_name}): ${DEFAULT_PASSWORD}`);
      }

      console.log(`[DEV SEEDER] Additional test users: ${additionalTestUsers.length} created`);
    } catch (error) {
      await transaction.rollback();
      console.error('[DEV SEEDER] Failed:', error);
      throw error;
    }
  },

  /**
   * Reverse the seeder
   */
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      const allTestUsers = [...testUsers, ...additionalTestUsers];
      const emails = allTestUsers.map(u => u.email);

      await queryInterface.bulkDelete(
        'users',
        { email: { [Sequelize.Op.in]: emails } },
        { transaction }
      );

      await transaction.commit();
      console.log('[DEV SEEDER] Development test users removed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('[DEV SEEDER] Rollback failed:', error);
      throw error;
    }
  },
};
