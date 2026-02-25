/**
 * User Model
 * Represents all users in the PatrolManager system
 */

import { DataTypes, Model, Optional, Sequelize } from 'sequelize';

// Enum for user status
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending',
}

// Enum for user types
export enum UserType {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SUPERVISOR = 'supervisor',
  GUARD = 'guard',
}

// TypeScript interface for User attributes
interface UserAttributes {
  id: number;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  status: string;
  role_id: number;
  last_login_at: Date | null;
  password_changed_at: Date | null;
  failed_login_attempts: number;
  account_locked_until: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

// TypeScript interface for User creation attributes
interface UserCreationAttributes extends Optional<UserAttributes, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'last_login_at' | 'password_changed_at' | 'failed_login_attempts' | 'account_locked_until'> {}

/**
 * User Model Definition
 * Stores all user accounts in the system
 */
class User extends Model<UserAttributes, UserCreationAttributes> implements UserAttributes {
  public id!: number;
  public email!: string;
  public password_hash!: string;
  public first_name!: string;
  public last_name!: string;
  public phone!: string | null;
  public status!: string;
  public role_id!: number;
  public last_login_at!: Date | null;
  public password_changed_at!: Date | null;
  public failed_login_attempts!: number;
  public account_locked_until!: Date | null;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at!: Date | null;

  /**
   * Initialize the User model
   */
  static init(sequelize: Sequelize) {
    return super.init.call(this, {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          isEmail: {
            msg: 'Must be a valid email address',
          },
          notEmpty: {
            msg: 'Email cannot be empty',
          },
        },
        comment: 'Unique email address for login',
      },
      password_hash: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Password hash cannot be empty',
          },
        },
        comment: 'Bcrypt hash of the user password',
      },
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'First name cannot be empty',
          },
          len: {
            args: [1, 100],
            msg: 'First name must be between 1 and 100 characters',
          },
        },
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Last name cannot be empty',
          },
          len: {
            args: [1, 100],
            msg: 'Last name must be between 1 and 100 characters',
          },
        },
      },
      phone: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: null,
        validate: {
          is: {
            args: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
            msg: 'Must be a valid phone number',
          },
        },
        comment: 'Contact phone number',
      },
      status: {
        type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          notEmpty: {
            msg: 'Status cannot be empty',
          },
        },
        comment: 'Account status',
      },
      role_id: {
        type: DataTypes.INTEGER,
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
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Timestamp of last successful login',
      },
      password_changed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Timestamp when password was last changed',
      },
      failed_login_attempts: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
          min: {
            args: [0],
            msg: 'Failed login attempts cannot be negative',
          },
        },
        comment: 'Counter for failed login attempts',
      },
      account_locked_until: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Timestamp until account is locked (null if not locked)',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Soft delete timestamp (null if not deleted)',
      },
    }, {
      sequelize,
      tableName: 'users',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      paranoid: true, // Enable soft deletes with deletedAt
      deletedAt: 'deleted_at',
      defaultScope: {
        attributes: {
          exclude: ['password_hash'], // Exclude password hash by default
        },
      },
      scopes: {
        withPassword: {
          attributes: {}, // Include password hash when needed
        },
        active: {
          where: {
            status: 'active',
          },
        },
        inactive: {
          where: {
            status: 'inactive',
          },
        },
        byRole: (roleId: number) => ({
          where: {
            role_id: roleId,
          },
        }),
      },
      indexes: [
        {
          name: 'idx_users_email',
          unique: true,
          fields: ['email'],
        },
        {
          name: 'idx_users_status',
          fields: ['status'],
        },
        {
          name: 'idx_users_role_id',
          fields: ['role_id'],
        },
        {
          name: 'idx_users_deleted_at',
          fields: ['deleted_at'],
        },
        {
          name: 'idx_users_status_role',
          fields: ['status', 'role_id'],
        },
        {
          name: 'idx_users_full_name',
          fields: ['first_name', 'last_name'],
        },
      ],
      hooks: {
        beforeUpdate: (user) => {
          // Update password_changed_at if password changed
          if (user.changed('password_hash')) {
            user.password_changed_at = new Date();
          }
        },
      },
    });
  }

  /**
   * Define model associations
   */
  static associate(models: any) {
    // User belongs to Role
    User.belongsTo(models.Role, {
      foreignKey: 'role_id',
      as: 'role',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    // User has many UserSessions
    User.hasMany(models.UserSession, {
      foreignKey: 'user_id',
      as: 'sessions',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // User granted many RolePermissions
    User.hasMany(models.RolePermission, {
      foreignKey: 'granted_by',
      as: 'granted_permissions',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  }

  /**
   * Get the user's full name
   */
  getFullName(): string {
    return `${this.first_name} ${this.last_name}`;
  }

  /**
   * Check if the user account is active
   */
  isActive(): boolean {
    return this.status === 'active' && !this.account_locked_until;
  }

  /**
   * Check if the account is locked
   */
  isLocked(): boolean {
    if (!this.account_locked_until) {
      return false;
    }
    return this.account_locked_until > new Date();
  }

  /**
   * Increment failed login attempts
   */
  incrementFailedLogin(): void {
    this.failed_login_attempts += 1;
  }

  /**
   * Reset failed login attempts
   */
  resetFailedLogin(): void {
    this.failed_login_attempts = 0;
    this.account_locked_until = null;
  }

  /**
   * Lock account for specified duration
   */
  lockAccount(durationMinutes: number = 30): void {
    this.account_locked_until = new Date(Date.now() + durationMinutes * 60 * 1000);
  }
}

export default User;
