# Core Services Layer

## Purpose
Pure business logic layer that orchestrates use cases. Services are framework-agnostic and contain all business rules.

## Responsibilities

1. **Business Logic**: Implement all business rules and workflows
2. **Orchestration**: Coordinate between multiple repositories
3. **Domain Operations**: Perform complex domain operations
4. **Validation**: Validate business rules (not input format - that's middleware)

## Structure

```
services/
├── index.ts           # Service exports
├── auth.service.ts    # Authentication business logic
├── user.service.ts    # User management logic
├── site.service.ts    # Site management logic
├── checkpoint.service.ts  # Checkpoint logic
├── patrol.service.ts  # Patrol execution logic
└── incident.service.ts    # Incident reporting logic
```

## Service Template

```typescript
import { IUserRepository } from '../domain/repositories/IUserRepository.js';
import { ValidationError, NotFoundError } from '../domain/errors/index.js';

export class UserService {
  constructor(
    private readonly userRepository: IUserRepository
  ) {}

  async findAll(options: FindOptions): Promise<PaginatedResult<User>> {
    const { page, limit } = options;

    const [items, total] = await Promise.all([
      this.userRepository.findAll({ skip: (page - 1) * limit, take: limit }),
      this.userRepository.count(),
    ]);

    return {
      items,
      page,
      limit,
      total,
    };
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw NotFoundError.forUser(id);
    }
    return user;
  }

  async create(dto: CreateUserDTO): Promise<User> {
    // Business rule: Check if email already exists
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw ConflictError.duplicateEmail(dto.email);
    }

    // Business rule: Validate role assignment
    if (dto.role && !this.isValidRole(dto.role)) {
      throw ValidationError.fromFields({
        role: `Invalid role. Must be one of: ${this.getValidRoles().join(', ')}`,
      });
    }

    // Create user through repository
    return this.userRepository.create(dto);
  }

  private isValidRole(role: string): boolean {
    return this.getValidRoles().includes(role);
  }

  private getValidRoles(): string[] {
    return ['admin', 'manager', 'supervisor', 'guard'];
  }
}
```

## Rules

| Rule | Description |
|------|-------------|
| **No Express** | Services cannot import Express/Request/Response |
| **No Sequelize** | Services work with repository interfaces only |
| **Pure TypeScript** | No framework-specific dependencies |
| **Domain Entities** | Use domain entities, not ORM models |
| **Error Classes** | Throw domain error classes (AppError subclasses) |

## Key Principles

1. **Dependency Inversion**: Services depend on repository interfaces, not implementations
2. **Single Responsibility**: Each service handles one domain concept
3. **Stateless**: Services are stateless, all state is in repositories
4. **Testable**: Services can be unit tested without Express/Sequelize

## TODO

- [ ] Implement authentication service
- [ ] Implement user management service
- [ ] Implement site management service
- [ ] Implement checkpoint service
- [ ] Implement patrol execution service
- [ ] Implement incident reporting service
