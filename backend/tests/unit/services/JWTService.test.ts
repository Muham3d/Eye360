/**
 * JWTService Unit Tests
 *
 * Tests for JWT token generation, verification, and management.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { JWTService, JWTPayload, TokenPair } from '../../../src/core/services/JWTService.js';
import { generateTestToken, generateExpiredTestToken } from '../../utils/auth-helpers.js';

describe('JWTService', () => {
  let jwtService: JWTService;
  let mockConfig: any;

  beforeEach(() => {
    // Mock timer for cleanup tests
    jest.useFakeTimers();

    mockConfig = {
      secret: 'test-secret-key-min-32-characters-for-testing',
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
      issuer: 'patrolmanager-test',
      audience: 'patrolmanager-api-test',
    };

    jwtService = new JWTService(mockConfig);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with provided config', () => {
      expect(jwtService).toBeInstanceOf(JWTService);
    });

    it('should calculate correct expiration times in seconds', () => {
      const service = new JWTService(mockConfig);
      expect(service['accessExpiresInSeconds']).toBe(900); // 15 minutes
      expect(service['refreshExpiresInSeconds']).toBe(604800); // 7 days
    });

    it('should throw error for invalid time format', () => {
      const invalidConfig = { ...mockConfig, accessExpiresIn: 'invalid' };
      expect(() => new JWTService(invalidConfig)).toThrow('Invalid time format');
    });
  });

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
    });

    it('should include correct payload in access token', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');
      const decoded = jwtService.decodeToken(token) as JWTPayload;

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe(1);
      expect(decoded?.email).toBe('test@example.com');
      expect(decoded?.roleId).toBe(1);
      expect(decoded?.roleName).toBe('Admin');
      expect(decoded?.type).toBe('access');
    });

    it('should include issuer and audience in token', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');
      const decoded = jwtService.decodeToken(token) as JWTPayload;

      expect(decoded?.iss).toBe(mockConfig.issuer);
      expect(decoded?.aud).toBe(mockConfig.audience);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = jwtService.generateRefreshToken(1, 'test@example.com', 1, 'Admin');

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should mark token as refresh type', () => {
      const token = jwtService.generateRefreshToken(1, 'test@example.com', 1, 'Admin');
      const decoded = jwtService.decodeToken(token) as JWTPayload;

      expect(decoded?.type).toBe('refresh');
    });

    it('should have longer expiration than access token', () => {
      const accessDecoded = jwtService.decodeToken(
        jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin')
      ) as JWTPayload;
      const refreshDecoded = jwtService.decodeToken(
        jwtService.generateRefreshToken(1, 'test@example.com', 1, 'Admin')
      ) as JWTPayload;

      expect(refreshDecoded.exp).toBeGreaterThan(accessDecoded.exp!);
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokens = jwtService.generateTokenPair(1, 'test@example.com', 1, 'Admin');

      expect(tokens).toBeDefined();
      expect(tokens.accessToken).toBeDefined();
      expect(tokens.refreshToken).toBeDefined();
      expect(tokens.expiresIn).toBe(900);
      expect(tokens.refreshExpiresIn).toBe(604800);
    });

    it('should generate different tokens', () => {
      const tokens = jwtService.generateTokenPair(1, 'test@example.com', 1, 'Admin');

      expect(tokens.accessToken).not.toBe(tokens.refreshToken);
    });

    it('should have consistent user data in both tokens', () => {
      const tokens = jwtService.generateTokenPair(1, 'test@example.com', 1, 'Admin');

      const accessDecoded = jwtService.decodeToken(tokens.accessToken) as JWTPayload;
      const refreshDecoded = jwtService.decodeToken(tokens.refreshToken) as JWTPayload;

      expect(accessDecoded.sub).toBe(refreshDecoded.sub);
      expect(accessDecoded.email).toBe(refreshDecoded.email);
      expect(accessDecoded.roleId).toBe(refreshDecoded.roleId);
      expect(accessDecoded.roleName).toBe(refreshDecoded.roleName);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid access token', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');
      const result = jwtService.verifyToken(token, 'access');

      expect(result.valid).toBe(true);
      expect(result.payload).toBeDefined();
      expect(result.payload?.sub).toBe(1);
      expect(result.payload?.type).toBe('access');
    });

    it('should verify a valid refresh token', () => {
      const token = jwtService.generateRefreshToken(1, 'test@example.com', 1, 'Admin');
      const result = jwtService.verifyToken(token, 'refresh');

      expect(result.valid).toBe(true);
      expect(result.payload?.type).toBe('refresh');
    });

    it('should reject token with wrong type', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');
      const result = jwtService.verifyToken(token, 'refresh');

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Expected refresh');
    });

    it('should reject expired token', () => {
      const token = generateExpiredTestToken({
        sub: 1,
        email: 'test@example.com',
        roleId: 1,
        roleName: 'Admin',
        type: 'access',
      });

      const result = jwtService.verifyToken(token);

      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
      expect(result.error).toContain('expired');
    });

    it('should reject invalid token', () => {
      const result = jwtService.verifyToken('invalid.token.here');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject blacklisted token', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');
      jwtService.blacklistToken(token, 1);

      const result = jwtService.verifyToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('revoked');
    });

    it('should reject token with missing required fields', () => {
      const incompleteToken = generateTestToken({ sub: 1 }, mockConfig.secret);
      const result = jwtService.verifyToken(incompleteToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid token payload');
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');
      const decoded = jwtService.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe(1);
    });

    it('should return null for invalid token', () => {
      const decoded = jwtService.decodeToken('invalid-token');

      expect(decoded).toBeNull();
    });

    it('should decode expired token without error', () => {
      const token = generateExpiredTestToken({
        sub: 1,
        email: 'test@example.com',
        roleId: 1,
        roleName: 'Admin',
        type: 'access',
      });

      const decoded = jwtService.decodeToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe(1);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');
      const header = `Bearer ${token}`;

      const extracted = jwtService.extractTokenFromHeader(header);

      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = jwtService.extractTokenFromHeader(undefined);

      expect(extracted).toBeNull();
    });

    it('should return null for invalid format', () => {
      const extracted = jwtService.extractTokenFromHeader('InvalidFormat token');

      expect(extracted).toBeNull();
    });

    it('should return null for header without Bearer prefix', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');
      const extracted = jwtService.extractTokenFromHeader(token);

      expect(extracted).toBeNull();
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist a token', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');

      jwtService.blacklistToken(token, 1);

      const isBlacklisted = jwtService.isTokenBlacklisted(token);
      expect(isBlacklisted).toBe(true);
    });

    it('should store token metadata in blacklist', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');
      const userId = 123;

      jwtService.blacklistToken(token, userId);

      const isBlacklisted = jwtService.isTokenBlacklisted(token);
      expect(isBlacklisted).toBe(true);
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should return false for non-blacklisted token', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');

      const isBlacklisted = jwtService.isTokenBlacklisted(token);

      expect(isBlacklisted).toBe(false);
    });

    it('should return true for blacklisted token', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');
      jwtService.blacklistToken(token, 1);

      const isBlacklisted = jwtService.isTokenBlacklisted(token);

      expect(isBlacklisted).toBe(true);
    });

    it('should return false for expired blacklisted token', () => {
      const expiredToken = generateExpiredTestToken({
        sub: 1,
        email: 'test@example.com',
        roleId: 1,
        roleName: 'Admin',
        type: 'access',
      });

      jwtService.blacklistToken(expiredToken, 1);

      const isBlacklisted = jwtService.isTokenBlacklisted(expiredToken);

      expect(isBlacklisted).toBe(false);
    });
  });

  describe('cleanupBlacklist', () => {
    it('should remove expired entries from blacklist', () => {
      const validToken = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');
      const expiredToken = generateExpiredTestToken({
        sub: 1,
        email: 'test@example.com',
        roleId: 1,
        roleName: 'Admin',
        type: 'access',
      });

      jwtService.blacklistToken(validToken, 1);
      jwtService.blacklistToken(expiredToken, 1);

      const removedCount = jwtService.cleanupBlacklist();

      expect(removedCount).toBeGreaterThanOrEqual(1);
      expect(jwtService.isTokenBlacklisted(validToken)).toBe(true);
      expect(jwtService.isTokenBlacklisted(expiredToken)).toBe(false);
    });

    it('should return 0 when blacklist is empty', () => {
      const removedCount = jwtService.cleanupBlacklist();

      expect(removedCount).toBe(0);
    });
  });

  describe('getUserIdFromToken', () => {
    it('should extract user ID from valid token', () => {
      const token = jwtService.generateAccessToken(123, 'test@example.com', 1, 'Admin');

      const userId = jwtService.getUserIdFromToken(token);

      expect(userId).toBe(123);
    });

    it('should return null for invalid token', () => {
      const userId = jwtService.getUserIdFromToken('invalid.token');

      expect(userId).toBeNull();
    });

    it('should return null for malformed token', () => {
      const userId = jwtService.getUserIdFromToken('not-a-jwt');

      expect(userId).toBeNull();
    });
  });

  describe('validatePayload', () => {
    it('should validate correct payload structure', () => {
      const payload = {
        sub: 1,
        email: 'test@example.com',
        roleId: 1,
        roleName: 'Admin',
        type: 'access' as 'access' | 'refresh',
      };

      const isValid = jwtService.validatePayload(payload);

      expect(isValid).toBe(true);
    });

    it('should reject payload with missing sub', () => {
      const payload = {
        email: 'test@example.com',
        roleId: 1,
        roleName: 'Admin',
        type: 'access' as 'access' | 'refresh',
      };

      const isValid = jwtService.validatePayload(payload);

      expect(isValid).toBe(false);
    });

    it('should reject payload with wrong type', () => {
      const payload = {
        sub: 1,
        email: 'test@example.com',
        roleId: 1,
        roleName: 'Admin',
        type: 'invalid',
      };

      const isValid = jwtService.validatePayload(payload);

      expect(isValid).toBe(false);
    });

    it('should reject null payload', () => {
      const isValid = jwtService.validatePayload(null);

      expect(isValid).toBe(false);
    });

    it('should reject non-object payload', () => {
      const isValid = jwtService.validatePayload('string');

      expect(isValid).toBe(false);
    });
  });

  describe('getTimeUntilExpiration', () => {
    it('should return positive time for valid token', () => {
      const token = jwtService.generateAccessToken(1, 'test@example.com', 1, 'Admin');

      const timeRemaining = jwtService.getTimeUntilExpiration(token);

      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(900); // 15 minutes
    });

    it('should return 0 for expired token', () => {
      const token = generateExpiredTestToken({
        sub: 1,
        email: 'test@example.com',
        roleId: 1,
        roleName: 'Admin',
        type: 'access',
      });

      const timeRemaining = jwtService.getTimeUntilExpiration(token);

      expect(timeRemaining).toBe(0);
    });

    it('should return null for invalid token', () => {
      const timeRemaining = jwtService.getTimeUntilExpiration('invalid');

      expect(timeRemaining).toBeNull();
    });
  });

  describe('initializeJWTService', () => {
    it('should create singleton instance', () => {
      const { initializeJWTService, getJWTService } = require('../../../src/core/services/JWTService.js');

      const service1 = initializeJWTService(mockConfig);
      const service2 = getJWTService();

      expect(service1).toBe(service2);
    });

    it('should throw error for short secret', () => {
      const { initializeJWTService } = require('../../../src/core/services/JWTService.js');
      const badConfig = { ...mockConfig, secret: 'short' };

      expect(() => initializeJWTService(badConfig)).toThrow('at least 32 characters');
    });

    it('should throw error for missing secret', () => {
      const { initializeJWTService } = require('../../../src/core/services/JWTService.js');

      expect(() => initializeJWTService({ ...mockConfig, secret: '' })).toThrow('required');
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete token lifecycle', () => {
      // Generate token
      const tokens = jwtService.generateTokenPair(1, 'test@example.com', 1, 'Admin');

      // Verify access token
      const accessVerify = jwtService.verifyToken(tokens.accessToken, 'access');
      expect(accessVerify.valid).toBe(true);

      // Use access token
      const userId = jwtService.getUserIdFromToken(tokens.accessToken);
      expect(userId).toBe(1);

      // Blacklist access token
      jwtService.blacklistToken(tokens.accessToken, 1);

      // Token should now be invalid
      const verifyAfterBlacklist = jwtService.verifyToken(tokens.accessToken);
      expect(verifyAfterBlacklist.valid).toBe(false);
    });

    it('should handle token refresh flow', () => {
      // Generate initial tokens
      const tokens = jwtService.generateTokenPair(1, 'test@example.com', 1, 'Admin');

      // Verify refresh token
      const refreshVerify = jwtService.verifyToken(tokens.refreshToken, 'refresh');
      expect(refreshVerify.valid).toBe(true);

      // Blacklist old refresh token (as would happen on refresh)
      jwtService.blacklistToken(tokens.refreshToken, 1);

      // Old refresh token should be invalid
      const verifyAfterBlacklist = jwtService.verifyToken(tokens.refreshToken);
      expect(verifyAfterBlacklist.valid).toBe(false);

      // Generate new tokens
      const newTokens = jwtService.generateTokenPair(1, 'test@example.com', 1, 'Admin');
      expect(newTokens.accessToken).toBeDefined();
    });
  });
});
