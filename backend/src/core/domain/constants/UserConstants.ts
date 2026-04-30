/**
 * User Domain Constants
 *
 * Centralized constants for user-related domain values.
 * These constants prevent typos, make maintenance easier,
 * and ensure consistency across the application.
 *
 * @module core/domain/constants/UserConstants
 */

/**
 * User Account Status Enumeration
 *
 * Represents the possible states of a user account.
 */
export enum UserStatus {
  /** User can log in and access the system */
  ACTIVE = 'ACTIVE',
  /** Account is disabled but not deleted */
  INACTIVE = 'INACTIVE',
  /** Account is temporarily locked due to violations */
  SUSPENDED = 'SUSPENDED',
  /** Account is awaiting verification */
  PENDING = 'PENDING',
}

/**
 * Default role for new users
 */
export const DEFAULT_ROLE = 'GUARD';

/**
 * Default status for new users
 */
export const DEFAULT_STATUS = UserStatus.INACTIVE;

/**
 * Human-readable role labels for display
 */
export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor',
  GUARD: 'Guard',
} as const;

/**
 * Role names (lowercase for consistent comparison)
 */
export const ROLE_NAMES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SUPERVISOR: 'supervisor',
  GUARD: 'guard',
} as const;

/**
 * Human-readable status labels for display
 */
export const STATUS_LABELS: Record<string, string> = {
  [UserStatus.ACTIVE]: 'Active',
  [UserStatus.INACTIVE]: 'Inactive',
  [UserStatus.SUSPENDED]: 'Suspended',
  [UserStatus.PENDING]: 'Pending',
} as const;

/**
 * CSS badge colors for roles (for UI rendering)
 */
export const ROLE_BADGE_COLORS: Record<string, string> = {
  [ROLE_NAMES.ADMIN]: 'bg-primary-100 text-primary-800',
  [ROLE_NAMES.MANAGER]: 'bg-purple-100 text-purple-800',
  [ROLE_NAMES.SUPERVISOR]: 'bg-warning-100 text-warning-800',
  [ROLE_NAMES.GUARD]: 'bg-secondary-100 text-secondary-800',
} as const;

/**
 * CSS badge colors for statuses (for UI rendering)
 */
export const STATUS_BADGE_COLORS: Record<string, { color: string; icon: string; label: string }> = {
  [UserStatus.ACTIVE.toLowerCase()]: {
    color: 'bg-success-100 text-success-800',
    icon: 'check-circle',
    label: 'Active',
  },
  [UserStatus.INACTIVE.toLowerCase()]: {
    color: 'bg-secondary-100 text-secondary-800',
    icon: 'minus-circle',
    label: 'Inactive',
  },
  [UserStatus.SUSPENDED.toLowerCase()]: {
    color: 'bg-error-100 text-error-800',
    icon: 'x-circle',
    label: 'Suspended',
  },
  [UserStatus.PENDING.toLowerCase()]: {
    color: 'bg-warning-100 text-warning-800',
    icon: 'clock',
    label: 'Pending',
  },
} as const;

/**
 * All valid user statuses (for validation)
 */
export const VALID_STATUSES = Object.values(UserStatus);

/**
 * All valid role names (for validation)
 */
export const VALID_ROLES = Object.values(ROLE_NAMES);

/**
 * Password policy constants
 */
export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: false, // Optional for better UX
} as const;

/**
 * User-related validation messages
 */
export const VALIDATION_MESSAGES = {
  EMAIL_REQUIRED: 'Email address is required',
  EMAIL_INVALID: 'Please enter a valid email address',
  EMAIL_EXISTS: 'A user with this email already exists',
  FIRST_NAME_REQUIRED: 'First name is required',
  FIRST_NAME_TOO_SHORT: 'First name must be at least 2 characters long',
  LAST_NAME_REQUIRED: 'Last name is required',
  LAST_NAME_TOO_SHORT: 'Last name must be at least 2 characters long',
  ROLE_REQUIRED: 'Please select a role for this user',
  STATUS_REQUIRED: 'Please select a status for this user',
  PASSWORD_REQUIRED: 'Password is required',
  PASSWORD_TOO_SHORT: 'Password must be at least 8 characters long',
  PASSWORD_MISMATCH: 'Passwords do not match',
} as const;

/**
 * Error messages for user operations
 */
export const ERROR_MESSAGES = {
  USER_NOT_FOUND: 'User not found',
  CANNOT_DELETE_SELF: 'You cannot delete your own account',
  CANNOT_CHANGE_OWN_ROLE: 'You cannot change your own role',
  CANNOT_CHANGE_OWN_STATUS: 'You cannot change your own status',
  UNAUTHORIZED_ACTION: 'You are not authorized to perform this action',
} as const;

/**
 * Success messages for user operations
 */
export const SUCCESS_MESSAGES = {
  USER_CREATED: 'User has been created successfully',
  USER_UPDATED: 'User has been updated successfully',
  USER_DELETED: 'User has been deleted successfully',
  ROLE_CHANGED: 'User role has been changed successfully',
  STATUS_CHANGED: 'User status has been changed successfully',
} as const;
