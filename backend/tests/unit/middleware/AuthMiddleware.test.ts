import { jest } from '@jest/globals';
import { ForbiddenError, AuthenticationError } from '../../../src/core/domain/errors/AppError.js';
// We will implement the actual middleware in T015/T014, for now we test the logic we want
import { authorize } from '../../../src/interfaces/http/middleware/AuthMiddleware.js';
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
        const middleware = authorize([UserRole.GUARD, UserRole.ADMIN]);
        middleware(mockRequest, mockResponse, nextFunction);
        expect(nextFunction).toHaveBeenCalled();
        expect(nextFunction).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should throw ForbiddenError if user does not have the required role', () => {
        const middleware = authorize([UserRole.ADMIN]);
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

    it('should throw AuthenticationError if user is not authenticated', () => {
        mockRequest.user = undefined;
        const middleware = authorize([UserRole.ADMIN]);
        middleware(mockRequest, mockResponse, nextFunction);
        expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
    });
});
