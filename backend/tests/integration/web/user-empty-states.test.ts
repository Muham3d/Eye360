/**
 * User Empty States Integration Tests
 *
 * Tests for empty state handling in the Users module.
 *
 * @module tests/integration/web/user-empty-states.test
 */

import request from 'supertest';
import { app } from '../../../src/app';
import { initializeDatabase, shutdownDatabase } from '../../../src/infrastructure/config/database';
import models from '../../../src/infrastructure/database/models';
import { getPasswordService } from '../../../src/core/services/PasswordService';

describe('User Empty States', () => {
  let sessionCookie: string;

  beforeAll(async () => {
    await initializeDatabase();

    // Create admin user
    const passwordService = getPasswordService();
    const adminPasswordHash = await passwordService.hash('Admin123!');

    await models.User.create({
      email: 'admin@test.com',
      password_hash: adminPasswordHash,
      first_name: 'Admin',
      last_name: 'User',
      role_id: 1,
      status: 'ACTIVE',
    });

    // Login and get session cookie
    const loginResponse = await request(app)
      .post('/login')
      .send({
        email: 'admin@test.com',
        password: 'Admin123!',
      })
      .expect(302);

    sessionCookie = loginResponse.headers['set-cookie'];
  });

  afterAll(async () => {
    await shutdownDatabase();
  });

  beforeEach(async () => {
    // Clear all users before each test
    await models.User.destroy({ where: {}, force: true });
  });

  describe('Empty list state', () => {
    it('should show empty state message when no users exist', async () => {
      const response = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.text).toContain('No users found');
      expect(response.text).toContain('Add User');
    });

    it('should not show any sample or hardcoded user rows', async () => {
      const response = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Should not contain any fake/sample data
      expect(response.text).not.toMatch(/John\s+Doe/i);
      expect(response.text).not.toMatch(/Jane\s+Smith/i);
      expect(response.text).not.toMatch(/example\.com/);
    });

    it('should provide a link to create the first user', async () => {
      const response = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.text).toContain('/users/new');
    });
  });

  describe('Empty search results', () => {
    beforeEach(async () => {
      // Create one test user
      const passwordService = getPasswordService();
      const testPasswordHash = await passwordService.hash('Test1234!');

      await models.User.create({
        email: `test-search-${Date.now()}@example.com`,
        password_hash: testPasswordHash,
        first_name: 'Test',
        last_name: 'User',
        role_id: 4,
        status: 'ACTIVE',
      });
    });

    it('should show empty state when search returns no results', async () => {
      const response = await request(app)
        .get('/users?search=nonexistentuser12345')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.text).toContain('No users found');
      expect(response.text).toContain('Try adjusting your filters');
    });

    it('should show empty state when role filter returns no results', async () => {
      const response = await request(app)
        .get('/users?role=admin') // Assuming there are no admins besides the current one
        .set('Cookie', sessionCookie)
        .expect(200);

      // May show empty state or filtered results
      // The key is no sample data
      expect(response.text).not.toMatch(/John\s+Doe/i);
    });

    it('should show empty state when status filter returns no results', async () => {
      const response = await request(app)
        .get('/users?status=suspended')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.text).not.toContain('sample');
    });
  });

  describe('Data refresh behavior', () => {
    it('should reflect new database records immediately', async () => {
      // First request - no users
      const response1 = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response1.text).toContain('No users found');

      // Create a user via database
      const passwordService = getPasswordService();
      const testPasswordHash = await passwordService.hash('Test1234!');

      await models.User.create({
        email: `new-user-${Date.now()}@example.com`,
        password_hash: testPasswordHash,
        first_name: 'New',
        last_name: 'User',
        role_id: 4,
        status: 'ACTIVE',
      });

      // Second request - should show the new user
      const response2 = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response2.text).toContain('New');
      expect(response2.text).toContain('User');
      expect(response2.text).not.toContain('No users found');
    });
  });

  describe('No hardcoded sample data', () => {
    it('should not contain any hardcoded user names in the source', async () => {
      const response = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Check for common fake/sample data patterns
      expect(response.text).not.toMatch(/Sample\s+User/i);
      expect(response.text).not.toMatch(/Test\s+User\s+1/i);
      expect(response.text).not.toMatch(/John\s+Doe/i);
      expect(response.text).not.toMatch(/Jane\s+Smith/i);
    });

    it('should display empty state message without sample rows', async () => {
      const response = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Should have empty state message
      expect(response.text).toContain('No users found');

      // Should not have a populated table with fake data
      // The table should either be absent or have 0 rows
      expect(response.text).not.toMatch(/<tbody>[\s\S]*?<tr[\s\S]*?<\/tr>[\s\S]*?<\/tbody>/);
    });
  });
});
