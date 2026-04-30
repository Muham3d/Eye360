# Data Model: Users Module Functional Integrity

**Feature**: 001-fix-users-actions
**Date**: 2026-03-07
**Status**: Final

## Overview

This document describes the data model for the Users Module Functional Integrity feature. This feature does not introduce new entities but clarifies the existing User and Role entities and their relationships as they pertain to the web interface.

> **Note**: This feature focuses on the web interface layer (controllers and views). No schema changes are required. The existing entities are documented here to provide context for the implementation.

---

## Entities

### User

**Description**: Represents a user account in the system with authentication credentials, profile information, and role-based access.

**Source**: `backend/src/core/domain/entities/User.ts`

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID/Number | No | Primary key |
| `email` | String | No | Unique email address (used for login) |
| `password` | String | Yes | Hashed password (bcrypt) |
| `firstName` | String | No | User's first name |
| `lastName` | String | No | User's last name |
| `phone` | String | Yes | Phone number |
| `roleId` | UUID/Number | No | Foreign key to Role |
| `status` | Enum | No | Account status (ACTIVE, INACTIVE, SUSPENDED) |
| `lastLoginAt` | DateTime | Yes | Timestamp of last successful login |
| `createdAt` | DateTime | No | Account creation timestamp |
| `updatedAt` | DateTime | No | Last update timestamp |
| `deletedAt` | DateTime | Yes | Soft delete timestamp (null if not deleted) |

**Relationships**:
- `belongsTo`: Role (via `roleId`)
- `hasMany`: Sessions (via userId)
- `hasMany`: AuditLogs (via userId)

**Validation Rules**:
- `email`: Must be valid email format, unique across active users
- `password`: If provided, must meet password policy (min 8 chars, mixed case, number)
- `firstName`, `lastName`: Required, max 100 characters
- `status`: Must be one of: ACTIVE, INACTIVE, SUSPENDED

**State Transitions**:
```
[INACTIVE] → [ACTIVE] (on activation)
[ACTIVE] → [SUSPENDED] (on violation)
[SUSPENDED] → [ACTIVE] (on appeal/resolution)
[ACTIVE/INACTIVE/SUSPENDED] → [DELETED] (soft delete)
```

---

### Role

**Description**: Defines a user role with associated permissions for role-based access control (RBAC).

**Source**: `backend/src/core/domain/entities/Role.ts`

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID/Number | No | Primary key |
| `name` | String | No | Unique role name (ADMIN, MANAGER, SUPERVISOR, GUARD) |
| `description` | String | Yes | Human-readable role description |
| `permissions` | JSON/Array | No | Array of permission strings |
| `createdAt` | DateTime | No | Creation timestamp |
| `updatedAt` | DateTime | No | Last update timestamp |

**Relationships**:
- `hasMany`: Users (via roleId)

**Predefined Roles** (from system requirements):
1. **ADMIN**: Full system access, user management, configuration
2. **MANAGER**: Site management, reporting, supervision
3. **SUPERVISOR**: Guard supervision, patrol assignment
4. **GUARD**: Basic guard operations (mobile app primary role)

**Validation Rules**:
- `name`: Required, unique, must match predefined role names
- `permissions`: Required, array of valid permission strings

---

### Session

**Description**: Represents an active user session for web authentication.

**Source**: `backend/src/core/domain/entities/Session.ts` (if exists)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | UUID/Number | No | Primary key |
| `userId` | UUID/Number | No | Foreign key to User |
| `token` | String | No | Session token |
| `expiresAt` | DateTime | No | Session expiration timestamp |
| `createdAt` | DateTime | No | Session creation timestamp |

**Relationships**:
- `belongsTo`: User (via userId)

---

## Domain Constants

### UserStatus

**Source**: `backend/src/core/domain/constants/UserConstants.ts` (to be created)

```typescript
export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export const DEFAULT_ROLE = 'GUARD';
export const DEFAULT_STATUS = UserStatus.INACTIVE;

export const ROLE_LABELS = {
  ADMIN: 'Administrator',
  MANAGER: 'Manager',
  SUPERVISOR: 'Supervisor',
  GUARD: 'Guard'
};

export const STATUS_LABELS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  SUSPENDED: 'Suspended'
};
```

---

## Entity Relationship Diagram

```
┌─────────────┐         ┌─────────────┐
│    User     │────────>│    Role     │
│             │         │             │
│ - id        │         │ - id        │
│ - email     │         │ - name      │
│ - password  │         │ - desc      │
│ - roleId FK│         │ - perms     │
│ - status    │         └─────────────┘
│ - ...       │
└─────────────┘
       │
       │ has many
       v
┌─────────────┐
│   Session   │
│             │
│ - id        │
│ - userId FK │
│ - token     │
│ - expiresAt │
└─────────────┘
```

---

## View Models (DTOs)

### UserListViewModel

**Description**: Data structure passed to the Users list view.

**Source**: `backend/src/interfaces/http/dtos/UserListDto.ts` (may need to be created)

```typescript
interface UserListViewModel {
  users: Array<{
    id: string;
    email: string;
    fullName: string;
    role: string;
    roleLabel: string;
    status: string;
    statusLabel: string;
    lastLoginAt?: Date;
    canEdit: boolean;
    canDelete: boolean;
  }>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search?: string;
    role?: string;
    status?: string;
  };
}
```

### UserFormViewModel

**Description**: Data structure passed to the User create/edit form view.

```typescript
interface UserFormViewModel {
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleId: string;
    status: string;
  };
  roles: Array<{
    id: string;
    name: string;
    label: string;
  }>;
  errors?: Record<string, string>;
}
```

---

## Data Access Patterns

### Repository Interface

**Source**: `backend/src/core/domain/repositories/IUserRepository.ts`

```typescript
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(options: FindOptions): Promise<User[]>;
  count(options: CountOptions): Promise<number>;
  create(data: CreateUserData): Promise<User>;
  update(id: string, data: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;
}
```

---

## Migration Notes

**No migrations required for this feature.**

This feature only modifies the web interface layer. The database schema remains unchanged. If the existing schema is missing any fields referenced in this document, a migration will be added as a separate task.

---

## Indexes

For reference, the following indexes should exist on the users table:

| Index | Fields | Purpose |
|-------|--------|---------|
| `users_email_unique` | `email` | Enforce email uniqueness |
| `users_role_id_index` | `roleId` | Optimize role-based queries |
| `users_status_index` | `status` | Optimize status filtering |
| `users_deleted_at_index` | `deletedAt` | Optimize soft delete queries |
