/**
 * UserSession Model
 * Manages user sessions for session-based authentication (Admin Web Panel)
 */

import { DataTypes, Model, Optional, Op } from 'sequelize';

// Enum for session status
export enum SessionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  REVOKED = 'revoked',
}

// TypeScript interface for UserSession attributes
interface UserSessionAttributes {
  id: number;
  user_id: number;
  session_token: string;
  refresh_token: string | null;
  expires_at: Date;
  ip_address: string | null;
  user_agent: string | null;
  device_info: string | null;
  last_activity_at: Date;
  status: string;
  created_at: Date;
  terminated_at: Date | null;
  terminated_by: number | null;
}

// TypeScript interface for UserSession creation attributes
interface UserSessionCreationAttributes extends Optional<UserSessionAttributes, 'id' | 'created_at' | 'terminated_at' | 'terminated_by' | 'refresh_token' | 'ip_address' | 'user_agent' | 'device_info'> {}

/**
 * UserSession Model Definition
 * Stores web panel sessions for session-based authentication
 */
class UserSession extends Model<UserSessionAttributes, UserSessionCreationAttributes> implements UserSessionAttributes {
  public id!: number;
  public user_id!: number;
  public session_token!: string;
  public refresh_token!: string | null;
  public expires_at!: Date;
  public ip_address!: string | null;
  public user_agent!: string | null;
  public device_info!: string | null;
  public last_activity_at!: Date;
  public status!: string;
  public readonly created_at!: Date;
  public terminated_at!: Date | null;
  public terminated_by!: number | null;

  /**
   * Initialize the UserSession model
   */
  static init(sequelize: Sequelize) {
    return super.init.call(this, {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      user_id: {
        type: DataTypes.INTEGER,
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
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: {
            msg: 'Session token cannot be empty',
          },
        },
        comment: 'Unique session identifier (hashed)',
      },
      refresh_token: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: 'Token for refreshing session (if using refresh tokens)',
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isDate: {
            msg: 'Expires at must be a valid date',
          },
        },
        comment: 'Session expiration timestamp',
      },
      ip_address: {
        type: DataTypes.STRING(45), // IPv6 can be up to 45 chars
        allowNull: true,
        defaultValue: null,
        validate: {
          isIP: {
            msg: 'Must be a valid IP address',
          },
        },
        comment: 'IP address of the client',
      },
      user_agent: {
        type: DataTypes.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: 'Browser user agent string',
      },
      device_info: {
        type: DataTypes.STRING(255),
        allowNull: true,
        defaultValue: null,
        comment: 'Parsed device information (browser, OS, etc.)',
      },
      last_activity_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Timestamp of last activity in this session',
      },
      status: {
        type: DataTypes.ENUM('active', 'expired', 'revoked'),
        allowNull: false,
        defaultValue: 'active',
        validate: {
          notEmpty: {
            msg: 'Status cannot be empty',
          },
        },
        comment: 'Session status',
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Session creation timestamp',
      },
      terminated_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: 'Session termination timestamp (if manually terminated)',
      },
      terminated_by: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: 'users',
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User ID who terminated the session',
      },
    }, {
      sequelize,
      tableName: 'user_sessions',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: false,
      indexes: [
        {
          name: 'idx_user_sessions_user_id',
          fields: ['user_id'],
        },
        {
          name: 'idx_user_sessions_session_token',
          unique: true,
          fields: ['session_token'],
        },
        {
          name: 'idx_user_sessions_refresh_token',
          unique: true,
          fields: ['refresh_token'],
          where: {
            refresh_token: {
              [Op.ne]: null,
            },
          },
        },
        {
          name: 'idx_user_sessions_expires_at',
          fields: ['expires_at'],
        },
        {
          name: 'idx_user_sessions_status',
          fields: ['status'],
        },
        {
          name: 'idx_user_sessions_user_status',
          fields: ['user_id', 'status'],
        },
      ],
      scopes: {
        active: {
          where: {
            status: 'active',
            expires_at: {
              [Op.gt]: new Date(),
            },
          },
        },
        expired: {
          where: {
            status: 'expired',
          },
        },
        revoked: {
          where: {
            status: 'revoked',
          },
        },
        forUser: (userId: number) => ({
          where: {
            user_id: userId,
          },
        }),
      },
    });
  }

  /**
   * Define model associations
   */
  static associate(models: any) {
    // UserSession belongs to User (session owner)
    UserSession.belongsTo(models.User, {
      foreignKey: 'user_id',
      as: 'user',
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    // UserSession belongs to User (terminated by)
    UserSession.belongsTo(models.User, {
      foreignKey: 'terminated_by',
      as: 'terminated_by_user',
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  }

  /**
   * Check if the session is expired
   */
  isExpired(): boolean {
    return new Date() > this.expires_at;
  }

  /**
   * Check if the session is active
   */
  isActive(): boolean {
    return this.status === 'active' && !this.isExpired();
  }

  /**
   * Mark session as expired
   */
  markAsExpired(): void {
    this.status = 'expired';
    this.terminated_at = new Date();
  }

  /**
   * Revoke the session
   */
  revoke(terminatedBy?: number): void {
    this.status = 'revoked';
    this.terminated_at = new Date();
    if (terminatedBy) {
      this.terminated_by = terminatedBy;
    }
  }

  /**
   * Update last activity timestamp
   */
  updateLastActivity(): void {
    this.last_activity_at = new Date();
  }
}

export default UserSession;
