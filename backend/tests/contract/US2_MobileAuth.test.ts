import request from 'supertest';
import app from '../../src/app.js';
import { jest, describe, it, expect, beforeAll, afterEach } from '@jest/globals';
import * as services from '../../src/core/services/index.js';

describe('US2 Mobile Authentication Contract Tests', () => {
    let mockAuthService: any;

    beforeAll(() => {
        mockAuthService = {
            loginMobile: jest.fn(),
        };
        // Spy on the exported function
        jest.spyOn(services, 'getAuthService').mockReturnValue(mockAuthService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /api/v1/auth/login (Mobile)', () => {
        it('should return 200 and tokens when mobile login is successful', async () => {
            const mockResult = {
                success: true,
                data: {
                    user: {
                        id: 1,
                        email: 'guard@example.com',
                        roleName: 'Guard',
                    },
                    tokens: {
                        accessToken: 'mock-access-token',
                        refreshToken: 'mock-refresh-token',
                    },
                }
            };

            mockAuthService.loginMobile.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/auth/login')
                .set('x-client-type', 'mobile')
                .send({
                    email: 'guard@example.com',
                    password: 'password123',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.tokens).toBeDefined();
            expect(response.body.data.tokens.accessToken).toBe('mock-access-token');
            expect(response.body.data.user.email).toBe('guard@example.com');
            expect(mockAuthService.loginMobile).toHaveBeenCalledWith({
                email: 'guard@example.com',
                password: 'password123',
            });
        });

        it('should return 401 when mobile login fails', async () => {
            const mockResult = {
                success: false,
                error: {
                    message: 'Invalid credentials',
                }
            };

            mockAuthService.loginMobile.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/auth/login')
                .set('x-client-type', 'mobile')
                .send({
                    email: 'wrong@example.com',
                    password: 'wrongpassword',
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error.message).toBe('Invalid credentials');
        });

        it('should return 401 and lock info when account is locked', async () => {
            const mockResult = {
                success: false,
                error: {
                    message: 'Account locked',
                    details: {
                        accountLocked: true,
                        accountLockedUntil: new Date(Date.now() + 3600000).toISOString(),
                    }
                }
            };

            mockAuthService.loginMobile.mockResolvedValue(mockResult);

            const response = await request(app)
                .post('/api/v1/auth/login')
                .set('x-client-type', 'mobile')
                .send({
                    email: 'locked@example.com',
                    password: 'password123',
                });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error.details.accountLocked).toBe(true);
        });
    });
});
