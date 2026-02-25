# PatrolManager Database Schema Documentation

## Overview

The PatrolManager database uses PostgreSQL with Sequelize ORM. The schema follows a clean architecture pattern with proper normalization, indexes, and cascade rules for data integrity.

## Entity Relationship Diagram (ERD)

```
┌─────────────────┐       ┌─────────────────┐       ┌──────────────────┐
│     Roles       │       │   Permissions   │       │  UserSessions    │
│─────────────────│       │─────────────────│       │──────────────────│
│ id (PK)         │──┐    │ id (PK)         │       │ id (PK)          │
│ name            │  │    │ name            │       │ user_id (FK)     │──┐
│ level           │  │    │ description     │       │ session_token    │  │
│ description     │  │    │ resource        │       │ expires_at       │  │
│ is_system_role  │  │    │ action          │       │ ip_address       │  │
│ created_at      │  │    │ created_at      │       │ user_agent       │  │
│ updated_at      │  │    │ updated_at      │       │ status           │  │
└─────────────────┘  │    └─────────────────┘       │ created_at       │  │
                     │                                │ terminated_at    │  │
                     │                                └──────────────────┘  │
                     │                                                        │
┌─────────────────┐  │    ┌─────────────────┐                                 │
│  RolePermission │  │    │      Users      │                                 │
│─────────────────│  │    │─────────────────│                                 │
│ role_id (FK)PK  │──┘    │ id (PK)         │◄────────────────────────────────┘
│ permission_id   │───┐   │ email           │
│   (FK)PK        │   │   │ password_hash   │
│ granted_at      │   │   │ first_name      │
│ granted_by (FK) │   │   │ last_name       │
└─────────────────┘   │   │ phone           │
                      │   │ status          │
                      └──│ role_id (FK)    │
                         │ last_login_at   │
                         │ created_at      │
                         │ updated_at      │
                         │ deleted_at      │
                         └─────────────────┘
```

## Table Definitions

### 1. Roles

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Unique identifier |
| name | ENUM | NOT NULL, UNIQUE | Role name: Admin, Manager, Supervisor, Guard |
| level | INTEGER | NOT NULL, UNIQUE | Hierarchy level (1=highest, 4=lowest) |
| description | TEXT | NULLABLE | Role description |
| is_system_role | BOOLEAN | NOT NULL, DEFAULT: true | Prevents deletion of system roles |
| created_at | TIMESTAMP | NOT NULL, DEFAULT: NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT: NOW() | Last update timestamp |

**Indexes:**
- `idx_roles_name` (UNIQUE) on name
- `idx_roles_level` (UNIQUE) on level

**Relationships:**
- One-to-Many with Users
- Many-to-Many with Permissions (through RolePermissions)

**Role Hierarchy:**
| Role | Level | Description |
|------|-------|-------------|
| Admin | 1 | Full system access |
| Manager | 2 | Site management |
| Supervisor | 3 | Patrol oversight |
| Guard | 4 | Patrol execution |

---

### 2. Permissions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Unique identifier |
| name | VARCHAR(100) | NOT NULL, UNIQUE | Permission identifier (e.g., users.create) |
| description | TEXT | NULLABLE | Human-readable description |
| resource | ENUM | NOT NULL | Resource: users, sites, checkpoints, patrols, incidents, reports, settings, notifications |
| action | ENUM | NOT NULL | Action: create, read, update, delete, manage, approve, assign, export |
| created_at | TIMESTAMP | NOT NULL, DEFAULT: NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT: NOW() | Last update timestamp |

**Indexes:**
- `idx_permissions_name` (UNIQUE) on name
- `idx_permissions_resource_action` (UNIQUE) on (resource, action)

**Relationships:**
- Many-to-Many with Roles (through RolePermissions)

**Permission Matrix by Role:**

| Resource/Action | Admin | Manager | Supervisor | Guard |
|-----------------|-------|---------|------------|-------|
| users.create | X | | | |
| users.read | X | X | X | X |
| users.update | X | | | |
| users.delete | X | | | |
| users.manage | X | | | |
| sites.create | X | X | | |
| sites.read | X | X | X | X |
| sites.update | X | X | | |
| sites.delete | X | X | | |
| sites.assign | X | X | | |
| checkpoints.create | X | X | | |
| checkpoints.read | X | X | X | X |
| checkpoints.update | X | X | | |
| checkpoints.delete | X | X | | |
| patrols.create | X | X | | |
| patrols.read | X | X | X | X |
| patrols.update | X | X | X | |
| patrols.delete | X | X | | |
| patrols.approve | X | X | X | |
| patrols.assign | X | X | | |
| incidents.create | X | X | X | X |
| incidents.read | X | X | X | X |
| incidents.update | X | X | X | |
| incidents.manage | X | | | |
| reports.read | X | X | X | |
| reports.export | X | X | | |
| settings.read | X | | | |
| settings.update | X | | | |
| notifications.read | X | X | X | X |
| notifications.manage | X | | | |

---

### 3. RolePermissions (Junction Table)

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| role_id | INTEGER | PK, FK(Roles.id) | Role identifier |
| permission_id | INTEGER | PK, FK(Permissions.id) | Permission identifier |
| granted_at | TIMESTAMP | NOT NULL, DEFAULT: NOW() | When permission was granted |
| granted_by | INTEGER | FK(Users.id), NULLABLE | User who granted the permission |

**Indexes:**
- `idx_role_permissions_role_id` on role_id
- `idx_role_permissions_permission_id` on permission_id
- `idx_role_permissions_granted_by` on granted_by

**Cascade Rules:**
- ON DELETE CASCADE when role or permission is deleted
- ON DELETE SET NULL for granted_by

---

### 4. Users

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Unique identifier |
| email | VARCHAR(255) | NOT NULL, UNIQUE | User email (login) |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt password hash |
| first_name | VARCHAR(100) | NOT NULL | First name |
| last_name | VARCHAR(100) | NOT NULL | Last name |
| phone | VARCHAR(20) | NULLABLE | Contact phone |
| status | ENUM | NOT NULL, DEFAULT: 'pending' | Account status: active, inactive, suspended, pending |
| role_id | INTEGER | FK(Roles.id), NOT NULL | User's role |
| last_login_at | TIMESTAMP | NULLABLE | Last successful login |
| password_changed_at | TIMESTAMP | NULLABLE | Last password change |
| failed_login_attempts | INTEGER | NOT NULL, DEFAULT: 0 | Failed login counter |
| account_locked_until | TIMESTAMP | NULLABLE | Account lock expiration |
| created_at | TIMESTAMP | NOT NULL, DEFAULT: NOW() | Creation timestamp |
| updated_at | TIMESTAMP | NOT NULL, DEFAULT: NOW() | Last update timestamp |
| deleted_at | TIMESTAMP | NULLABLE | Soft delete timestamp |

**Indexes:**
- `idx_users_email` (UNIQUE) on email
- `idx_users_status` on status
- `idx_users_role_id` on role_id
- `idx_users_deleted_at` on deleted_at
- `idx_users_status_role` on (status, role_id)
- `idx_users_full_name` on (first_name, last_name)

**Cascade Rules:**
- ON DELETE RESTRICT for role_id (prevents deletion if users exist)
- Soft deletes enabled (paranoid mode)

**Scopes:**
- `withPassword` - Include password_hash
- `active` - Filter by status='active'
- `byRole(roleId)` - Filter by role_id

---

### 5. UserSessions

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | INTEGER | PK, AUTO_INCREMENT | Unique identifier |
| user_id | INTEGER | FK(Users.id), NOT NULL | Session owner |
| session_token | VARCHAR(255) | NOT NULL, UNIQUE | Session token (hashed) |
| refresh_token | VARCHAR(255) | NULLABLE, UNIQUE | Refresh token (optional) |
| expires_at | TIMESTAMP | NOT NULL | Session expiration |
| ip_address | VARCHAR(45) | NULLABLE | Client IP address |
| user_agent | TEXT | NULLABLE | Browser user agent |
| device_info | VARCHAR(255) | NULLABLE | Parsed device info |
| last_activity_at | TIMESTAMP | NOT NULL, DEFAULT: NOW() | Last activity timestamp |
| status | ENUM | NOT NULL, DEFAULT: 'active' | Session status: active, expired, revoked |
| created_at | TIMESTAMP | NOT NULL, DEFAULT: NOW() | Creation timestamp |
| terminated_at | TIMESTAMP | NULLABLE | Termination timestamp |
| terminated_by | INTEGER | FK(Users.id), NULLABLE | User who terminated session |

**Indexes:**
- `idx_user_sessions_user_id` on user_id
- `idx_user_sessions_session_token` (UNIQUE) on session_token
- `idx_user_sessions_expires_at` on expires_at
- `idx_user_sessions_status` on status
- `idx_user_sessions_user_status` on (user_id, status)

**Cascade Rules:**
- ON DELETE CASCADE for user_id
- ON DELETE SET NULL for terminated_by

**Scopes:**
- `active` - Filter active and non-expired sessions
- `expired` - Filter expired sessions
- `revoked` - Filter revoked sessions
- `forUser(userId)` - Filter by user_id

---

## Data Integrity Rules

### Cascade Delete Rules

| Table | On Delete | Behavior |
|-------|-----------|----------|
| Roles | RESTRICT | Prevent deletion if users exist |
| Permissions | CASCADE | Remove role_permissions entries |
| Users | CASCADE | Remove user_sessions entries |
| RolePermissions | CASCADE | Remove entries when role/permission deleted |
| UserSessions | CASCADE | Remove sessions when user deleted |

### Validation Rules

| Table | Column | Validation |
|-------|--------|------------|
| Users | email | Must be valid email format |
| Users | phone | Must match phone regex pattern |
| Users | status | Must be one of: active, inactive, suspended, pending |
| Roles | name | Must be one of: Admin, Manager, Supervisor, Guard |
| Permissions | name | Format: {resource}.{action} |
| UserSessions | ip_address | Must be valid IP address |

### Business Logic Hooks

| Table | Hook | Logic |
|-------|------|-------|
| Users | beforeUpdate | Update password_changed_at when password changes |
| Users | beforeUpdate | Prevent modification of system role levels |
| Users | beforeDestroy | Prevent deletion of system roles |
| UserSessions | - | Auto-expire inactive sessions |

---

## Performance Considerations

### Index Strategy

1. **Foreign Keys**: All foreign keys have indexes for join performance
2. **Unique Constraints**: Email, session_token, role names are indexed as unique
3. **Composite Indexes**: (status, role_id) and (resource, action) for common queries
4. **Soft Deletes**: deleted_at indexed for efficient filtering
5. **Query Optimization**: Full-text search on names via composite index

### Query Patterns

| Query Type | Recommended Index | Usage |
|------------|-------------------|-------|
| User login | idx_users_email | Authentication |
| Active users | idx_users_status | Dashboard queries |
| Role-based filter | idx_users_role_id | Permission checks |
| Session validation | idx_user_sessions_session_token | Session auth |
| Expiration cleanup | idx_user_sessions_expires_at | Cleanup jobs |
| Permission check | idx_permissions_resource_action | RBAC checks |

---

## Future Phase Extensions

The schema is designed to accommodate future phases:

### Phase 2: Patrol Engine & Geofencing
- **Sites** table (with geofence boundaries)
- **Checkpoints** table (NFC/QR/GPS verification)
- **PatrolTemplates** table (sequenced routes)
- **PatrolRuns** table (executed instances)

### Phase 3: Real-time Command
- **LiveLocations** table (GPS tracking)
- **Alerts** table (SOS/dispatch)

### Phase 4: Incidents
- **Incidents** table (already defined in permissions)
- **IncidentMedia** table (evidence images)
- **IncidentComments** table (workflow)

### Phase 5: HR & Analytics
- **Shifts** table (scheduling)
- **Attendance** table (clock-in/out)
- **PerformanceMetrics** table (analytics)

---

## Database Best Practices Implemented

1. **Normalization**: 3NF compliance with proper foreign keys
2. **Timestamps**: All tables have created_at/updated_at
3. **Soft Deletes**: Users table uses paranoid mode
4. **Cascade Rules**: Proper referential integrity
5. **Enumerations**: PostgreSQL ENUMs for type safety
6. **Indexes**: Strategic indexing for query performance
7. **Validation**: Sequelize validators for data integrity
8. **Hooks**: Business logic enforcement at database level
9. **Transactions**: Migration/seeders use transactions
10. **Documentation**: Comprehensive schema documentation

---

## Migration Commands

```bash
# Run migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate:undo

# Run seeders
npm run db:seed

# Rollback seeders
npm run db:seed:undo
```

---

## Model Location Reference

| Model | Location |
|-------|----------|
| Role | `backend/src/infrastructure/database/models/Role.ts` |
| Permission | `backend/src/infrastructure/database/models/Permission.ts` |
| User | `backend/src/infrastructure/database/models/User.ts` |
| UserSession | `backend/src/infrastructure/database/models/UserSession.ts` |
| RolePermission | `backend/src/infrastructure/database/models/RolePermission.ts` |
| Models Index | `backend/src/infrastructure/database/models/index.ts` |
| Migration | `backend/src/infrastructure/database/migrations/20240223000001-create-rbac-schema.js` |
| Seeder | `backend/src/infrastructure/database/seeders/20240223000001-seed-rbac.js` |
| Repository Interface | `backend/src/core/domain/repositories/IUserRepository.ts` |
