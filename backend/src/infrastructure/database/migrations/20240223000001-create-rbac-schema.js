/**
 * Migration: Create RBAC Schema
 * Creates tables for Users, Roles, Permissions, and Sessions
 *
 * @type {import('sequelize-cli').Migration}
 */
export default {
  /**
   * Run the migration - creates all tables
   */
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // 1. Create Roles table
      await queryInterface.createTable('roles', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.ENUM('Admin', 'Manager', 'Supervisor', 'Guard'),
          allowNull: false,
          unique: true,
        },
        level: {
          type: Sequelize.INTEGER,
          allowNull: false,
          unique: true,
          comment: 'Lower number = higher priority (1 is highest)',
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        is_system_role: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'System roles cannot be deleted',
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

      // Create indexes for roles
      await queryInterface.addIndex('roles', ['name'], {
        name: 'idx_roles_name',
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('roles', ['level'], {
        name: 'idx_roles_level',
        unique: true,
        transaction,
      });

      // 2. Create Permissions table
      await queryInterface.createTable('permissions', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true,
          comment: 'Unique permission identifier (e.g., users.create, sites.read)',
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Human-readable description of the permission',
        },
        resource: {
          type: Sequelize.ENUM('users', 'sites', 'checkpoints', 'patrols', 'incidents', 'reports', 'settings', 'notifications'),
          allowNull: false,
          comment: 'The resource this permission applies to',
        },
        action: {
          type: Sequelize.ENUM('create', 'read', 'update', 'delete', 'manage', 'approve', 'assign', 'export'),
          allowNull: false,
          comment: 'The action allowed on the resource',
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

      // Create indexes for permissions
      await queryInterface.addIndex('permissions', ['name'], {
        name: 'idx_permissions_name',
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('permissions', ['resource', 'action'], {
        name: 'idx_permissions_resource_action',
        unique: true,
        transaction,
      });

      // 3. Create RolePermissions junction table
      await queryInterface.createTable('role_permissions', {
        role_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          allowNull: false,
          references: {
            model: 'roles',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        permission_id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          allowNull: false,
          references: {
            model: 'permissions',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        granted_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          comment: 'Timestamp when permission was granted to role',
        },
        granted_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'User ID who granted this permission (for audit)',
        },
      }, { transaction });

      // Create indexes for role_permissions
      await queryInterface.addIndex('role_permissions', ['role_id'], {
        name: 'idx_role_permissions_role_id',
        transaction,
      });
      await queryInterface.addIndex('role_permissions', ['permission_id'], {
        name: 'idx_role_permissions_permission_id',
        transaction,
      });
      await queryInterface.addIndex('role_permissions', ['granted_by'], {
        name: 'idx_role_permissions_granted_by',
        transaction,
      });

      // 4. Create Users table
      await queryInterface.createTable('users', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        email: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true,
          comment: 'Unique email address for login',
        },
        password_hash: {
          type: Sequelize.STRING(255),
          allowNull: false,
          comment: 'Bcrypt hash of the user password',
        },
        first_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        last_name: {
          type: Sequelize.STRING(100),
          allowNull: false,
        },
        phone: {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: 'Contact phone number',
        },
        status: {
          type: Sequelize.ENUM('active', 'inactive', 'suspended', 'pending'),
          allowNull: false,
          defaultValue: 'pending',
          comment: 'Account status',
        },
        role_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'roles',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
          comment: 'Foreign key to roles table',
        },
        last_login_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp of last successful login',
        },
        password_changed_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp when password was last changed',
        },
        failed_login_attempts: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Counter for failed login attempts',
        },
        account_locked_until: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Timestamp until account is locked (null if not locked)',
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

      // Create indexes for users
      await queryInterface.addIndex('users', ['email'], {
        name: 'idx_users_email',
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('users', ['status'], {
        name: 'idx_users_status',
        transaction,
      });
      await queryInterface.addIndex('users', ['role_id'], {
        name: 'idx_users_role_id',
        transaction,
      });
      await queryInterface.addIndex('users', ['deleted_at'], {
        name: 'idx_users_deleted_at',
        transaction,
      });
      await queryInterface.addIndex('users', ['status', 'role_id'], {
        name: 'idx_users_status_role',
        transaction,
      });
      await queryInterface.addIndex('users', ['first_name', 'last_name'], {
        name: 'idx_users_full_name',
        transaction,
      });

      // 5. Create UserSessions table
      await queryInterface.createTable('user_sessions', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          comment: 'Foreign key to users table',
        },
        session_token: {
          type: Sequelize.STRING(255),
          allowNull: false,
          unique: true,
          comment: 'Unique session identifier (hashed)',
        },
        refresh_token: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Token for refreshing session (if using refresh tokens)',
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false,
          comment: 'Session expiration timestamp',
        },
        ip_address: {
          type: Sequelize.STRING(45),
          allowNull: true,
          comment: 'IP address of the client',
        },
        user_agent: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Browser user agent string',
        },
        device_info: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Parsed device information (browser, OS, etc.)',
        },
        last_activity_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          comment: 'Timestamp of last activity in this session',
        },
        status: {
          type: Sequelize.ENUM('active', 'expired', 'revoked'),
          allowNull: false,
          defaultValue: 'active',
          comment: 'Session status',
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          comment: 'Session creation timestamp',
        },
        terminated_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Session termination timestamp (if manually terminated)',
        },
        terminated_by: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'users',
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'User ID who terminated the session',
        },
      }, { transaction });

      // Create indexes for user_sessions
      await queryInterface.addIndex('user_sessions', ['user_id'], {
        name: 'idx_user_sessions_user_id',
        transaction,
      });
      await queryInterface.addIndex('user_sessions', ['session_token'], {
        name: 'idx_user_sessions_session_token',
        unique: true,
        transaction,
      });
      await queryInterface.addIndex('user_sessions', ['expires_at'], {
        name: 'idx_user_sessions_expires_at',
        transaction,
      });
      await queryInterface.addIndex('user_sessions', ['status'], {
        name: 'idx_user_sessions_status',
        transaction,
      });
      await queryInterface.addIndex('user_sessions', ['user_id', 'status'], {
        name: 'idx_user_sessions_user_status',
        transaction,
      });

      await transaction.commit();
      console.log('RBAC schema migration completed successfully');
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
      // Drop tables in reverse order due to foreign key constraints
      await queryInterface.dropTable('user_sessions', { transaction });
      await queryInterface.dropTable('users', { transaction });
      await queryInterface.dropTable('role_permissions', { transaction });
      await queryInterface.dropTable('permissions', { transaction });
      await queryInterface.dropTable('roles', { transaction });

      // Drop ENUM types
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_roles_name;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_permissions_resource;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_permissions_action;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_users_status;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_user_sessions_status;', { transaction });

      await transaction.commit();
      console.log('RBAC schema rollback completed successfully');
    } catch (error) {
      await transaction.rollback();
      console.error('Rollback failed:', error);
      throw error;
    }
  },
};
