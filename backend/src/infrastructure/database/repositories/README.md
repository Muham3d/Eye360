# Repository Implementations

## Purpose
Sequelize-based implementations of repository interfaces defined in the domain layer.

## Responsibilities

1. **Database Access**: All database queries go through repositories
2. **ORM Mapping**: Map between domain entities and Sequelize models
3. **Transactions**: Handle database transactions
4. **Query Optimization**: Optimize database queries

## Structure

```
repositories/
├── index.ts              # Repository exports
├── UserRepository.ts     # User repository implementation
├── SiteRepository.ts     # Site repository implementation
├── CheckpointRepository.ts  # Checkpoint repository implementation
├── PatrolRepository.ts   # Patrol repository implementation
└── IncidentRepository.ts # Incident repository implementation
```

## Repository Template

```typescript
import { User } from '@core/domain/entities/User.js';
import { IUserRepository } from '@core/domain/repositories/IUserRepository.js';
import { UserModel } from '../models/User.js';

export class UserRepository implements IUserRepository {
  async findById(id: number): Promise<User | null> {
    const model = await UserModel.findByPk(id);
    if (!model) {
      return null;
    }
    return this.toDomain(model);
  }

  async findByEmail(email: string): Promise<User | null> {
    const model = await UserModel.findOne({ where: { email } });
    if (!model) {
      return null;
    }
    return this.toDomain(model);
  }

  async findAll(options: FindOptions): Promise<User[]> {
    const models = await UserModel.findAll({
      offset: options.skip,
      limit: options.take,
      order: [['created_at', 'DESC']],
    });
    return models.map(model => this.toDomain(model));
  }

  async count(): Promise<number> {
    return UserModel.count();
  }

  async create(dto: CreateUserDTO): Promise<User> {
    const model = await UserModel.create(dto);
    return this.toDomain(model);
  }

  async update(id: number, dto: UpdateUserDTO): Promise<User> {
    await UserModel.update(dto, { where: { id } });
    const model = await UserModel.findByPk(id);
    if (!model) {
      throw new Error('User not found after update');
    }
    return this.toDomain(model);
  }

  async delete(id: number): Promise<void> {
    await UserModel.destroy({ where: { id } });
  }

  private toDomain(model: UserModel): User {
    return new User({
      id: model.id,
      email: model.email,
      firstName: model.first_name,
      lastName: model.last_name,
      role: model.role,
      // ... map other fields
    });
  }
}
```

## Rules

| Rule | Description |
|------|-------------|
| **Interface Compliance** | Must implement domain repository interface |
| **ORM Mapping Only** | No business logic in repositories |
| **Snake Case to Camel Case** | Map DB snake_case to domain camelCase |
| **Transaction Support** | Support passing transaction options |

## TODO

- [ ] Implement UserRepository
- [ ] Implement SiteRepository
- [ ] Implement CheckpointRepository
- [ ] Implement PatrolRepository
- [ ] Implement IncidentRepository
