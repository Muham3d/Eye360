/**
 * User List Integration Tests
 *
 * Tests for the user list page and its actions.
 *
 * @module tests/integration/web/user-list.test
 */

import request from 'supertest';
import { app } from '../../../src/app';
import { initializeDatabase, shutdownDatabase } from '../../../src/infrastructure/config/database';
import models from '../../../src/infrastructure/database/models';
import { getPasswordService } from '../../../src/core/services/PasswordService';

describe('User List Actions', () => {
  let server: any;
  let sessionCookie: string;
  let testUserId: number;
  let adminUserId: number;

  beforeAll(async () => {
    await initializeDatabase();

    // Create admin user
    const passwordService = getPasswordService();
    const adminPasswordHash = await passwordService.hash('Admin123!');

    const admin = await models.User.create({
      email: 'admin@test.com',
      password_hash: adminPasswordHash,
      first_name: 'Admin',
      last_name: 'User',
      role_id: 1, // Assuming admin role is ID 1
      status: 'ACTIVE',
    });
    adminUserId = admin.id;

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
    // Create a test user for each test
    const passwordService = getPasswordService();
    const testPasswordHash = await passwordService.hash('Test1234!');

    const testUser = await models.User.create({
      email: `test-${Date.now()}@example.com`,
      password_hash: testPasswordHash,
      first_name: 'Test',
      last_name: 'User',
      role_id: 4, // Guard role
      status: 'ACTIVE',
    });
    testUserId = testUser.id;
  });

  afterEach(async () => {
    // Clean up test user
    if (testUserId) {
      await models.User.destroy({ where: { id: testUserId }, force: true });
    }
  });

  describe('GET /users - List page loads correctly', () => {
    it('should load the users list page successfully', async () => {
      const response = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.text).toContain('Users');
      expect(response.text).toContain('Manage user accounts');
    });

    it('should display users in the list', async () => {
      const response = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.text).toContain('Test User');
      expect(response.text).toContain('admin@test.com');
    });

    it('should include pagination information', async () => {
      const response = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.text).toMatch(/page|pagination|Showing/i);
    });
  });

  describe('User List Actions', () => {
    describe('Edit button', () => {
      it('should navigate to the edit page when clicking edit', async () => {
        const response = await request(app)
          .get(`/users/${testUserId}/edit`)
          .set('Cookie', sessionCookie)
          .expect(200);

        expect(response.text).toContain('Edit User');
        expect(response.text).toContain('Test');
        expect(response.text).toContain('User');
      });

      it('should pre-fill the edit form with user data', async () => {
        const response = await request(app)
          .get(`/users/${testUserId}/edit`)
          .set('Cookie', sessionCookie)
          .expect(200);

        expect(response.text).toContain('Test');
        expect(response.text).toContain('User');
      });
    });

    describe('Delete action', () => {
      it('should show delete confirmation modal', async () => {
        // This tests that the delete modal exists in the HTML
        const response = await request(app)
          .get('/users')
          .set('Cookie', sessionCookie)
          .expect(200);

        // Check that the delete modal function exists
        expect(response.text).toContain('openDeleteModal');
      });

      it('should delete user when confirmed', async () => {
        const response = await request(app)
          .post(`/users/${testUserId}/delete`)
          .set('Cookie', sessionCookie)
          .send({
            confirm: '1',
            confirmDelete: '1',
            'confirm-text': 'DELETE',
          })
          .expect(302);

        expect(response.headers.location).toBe('/users');

        // Verify user is deleted
        const deletedUser = await models.User.findByPk(testUserId);
        expect(deletedUser).toBeNull();
      });
    });

    describe('Self-deletion prevention', () => {
      it('should not allow users to delete themselves', async () => {
        const response = await request(app)
          .post(`/users/${adminUserId}/delete`)
          .set('Cookie', sessionCookie)
          .send({
            confirm: '1',
            confirmDelete: '1',
            'confirm-text': 'DELETE',
          })
          .expect(302);

        expect(response.headers.location).toBe('/users');

        // Verify admin user still exists
        const adminUser = await models.User.findByPk(adminUserId);
        expect(adminUser).not.toBeNull();
      });
    });
  });

  describe('CSRF Protection', () => {
    it('should reject POST requests without CSRF token', async () => {
      const response = await request(app)
        .post('/users')
        .set('Cookie', sessionCookie)
        .send({
          firstName: 'Test',
          lastName: 'User',
          email: 'csrf-test@example.com',
          roleId: 4,
          status: 'ACTIVE',
          password: 'Test1234!',
          confirmPassword: 'Test1234!',
        })
        .expect(403);

      expect(response.body).toHaveProperty('error', 'CSRF token validation failed');
    });
  });

  describe('Empty State Handling', () => {
    it('should show empty state when no users match filters', async () => {
      const response = await request(app)
        .get('/users?search=nonexistentuser12345')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.text).toContain('No users found');
    });
  });
});
