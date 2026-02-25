/**
 * Password Service
 *
 * Handles password hashing, verification, and validation.
 * This service is framework-agnostic and contains pure business logic.
 *
 * @module core/services/PasswordService
 */

import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ValidationError } from '../domain/errors/ValidationError.js';

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'medium' | 'strong';
}

/**
 * Password service configuration
 */
interface PasswordServiceConfig {
  minStrength: 'weak' | 'medium' | 'strong';
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  minLength: number;
  maxLength: number;
  bcryptCost: number;
}

/**
 * Default password requirements
 */
const DEFAULT_CONFIG: PasswordServiceConfig = {
  minStrength: 'medium',
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,
  minLength: 8,
  maxLength: 128,
  bcryptCost: 10,
};

/**
 * Common weak passwords list
 */
const WEAK_PASSWORDS = new Set([
  'password',
  'password123',
  '12345678',
  'qwerty123',
  'abc12345',
  'letmein',
  'welcome1',
  'admin123',
  'password1',
  'passw0rd',
  '123456789',
  '11111111',
  'aaaaaaaa',
  '00000000',
]);

/**
 * Patterns for checking character types
 */
const PATTERNS = {
  uppercase: /[A-Z]/,
  lowercase: /[a-z]/,
  number: /[0-9]/,
  specialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
  sequential: /(?:012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)/i,
  repeated: /(.)\1{2,}/,
};

/**
 * Password Service Class
 *
 * Provides password-related operations
 */
export class PasswordService {
  private readonly config: PasswordServiceConfig;

  constructor(config: Partial<PasswordServiceConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Hash a password using bcrypt
   *
   * @param password - Plain text password
   * @returns Hashed password
   * @throws ValidationError if password is invalid
   */
  async hashPassword(password: string): Promise<string> {
    // Validate password before hashing
    const validation = this.validatePassword(password);
    if (!validation.valid) {
      throw new ValidationError(`Password validation failed: ${validation.errors.join(', ')}`);
    }

    return bcrypt.hash(password, this.config.bcryptCost);
  }

  /**
   * Compare a plain password with a hashed password
   *
   * @param password - Plain text password
   * @param hash - Hashed password
   * @returns True if passwords match
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Validate password strength and format
   *
   * @param password - Password to validate
   * @returns Validation result with errors and strength
   */
  validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    let score = 0;

    // Check length
    if (password.length < this.config.minLength) {
      errors.push(`Password must be at least ${this.config.minLength} characters`);
    } else if (password.length >= 12) {
      score += 2; // Extra points for longer passwords
    } else {
      score += 1;
    }

    if (password.length > this.config.maxLength) {
      errors.push(`Password must not exceed ${this.config.maxLength} characters`);
    }

    // Check for uppercase
    if (this.config.requireUppercase) {
      if (!PATTERNS.uppercase.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
      } else {
        score += 1;
      }
    }

    // Check for lowercase
    if (this.config.requireLowercase) {
      if (!PATTERNS.lowercase.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
      } else {
        score += 1;
      }
    }

    // Check for numbers
    if (this.config.requireNumber) {
      if (!PATTERNS.number.test(password)) {
        errors.push('Password must contain at least one number');
      } else {
        score += 1;
      }
    }

    // Check for special characters
    if (this.config.requireSpecialChar) {
      if (!PATTERNS.specialChar.test(password)) {
        errors.push('Password must contain at least one special character');
      } else {
        score += 1;
      }
    }

    // Check for common weak passwords
    const lowerPassword = password.toLowerCase();
    if (WEAK_PASSWORDS.has(lowerPassword)) {
      errors.push('Password is too common');
      score = 0;
    }

    // Check for sequential characters
    if (PATTERNS.sequential.test(password)) {
      errors.push('Password contains sequential characters');
      score = Math.max(0, score - 1);
    }

    // Check for repeated characters
    if (PATTERNS.repeated.test(password)) {
      errors.push('Password contains repeated characters');
      score = Math.max(0, score - 1);
    }

    // Calculate strength
    let strength: PasswordValidationResult['strength'];
    if (score <= 2) {
      strength = 'weak';
    } else if (score <= 4) {
      strength = 'medium';
    } else {
      strength = 'strong';
    }

    // Check against minimum required strength
    const minScore = this.config.minStrength === 'strong' ? 5 : this.config.minStrength === 'medium' ? 3 : 0;
    const valid = errors.length === 0 && score >= minScore;

    return {
      valid,
      errors,
      strength,
    };
  }

  /**
   * Generate a secure random token
   *
   * @param bytes - Number of bytes (default: 32 for 256-bit token)
   * @returns Hex-encoded random token
   */
  generateSecureToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }

  /**
   * Generate a URL-safe random token
   *
   * @param bytes - Number of bytes (default: 32)
   * @returns URL-safe base64 encoded token
   */
  generateUrlSafeToken(bytes: number = 32): string {
    return crypto.randomBytes(bytes).toString('base64url');
  }

  /**
   * Generate a password reset token
   *
   * @param userId - User ID for verification
   * @returns Reset token
   */
  generatePasswordResetToken(userId: number): string {
    const timestamp = Date.now();
    const randomPart = this.generateSecureToken(16);
    const data = `${userId}:${timestamp}:${randomPart}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Generate a random password meeting requirements
   *
   * @param length - Password length (default: 16)
   * @returns Generated password
   */
  generateRandomPassword(length: number = 16): string {
    if (length < this.config.minLength) {
      throw new ValidationError(`Generated password must be at least ${this.config.minLength} characters`);
    }

    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    const all = uppercase + lowercase + numbers + special;

    let password = '';

    // Ensure required characters are included
    if (this.config.requireUppercase) {
      password += uppercase[Math.floor(Math.random() * uppercase.length)];
    }
    if (this.config.requireLowercase) {
      password += lowercase[Math.floor(Math.random() * lowercase.length)];
    }
    if (this.config.requireNumber) {
      password += numbers[Math.floor(Math.random() * numbers.length)];
    }
    if (this.config.requireSpecialChar) {
      password += special[Math.floor(Math.random() * special.length)];
    }

    // Fill remaining length with random characters
    while (password.length < length) {
      password += all[Math.floor(Math.random() * all.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Calculate password strength score (0-100)
   *
   * @param password - Password to evaluate
   * @returns Strength score
   */
  calculateStrengthScore(password: string): number {
    let score = 0;

    // Length score (up to 25 points)
    score += Math.min(25, password.length * 2);

    // Character variety (up to 25 points)
    if (PATTERNS.lowercase.test(password)) score += 5;
    if (PATTERNS.uppercase.test(password)) score += 5;
    if (PATTERNS.number.test(password)) score += 5;
    if (PATTERNS.specialChar.test(password)) score += 10;

    // Complexity bonuses (up to 30 points)
    const uniqueChars = new Set(password).size;
    score += Math.min(15, (uniqueChars / password.length) * 15);

    if (password.length >= 12) score += 5;
    if (password.length >= 16) score += 10;

    // Penalties (up to -30 points)
    if (PATTERNS.sequential.test(password)) score -= 15;
    if (PATTERNS.repeated.test(password)) score -= 15;
    if (WEAK_PASSWORDS.has(password.toLowerCase())) score -= 30;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Check if password needs to be changed (old password)
   *
   * @param passwordAge - Age of password in milliseconds
   * @param maxAge - Maximum password age in milliseconds (default: 90 days)
   * @returns True if password should be changed
   */
  shouldPasswordExpire(passwordAge: number, maxAge: number = 90 * 24 * 60 * 60 * 1000): boolean {
    return passwordAge > maxAge;
  }

  /**
   * Validate that a new password is different from the old one
   *
   * @param newPassword - New password
   * @param oldPasswordHash - Hashed old password
   * @returns True if passwords are different
   */
  async isNewPasswordDifferent(
    newPassword: string,
    oldPasswordHash: string
  ): Promise<boolean> {
    const isSame = await this.comparePassword(newPassword, oldPasswordHash);
    return !isSame;
  }

  /**
   * Hash a token for secure storage
   *
   * @param token - Plain token
   * @returns Hashed token
   */
  async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, this.config.bcryptCost);
  }

  /**
   * Verify a token against its hash
   *
   * @param token - Plain token
   * @param tokenHash - Hashed token
   * @returns True if token matches
   */
  async verifyToken(token: string, tokenHash: string): Promise<boolean> {
    return bcrypt.compare(token, tokenHash);
  }

  /**
   * Estimate time to crack password (in seconds)
   *
   * This is a rough estimate based on password entropy
   *
   * @param password - Password to evaluate
   * @returns Estimated seconds to crack
   */
  estimateCrackTime(password: string): number {
    // Calculate character set size
    let charsetSize = 0;
    if (PATTERNS.lowercase.test(password)) charsetSize += 26;
    if (PATTERNS.uppercase.test(password)) charsetSize += 26;
    if (PATTERNS.number.test(password)) charsetSize += 10;
    if (PATTERNS.specialChar.test(password)) charsetSize += 32;

    // Calculate combinations
    const combinations = Math.pow(charsetSize, password.length);

    // Assume 10 billion guesses per second (modern GPU)
    const guessesPerSecond = 10_000_000_000;

    // On average, half the combinations need to be tried
    return combinations / (2 * guessesPerSecond);
  }

  /**
   * Get the current configuration
   */
  getConfig(): PasswordServiceConfig {
    return { ...this.config };
  }
}

/**
 * Create a singleton instance with default configuration
 */
let passwordServiceInstance: PasswordService | null = null;

/**
 * Initialize password service with configuration
 *
 * @param config - Partial configuration (uses defaults for unspecified)
 * @returns Password service instance
 */
export function initializePasswordService(config?: Partial<PasswordServiceConfig>): PasswordService {
  passwordServiceInstance = new PasswordService(config);
  return passwordServiceInstance;
}

/**
 * Get the password service instance
 *
 * @throws Error if service not initialized
 * @returns Password service instance
 */
export function getPasswordService(): PasswordService {
  if (!passwordServiceInstance) {
    throw new Error('PasswordService not initialized. Call initializePasswordService first.');
  }

  return passwordServiceInstance;
}

/**
 * Export the password service class for dependency injection
 */
export default PasswordService;
