import bcrypt from 'bcrypt';
import models from './src/infrastructure/database/models/index.js';

(async () => {
  try {
    // Create roles
    console.log('Creating roles...');
    await models.Role.bulkCreate([
      { name: 'Admin', level: 1, description: 'Full system access', is_system_role: true },
      { name: 'Manager', level: 2, description: 'Site management', is_system_role: true },
      { name: 'Supervisor', level: 3, description: 'Patrol supervision', is_system_role: true },
      { name: 'Guard', level: 4, description: 'Patrol execution', is_system_role: true },
    ], { ignoreDuplicates: true });

    // Get Admin role
    const adminRole = await models.Role.findOne({ where: { name: 'Admin' } });
    if (!adminRole) {
      console.error('Failed to create/find Admin role');
      process.exit(1);
    }

    // Check if admin user exists
    const existingUser = await models.User.findOne({ where: { email: 'admin@patrolmanager.com' } });

    if (existingUser) {
      console.log('Admin user already exists');
    } else {
      // Create admin user
      const hashedPassword = await bcrypt.hash('Admin123!', 10);

      await models.User.create({
        email: 'admin@patrolmanager.com',
        password_hash: hashedPassword,
        first_name: 'Admin',
        last_name: 'User',
        role_id: adminRole.id,
        status: 'active',
      });

      console.log('Admin user created!');
      console.log('Email: admin@patrolmanager.com');
      console.log('Password: Admin123!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
