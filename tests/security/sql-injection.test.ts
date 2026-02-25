/**
 * SQL Injection Security Tests
 *
 * Test suite to verify that the API is protected against SQL injection attacks.
 * These tests attempt to inject SQL code via various input parameters.
 *
 * @module tests/security
 */

import request from 'supertest';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestApp, TestApp } from '../utils/test-app';
import { createTestUser, generateAuthToken } from '../utils/test-helpers';
import { User } from '@infrastructure/database/models/index.js';

describe('SQL Injection Security Tests', () => {
  let app: TestApp;
  let adminToken: string;
  let adminUser: User;

  beforeAll(async () => {
    app = await createTestApp();

    // Create admin user for authentication
    adminUser = await createTestUser({ role: 'Admin' });
    adminToken = generateAuthToken(adminUser);
  });

  afterAll(async () => {
    await app.cleanup();
  });

  describe('Authentication Endpoints', () => {
    describe('POST /api/auth/login', () => {
      const sqlInjectionPayloads = [
        // Classic SQL injection
        "admin'--",
        "admin'/*",
        "' OR '1'='1",
        "' OR '1'='1'--",
        "' OR '1'='1'/*",
        "admin' OR '1'='1",
        "admin' OR '1'='1'--",
        "admin' OR '1'='1'/*",
        // Union-based
        "' UNION SELECT NULL--",
        "' UNION SELECT NULL,NULL--",
        "' UNION SELECT NULL,NULL,NULL--",
        // Error-based
        "' AND 1=CONVERT(int, (SELECT version))--",
        "' AND 1=CAST((SELECT version) AS int)--",
        // Time-based blind
        "' AND SLEEP(5)--",
        "' WAITFOR DELAY '00:00:05'--",
        // Boolean-based
        "' AND 1=1--",
        "' AND 1=2--",
        // Stack-based queries
        "'; DROP TABLE users--",
        "'; DROP TABLE users;--",
        // Stacked queries with comments
        "admin'; INSERT INTO users VALUES--",
        // Encoding variations
        "admin%27--",
        "admin%27%20OR%20%271%27%3D%271",
        // Multi-byte encoding
        "admin' OR 1=1#",
        "admin' OR 1=1/*",
        // PostgreSQL-specific
        "admin'; SELECT pg_sleep(5)--",
        "' OR 1=1; SELECT * FROM users WHERE '1'='1",
        // Backslash variations
        "admin\\",
        "\\",
        // Null byte injection
        "admin%00",
        // Hex encoding
        "0x61646D696E",
      ];

      test.each(sqlInjectionPayloads)('should reject SQL injection attempt in email: %s', async (payload) => {
        const response = await request(app.server)
          .post('/api/auth/login')
          .send({
            email: payload,
            password: 'AnyPassword123!',
          });

        // Should not return 200 (successful login)
        expect(response.status).not.toBe(200);

        // Should return validation error or unauthorized
        expect([400, 401, 422]).toContain(response.status);
      });

      test.each(sqlInjectionPayloads)('should reject SQL injection attempt in password: %s', async (payload) => {
        const response = await request(app.server)
          .post('/api/auth/login')
          .send({
            email: 'test@example.com',
            password: payload,
          });

        // Should not return 200 (successful login)
        expect(response.status).not.toBe(200);

        // Should return validation error or unauthorized
        expect([400, 401, 422]).toContain(response.status);
      });
    });
  });

  describe('User Management Endpoints', () => {
    describe('GET /api/users/:id', () => {
      const sqlInjectionIds = [
        "1' OR '1'='1",
        "1' UNION SELECT NULL--",
        "1; DROP TABLE users--",
        "1' AND SLEEP(5)--",
        "-1' OR '1'='1",
        "999999 OR 1=1",
        "1' OR 1=1--",
        "1'/*",
        "1'; SELECT pg_sleep(5)--",
      ];

      test.each(sqlInjectionIds)('should reject SQL injection in user ID parameter: %s', async (id) => {
        const response = await request(app.server)
          .get(`/api/users/${encodeURIComponent(id)}`)
          .set('Authorization', `Bearer ${adminToken}`);

        // Should reject the malicious input
        expect(response.status).not.toBe(200);
        expect([400, 404, 422]).toContain(response.status);
      });
    });

    describe('GET /api/users/search', () => {
      const sqlInjectionSearchQueries = [
        "admin' OR '1'='1",
        "'; DROP TABLE users--",
        "' UNION SELECT email FROM users--",
        "test' AND SLEEP(5)--",
        "admin%'; DROP TABLE users;--",
        "x' OR '1'='1'--",
      ];

      test.each(sqlInjectionSearchQueries)('should reject SQL injection in search query: %s', async (query) => {
        const response = await request(app.server)
          .get('/api/users/search')
          .query({ search: query })
          .set('Authorization', `Bearer ${adminToken}`);

        // Should handle safely (either return empty or validation error)
        expect([200, 400, 422]).toContain(response.status);

        // If 200, should not leak database information
        if (response.status === 200) {
          expect(response.body).not.toHaveProperty('sql');
          expect(response.body).not.toHaveProperty('error');
        }
      });
    });
  });

  describe('Patrol Endpoints', () => {
    describe('GET /api/patrols/:id', () => {
      const sqlInjectionIds = [
        "1' OR '1'='1",
        "1' UNION SELECT * FROM users--",
        "1'; DROP TABLE patrols--",
      ];

      test.each(sqlInjectionIds)('should reject SQL injection in patrol ID: %s', async (id) => {
        const response = await request(app.server)
          .get(`/api/patrols/${encodeURIComponent(id)}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(response.status).not.toBe(200);
      });
    });

    describe('POST /api/patrols/checkpoints/:id/verify', () => {
      const sqlInjectionPayloads = [
        {
          comment: "'; DROP TABLE checkpoints--",
        },
        {
          comment: "' OR '1'='1",
        },
        {
          note: "<script>alert('XSS')</script>",
        },
      ];

      test.each(sqlInjectionPayloads)('should sanitize comment/note fields: %o', async (payload) => {
        const response = await request(app.server)
          .post('/api/patrols/checkpoints/1/verify')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(payload);

        // Should not crash or leak database info
        expect(response.status).not.toBe(500);

        // If successful, verify data is sanitized
        if (response.status === 200 || response.status === 201) {
          expect(response.body).not.toContain('DROP TABLE');
        }
      });
    });
  });

  describe('Incident Endpoints', () => {
    describe('POST /api/incidents', () => {
      const sqlInjectionPayloads = [
        {
          title: "'; DROP TABLE incidents--",
          description: "Test description",
        },
        {
          title: "Test Incident",
          description: "'; INSERT INTO incidents VALUES--",
        },
        {
          title: "' OR '1'='1",
          description: "Test",
          location: "'; DROP TABLE locations--",
        },
      ];

      test.each(sqlInjectionPayloads)('should sanitize incident creation: %o', async (payload) => {
        const response = await request(app.server)
          .post('/api/incidents')
          .set('Authorization', `Bearer ${adminToken}`)
          .send(payload);

        // Should not crash (500) or execute SQL
        expect(response.status).not.toBe(500);

        // If successful, verify data is sanitized
        if (response.status === 201 || response.status === 200) {
          expect(response.body.title).not.toContain('DROP TABLE');
          expect(response.body.description).not.toContain('INSERT INTO');
        }
      });
    });
  });

  describe('Parameter Pollution', () => {
    test('should handle duplicate parameter names safely', async () => {
      const response = await request(app.server)
        .get('/api/users/1')
        .query({ id: '1', id: "1' OR '1'='1" })
        .set('Authorization', `Bearer ${adminToken}`);

      // Should not be vulnerable to parameter pollution
      expect(response.status).not.toBe(500);
    });

    test('should handle array parameters safely', async () => {
      const response = await request(app.server)
        .get('/api/users')
        .query({ id: ['1', "1' OR '1'='1'] })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).not.toBe(500);
    });
  });

  describe('Order By and Sort Injection', () => {
    test('should reject SQL injection in sortBy parameter', async () => {
      const response = await request(app.server)
        .get('/api/users')
        .query({ sortBy: "id; DROP TABLE users--" })
        .set('Authorization', `Bearer ${adminToken}`);

      // Should validate the sortBy parameter
      expect([200, 400, 422]).toContain(response.status);

      if (response.status === 200) {
        // Should use a default sort if invalid value provided
        expect(response.body).toBeDefined();
      }
    });

    test('should reject SQL injection in sortOrder parameter', async () => {
      const response = await request(app.server)
        .get('/api/users')
        .query({ sortOrder: "ASC; DROP TABLE users--" })
        .set('Authorization', `Bearer ${adminToken}`);

      expect([200, 400, 422]).toContain(response.status);
    });
  });

  describe('Blind SQL Injection', () => {
    test('should not be vulnerable to time-based blind SQL injection', async () => {
      const startTime = Date.now();

      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: "test@example.com' AND SLEEP(5)--",
          password: 'password',
        });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Request should complete quickly (less than 2 seconds for a failed login)
      // SLEEP(5) would cause a 5+ second delay if vulnerable
      expect(duration).toBeLessThan(3000);
      expect(response.status).not.toBe(200);
    });

    test('should not be vulnerable to boolean-based blind SQL injection', async () => {
      // Test with a condition that would be true if SQL injection works
      const trueCondition = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: "test@example.com' AND '1'='1",
          password: 'wrongpassword',
        });

      const falseCondition = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: "test@example.com' AND '1'='2",
          password: 'wrongpassword',
        });

      // Both should fail the same way (no info leakage)
      expect(trueCondition.status).toBe(falseCondition.status);
    });
  });

  describe('Second-Order SQL Injection', () => {
    test('should sanitize data that is stored and later used in queries', async () => {
      const maliciousData = "'; DROP TABLE test--";

      // Create user with malicious data
      const createResponse = await request(app.server)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'secondorder@test.com',
          password: 'TestPass123!',
          firstName: maliciousData,
          lastName: 'Test',
          roleId: 4, // Guard
        });

      // If user was created, try to search for them
      if (createResponse.status === 201) {
        const searchResponse = await request(app.server)
          .get('/api/users/search')
          .query({ search: maliciousData })
          .set('Authorization', `Bearer ${adminToken}`);

        // Should not cause database errors
        expect(searchResponse.status).not.toBe(500);

        // Clean up
        await request(app.server)
          .delete(`/api/users/${createResponse.body.id}`)
          .set('Authorization', `Bearer ${adminToken}`);
      }
    });
  });

  describe('Batch Query Protection', () => {
    test('should reject batched SQL queries', async () => {
      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: "admin'; SELECT * FROM users--",
          password: 'password',
        });

      // Should not execute the second query
      expect(response.status).not.toBe(200);
      expect(response.body).not.toHaveProperty('users');
    });

    test('should reject stacked queries', async () => {
      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: "admin'; INSERT INTO users (email) VALUES ('hacker@evil.com')--",
          password: 'password',
        });

      expect(response.status).not.toBe(200);

      // Verify the hacker user was not created
      const verifyResponse = await request(app.server)
        .get('/api/users')
        .query({ search: 'hacker@evil.com' })
        .set('Authorization', `Bearer ${adminToken}`);

      expect(verifyResponse.body.users?.length || 0).toBe(0);
    });
  });

  describe('ORM-Specific Protections', () => {
    test('should use parameterized queries via Sequelize', async () => {
      // This test verifies that Sequelize is using proper parameterization
      // We attempt an injection that would work with raw SQL concatenation

      const response = await request(app.server)
        .get('/api/users')
        .query({ search: "admin' OR '1'='1" })
        .set('Authorization', `Bearer ${adminToken}`);

      // If properly parameterized, this should either:
      // 1. Return validation error (if input is validated)
      // 2. Return no results (if parameterized and searched literally)
      // 3. Not leak all users (which would indicate SQL injection success)

      if (response.status === 200) {
        // Should not return all users (which would happen with ' OR '1'='1)
        const userCount = response.body.users?.length || response.body.length || 0;
        expect(userCount).toBeLessThan(100); // Arbitrary sanity check
      }
    });
  });

  describe('Error Message Information Disclosure', () => {
    test('should not leak database structure in error messages', async () => {
      const response = await request(app.server)
        .get('/api/users/invalid')

      .set('Authorization', `Bearer ${adminToken}`);

      if (response.status >= 400) {
        const errorString = JSON.stringify(response.body);

        // Should not contain database-specific information
        expect(errorString.toLowerCase()).not.toContain('select');
        expect(errorString.toLowerCase()).not.toContain('insert');
        expect(errorString.toLowerCase()).not.toContain('update');
        expect(errorString.toLowerCase()).not.toContain('delete');
        expect(errorString.toLowerCase()).not.toContain('drop');
        expect(errorString.toLowerCase()).not.toContain('truncate');
        expect(errorString.toLowerCase()).not.toContain('union');
        expect(errorString.toLowerCase()).not.toContain('join');

        // Should not contain table names
        expect(errorString.toLowerCase()).not.toContain('users(');
        expect(errorString.toLowerCase()).not.toContain('patrols(');
        expect(errorString.toLowerCase()).not.toContain('incidents(');
      }
    });
  });
});
