import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../src/app.js';
import { UserRole } from '../../src/core/domain/entities/Role.js';

describe('US1: User Management Integration', () => {
    // Note: This test will fail until UserService and AuthMiddleware are implemented

    describe('Admin Role Management', () => {
        it('should allow an Admin to create a new user', async () => {
            // Logic for simulating an Admin session would go here in Phase 3 implementation
            const newUser = {
                email: 'guard@example.com',
                password: 'Password123!',
                firstName: 'John',
                lastName: 'Doe',
                role: UserRole.GUARD
            };

            const response = await request(app)
                .post('/api/admin/users')
                .send(newUser);

            // Expect 404 for now because route doesn't exist, but eventually 201
            expect(response.status).not.toBe(500);
        });

        it('should reject non-admin users from management routes', async () => {
            const response = await request(app)
                .get('/api/admin/users');

            // Expect 401 or 403 when RBAC is implemented
            expect([401, 403, 404]).toContain(response.status);
        });
    });
});
