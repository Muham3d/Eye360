/**
 * User List DTO
 *
 * Data Transfer Object for user list views.
 * Defines the structure of data passed to the users list view.
 *
 * @module interfaces/http/dtos/UserListDto
 */

/**
 * User item in list view
 */
export interface UserListItemDto {
  /** User ID */
  id: number;
  /** User email address */
  email: string;
  /** User's first name */
  firstName: string;
  /** User's last name */
  lastName: string;
  /** User's full name (computed) */
  fullName: string;
  /** User's phone number (optional) */
  phone?: string;
  /** Role ID */
  roleId: number;
  /** Role name */
  roleName: string;
  /** User account status */
  status: string;
  /** Human-readable status label */
  statusLabel: string;
  /** Last login timestamp */
  lastLoginAt?: Date;
  /** When the user was created */
  createdAt: Date;
  /** When the user was last updated */
  updatedAt: Date;
  /** Whether current user can edit this user */
  canEdit: boolean;
  /** Whether current user can delete this user */
  canDelete: boolean;
}

/**
 * Pagination metadata for user list
 */
export interface UserListPaginationDto {
  /** Current page number (1-indexed) */
  currentPage: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of users */
  total: number;
  /** Number of users per page */
  limit: number;
  /** First user index on current page */
  from: number;
  /** Last user index on current page */
  to: number;
  /** Previous page number (if exists) */
  prevPage: number | null;
  /** Next page number (if exists) */
  nextPage: number | null;
}

/**
 * Active filters on user list
 */
export interface UserListFiltersDto {
  /** Search query (searches name/email) */
  search?: string;
  /** Filter by role name */
  role?: string;
  /** Filter by status */
  status?: string;
  /** Sort field */
  sort?: string;
  /** Sort order (asc/desc) */
  order?: string;
}

/**
 * Complete view model for users list page
 */
export interface UserListViewModel {
  /** Page title */
  title: string;
  /** List of users */
  users: UserListItemDto[];
  /** Pagination metadata */
  pagination: UserListPaginationDto;
  /** Active filters */
  filters: UserListFiltersDto;
  /** Available roles for filtering */
  roles: Array<{
    id: number;
    name: string;
    description: string;
  }>;
}
