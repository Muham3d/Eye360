/**
 * Seeder: Seed RBAC Initial Data
 * Seeds the 4 system roles and default permissions
 *
 * @type {import('sequelize-cli').Seeder}
 */
export default {
  /**
   * Run the seeder
   */
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Insert System Roles
      const roles = await queryInterface.bulkInsert('roles', [
        {
          name: 'Admin',
          level: 1,
          description: 'Full system access with all permissions',
          is_system_role: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          name: 'Manager',
          level: 2,
          description: 'Site management and operational oversight',
          is_system_role: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          name: 'Supervisor',
          level: 3,
          description: 'Patrol supervision and coordination',
          is_system_role: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          name: 'Guard',
          level: 4,
          description: 'Patrol execution and incident reporting',
          is_system_role: true,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ], { transaction, returning: true });

      // Get role IDs
      const adminRole = roles.find(r => r.name === 'Admin');
      const managerRole = roles.find(r => r.name === 'Manager');
      const supervisorRole = roles.find(r => r.name === 'Supervisor');
      const guardRole = roles.find(r => r.name === 'Guard');

      // 2. Insert Permissions
      const permissions = await queryInterface.bulkInsert('permissions', [
        // User Management
        { name: 'users.create', description: 'Create new user accounts', resource: 'users', action: 'create', created_at: new Date(), updated_at: new Date() },
        { name: 'users.read', description: 'View user information', resource: 'users', action: 'read', created_at: new Date(), updated_at: new Date() },
        { name: 'users.update', description: 'Update user accounts', resource: 'users', action: 'update', created_at: new Date(), updated_at: new Date() },
        { name: 'users.delete', description: 'Delete user accounts', resource: 'users', action: 'delete', created_at: new Date(), updated_at: new Date() },
        { name: 'users.manage', description: 'Full user management access', resource: 'users', action: 'manage', created_at: new Date(), updated_at: new Date() },

        // Site Management
        { name: 'sites.create', description: 'Create new sites', resource: 'sites', action: 'create', created_at: new Date(), updated_at: new Date() },
        { name: 'sites.read', description: 'View site information', resource: 'sites', action: 'read', created_at: new Date(), updated_at: new Date() },
        { name: 'sites.update', description: 'Update site details', resource: 'sites', action: 'update', created_at: new Date(), updated_at: new Date() },
        { name: 'sites.delete', description: 'Delete sites', resource: 'sites', action: 'delete', created_at: new Date(), updated_at: new Date() },
        { name: 'sites.assign', description: 'Assign guards to sites', resource: 'sites', action: 'assign', created_at: new Date(), updated_at: new Date() },

        // Checkpoint Management
        { name: 'checkpoints.create', description: 'Create checkpoints', resource: 'checkpoints', action: 'create', created_at: new Date(), updated_at: new Date() },
        { name: 'checkpoints.read', description: 'View checkpoint information', resource: 'checkpoints', action: 'read', created_at: new Date(), updated_at: new Date() },
        { name: 'checkpoints.update', description: 'Update checkpoint details', resource: 'checkpoints', action: 'update', created_at: new Date(), updated_at: new Date() },
        { name: 'checkpoints.delete', description: 'Delete checkpoints', resource: 'checkpoints', action: 'delete', created_at: new Date(), updated_at: new Date() },

        // Patrol Management
        { name: 'patrols.create', description: 'Create patrol templates', resource: 'patrols', action: 'create', created_at: new Date(), updated_at: new Date() },
        { name: 'patrols.read', description: 'View patrol information', resource: 'patrols', action: 'read', created_at: new Date(), updated_at: new Date() },
        { name: 'patrols.update', description: 'Update patrol templates', resource: 'patrols', action: 'update', created_at: new Date(), updated_at: new Date() },
        { name: 'patrols.delete', description: 'Delete patrol templates', resource: 'patrols', action: 'delete', created_at: new Date(), updated_at: new Date() },
        { name: 'patrols.approve', description: 'Approve patrol reports', resource: 'patrols', action: 'approve', created_at: new Date(), updated_at: new Date() },
        { name: 'patrols.assign', description: 'Assign patrols to guards', resource: 'patrols', action: 'assign', created_at: new Date(), updated_at: new Date() },

        // Incident Management
        { name: 'incidents.create', description: 'Report incidents', resource: 'incidents', action: 'create', created_at: new Date(), updated_at: new Date() },
        { name: 'incidents.read', description: 'View incident reports', resource: 'incidents', action: 'read', created_at: new Date(), updated_at: new Date() },
        { name: 'incidents.update', description: 'Update incident reports', resource: 'incidents', action: 'update', created_at: new Date(), updated_at: new Date() },
        { name: 'incidents.manage', description: 'Manage incident workflow', resource: 'incidents', action: 'manage', created_at: new Date(), updated_at: new Date() },

        // Reports
        { name: 'reports.read', description: 'View reports', resource: 'reports', action: 'read', created_at: new Date(), updated_at: new Date() },
        { name: 'reports.export', description: 'Export reports', resource: 'reports', action: 'export', created_at: new Date(), updated_at: new Date() },

        // Settings
        { name: 'settings.read', description: 'View system settings', resource: 'settings', action: 'read', created_at: new Date(), updated_at: new Date() },
        { name: 'settings.update', description: 'Update system settings', resource: 'settings', action: 'update', created_at: new Date(), updated_at: new Date() },

        // Notifications
        { name: 'notifications.read', description: 'View notifications', resource: 'notifications', action: 'read', created_at: new Date(), updated_at: new Date() },
        { name: 'notifications.manage', description: 'Manage notifications', resource: 'notifications', action: 'manage', created_at: new Date(), updated_at: new Date() },
      ], { transaction, returning: true });

      // 3. Assign Permissions to Roles

      // Admin: All permissions
      const rolePermissionsForAdmin = permissions.map(p => ({
        role_id: adminRole.id,
        permission_id: p.id,
        granted_at: new Date(),
      }));
      await queryInterface.bulkInsert('role_permissions', rolePermissionsForAdmin, { transaction });

      // Manager: Site, Checkpoint, Patrol, Incident, Report permissions (no user management, no settings)
      const managerPermissions = permissions.filter(p =>
        p.resource === 'sites' ||
        p.resource === 'checkpoints' ||
        p.resource === 'patrols' ||
        p.resource === 'incidents' ||
        p.resource === 'reports' ||
        p.name === 'users.read' ||
        p.name === 'notifications.read'
      );
      const rolePermissionsForManager = managerPermissions.map(p => ({
        role_id: managerRole.id,
        permission_id: p.id,
        granted_at: new Date(),
      }));
      await queryInterface.bulkInsert('role_permissions', rolePermissionsForManager, { transaction });

      // Supervisor: Patrol, Incident permissions (read/update), Reports
      const supervisorPermissions = permissions.filter(p =>
        (p.resource === 'patrols' && (p.action === 'read' || p.action === 'update' || p.action === 'approve')) ||
        (p.resource === 'incidents' && (p.action === 'create' || p.action === 'read' || p.action === 'update')) ||
        (p.resource === 'reports' && p.action === 'read') ||
        (p.resource === 'sites' && p.action === 'read') ||
        (p.resource === 'checkpoints' && p.action === 'read') ||
        (p.resource === 'users' && p.action === 'read')
      );
      const rolePermissionsForSupervisor = supervisorPermissions.map(p => ({
        role_id: supervisorRole.id,
        permission_id: p.id,
        granted_at: new Date(),
      }));
      await queryInterface.bulkInsert('role_permissions', rolePermissionsForSupervisor, { transaction });

      // Guard: Patrol execution, Incident reporting, Basic read access
      const guardPermissions = permissions.filter(p =>
        (p.resource === 'patrols' && p.action === 'read') ||
        (p.resource === 'incidents' && (p.action === 'create' || p.action === 'read')) ||
        (p.resource === 'sites' && p.action === 'read') ||
        (p.resource === 'checkpoints' && p.action === 'read') ||
        (p.resource === 'notifications' && p.action === 'read')
      );
      const rolePermissionsForGuard = guardPermissions.map(p => ({
        role_id: guardRole.id,
        permission_id: p.id,
        granted_at: new Date(),
      }));
      await queryInterface.bulkInsert('role_permissions', rolePermissionsForGuard, { transaction });

      await transaction.commit();
      console.log('RBAC seed data inserted successfully');
      console.log(`- Created ${roles.length} roles`);
      console.log(`- Created ${permissions.length} permissions`);
      console.log(`- Assigned ${rolePermissionsForAdmin.length} permissions to Admin`);
      console.log(`- Assigned ${rolePermissionsForManager.length} permissions to Manager`);
      console.log(`- Assigned ${rolePermissionsForSupervisor.length} permissions to Supervisor`);
      console.log(`- Assigned ${rolePermissionsForGuard.length} permissions to Guard`);
    } catch (error) {
      await transaction.rollback();
      console.error('Seeder failed:', error);
      throw error;
    }
  },

  /**
   * Reverse the seeder
   */
  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Delete in reverse order due to foreign keys
      await queryInterface.bulkDelete('role_permissions', {}, { transaction });
      await queryInterface.bulkDelete('permissions', {}, { transaction });
      await queryInterface.bulkDelete('roles', {}, { transaction });

      await transaction.commit();
      console.log('RBAC seed data removed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Seeder rollback failed:', error);
      throw error;
    }
  },
};
