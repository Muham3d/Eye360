const { Sequelize } = require('sequelize');
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'data', 'patrolmanager.sqlite');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false,
});

(async () => {
  try {
    // Create roles
    console.log('Creating roles...');
    await sequelize.query(`
      INSERT OR IGNORE INTO roles (name, level, description, is_system_role, created_at, updated_at)
      VALUES
        ('Admin', 1, 'Full system access', 1, datetime('now'), datetime('now')),
        ('Manager', 2, 'Site management', 1, datetime('now'), datetime('now')),
        ('Supervisor', 3, 'Patrol supervision', 1, datetime('now'), datetime('now')),
        ('Guard', 4, 'Patrol execution', 1, datetime('now'), datetime('now'))
    `);

    // Get Admin role ID
    const [roles] = await sequelize.query(`SELECT id FROM roles WHERE name = 'Admin'`);
    const adminRoleId = roles[0].id;
    console.log('Admin role ID:', adminRoleId);

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    await sequelize.query(`
      INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, role_id, status, created_at, updated_at)
      VALUES ('admin@patrolmanager.com', ?, 'Admin', 'User', ?, 'active', datetime('now'), datetime('now'))
    `, { replacements: [hashedPassword, adminRoleId] });

    console.log('Admin user created!');
    console.log('Email: admin@patrolmanager.com');
    console.log('Password: Admin123!');

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
