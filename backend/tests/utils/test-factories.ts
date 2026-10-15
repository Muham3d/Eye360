/**
 * Test Factories
 *
 * Factory functions for creating test data objects.
 * These factories generate realistic test data with the ability to override specific fields.
 */

import type { RoleName } from '../../src/infrastructure/database/models/Role.js';
import type { UserStatus } from '../../src/infrastructure/database/models/User.js';

/**
 * User factory
 */
export function createUserFactory(overrides: Partial<any> = {}) {
  return {
    id: 1,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    status: 'active' as UserStatus,
    roleId: 1,
    roleName: 'Admin' as RoleName,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * User creation DTO factory
 */
export function createUserDTOFactory(overrides: Partial<any> = {}) {
  return {
    email: 'newuser@example.com',
    password: 'hashedPassword123',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+9876543210',
    roleId: 2,
    status: 'active' as UserStatus,
    ...overrides,
  };
}

/**
 * User update DTO factory
 */
export function updateUserDTOFactory(overrides: Partial<any> = {}) {
  return {
    email: 'updated@example.com',
    firstName: 'Updated',
    lastName: 'Name',
    phone: '+1111111111',
    status: 'active' as UserStatus,
    roleId: 3,
    ...overrides,
  };
}

/**
 * User with password factory (for authentication tests)
 */
export function createUserWithPasswordFactory(overrides: Partial<any> = {}) {
  return {
    ...createUserFactory(overrides),
    passwordHash: '$2b$10$abcdefghijklmnopqrstuvwxyz123456',
  };
}

/**
 * Role factory
 */
export function createRoleFactory(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: 'Admin' as RoleName,
    level: 1,
    description: 'System administrator',
    permissions: [],
    ...overrides,
  };
}

/**
 * Permission factory
 */
export function createPermissionFactory(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: 'users.manage',
    description: 'Manage users',
    resource: 'users',
    action: 'manage',
    ...overrides,
  };
}

/**
 * Session factory
 */
export function createSessionFactory(overrides: Partial<any> = {}) {
  return {
    id: 1,
    userId: 1,
    sessionToken: 'test-session-token-abc123',
    expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    ipAddress: '127.0.0.1',
    userAgent: 'Test Agent',
    lastActivityAt: new Date(),
    createdAt: new Date(),
    isActive: true,
    ...overrides,
  };
}

/**
 * Session creation DTO factory
 */
export function createSessionDTOFactory(overrides: Partial<any> = {}) {
  return {
    userId: 1,
    sessionToken: 'new-session-token-xyz789',
    expiresAt: new Date(Date.now() + 7200000), // 2 hours from now
    ipAddress: '192.168.1.1',
    userAgent: 'Mozilla/5.0',
    deviceInfo: 'Desktop',
    ...overrides,
  };
}

/**
 * JWT payload factory
 */
export function createJWTPayloadFactory(overrides: Partial<any> = {}) {
  return {
    sub: 1,
    email: 'test@example.com',
    roleId: 1,
    roleName: 'Admin' as RoleName,
    type: 'access' as 'access' | 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
    iss: 'patrolmanager',
    aud: 'patrolmanager-api',
    ...overrides,
  };
}

/**
 * Token pair factory
 */
export function createTokenPairFactory(overrides: Partial<any> = {}) {
  return {
    accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.access',
    refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.refresh',
    expiresIn: 900,
    refreshExpiresIn: 604800,
    ...overrides,
  };
}

/**
 * Paginated result factory
 */
export function createPaginatedResultFactory<T>(
  data: T[],
  overrides: Partial<{
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> = {}
) {
  return {
    data,
    total: overrides.total ?? data.length,
    page: overrides.page ?? 1,
    limit: overrides.limit ?? 25,
    totalPages: overrides.totalPages ?? Math.ceil((overrides.total ?? data.length) / (overrides.limit ?? 25)),
    ...overrides,
  };
}

/**
 * Login credentials factory
 */
export function createLoginCredentialsFactory(overrides: Partial<any> = {}) {
  return {
    email: 'test@example.com',
    password: 'Password123!',
    ...overrides,
  };
}

/**
 * Register data factory
 */
export function createRegisterDataFactory(overrides: Partial<any> = {}) {
  return {
    email: 'newuser@example.com',
    password: 'Password123!',
    firstName: 'New',
    lastName: 'User',
    phone: '+1234567890',
    roleId: 3,
    ...overrides,
  };
}

/**
 * Array factory - creates an array of items using a factory function
 */
export function createArray<T>(
  factory: () => T,
  count: number
): T[] {
  return Array.from({ length: count }, factory);
}

/**
 * Create multiple users
 */
export function createUsers(count: number, startId = 1): any[] {
  return createArray(() => createUserFactory({ id: startId++ }), count);
}

/**
 * Create multiple roles
 */
export function createRoles(): any[] {
  return [
    createRoleFactory({ id: 1, name: 'Admin' as RoleName, level: 1, description: 'System administrator' }),
    createRoleFactory({ id: 2, name: 'Manager' as RoleName, level: 2, description: 'Site manager' }),
    createRoleFactory({ id: 3, name: 'Supervisor' as RoleName, level: 3, description: 'Shift supervisor' }),
    createRoleFactory({ id: 4, name: 'Guard' as RoleName, level: 4, description: 'Security guard' }),
  ];
}

/**
 * Create all permissions
 */
export function createPermissions(): any[] {
  return [
    createPermissionFactory({ id: 1, name: 'users.create', resource: 'users', action: 'create' }),
    createPermissionFactory({ id: 2, name: 'users.read', resource: 'users', action: 'read' }),
    createPermissionFactory({ id: 3, name: 'users.update', resource: 'users', action: 'update' }),
    createPermissionFactory({ id: 4, name: 'users.delete', resource: 'users', action: 'delete' }),
    createPermissionFactory({ id: 5, name: 'users.manage', resource: 'users', action: 'manage' }),
    createPermissionFactory({ id: 6, name: 'sites.create', resource: 'sites', action: 'create' }),
    createPermissionFactory({ id: 7, name: 'sites.read', resource: 'sites', action: 'read' }),
    createPermissionFactory({ id: 8, name: 'sites.update', resource: 'sites', action: 'update' }),
    createPermissionFactory({ id: 9, name: 'sites.delete', resource: 'sites', action: 'delete' }),
    createPermissionFactory({ id: 10, name: 'sites.manage', resource: 'sites', action: 'manage' }),
  ];
}

/**
 * Site factory
 */
export function createSiteFactory(overrides: Partial<any> = {}) {
  return {
    id: 1,
    name: 'Test Site',
    description: 'A test site',
    address: '123 Test St',
    geofenceBoundary: {
      type: 'Polygon',
      coordinates: [
        [
          [-122.42, 37.77],
          [-122.40, 37.77],
          [-122.40, 37.79],
          [-122.42, 37.79],
          [-122.42, 37.77],
        ],
      ],
    },
    geofenceBuffer: 10,
    timezone: 'America/Los_Angeles',
    status: 'active',
    createdById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Site creation DTO factory
 */
export function createSiteDTOFactory(overrides: Partial<any> = {}) {
  return {
    name: 'New Test Site',
    description: 'New test site description',
    address: '456 New St',
    geofenceBoundary: {
      type: 'Polygon',
      coordinates: [
        [
          [-122.42, 37.77],
          [-122.40, 37.77],
          [-122.40, 37.79],
          [-122.42, 37.79],
          [-122.42, 37.77],
        ],
      ],
    },
    geofenceBuffer: 10,
    timezone: 'America/Los_Angeles',
    status: 'active',
    createdById: 1,
    ...overrides,
  };
}

/**
 * Site update DTO factory
 */
export function updateSiteDTOFactory(overrides: Partial<any> = {}) {
  return {
    name: 'Updated Test Site',
    description: 'Updated test site description',
    ...overrides,
  };
}

/**
 * Site statistics factory
 */
export function createSiteStatisticsFactory(overrides: Partial<any> = {}) {
  return {
    siteId: 1,
    checkpointCount: 5,
    activeTemplateCount: 2,
    activeGuardCount: 3,
    totalPatrolsToday: 10,
    completedPatrolsToday: 8,
    missedPatrolsToday: 2,
    averageCompletionTime: 45,
    ...overrides,
  };
}
