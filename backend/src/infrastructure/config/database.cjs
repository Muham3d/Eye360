/**
 * Database Configuration for Sequelize CLI
 * CommonJS format for sequelize-cli migrations and seeders
 */

const path = require('path');

module.exports = {
  development: {
    dialect: 'sqlite',
    storage: path.resolve(process.cwd(), 'data', 'patrolmanager.sqlite'),
    logging: false,
    define: {
      underscored: true,
      freezeTableName: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  test: {
    dialect: 'sqlite',
    storage: path.resolve(process.cwd(), 'data', 'test.sqlite'),
    logging: false,
    define: {
      underscored: true,
      freezeTableName: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  },
  production: {
    dialect: 'postgres',
    url: process.env.DATABASE_URL || `postgres://${process.env.DB_USER || 'patrolmanager'}:${process.env.DB_PASSWORD || ''}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'patrolmanager'}`,
    logging: false,
    define: {
      underscored: true,
      freezeTableName: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '20'),
      min: parseInt(process.env.DB_POOL_MIN || '2'),
      acquire: parseInt(process.env.DB_POOL_ACQUIRE || '10000'),
      idle: parseInt(process.env.DB_POOL_IDLE || '10000'),
    },
    ssl: process.env.DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    } : undefined,
  },
};
