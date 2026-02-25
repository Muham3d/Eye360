/**
 * PasswordService Unit Tests
 *
 * Tests for password hashing, verification, validation, and token generation.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PasswordService, PasswordValidationResult } from '../../../src/core/services/PasswordService.js';
import { hashPassword, verifyPassword } from '../../utils/auth-helpers.js';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should initialize with default config', () => {
      const config = passwordService.getConfig();

      expect(config.minLength).toBe(8);
      expect(config.maxLength).toBe(128);
      expect(config.requireUppercase).toBe(true);
      expect(config.requireLowercase).toBe(true);
      expect(config.requireNumber).toBe(true);
      expect(config.bcryptCost).toBe(10);
    });

    it('should accept custom config', () => {
      const customService = new PasswordService({
        minLength: 12,
        requireSpecialChar: true,
        bcryptCost: 12,
      });

      const config = customService.getConfig();

      expect(config.minLength).toBe(12);
      expect(config.requireSpecialChar).toBe(true);
      expect(config.bcryptCost).toBe(12);
    });

    it('should merge custom config with defaults', () => {
      const customService = new PasswordService({
        minLength: 10,
      });

      const config = customService.getConfig();

      expect(config.minLength).toBe(10);
      expect(config.maxLength).toBe(128); // Default
      expect(config.requireUppercase).toBe(true); // Default
    });
  });

  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);

      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
      expect(hash.startsWith('$2b$10$') || hash.startsWith('$2a$10$')).toBe(true);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await passwordService.hashPassword(password);
      const hash2 = await passwordService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should throw error for weak password', async () => {
      const password = 'weak';

      await expect(passwordService.hashPassword(password)).rejects.toThrow('Password validation failed');
    });

    it('should throw error for password exceeding max length', async () => {
      const password = 'a'.repeat(129);

      await expect(passwordService.hashPassword(password)).rejects.toThrow('Password validation failed');
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);

      const isValid = await passwordService.comparePassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);

      const isValid = await passwordService.comparePassword('WrongPassword123!', hash);

      expect(isValid).toBe(false);
    });

    it('should return false for empty password', async () => {
      const hash = await passwordService.hashPassword('TestPassword123!');

      const isValid = await passwordService.comparePassword('', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('validatePassword', () => {
    const createValidation = (
      valid: boolean,
      errors: string[] = [],
      strength: 'weak' | 'medium' | 'strong' = 'medium'
    ): PasswordValidationResult => ({ valid, errors, strength });

    it('should validate a strong password', () => {
      const result = passwordService.validatePassword('StrongP@ssw0rd123');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.strength).toBe('strong');
    });

    it('should reject password that is too short', () => {
      const result = passwordService.validatePassword('Short1!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });

    it('should reject password without uppercase', () => {
      const result = passwordService.validatePassword('lowercase123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = passwordService.validatePassword('UPPERCASE123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = passwordService.validatePassword('NoNumbers!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should reject common weak passwords', () => {
      const weakPasswords = ['password', 'password123', '12345678', 'qwerty123'];

      weakPasswords.forEach((password) => {
        const result = passwordService.validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password is too common');
      });
    });

    it('should reject password with sequential characters', () => {
      const result = passwordService.validatePassword('Abcdefg123!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password contains sequential characters');
    });

    it('should reject password with repeated characters', () => {
      const result = passwordService.validatePassword('AAAAAAA111!');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password contains repeated characters');
    });

    it('should calculate correct strength levels', () => {
      const weakResult = passwordService.validatePassword('Short1!');
      expect(weakResult.strength).toBe('weak');

      const mediumResult = passwordService.validatePassword('MediumPass123');
      expect(mediumResult.strength).toBe('medium');

      const strongResult = passwordService.validatePassword('StrongP@ssw0rd!2024');
      expect(strongResult.strength).toBe('strong');
    });

    it('should validate password exceeding max length', () => {
      const longPassword = 'a'.repeat(129) + 'A1!';
      const result = passwordService.validatePassword(longPassword);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
    });
  });

  describe('generateSecureToken', () => {
    it('should generate a hex-encoded token', () => {
      const token = passwordService.generateSecureToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });

    it('should generate tokens with different lengths', () => {
      const token16 = passwordService.generateSecureToken(16);
      const token32 = passwordService.generateSecureToken(32);
      const token64 = passwordService.generateSecureToken(64);

      expect(token16.length).toBe(32);
      expect(token32.length).toBe(64);
      expect(token64.length).toBe(128);
    });

    it('should generate unique tokens', () => {
      const token1 = passwordService.generateSecureToken();
      const token2 = passwordService.generateSecureToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('generateUrlSafeToken', () => {
    it('should generate a URL-safe base64 token', () => {
      const token = passwordService.generateUrlSafeToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token).not.toMatch(/[+/=]/); // No URL-unsafe characters
    });

    it('should generate tokens with different lengths', () => {
      const token16 = passwordService.generateUrlSafeToken(16);
      const token32 = passwordService.generateUrlSafeToken(32);

      expect(token16.length).toBeGreaterThan(0);
      expect(token32.length).toBeGreaterThan(token16.length);
    });

    it('should generate unique tokens', () => {
      const token1 = passwordService.generateUrlSafeToken();
      const token2 = passwordService.generateUrlSafeToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('generatePasswordResetToken', () => {
    it('should generate a unique reset token for user', () => {
      const token1 = passwordService.generatePasswordResetToken(1);
      const token2 = passwordService.generatePasswordResetToken(1);

      expect(token1).not.toBe(token2);
    });

    it('should generate different tokens for different users', () => {
      const token1 = passwordService.generatePasswordResetToken(1);
      const token2 = passwordService.generatePasswordResetToken(2);

      expect(token1).not.toBe(token2);
    });

    it('should generate hex-encoded hash', () => {
      const token = passwordService.generatePasswordResetToken(1);

      expect(token).toBeDefined();
      expect(/^[0-9a-f]{64}$/.test(token)).toBe(true); // SHA-256 = 64 hex chars
    });
  });

  describe('generateRandomPassword', () => {
    it('should generate password meeting requirements', () => {
      const password = passwordService.generateRandomPassword();

      const validation = passwordService.validatePassword(password);

      expect(validation.valid).toBe(true);
    });

    it('should generate password of specified length', () => {
      const password = passwordService.generateRandomPassword(20);

      expect(password.length).toBe(20);
    });

    it('should include uppercase when required', () => {
      const service = new PasswordService({ requireUppercase: true });
      const password = service.generateRandomPassword();

      expect(/[A-Z]/.test(password)).toBe(true);
    });

    it('should include lowercase when required', () => {
      const service = new PasswordService({ requireLowercase: true });
      const password = service.generateRandomPassword();

      expect(/[a-z]/.test(password)).toBe(true);
    });

    it('should include number when required', () => {
      const service = new PasswordService({ requireNumber: true });
      const password = service.generateRandomPassword();

      expect(/[0-9]/.test(password)).toBe(true);
    });

    it('should include special character when required', () => {
      const service = new PasswordService({ requireSpecialChar: true });
      const password = service.generateRandomPassword();

      expect(/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)).toBe(true);
    });

    it('should throw error for length below minimum', () => {
      expect(() => passwordService.generateRandomPassword(4)).toThrow('at least 8 characters');
    });

    it('should generate unique passwords', () => {
      const password1 = passwordService.generateRandomPassword();
      const password2 = passwordService.generateRandomPassword();

      expect(password1).not.toBe(password2);
    });
  });

  describe('calculateStrengthScore', () => {
    it('should return 0 for empty password', () => {
      const score = passwordService.calculateStrengthScore('');

      expect(score).toBe(0);
    });

    it('should return low score for weak password', () => {
      const score = passwordService.calculateStrengthScore('password');

      expect(score).toBeLessThan(30);
    });

    it('should return high score for strong password', () => {
      const score = passwordService.calculateStrengthScore('Str0ng!P@ssw0rd#2024');

      expect(score).toBeGreaterThan(70);
    });

    it('should return maximum 100', () => {
      const score = passwordService.calculateStrengthScore('V3ry$tr0ng!P@ssw0rd#With*Many^Char$2024');

      expect(score).toBeLessThanOrEqual(100);
    });

    it('should penalize repeated characters', () => {
      const score1 = passwordService.calculateStrengthScore('TestPassword123!');
      const score2 = passwordService.calculateStrengthScore('TTTTTTPPPPP111!!!');

      expect(score2).toBeLessThan(score1);
    });

    it('should penalize sequential characters', () => {
      const score1 = passwordService.calculateStrengthScore('TestPass123!');
      const score2 = passwordService.calculateStrengthScore('Abcdefg123!');

      expect(score2).toBeLessThan(score1);
    });

    it('should reward longer passwords', () => {
      const score12 = passwordService.calculateStrengthScore('TestPass123!');
      const score20 = passwordService.calculateStrengthScore('TestPass123!Longer');

      expect(score20).toBeGreaterThan(score12);
    });
  });

  describe('shouldPasswordExpire', () => {
    it('should return true for old password', () => {
      const oldAge = 100 * 24 * 60 * 60 * 1000; // 100 days in ms

      const shouldExpire = passwordService.shouldPasswordExpire(oldAge);

      expect(shouldExpire).toBe(true);
    });

    it('should return false for recent password', () => {
      const recentAge = 10 * 24 * 60 * 60 * 1000; // 10 days in ms

      const shouldExpire = passwordService.shouldPasswordExpire(recentAge);

      expect(shouldExpire).toBe(false);
    });

    it('should use custom max age', () => {
      const age = 60 * 24 * 60 * 60 * 1000; // 60 days
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

      const shouldExpire = passwordService.shouldPasswordExpire(age, maxAge);

      expect(shouldExpire).toBe(true);
    });

    it('should handle edge case of exact max age', () => {
      const exactAge = 90 * 24 * 60 * 60 * 1000; // Exactly 90 days

      const shouldExpire = passwordService.shouldPasswordExpire(exactAge);

      expect(shouldExpire).toBe(false); // Not greater than max age
    });
  });

  describe('isNewPasswordDifferent', () => {
    it('should return true for different password', async () => {
      const oldHash = await passwordService.hashPassword('OldPassword123!');
      const newPassword = 'NewPassword123!';

      const isDifferent = await passwordService.isNewPasswordDifferent(newPassword, oldHash);

      expect(isDifferent).toBe(true);
    });

    it('should return false for same password', async () => {
      const oldHash = await passwordService.hashPassword('SamePassword123!');
      const samePassword = 'SamePassword123!';

      const isDifferent = await passwordService.isNewPasswordDifferent(samePassword, oldHash);

      expect(isDifferent).toBe(false);
    });

    it('should be case sensitive', async () => {
      const oldHash = await passwordService.hashPassword('Password123!');
      const newPassword = 'password123!'; // lowercase

      const isDifferent = await passwordService.isNewPasswordDifferent(newPassword, oldHash);

      expect(isDifferent).toBe(true);
    });
  });

  describe('hashToken', () => {
    it('should hash a token', async () => {
      const token = 'plain-token-to-hash';
      const hash = await passwordService.hashToken(token);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(token);
      expect(hash.startsWith('$2b$10$') || hash.startsWith('$2a$10$')).toBe(true);
    });

    it('should generate different hashes for same token', async () => {
      const token = 'same-token';
      const hash1 = await passwordService.hashToken(token);
      const hash2 = await passwordService.hashToken(token);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyToken', () => {
    it('should verify correct token', async () => {
      const token = 'token-to-verify';
      const hash = await passwordService.hashToken(token);

      const isValid = await passwordService.verifyToken(token, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect token', async () => {
      const token = 'original-token';
      const hash = await passwordService.hashToken(token);

      const isValid = await passwordService.verifyToken('wrong-token', hash);

      expect(isValid).toBe(false);
    });

    it('should reject empty token', async () => {
      const hash = await passwordService.hashToken('token');

      const isValid = await passwordService.verifyToken('', hash);

      expect(isValid).toBe(false);
    });
  });

  describe('estimateCrackTime', () => {
    it('should return 0 for empty password', () => {
      const time = passwordService.estimateCrackTime('');

      expect(time).toBe(0);
    });

    it('should estimate longer time for strong password', () => {
      const weakTime = passwordService.estimateCrackTime('pass');
      const strongTime = passwordService.estimateCrackTime('Str0ng!P@ssw0rd#2024VeryLong');

      expect(strongTime).toBeGreaterThan(weakTime);
    });

    it('should estimate very short time for weak password', () => {
      const time = passwordService.estimateCrackTime('123');

      expect(time).toBeCloseTo(0, 0);
    });

    it('should consider character variety', () => {
      const lowercaseTime = passwordService.estimateCrackTime('aaaaaaaa');
      const mixedTime = passwordService.estimateCrackTime('Aa1!Aa1!');

      expect(mixedTime).toBeGreaterThan(lowercaseTime);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete password workflow', async () => {
      const password = 'SecurePass123!';

      // Validate
      const validation = passwordService.validatePassword(password);
      expect(validation.valid).toBe(true);

      // Hash
      const hash = await passwordService.hashPassword(password);
      expect(hash).toBeDefined();

      // Verify
      const isValid = await passwordService.comparePassword(password, hash);
      expect(isValid).toBe(true);

      // Check difference
      const isDifferent = await passwordService.isNewPasswordDifferent('NewPass123!', hash);
      expect(isDifferent).toBe(true);
    });

    it('should handle reset token workflow', () => {
      const userId = 123;

      // Generate reset token
      const resetToken = passwordService.generatePasswordResetToken(userId);
      expect(resetToken).toBeDefined();

      // Token should be consistent format
      expect(/^[0-9a-f]{64}$/.test(resetToken)).toBe(true);

      // Different users get different tokens
      const differentToken = passwordService.generatePasswordResetToken(456);
      expect(resetToken).not.toBe(differentToken);
    });

    it('should handle password strength assessment', () => {
      const weakPassword = 'password';
      const strongPassword = 'V3ry$tr0ng!P@ssw0rd#2024';

      const weakValidation = passwordService.validatePassword(weakPassword);
      const strongValidation = passwordService.validatePassword(strongPassword);

      expect(weakValidation.valid).toBe(false);
      expect(strongValidation.valid).toBe(true);

      const weakScore = passwordService.calculateStrengthScore(weakPassword);
      const strongScore = passwordService.calculateStrengthScore(strongPassword);

      expect(strongScore).toBeGreaterThan(weakScore);
    });
  });
});
