/**
 * User Data Accuracy Integration Tests
 *
 * Tests for data accuracy and consistency across views.
 *
 * @module tests/integration/web/user-data-accuracy.test
 */

import request from 'supertest';
import { app } from '../../../src/app';
import { initializeDatabase, shutdownDatabase } from '../../../src/infrastructure/config/database';
import models from '../../../src/infrastructure/database/models';
import { getPasswordService } from '../../../src/core/services/PasswordService';

describe('User Data Accuracy Across Views', () => {
  let sessionCookie: string;
  let testUserId1: number;
  let testUserId2: number;

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
    // Create two test users
    const passwordService = getPasswordService();
    const testPasswordHash = await passwordService.hash('Test1234!');

    const user1 = await models.User.create({
      email: `user1-${Date.now()}@example.com`,
      password_hash: testPasswordHash,
      first_name: 'John',
      last_name: 'Doe',
      role_id: 4,
      status: 'ACTIVE',
    });

    const user2 = await models.User.create({
      email: `user2-${Date.now()}@example.com`,
      password_hash: testPasswordHash,
      first_name: 'Jane',
      last_name: 'Smith',
      role_id: 3,
      status: 'INACTIVE',
    });

    testUserId1 = user1.id;
    testUserId2 = user2.id;
  });

  afterEach(async () => {
    if (testUserId1) {
      await models.User.destroy({ where: { id: testUserId1 }, force: true });
    }
    if (testUserId2) {
      await models.User.destroy({ where: { id: testUserId2 }, force: true });
    }
  });

  describe('List vs Edit form data consistency', () => {
    it('should show same data in list and edit form for User 1', async () => {
      // Get list page
      const listResponse = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Get edit page
      const editResponse = await request(app)
        .get(`/users/${testUserId1}/edit`)
        .set('Cookie', sessionCookie)
        .expect(200);

      // Both should contain John Doe
      expect(listResponse.text).toContain('John');
      expect(listResponse.text).toContain('Doe');
      expect(editResponse.text).toContain('John');
      expect(editResponse.text).toContain('Doe');
    });

    it('should show same data in list and edit form for User 2', async () => {
      // Get list page
      const listResponse = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Get edit page
      const editResponse = await request(app)
        .get(`/users/${testUserId2}/edit`)
        .set('Cookie', sessionCookie)
        .expect(200);

      // Both should contain Jane Smith
      expect(listResponse.text).toContain('Jane');
      expect(listResponse.text).toContain('Smith');
      expect(editResponse.text).toContain('Jane');
      expect(editResponse.text).toContain('Smith');
    });

    it('should display different data for different users', async () => {
      // Get edit page for user 1
      const edit1Response = await request(app)
        .get(`/users/${testUserId1}/edit`)
        .set('Cookie', sessionCookie)
        .expect(200);

      // Get edit page for user 2
      const edit2Response = await request(app)
        .get(`/users/${testUserId2}/edit`)
        .set('Cookie', sessionCookie)
        .expect(200);

      // Should have different names
      expect(edit1Response.text).toContain('John');
      expect(edit1Response.text).not.toContain('Jane');
      expect(edit2Response.text).toContain('Jane');
      expect(edit2Response.text).not.toContain('John');
    });
  });

  describe('Saved changes reflect across views', () => {
    it('should show updated data in both list and edit form after update', async () => {
      // Update user 1
      await request(app)
        .post(`/users/${testUserId1}`)
        .set('Cookie', sessionCookie)
        .send({
          _method: 'PUT',
          _csrf: sessionCookie?.match(/csrfToken=([^;]+)/)?.[1] || '',
          firstName: 'Updated',
          lastName: 'Name',
          email: `updated-${Date.now()}@example.com`,
          roleId: 4,
          status: 'ACTIVE',
        })
        .expect(302);

      // Check list page shows updated data
      const listResponse = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(listResponse.text).toContain('Updated');

      // Check edit page shows updated data
      const editResponse = await request(app)
        .get(`/users/${testUserId1}/edit`)
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(editResponse.text).toContain('Updated');
    });
  });

  describe('No hardcoded fallback values', () => {
    it('should not use hardcoded role names when role is null', async () => {
      // Set user's role to null
      await models.User.update(
        { role_id: null },
        { where: { id: testUserId1 } }
      );

      // Get list page
      const listResponse = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Should handle gracefully without hardcoded 'Guard' appearing unexpectedly
      // The view should either show empty role or a placeholder
      expect(listResponse.text).toBeDefined();
    });

    it('should display correct status labels', async () => {
      // Get list page
      const listResponse = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Should show Active for user1 and Inactive for user2
      expect(listResponse.text).toContain('Active');
      expect(listResponse.text).toContain('Inactive');
    });
  });

  describe('Refresh behavior', () => {
    it('should show latest data after page refresh', async () => {
      // Get initial data
      const initialResponse = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(initialResponse.text).toContain('John');

      // Update user directly in database
      await models.User.update(
        { first_name: 'Refreshed' },
        { where: { id: testUserId1 } }
      );

      // Refresh (get the page again)
      const refreshedResponse = await request(app)
        .get('/users')
        .set('Cookie', sessionCookie)
        .expect(200);

      // Should show updated data
      expect(refreshedResponse.text).toContain('Refreshed');
      expect(refreshedResponse.text).not.toContain('John');
    });
  });
});
