import { jest } from '@jest/globals';
/**
 * Jest Test Setup File
 *
 * This file runs before each test suite.
 * It sets up global test utilities, mocks, and configurations.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.DB_NAME = process.env.DB_NAME || 'patrolmanager_test';
process.env.JWT_SECRET = 'test-secret-key-for-jwt-tokens-min-32-chars';
process.env.JWT_ACCESS_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Extend Jest matchers
import 'jest-extended';

// Global test utilities
import { mockConsole } from './utils/console.mock';
import { clearAllMocks } from './utils/mock.helpers';

// Setup global beforeAll
beforeAll(async () => {
  // Silence console in tests unless explicitly needed
  mockConsole();

  // Setup any global test state
});

// Setup global afterAll
afterAll(async () => {
  // Cleanup global test state
  clearAllMocks();
});

// Setup global beforeEach
beforeEach(() => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

// Setup global afterEach
afterEach(() => {
  // Clean up after each test
  jest.restoreAllMocks();
});

// Increase timeout for database operations
jest.setTimeout(10000);
