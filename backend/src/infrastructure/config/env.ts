/**
 * Environment Configuration
 *
 * Validates and exports type-safe environment variables.
 * Throws an error at startup if required variables are missing.
 *
 * @module infrastructure/config/env
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

/**
 * Supported Node environments
 */
export type NodeEnv = 'development' | 'production' | 'test';

/**
 * Database configuration interface
 */
interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  ssl: boolean;
  url?: string;
  poolMax: number;
  poolMin: number;
  poolAcquire: number;
  poolIdle: number;
}

/**
 * JWT configuration interface
 */
interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
}

/**
 * Session configuration interface
 */
interface SessionConfig {
  secret: string;
  resave: boolean;
  saveUninitialized: boolean;
  rolling: boolean;
  cookieMaxAge: number;
  cookieSecure: boolean;
  cookieSameSite: boolean | 'lax' | 'strict' | 'none';
}

/**
 * CORS configuration interface
 */
interface CORSConfig {
  origin: string | string[] | boolean;
  credentials: boolean;
  exposedHeaders: string[];
}

/**
 * Rate limiting configuration interface
 */
interface RateLimitConfig {
  windowMs: number;
  max: number;
  standardHeaders: boolean;
  legacyHeaders: boolean;
}

/**
 * Server configuration interface
 */
interface ServerConfig {
  env: NodeEnv;
  port: number;
  host: string;
  apiUrl: string;
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
}

/**
 * Logging configuration interface
 */
interface LoggingConfig {
  level: string;
  format: string;
  file: boolean;
  filePath: string;
  maxFiles: number;
  maxSize: string;
}

/**
 * Complete application configuration interface
 */
export interface AppConfig {
  server: ServerConfig;
  database: DatabaseConfig;
  jwt: JWTConfig;
  session: SessionConfig;
  cors: CORSConfig;
  rateLimit: RateLimitConfig;
  logging: LoggingConfig;
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
 * Get boolean environment variable with default
 */
function getEnvBooleanOrDefault(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true';
}

/**
 * Validate Node environment
 */
function validateNodeEnv(env: string): NodeEnv {
  const validEnvs: NodeEnv[] = ['development', 'production', 'test'];
  if (!validEnvs.includes(env as NodeEnv)) {
    throw new Error(`Invalid NODE_ENV: ${env}. Must be one of: ${validEnvs.join(', ')}`);
  }
  return env as NodeEnv;
}

/**
 * Create and validate application configuration
 */
function createConfig(): AppConfig {
  const nodeEnv = validateNodeEnv(
    getEnvOrDefault('NODE_ENV', 'development')
  );

  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';

  // Server configuration
  const server: ServerConfig = {
    env: nodeEnv,
    port: getEnvNumberOrDefault('PORT', 3000),
    host: getEnvOrDefault('SERVER_HOST', '0.0.0.0'),
    apiUrl: getEnvOrDefault('API_URL', `http://localhost:${getEnvNumberOrDefault('PORT', 3000)}`),
    isDevelopment,
    isProduction,
    isTest,
  };

  // Database configuration
  const database: DatabaseConfig = {
    host: getEnvOrDefault('DB_HOST', 'localhost'),
    port: getEnvNumberOrDefault('DB_PORT', 5432),
    name: getEnvOrDefault('DB_NAME', 'patrolmanager'),
    user: getEnvOrDefault('DB_USER', 'postgres'),
    password: getRequiredEnv('DB_PASSWORD'),
    ssl: getEnvBooleanOrDefault('DB_SSL', false),
    url: process.env.DB_URL, // Optional connection string override
    poolMax: getEnvNumberOrDefault('DB_POOL_MAX', isProduction ? 20 : 10),
    poolMin: getEnvNumberOrDefault('DB_POOL_MIN', isProduction ? 5 : 0),
    poolAcquire: getEnvNumberOrDefault('DB_POOL_ACQUIRE', 60000),
    poolIdle: getEnvNumberOrDefault('DB_POOL_IDLE', 10000),
  };

  // JWT configuration
  const jwt: JWTConfig = {
    secret: getRequiredEnv('JWT_SECRET'),
    expiresIn: getEnvOrDefault('JWT_EXPIRES_IN', '1h'),
    refreshExpiresIn: getEnvOrDefault('JWT_REFRESH_EXPIRES_IN', '7d'),
    issuer: getEnvOrDefault('JWT_ISSUER', 'patrolmanager'),
    audience: getEnvOrDefault('JWT_AUDIENCE', 'patrolmanager-api'),
  };

  // Session configuration
  const session: SessionConfig = {
    secret: getRequiredEnv('SESSION_SECRET'),
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookieMaxAge: getEnvNumberOrDefault('SESSION_COOKIE_MAX_AGE', 86400000), // 24 hours
    cookieSecure: isProduction,
    cookieSameSite: isProduction ? 'strict' : 'lax',
  };

  // CORS configuration
  const cors: CORSConfig = {
    origin: isDevelopment
      ? ['http://localhost:3000', 'http://localhost:5173']
      : getEnvOrDefault('CORS_ORIGIN', '').split(',').filter(Boolean),
    credentials: true,
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  };

  // Rate limiting configuration
  const rateLimit: RateLimitConfig = {
    windowMs: getEnvNumberOrDefault('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    max: getEnvNumberOrDefault('RATE_LIMIT_MAX', isDevelopment ? 1000 : 100),
    standardHeaders: true,
    legacyHeaders: false,
  };

  // Logging configuration
  const logging: LoggingConfig = {
    level: getEnvOrDefault('LOG_LEVEL', isDevelopment ? 'debug' : 'info'),
    format: getEnvOrDefault('LOG_FORMAT', 'json'),
    file: !isTest,
    filePath: getEnvOrDefault('LOG_FILE_PATH', './logs'),
    maxFiles: getEnvNumberOrDefault('LOG_MAX_FILES', 14),
    maxSize: getEnvOrDefault('LOG_MAX_SIZE', '20m'),
  };

  return {
    server,
    database,
    jwt,
    session,
    cors,
    rateLimit,
    logging,
  };
}

/**
 * Export validated configuration
 */
export const config = createConfig();

/**
 * Export configuration type for use in other modules
 */
export type { AppConfig };
