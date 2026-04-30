/**
 * User Form DTO
 *
 * Data Transfer Object for user create/edit forms.
 * Defines the structure of data passed to the user form view.
 *
 * @module interfaces/http/dtos/UserFormDto
 */

/**
 * User form data
 */
export interface UserFormData {
  /** User ID (only for edit mode) */
  id?: number;
  /** User email address */
  email?: string;
  /** User's first name */
  firstName?: string;
  /** User's last name */
  lastName?: string;
  /** User's phone number (optional) */
  phone?: string;
  /** Role ID */
  roleId?: number;
  /** User account status */
  status?: string;
}

/**
 * Role option for form dropdown
 */
export interface RoleOptionDto {
  /** Role ID */
  id: number;
  /** Role name */
  name: string;
  /** Role description */
  description: string;
  /** Human-readable label */
  label: string;
}

/**
 * Status option for form dropdown
 */
export interface StatusOptionDto {
  /** Status value */
  value: string;
  /** Display label */
  label: string;
  /** CSS badge color class */
  color: string;
}

/**
 * Validation error mapping
 */
export interface UserFormErrors {
  /** Email validation error */
  email?: string;
  /** First name validation error */
  firstName?: string;
  /** Last name validation error */
  lastName?: string;
  /** Phone validation error */
  phone?: string;
  /** Role validation error */
  roleId?: string;
  /** Status validation error */
  status?: string;
  /** Password validation error */
  password?: string;
  /** Confirm password validation error */
  confirmPassword?: string;
}

/**
 * Complete view model for user form page
 */
export interface UserFormViewModel {
  /** Page title */
  title: string;
  /** Form mode: 'create' or 'edit' */
  mode: 'create' | 'edit';
  /** User data (for edit mode) or submitted values (on error) */
  user: UserFormData;
  /** Available role options */
  roles: RoleOptionDto[];
  /** Available status options */
  statuses?: StatusOptionDto[];
  /** Validation errors (if any) */
  errors: UserFormErrors;
  /** Additional metadata */
  metadata?: {
    /** Account creation date (edit mode only) */
    createdAt?: Date;
    /** Last update date (edit mode only) */
    updatedAt?: Date;
    /** Last login timestamp (edit mode only) */
    lastLoginAt?: Date;
    /** Failed login attempts (edit mode only) */
    failedLoginAttempts?: number;
  };
}
