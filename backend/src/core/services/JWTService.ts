/**
 * JWT Service
 *
 * Handles JWT token generation, verification, and revocation.
 * This service is framework-agnostic and contains pure business logic.
 *
 * @module core/services/JWTService
 */

import jwt from 'jsonwebtoken';
import { ValidationError } from '../domain/errors/ValidationError.js';
import { AuthenticationError } from '../domain/errors/AuthenticationError.js';

/**
 * JWT payload interface
 */
export interface JWTPayload {
  sub: number; // User ID (subject)
  email: string;
  roleId: number;
  roleName: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
}

/**
 * Token pair interface
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
  expired?: boolean;
}

/**
 * Token blacklist entry interface
 */
interface BlacklistEntry {
  token: string;
  expiresAt: Date;
  revokedAt: Date;
  userId: number;
}

/**
 * JWT Service Configuration
 */
interface JWTServiceConfig {
  secret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
  issuer: string;
  audience: string;
}

/**
 * Token blacklist storage (in-memory for now, can be replaced with Redis)
 * Map structure: tokenHash -> BlacklistEntry
 */
const tokenBlacklist = new Map<string, BlacklistEntry>();

/**
 * Helper to create a hash of a token for blacklist storage
 * We store only a hash to prevent token leakage if the blacklist is compromised
 */
function hashToken(token: string): string {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Convert time string to seconds
 */
function timeToSeconds(timeString: string): number {
  const match = timeString.match(/^(\d+)([dhms])$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeString}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd': return value * 24 * 60 * 60;
    case 'h': return value * 60 * 60;
    case 'm': return value * 60;
    case 's': return value;
    default: throw new Error(`Invalid time unit: ${unit}`);
  }
}

/**
 * JWT Service Class
 *
 * Provides JWT token operations for authentication
 */
export class JWTService {
  private readonly config: JWTServiceConfig;
  private readonly accessExpiresInSeconds: number;
  private readonly refreshExpiresInSeconds: number;

  constructor(config: JWTServiceConfig) {
    this.config = config;
    this.accessExpiresInSeconds = timeToSeconds(config.accessExpiresIn);
    this.refreshExpiresInSeconds = timeToSeconds(config.refreshExpiresIn);
  }

  /**
   * Generate an access token for a user
   *
   * @param userId - User ID
   * @param email - User email
   * @param roleId - User role ID
   * @param roleName - User role name
   * @returns Signed JWT access token
   */
  generateAccessToken(
    userId: number,
    email: string,
    roleId: number,
    roleName: string
  ): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'> = {
      sub: userId,
      email,
      roleId,
      roleName,
      type: 'access',
    };

    return jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.accessExpiresIn,
      issuer: this.config.issuer,
      audience: this.config.audience,
    });
  }

  /**
   * Generate a refresh token for a user
   *
   * @param userId - User ID
   * @param email - User email
   * @param roleId - User role ID
   * @param roleName - User role name
   * @returns Signed JWT refresh token
   */
  generateRefreshToken(
    userId: number,
    email: string,
    roleId: number,
    roleName: string
  ): string {
    const payload: Omit<JWTPayload, 'iat' | 'exp' | 'iss' | 'aud'> = {
      sub: userId,
      email,
      roleId,
      roleName,
      type: 'refresh',
    };

    return jwt.sign(payload, this.config.secret, {
      expiresIn: this.config.refreshExpiresIn,
      issuer: this.config.issuer,
      audience: this.config.audience,
    });
  }

  /**
   * Generate both access and refresh tokens
   *
   * @param userId - User ID
   * @param email - User email
   * @param roleId - User role ID
   * @param roleName - User role name
   * @returns Object containing both tokens and expiration times
   */
  generateTokenPair(
    userId: number,
    email: string,
    roleId: number,
    roleName: string
  ): TokenPair {
    const accessToken = this.generateAccessToken(userId, email, roleId, roleName);
    const refreshToken = this.generateRefreshToken(userId, email, roleId, roleName);

    return {
      accessToken,
      refreshToken,
      expiresIn: this.accessExpiresInSeconds,
      refreshExpiresIn: this.refreshExpiresInSeconds,
    };
  }

  /**
   * Verify and decode a JWT token
   *
   * @param token - JWT token to verify
   * @param expectedType - Expected token type ('access' or 'refresh')
   * @returns Token verification result
   */
  verifyToken(token: string, expectedType?: 'access' | 'refresh'): TokenVerificationResult {
    // Check if token is blacklisted
    if (this.isTokenBlacklisted(token)) {
      return {
        valid: false,
        error: 'Token has been revoked',
        expired: false,
      };
    }

    try {
      const decoded = jwt.verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as JWTPayload;

      // Verify token type if specified
      if (expectedType && decoded.type !== expectedType) {
        return {
          valid: false,
          error: `Invalid token type. Expected ${expectedType}, got ${decoded.type}`,
          expired: false,
        };
      }

      // Validate required payload fields
      if (!decoded.sub || !decoded.email || !decoded.roleId) {
        return {
          valid: false,
          error: 'Invalid token payload',
          expired: false,
        };
      }

      return {
        valid: true,
        payload: decoded,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return {
          valid: false,
          error: 'Token has expired',
          expired: true,
        };
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return {
          valid: false,
          error: 'Invalid token',
          expired: false,
        };
      }

      if (error instanceof jwt.NotBeforeError) {
        return {
          valid: false,
          error: 'Token not yet valid',
          expired: false,
        };
      }

      return {
        valid: false,
        error: 'Unknown token verification error',
        expired: false,
      };
    }
  }

  /**
   * Decode a token without verification (for logging/debugging)
   *
   * @param token - JWT token to decode
   * @returns Decoded payload or null if invalid
   */
  decodeToken(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }

  /**
   * Extract token from Authorization header
   *
   * @param authHeader - Authorization header value
   * @returns Extracted token or null
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Add a token to the blacklist (for logout)
   *
   * @param token - Token to blacklist
   * @param userId - User ID (for tracking)
   */
  blacklistToken(token: string, userId: number): void {
    const decoded = this.decodeToken(token);

    if (!decoded || !decoded.exp) {
      return;
    }

    const expiresAt = new Date(decoded.exp * 1000);
    const tokenHash = hashToken(token);

    tokenBlacklist.set(tokenHash, {
      token: tokenHash,
      expiresAt,
      revokedAt: new Date(),
      userId,
    });
  }

  /**
   * Check if a token is blacklisted
   *
   * @param token - Token to check
   * @returns True if token is blacklisted
   */
  isTokenBlacklisted(token: string): boolean {
    const tokenHash = hashToken(token);
    const entry = tokenBlacklist.get(tokenHash);

    if (!entry) {
      return false;
    }

    // Remove expired entries and return false if expired
    if (new Date() > entry.expiresAt) {
      tokenBlacklist.delete(tokenHash);
      return false;
    }

    return true;
  }

  /**
   * Clean up expired blacklist entries
   *
   * @returns Number of entries removed
   */
  cleanupBlacklist(): number {
    const now = new Date();
    let removedCount = 0;

    for (const [tokenHash, entry] of tokenBlacklist.entries()) {
      if (now > entry.expiresAt) {
        tokenBlacklist.delete(tokenHash);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Get user ID from token without verification
   *
   * @param token - JWT token
   * @returns User ID or null
   */
  getUserIdFromToken(token: string): number | null {
    const decoded = this.decodeToken(token);
    return decoded?.sub ?? null;
  }

  /**
   * Validate token payload structure
   *
   * @param payload - Payload to validate
   * @returns True if payload is valid
   */
  validatePayload(payload: unknown): payload is JWTPayload {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const p = payload as Record<string, unknown>;

    return (
      typeof p.sub === 'number' &&
      typeof p.email === 'string' &&
      typeof p.roleId === 'number' &&
      typeof p.roleName === 'string' &&
      (p.type === 'access' || p.type === 'refresh')
    );
  }

  /**
   * Get time until token expiration
   *
   * @param token - JWT token
   * @returns Seconds until expiration or null
   */
  getTimeUntilExpiration(token: string): number | null {
    const decoded = this.decodeToken(token);

    if (!decoded || !decoded.exp) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const remaining = decoded.exp - now;

    return remaining > 0 ? remaining : 0;
  }
}

/**
 * Create a singleton instance with default configuration
 */
let jwtServiceInstance: JWTService | null = null;

/**
 * Initialize JWT service with configuration
 *
 * @param config - JWT service configuration
 * @returns JWT service instance
 */
export function initializeJWTService(config: JWTServiceConfig): JWTService {
  if (!config.secret) {
    throw new ValidationError('JWT secret is required');
  }

  if (config.secret.length < 32) {
    throw new ValidationError('JWT secret must be at least 32 characters long');
  }

  jwtServiceInstance = new JWTService(config);

  // Schedule periodic cleanup of expired blacklist entries (every hour)
  setInterval(() => {
    jwtServiceInstance?.cleanupBlacklist();
  }, 60 * 60 * 1000);

  return jwtServiceInstance;
}

/**
 * Get the JWT service instance
 *
 * @throws Error if service not initialized
 * @returns JWT service instance
 */
export function getJWTService(): JWTService {
  if (!jwtServiceInstance) {
    throw new Error('JWTService not initialized. Call initializeJWTService first.');
  }

  return jwtServiceInstance;
}

/**
 * Export the JWT service class for dependency injection
 */
export default JWTService;
