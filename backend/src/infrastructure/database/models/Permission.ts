/**
 * Permission Model
 * Represents granular permissions for RBAC system
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

// Enum for permission resources
export enum PermissionResource {
  USERS = 'users',
  SITES = 'sites',
  CHECKPOINTS = 'checkpoints',
  PATROLS = 'patrols',
  INCIDENTS = 'incidents',
  REPORTS = 'reports',
  SETTINGS = 'settings',
  NOTIFICATIONS = 'notifications',
}

// Enum for permission actions
export enum PermissionAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  MANAGE = 'manage',
  APPROVE = 'approve',
  ASSIGN = 'assign',
  EXPORT = 'export',
}

// TypeScript interface for Permission attributes
interface PermissionAttributes {
  id: number;
  name: string;
  description: string;
  resource: string;
  action: string;
  created_at: Date;
  updated_at: Date;
}

// TypeScript interface for Permission creation attributes
interface PermissionCreationAttributes extends Omit<PermissionAttributes, 'id' | 'created_at' | 'updated_at'> {}

/**
 * Permission Model Definition
 * Stores granular permissions for role-based access control
 */
class Permission extends Model<PermissionAttributes, PermissionCreationAttributes> implements PermissionAttributes {
  public id!: number;
  public name!: string;
  public description!: string;
  public resource!: string;
  public action!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  /**
   * Initialize the Permission model
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
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: 'Permission name cannot be empty',
          },
          len: {
            args: [3, 100],
            msg: 'Permission name must be between 3 and 100 characters',
          },
        },
        comment: 'Unique permission identifier (e.g., users.create, sites.read)',
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Human-readable description of the permission',
      },
      resource: {
        type: DataTypes.ENUM('users', 'sites', 'checkpoints', 'patrols', 'incidents', 'reports', 'settings', 'notifications'),
        allowNull: false,
        comment: 'The resource this permission applies to',
      },
      action: {
        type: DataTypes.ENUM('create', 'read', 'update', 'delete', 'manage', 'approve', 'assign', 'export'),
        allowNull: false,
        comment: 'The action allowed on the resource',
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
      tableName: 'permissions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        {
          name: 'idx_permissions_name',
          unique: true,
          fields: ['name'],
        },
        {
          name: 'idx_permissions_resource_action',
          fields: ['resource', 'action'],
          unique: true,
        },
      ],
    });
  }

  /**
   * Define model associations
   */
  static associate(models: any) {
    // Permission has many RolePermissions
    Permission.hasMany(models.RolePermission, {
      foreignKey: 'permission_id',
      as: 'role_permissions',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // Permission has many Roles through RolePermissions
    Permission.belongsToMany(models.Role, {
      through: models.RolePermission,
      foreignKey: 'permission_id',
      otherKey: 'role_id',
      as: 'roles',
    });
  }

  /**
   * Get the full permission identifier
   */
  getFullName(): string {
    return `${this.resource}.${this.action}`;
  }
}

export default Permission;
