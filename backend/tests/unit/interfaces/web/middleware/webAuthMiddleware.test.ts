import { validateSession } from '../../../../../src/interfaces/web/middleware/webAuthMiddleware';
import { getSessionService } from '../../../../../src/core/services/SessionService';
import { setFlashMessage } from '../../../../../src/interfaces/web/config/ejs';

jest.mock('../../../../../src/core/services/SessionService');
jest.mock('../../../../../src/interfaces/web/config/ejs');

describe('webAuthMiddleware', () => {
  describe('validateSession', () => {
    let req: any;
    let res: any;
    let next: jest.Mock;
    let mockSessionService: any;

    beforeEach(() => {
      req = {
        session: {
          user: { id: 1, email: 'test@example.com' },
          token: 'valid-token',
        },
      };
      res = {
        redirect: jest.fn(),
      };
      next = jest.fn();
      mockSessionService = {
        validateSession: jest.fn(),
      };
      (getSessionService as jest.Mock).mockReturnValue(mockSessionService);
    });

    it('should call next if no user in session', async () => {
      req.session.user = null;
      await validateSession(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(mockSessionService.validateSession).not.toHaveBeenCalled();
    });

    it('should call next if session is valid', async () => {
      mockSessionService.validateSession.mockResolvedValue({
        valid: true,
        user: { id: 1, email: 'test@example.com', firstName: 'John', lastName: 'Doe', roleName: 'admin' },
      });

      await validateSession(req, res, next);

      expect(mockSessionService.validateSession).toHaveBeenCalledWith('valid-token');
      expect(req.session.user.role).toBe('admin');
      expect(next).toHaveBeenCalled();
    });

    it('should redirect to login if session is invalid', async () => {
      mockSessionService.validateSession.mockResolvedValue({
        valid: false,
        error: 'Session expired',
      });

      await validateSession(req, res, next);

      expect(req.session.user).toBeUndefined();
      expect(req.session.token).toBeUndefined();
      expect(setFlashMessage).toHaveBeenCalledWith(expect.anything(), 'warning', 'Your session has expired. Please log in again.');
      expect(res.redirect).toHaveBeenCalledWith('/login');
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle errors by calling next with error', async () => {
      const error = new Error('Database error');
      mockSessionService.validateSession.mockRejectedValue(error);

      await validateSession(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
