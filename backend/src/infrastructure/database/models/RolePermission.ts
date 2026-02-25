/**
 * RolePermission Model
 * Junction table for many-to-many relationship between Roles and Permissions
 */

import { DataTypes, Model, Sequelize } from 'sequelize';

// TypeScript interface for RolePermission attributes
interface RolePermissionAttributes {
  role_id: number;
  permission_id: number;
  granted_at: Date;
  granted_by: number | null;
}

// TypeScript interface for RolePermission creation attributes
interface RolePermissionCreationAttributes extends Omit<RolePermissionAttributes, 'granted_at'> {}

/**
 * RolePermission Model Definition
 * Junction table for Role-Permission many-to-many relationship
 */
class RolePermission extends Model<RolePermissionAttributes, RolePermissionCreationAttributes> implements RolePermissionAttributes {
  public role_id!: number;
  public permission_id!: number;
  public readonly granted_at!: Date;
  public granted_by!: number | null;

  /**
   * Initialize the RolePermission model
   */
  static init(sequelize: Sequelize) {
    return super.init.call(this, {
      role_id: {
        type: DataTypes.INTEGER,
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
        type: DataTypes.INTEGER,
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
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Timestamp when permission was granted to role',
      },
      granted_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User ID who granted this permission (for audit)',
      },
    }, {
      sequelize,
      tableName: 'role_permissions',
      timestamps: false,
      indexes: [
        {
          name: 'idx_role_permissions_role_id',
          fields: ['role_id'],
        },
        {
          name: 'idx_role_permissions_permission_id',
          fields: ['permission_id'],
        },
        {
          name: 'idx_role_permissions_granted_by',
          fields: ['granted_by'],
        },
      ],
    });
  }

  /**
   * Define model associations
   */
  static associate(models: any) {
    // RolePermission belongs to Role
    RolePermission.belongsTo(models.Role, {
      foreignKey: 'role_id',
      as: 'role',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // RolePermission belongs to Permission
    RolePermission.belongsTo(models.Permission, {
      foreignKey: 'permission_id',
      as: 'permission',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // RolePermission belongs to User (granted_by)
    RolePermission.belongsTo(models.User, {
      foreignKey: 'granted_by',
      as: 'granted_by_user',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  }
}

export default RolePermission;
