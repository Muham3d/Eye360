/**
 * Jest Global Teardown File
 *
 * This file runs once after all test suites.
 * Use it for one-time cleanup operations.
 */

export default async function globalTeardown() {
  // Any one-time cleanup can go here
  // For example: closing test databases, stopping test servers, etc.

  console.log('Global test teardown started...');

  // Example: Clean up test database
  // await cleanupTestDatabase();

  console.log('Global test teardown completed');
}
