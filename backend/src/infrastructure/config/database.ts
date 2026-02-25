/**
 * Database Configuration
 * PostgreSQL/SQLite configuration for Sequelize ORM with connection pooling
 *
 * @module infrastructure/config/database
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Environment type for database configuration
 */
type NodeEnv = 'development' | 'test' | 'production';

/**
 * Use SQLite for development (set via env var)
 */
const USE_SQLITE = process.env.USE_SQLITE === 'true' || process.env.NODE_ENV !== 'production';

/**
 * Get current Node environment
 */
function getNodeEnv(): NodeEnv {
  const env = process.env.NODE_ENV || 'development';
  if (!['development', 'test', 'production'].includes(env)) {
    throw new Error(`Invalid NODE_ENV: ${env}`);
  }
  return env as NodeEnv;
}

/**
 * Get required environment variable or throw error
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

/**
 * Get optional environment variable with default
 */
function getEnvOrDefault(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

/**
 * Get number environment variable with default
 */
function getEnvNumberOrDefault(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

/**
 * SQLite database file path
 */
function getSQLitePath(): string {
  const dbDir = path.resolve(__dirname, '../../data');
  return path.join(dbDir, 'patrolmanager.sqlite');
}

/**
 * Sequelize configuration interface
 */
interface SequelizeConfig {
  url?: string;
  storage?: string;
  username?: string;
  password?: string;
  database?: string;
  host?: string;
  port?: number;
  dialect: 'postgres' | 'sqlite';
  logging: boolean | ((sql: string, timing?: number) => void);
  logQueryParameters?: boolean;
  timezone: string;
  define: {
    underscored: boolean;
    freezeTableName: boolean;
    timestamps: boolean;
    createdAt: string;
    updatedAt: string;
  };
  pool?: {
    max?: number;
    min?: number;
    acquire: number;
    idle: number;
    evict?: number;
  };
  dialectOptions?: Record<string, unknown>;
  ssl?: boolean | Record<string, unknown>;
}

/**
 * Create SQLite configuration (for development)
 */
function createSQLiteConfig(): SequelizeConfig {
  return {
    dialect: 'sqlite',
    storage: getSQLitePath(),
    logging: (sql: string, timing?: number) => {
      const timingStr = timing !== undefined ? ` (${timing}ms)` : '';
      console.log(`[DB QUERY]${timingStr}: ${sql}`);
    },
    logQueryParameters: true,
    timezone: '+00:00',
    define: {
      underscored: true,
      freezeTableName: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
  };
}

/**
 * Build PostgreSQL connection URL from environment variables
 */
function buildPostgresConfig(): SequelizeConfig {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_NAME = 'patrolmanager',
    DB_USER = 'patrolmanager',
    DB_PASSWORD,
    DB_SSL = 'false',
  } = process.env;

  const sslMode = DB_SSL === 'true' ? '?sslmode=require' : '';
  const url = `postgres://${encodeURIComponent(DB_USER)}:${encodeURIComponent(DB_PASSWORD || '')}@${DB_HOST}:${DB_PORT}/${DB_NAME}${sslMode}`;

  return {
    url,
    dialect: 'postgres',
    logging: (sql: string, timing?: number) => {
      const timingStr = timing !== undefined ? ` (${timing}ms)` : '';
      console.log(`[DB QUERY]${timingStr}: ${sql}`);
    },
    logQueryParameters: true,
    timezone: '+00:00',
    define: {
      underscored: true,
      freezeTableName: true,
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
    },
    pool: {
      max: getEnvNumberOrDefault('DB_POOL_MAX', 20),
      min: getEnvNumberOrDefault('DB_POOL_MIN', 2),
      acquire: getEnvNumberOrDefault('DB_POOL_ACQUIRE', 10000),
      idle: getEnvNumberOrDefault('DB_POOL_IDLE', 10000),
      evict: getEnvNumberOrDefault('DB_POOL_EVICT', 60000),
    },
    ssl: DB_SSL === 'true' ? {
      require: true,
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    } : undefined,
  };
}

/**
 * Create database configuration for specific environment
 */
function createEnvironmentConfig(env: NodeEnv): SequelizeConfig {
  // Use SQLite for development/test unless explicitly disabled
  if (USE_SQLITE && (env === 'development' || env === 'test')) {
    console.log('[DATABASE] Using SQLite for development');
    return createSQLiteConfig();
  }

  console.log('[DATABASE] Using PostgreSQL');
  return buildPostgresConfig();
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const { Sequelize } = await import('sequelize');
    const dbConfig = createEnvironmentConfig(getNodeEnv());

    const sequelize = new Sequelize(dbConfig);

    await sequelize.authenticate();
    console.log('[DATABASE] Connection established successfully');

    // Test a simple query
    await sequelize.query('SELECT 1 as result');
    console.log('[DATABASE] Query test passed');

    await sequelize.close();
    return true;
  } catch (error) {
    console.error('[DATABASE] Connection test failed:', error);
    return false;
  }
}

/**
 * Get the current environment's database configuration
 */
export function getCurrentConfig(): SequelizeConfig {
  return createEnvironmentConfig(getNodeEnv());
}

export default { getCurrentConfig, testConnection };
export type { SequelizeConfig };
