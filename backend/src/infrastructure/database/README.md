# Database Infrastructure

## Purpose
Implements repository interfaces using Sequelize ORM. Handles all database operations.

## Contents
- Sequelize models with associations
- Repository implementations
- Database migrations and seeders
- Connection pooling configuration

## Rules
- Implements interfaces defined in core/domain
- Uses Sequelize for ORM operations
- All database access goes through repositories
- No business logic (only data access)

## Structure
- `models/` - Sequelize model definitions
- `repositories/` - Repository implementations
- `migrations/` - Database schema migrations
- `seeders/` - Initial data seeds

## RBAC Models (Phase 1)

### Core Models

| Model | File | Description |
|-------|------|-------------|
| Role | `models/Role.ts` | System roles (Admin, Manager, Supervisor, Guard) |
| Permission | `models/Permission.ts` | Granular permissions for RBAC |
| User | `models/User.ts` | User accounts with authentication |
| UserSession | `models/UserSession.ts` | Web panel sessions |
| RolePermission | `models/RolePermission.ts` | Junction table for many-to-many |

### Model Features

- **TypeScript Support**: Full TypeScript definitions with interfaces
- **Validation**: Sequelize validators for data integrity
- **Hooks**: Business logic enforcement (e.g., password change tracking)
- **Scopes**: Pre-defined query filters (e.g., active users)
- **Soft Deletes**: User model uses paranoid mode
- **Associations**: Proper foreign key relationships
- **Indexes**: Strategic indexing for performance

## Migrations

### Running Migrations

```bash
# Run all pending migrations
npm run db:migrate

# Undo the last migration
npm run db:migrate:undo
```

### Migration Files

| Migration | Description |
|-----------|-------------|
| 20240223000001-create-rbac-schema.js | Creates RBAC tables (roles, permissions, users, sessions) |

## Seeders

### Running Seeders

```bash
# Run all seeders
npm run db:seed

# Undo seeders
npm run db:seed:undo
```

### Seeder Files

| Seeder | Description |
|--------|-------------|
| 20240223000001-seed-rbac.js | Seeds system roles and permissions |

## Cascade Rules

| Relationship | On Delete | Behavior |
|--------------|-----------|----------|
| Role → User | RESTRICT | Prevents deletion if users exist |
| User → UserSession | CASCADE | Deletes sessions when user deleted |
| Role → RolePermission | CASCADE | Deletes permissions when role deleted |
| Permission → RolePermission | CASCADE | Deletes roles when permission deleted |

## Schema Documentation

Complete ERD and schema documentation is available at:
`docs/database/schema.md`
