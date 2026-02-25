/**
 * Role Model
 * Represents the 4 hierarchical roles in the PatrolManager system
 */

import { DataTypes, Model, ModelDefined, Sequelize } from 'sequelize';

// Enum for role hierarchy levels
export enum RoleLevel {
  ADMIN = 1,
  MANAGER = 2,
  SUPERVISOR = 3,
  GUARD = 4,
}

// Enum for role names
export enum RoleName {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  SUPERVISOR = 'Supervisor',
  GUARD = 'Guard',
}

// TypeScript interface for Role attributes
interface RoleAttributes {
  id: number;
  name: string;
  level: number;
  description: string;
  is_system_role: boolean;
  created_at: Date;
  updated_at: Date;
}

// TypeScript interface for Role creation attributes
interface RoleCreationAttributes extends Omit<RoleAttributes, 'id' | 'created_at' | 'updated_at'> {}

/**
 * Role Model Definition
 * Stores system roles with hierarchical levels
 */
class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: number;
  public name!: string;
  public level!: number;
  public description!: string;
  public is_system_role!: boolean;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  /**
   * Initialize the Role model
   */
  static init(sequelize: Sequelize) {
    return super.init.call(this, {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.ENUM('Admin', 'Manager', 'Supervisor', 'Guard'),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: 'Role name cannot be empty',
          },
        },
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        validate: {
          min: {
            args: [1],
            msg: 'Role level must be at least 1',
          },
          max: {
            args: [100],
            msg: 'Role level cannot exceed 100',
          },
        },
        comment: 'Lower number = higher priority (1 is highest)',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
      },
      is_system_role: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'System roles cannot be deleted',
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
    }, {
      sequelize,
      tableName: 'roles',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          name: 'idx_roles_name',
          unique: true,
          fields: ['name'],
        },
        {
          name: 'idx_roles_level',
          unique: true,
          fields: ['level'],
        },
      ],
      hooks: {
        beforeUpdate: (role) => {
          // Prevent modifying system role levels
          if (role.is_system_role && role.changed('level')) {
            throw new Error('Cannot modify the level of a system role');
          }
        },
        beforeDestroy: async (role) => {
          // Prevent deleting system roles
          if (role.is_system_role) {
            throw new Error('Cannot delete system roles');
          }
        },
      },
    });
  }

  /**
   * Define model associations
   */
  static associate(models: any) {
    // Role has many Users
    Role.hasMany(models.User, {
      foreignKey: 'role_id',
      as: 'users',
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });

    // Role has many RolePermissions
    Role.hasMany(models.RolePermission, {
      foreignKey: 'role_id',
      as: 'role_permissions',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // Role has many Permissions through RolePermissions
    Role.belongsToMany(models.Permission, {
      through: models.RolePermission,
      foreignKey: 'role_id',
      otherKey: 'permission_id',
      as: 'permissions',
    });
  }

  /**
   * Check if this role has higher priority than another role
   */
  hasHigherPriorityThan(otherRole: Role): boolean {
    return this.level < otherRole.level;
  }

  /**
   * Check if this role can manage another role
   */
  canManage(otherRole: Role): boolean {
    return this.level < otherRole.level;
  }
}

export default Role;
