# Domain Layer

## Purpose
Contains pure business entities, value objects, and interfaces that are completely framework-agnostic.

## Structure

```
domain/
├── entities/          # Domain entity classes
├── value-objects/     # Immutable value objects
├── repositories/      # Repository interfaces (ports)
├── errors/            # Custom error classes
└── dto/               # Data transfer objects for boundaries
```

## Entities

Core business entities representing the domain model:

| Entity | Description |
|--------|-------------|
| User | Guards, Supervisors, Managers, Admins with RBAC |
| Site | Locations with geofence boundaries |
| Checkpoint | Verification points (NFC, QR, GPS) |
| PatrolTemplate | Sequenced checkpoint routes for scheduled patrols |
| PatrolRun | Executed patrol instances with GPS validation |
| Incident | Reported events with evidence and workflow states |

## Value Objects

Immutable value objects for domain concepts:

| Value Object | Description |
|--------------|-------------|
| GeofenceBoundary | GPS polygon defining site boundaries |
| GPSLocation | Latitude/longitude with accuracy |
| PhoneNumber | Validated phone number |
| Email | Validated email address |
| Money | Currency amount with precision |

## Repository Interfaces

Repository interfaces that define contracts for infrastructure implementations:

| Interface | Methods |
|-----------|---------|
| IUserRepository | findById, findByEmail, findAll, create, update, delete |
| ISiteRepository | findById, findAll, create, update, delete |
| ICheckpointRepository | findById, findBySite, findAll, create, update, delete |
| IPatrolRepository | findById, findAll, create, update, delete |
| IIncidentRepository | findById, findAll, create, update, delete |

## Rules

| Rule | Description |
|------|-------------|
| **No Framework Dependencies** | NO Express, Sequelize, Socket.io imports |
| **Pure TypeScript** | Business logic only, no platform specifics |
| **Interfaces Define "What"** | Repository interfaces define contracts, not implementation |
| **Entities Are Rich** | Entities contain business behavior, not just data |
| **Value Objects Are Immutable** | Once created, value objects cannot change |

## Entity Template

```typescript
export class User {
  private constructor(
    public readonly id: number,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly role: UserRole,
    public readonly createdAt: Date,
    public readonly updatedAt: Date
  ) {}

  // Factory method for creation
  static create(props: CreateUserProps): User {
    // Validate business rules
    if (!this.isValidEmail(props.email)) {
      throw ValidationError.fromFields({ email: 'Invalid email' });
    }

    return new User(
      0, // ID assigned by repository
      props.email.toLowerCase(),
      props.firstName,
      props.lastName,
      props.role,
      new Date(),
      new Date()
    );
  }

  // Business behavior
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  canManageRoles(targetRoles: UserRole[]): boolean {
    const roleHierarchy = {
      admin: 4,
      manager: 3,
      supervisor: 2,
      guard: 1,
    };

    return targetRoles.every(
      role => roleHierarchy[this.role] >= roleHierarchy[role]
    );
  }

  private static isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
```

## TODO

- [ ] Implement User entity with business rules
- [ ] Implement Site entity with geofence validation
- [ ] Implement Checkpoint entity with verification logic
- [ ] Implement PatrolTemplate and PatrolRun entities
- [ ] Implement Incident entity with workflow states
- [ ] Implement value objects (GeofenceBoundary, GPSLocation, etc.)
