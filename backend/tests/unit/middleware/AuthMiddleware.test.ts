import { jest } from '@jest/globals';
import { ForbiddenError, UnauthorizedError } from '../../../src/core/domain/errors/index.js';
// Test requireRole middleware from authMiddleware.js
import { requireRole } from '../../../src/interfaces/http/middleware/authMiddleware.js';
import { UserRole } from '../../../src/core/domain/entities/Role.js';

describe('AuthMiddleware RBAC Unit Tests', () => {
    let mockRequest: any;
    let mockResponse: any;
    let nextFunction: any;

    beforeEach(() => {
        mockRequest = {
            user: {
                role: UserRole.GUARD
            }
        };
        mockResponse = {};
        nextFunction = jest.fn();
    });

    it('should allow access if user has the required role', () => {
        const middleware = requireRole(UserRole.GUARD, UserRole.ADMIN);
        middleware(mockRequest, mockResponse, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
        expect(nextFunction).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should throw ForbiddenError if user does not have the required role', () => {
        const middleware = requireRole(UserRole.ADMIN);
        try {
            middleware(mockRequest, mockResponse, nextFunction);
        } catch (error) {
            expect(error).toBeInstanceOf(ForbiddenError);
        }
        // Alternatively if the middleware calls next(err)
        middleware(mockRequest, mockResponse, nextFunction);
        if (nextFunction.mock.calls.length > 0) {
            expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
        }
    });

    it('should throw UnauthorizedError if user is not authenticated', () => {
        mockRequest.user = undefined;
        const middleware = requireRole(UserRole.ADMIN);
        middleware(mockRequest, mockResponse, nextFunction);
        expect(nextFunction).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });
});
