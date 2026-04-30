const fs = require('fs');
const path = require('path');

// Read tsconfig.json
const tsconfig = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, './tsconfig.json'), 'utf-8')
);

// Helper to create path mappings
function createPathMappings() {
  const mappings = {};
  const paths = tsconfig.compilerOptions.paths || {};
  const baseUrl = tsconfig.compilerOptions.baseUrl || '.';

  for (const [alias, targets] of Object.entries(paths)) {
    // Remove the trailing /* from the alias
    const aliasPattern = alias.replace(/\/\*$/, '');
    // Get the first target (usually there's only one)
    const target = targets[0].replace(/\/\*$/, '');

    // Create regex pattern and replacement
    // Match both with and without .js extension
    mappings[`^${aliasPattern}/(.*)$`] = `<rootDir>/src/${target}/$1`;
    mappings[`^${aliasPattern}/(.*)\\.js$`] = `<rootDir>/src/${target}/$1`;
  }

  return mappings;
}

module.exports = {
  // Use commonjs preset for better compatibility
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Root directories for tests
  roots: ['<rootDir>/tests'],

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts',
  ],

  // TypeScript transformation - use ts-jest transform syntax
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        module: 'commonjs', // Use commonjs for tests
      },
      useESM: false, // Disable ESM for better compatibility
    }],
  },

  // Module name mapper for path aliases and .js extension handling
  moduleNameMapper: {
    // Path aliases from tsconfig
    ...createPathMappings(),
    // Handle relative imports with .js extension -> .ts files
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Also handle .js extensions for path aliases
    '^@core/(.*)\\.js$': '<rootDir>/src/core/$1',
    '^@infrastructure/(.*)\\.js$': '<rootDir>/src/infrastructure/$1',
    '^@interfaces/(.*)\\.js$': '<rootDir>/src/interfaces/$1',
    '^@/(.*)\\.js$': '<rootDir>/src/$1',
  },

  // Extensions to consider
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/**/*.type.ts',
    '!src/**/*.test.ts',
    '!src/**/*.spec.ts',
    '!src/server.ts',
    '!src/app.ts',
  ],

  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],

  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Global setup/teardown
  globalSetup: '<rootDir>/tests/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/globalTeardown.ts',

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: false,
  restoreMocks: true,

  // Timeout for tests (ms)
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Maximum number of workers
  maxWorkers: '50%',

  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache',

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],

  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>/src'],

  // Transform ignore patterns
  transformIgnorePatterns: [
    '/node_modules/',
  ],

  // Coverage providers
  coverageProvider: 'v8',
};
