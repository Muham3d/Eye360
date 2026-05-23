import { jest } from '@jest/globals';
/**
 * Authentication Test Helpers
 *
 * Utilities for testing authentication-related functionality.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * Generate a valid JWT token for testing
 */
export function generateTestToken(payload: any, secret = process.env.JWT_SECRET || 'test-secret-key-for-jwt-tokens-min-32-chars'): string {
  return jwt.sign(payload, secret, {
    expiresIn: '15m',
    issuer: 'patrolmanager',
    audience: 'patrolmanager-api',
  });
}

/**
 * Generate an expired JWT token for testing
 */
export function generateExpiredTestToken(payload: any): string {
  return jwt.sign(payload, process.env.JWT_SECRET || 'test-secret-key-for-jwt-tokens-min-32-chars', {
    expiresIn: '-1h', // Expired 1 hour ago
    issuer: 'patrolmanager',
    audience: 'patrolmanager-api',
  });
}

/**
 * Generate a malformed JWT token for testing
 */
export function generateMalformedToken(): string {
  return 'not.a.valid.jwt.token';
}

/**
 * Generate a token with wrong signature
 */
export function generateTokenWithWrongSignature(payload: any): string {
  return jwt.sign(payload, 'wrong-secret', {
    expiresIn: '15m',
  });
}

/**
 * Hash a password for testing
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a random session token
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a mock request object with authentication
 */
export function createMockRequest(overrides: Partial<any> = {}): any {
  return {
    headers: {},
    body: {},
    params: {},
    query: {},
    user: null,
    session: null,
    ip: '127.0.0.1',
    get: (header: string) => {
      const headerMap: Record<string, string> = {
        'authorization': `Bearer ${generateTestToken({ sub: 1, email: 'test@example.com', roleId: 1, roleName: 'Admin', type: 'access' })}`,
        'user-agent': 'Test Agent',
        'x-forwarded-for': '127.0.0.1',
      };
      return headers[header.toLowerCase()] || headerMap[header.toLowerCase()] || null;
    },
    ...overrides,
  };
}

/**
 * Create a mock response object
 */
export function createMockResponse(): any {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    render: jest.fn().mockReturnThis(),
    locals: {},
  };

  return res;
}

/**
 * Create a mock next function
 */
export function createMockNext(): jest.Mock {
  return jest.fn();
}

/**
 * Create authenticated request
 */
export function createAuthenticatedRequest(user: any, overrides: Partial<any> = {}): any {
  const token = generateTestToken({
    sub: user.id,
    email: user.email,
    roleId: user.roleId,
    roleName: user.roleName,
    type: 'access',
  });

  return createMockRequest({
    headers: {
      authorization: `Bearer ${token}`,
    },
    user,
    ...overrides,
  });
}

/**
 * Create session-based authenticated request
 */
export function createSessionRequest(sessionToken: string, user: any, overrides: Partial<any> = {}): any {
  return createMockRequest({
    session: {
      token: sessionToken,
      user,
    },
    headers: {
      'x-session-token': sessionToken,
    },
    user,
    ...overrides,
  });
}

/**
 * Decode JWT token
 */
export function decodeToken(token: string): any {
  return jwt.decode(token);
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string, secret?: string): any {
  try {
    return jwt.verify(token, secret || process.env.JWT_SECRET || 'test-secret-key-for-jwt-tokens-min-32-chars');
  } catch (error) {
    return null;
  }
}

/**
 * Create mock user with password
 */
export async function createMockUserWithPassword(overrides: Partial<any> = {}): Promise<any> {
  const password = overrides.password || 'Password123!';
  const passwordHash = await hashPassword(password);

  return {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    status: 'active',
    roleId: 1,
    roleName: 'Admin',
    passwordHash,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}
