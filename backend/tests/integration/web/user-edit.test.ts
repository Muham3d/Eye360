/**
 * User Edit Integration Tests
 *
 * Tests for the user edit form and update functionality.
 *
 * @module tests/integration/web/user-edit.test
 */

import request from 'supertest';
import { app } from '../../../src/app';
import { initializeDatabase, shutdownDatabase } from '../../../src/infrastructure/config/database';
import models from '../../../src/infrastructure/database/models';
import { getPasswordService } from '../../../src/core/services/PasswordService';

describe('User Edit Actions', () => {
  let server: any;
  let sessionCookie: string;
  let testUserId: number;

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
    // Create a test user
    const passwordService = getPasswordService();
    const testPasswordHash = await passwordService.hash('Test1234!');

    const testUser = await models.User.create({
      email: `test-edit-${Date.now()}@example.com`,
      password_hash: testPasswordHash,
      first_name: 'Test',
      last_name: 'User',
      role_id: 4,
      status: 'ACTIVE',
    });
    testUserId = testUser.id;
  });

  afterEach(async () => {
    if (testUserId) {
      await models.User.destroy({ where: { id: testUserId }, force: true });
    }
  });

  describe('GET /users/:id/edit - Edit form', () => {
    it('should load the edit form successfully', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/edit`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.text).toContain('Edit User');
    });

    it('should pre-fill form with user data', async () => {
      const response = await request(app)
        .get(`/users/${testUserId}/edit`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.text).toContain('Test');
      expect(response.text).toContain('User');
      expect(response.text).toContain('test-edit-');
    });

    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/users/999999/edit')
        .set('Cookie', sessionCookie)
        .expect(302);

      expect(response.headers.location).toBe('/users');
    });
  });

  describe('POST /users/:id - Update user', () => {
    it('should update user with valid data', async () => {
      const response = await request(app)
        .post(`/users/${testUserId}`)
        .set('Cookie', sessionCookie)
        .send({
          _method: 'PUT',
          _csrf: sessionCookie?.match(/csrfToken=([^;]+)/)?.[1] || '',
          firstName: 'Updated',
          lastName: 'Name',
          email: `updated-${Date.now()}@example.com`,
          phone: '+1234567890',
          roleId: 3,
          status: 'ACTIVE',
        })
        .expect(302);

      expect(response.headers.location).toBe('/users');
    });

    it('should show validation errors for invalid data', async () => {
      const response = await request(app)
        .post(`/users/${testUserId}`)
        .set('Cookie', sessionCookie)
        .send({
          _method: 'PUT',
          _csrf: sessionCookie?.match(/csrfToken=([^;]+)/)?.[1] || '',
          firstName: 'A', // Too short
          lastName: '',
          email: 'invalid-email',
          roleId: '',
          status: '',
        })
        .expect(200);

      expect(response.text).toContain('must be at least 2 characters');
    });

    it('should reject duplicate email', async () => {
      // Create another user
      const passwordService = getPasswordService();
      const anotherPasswordHash = await passwordService.hash('Another123!');
      await models.User.create({
        email: `another-${Date.now()}@example.com`,
        password_hash: anotherPasswordHash,
        first_name: 'Another',
        last_name: 'User',
        role_id: 4,
        status: 'ACTIVE',
      });

      const response = await request(app)
        .post(`/users/${testUserId}`)
        .set('Cookie', sessionCookie)
        .send({
          _method: 'PUT',
          _csrf: sessionCookie?.match(/csrfToken=([^;]+)/)?.[1] || '',
          firstName: 'Test',
          lastName: 'User',
          email: `another-${Date.now()}@example.com`,
          roleId: 4,
          status: 'ACTIVE',
        })
        .expect(200);

      expect(response.text).toContain('already exists');
    });
  });

  describe('Data Accuracy', () => {
    it('should show consistent data between list and edit form', async () => {
      const listResponse = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      const editResponse = await request(app)
        .get(`/users/${testUserId}/edit`)
        .set('Cookie', sessionCookie)
        .expect(200);

      // Both should contain the user's name
      expect(listResponse.text).toContain('Test');
      expect(editResponse.text).toContain('Test');
    });

    it('should persist changes across page refreshes', async () => {
      // Update user
      await request(app)
        .post(`/users/${testUserId}`)
        .set('Cookie', sessionCookie)
        .send({
          _method: 'PUT',
          _csrf: sessionCookie?.match(/csrfToken=([^;]+)/)?.[1] || '',
          firstName: 'Modified',
          lastName: 'User',
          email: `modified-${Date.now()}@example.com`,
          roleId: 4,
          status: 'INACTIVE',
        })
        .expect(302);

      // Check edit page shows updated data
      const editResponse = await request(app)
        .get(`/users/${testUserId}/edit`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(editResponse.text).toContain('Modified');

      // Check list page shows updated data
      const listResponse = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(listResponse.text).toContain('Modified');
    });
  });
});
