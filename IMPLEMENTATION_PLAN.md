# Modular Architecture Plan for PatrolManager

## Context

The user needs a plug-and-play modular architecture where features can be added like puzzle pieces without modifying existing code. Modules should be developed, tested, and deployed independently.

**Vision:** Build modules incrementally: Users/Auth → Sites → Patrols → Incidents → etc.

**User Requirements:**

- No hot-reload during development (server restart required)
- Dynamic enable/disable at runtime (via configuration)
- Mobile: Static modules bundled at build time

---

## Recommended Architecture: Plugin-Based Module System

### Core Principles

1. **Self-Contained Modules:** Each feature lives in its own directory with all layers (domain, infrastructure, interfaces)
2. **Zero Touch Addition:** Adding a module doesn't require modifying existing module code
3. **Event-Driven Communication:** Modules communicate via events, not direct coupling
4. **Dependency Injection:** Shared services registered in central DI container
5. **Runtime Configuration:** Modules can be enabled/disabled without recompilation

---

## Backend Modular Structure

### Directory Layout

```
backend/src/
├── core/                           # Shared Kernel
│   ├── domain/
│   │   ├── base-entity.ts
│   │   └── interfaces/
│   │       ├── module.interface.ts      # IModule, IModuleManifest
│   │       └── service-provider.interface.ts
│   ├── events/
│   │   ├── event-bus.ts                 # Inter-module communication
│   │   └── event-types.ts
│   ├── di/
│   │   └── container.ts                 # DI Container for service registration
│   └── utils/
│
├── infrastructure/                 # Shared Infrastructure
│   ├── database/
│   │   ├── connection.ts
│   │   └── base-repository.ts
│   └── middleware/
│
└── modules/                        # Feature Modules (plug-and-play)
    │
    ├── users-auth/                 # Module 1
    │   ├── module.ts                    # Module class (implements IModule)
    │   ├── module.manifest.json         # Module metadata
    │   ├── domain/                      # Business logic
    │   │   ├── entities/
    │   │   ├── repositories/            # Interfaces only
    │   │   └── services/
    │   ├── infrastructure/              # Implementations
    │   │   ├── database/
    │   │   │   ├── models/
    │   │   │   ├── repositories/        # Sequelize implementations
    │   │   │   └── migrations/
    │   │   └── websocket/
    │   └── interfaces/
    │       ├── http/                    # Controllers, routes, DTOs
    │       └── websocket/
    │
    ├── sites/                      # Module 2
    │   ├── module.ts
    │   ├── module.manifest.json
    │   └── ... (same structure)
    │
    ├── patrols/                    # Module 3
    └── incidents/                  # Module 4
```

### Module Interface

```typescript
// core/domain/interfaces/module.interface.ts

export interface IModule {
  readonly name: string;
  readonly version: string;
  readonly dependencies: string[];

  initialize(container: DIContainer): Promise<void>;
  shutdown(): Promise<void>;
}

export interface IModuleManifest {
  name: string;
  version: string;
  dependencies: string[];
  provides: string[];        // Capabilities this module provides
  requires: string[];        // Capabilities this module requires
  routes: RouteDefinition[];
  migrations: string[];
  permissions: string[];
}
```

### Module Manifest Example

```json
// modules/users-auth/module.manifest.json
{
  "name": "users-auth",
  "version": "1.0.0",
  "description": "User management and authentication",
  "dependencies": [],
  "provides": ["auth.jwt", "user.crud", "rbac"],
  "requires": [],
  "routes": [
    { "prefix": "/api/auth", "protected": false },
    { "prefix": "/api/users", "protected": true, "permissions": ["user.view"] }
  ],
  "migrations": ["001-create-roles", "002-create-users"],
  "permissions": ["user.create", "user.view", "user.update", "user.delete"]
}
```

### Module Example

```typescript
// modules/users-auth/module.ts

export class UsersAuthModule implements IModule {
  readonly name = 'users-auth';
  readonly version = '1.0.0';
  readonly dependencies: string[] = [];

  async initialize(container: DIContainer): Promise<void> {
    // Register repositories
    container.registerSingleton('UserRepository', () => new UserRepository());

    // Register services
    container.registerSingleton('UserService', (c) => new UserService(...));
    container.registerSingleton('AuthService', (c) => new AuthService(...));

    // Register routes
    this.registerRoutes(container);

    // Register event handlers
    this.registerEventHandlers(container);
  }

  async shutdown(): Promise<void> { /* cleanup */ }
}
```

---

## Inter-Module Communication

### Event Bus (Primary Method)

```typescript
// core/events/event-bus.ts

export interface IEventBus {
  publish<T>(eventType: string, event: T): Promise<void>;
  subscribe<T>(eventType: string, handler: (event: T) => Promise<void>): void;
}

// Event Types
export const EventTypes = {
  USER_CREATED: 'user.created',
  USER_DELETED: 'user.deleted',
  SITE_CREATED: 'site.created',
  PATROL_STARTED: 'patrol.started',
  INCIDENT_CREATED: 'incident.created',
  SOS_TRIGGERED: 'sos.triggered'
} as const;
```

**Usage Example:**

```typescript
// Sites module listens to User deletion
eventBus.subscribe(EventTypes.USER_DELETED, async (event) => {
  await siteService.removeUserAssignments(event.userId);
});

// Sites module publishes events
eventBus.publish(EventTypes.SITE_CREATED, { siteId, name });
```

### Service Interface (Secondary Method)

For synchronous operations requiring immediate responses:

```typescript
// Module registers service in DI container
container.registerSingleton('SiteService', (c) => new SiteService(...));

// Other modules consume via interface
const siteService = container.get<ISiteService>('SiteService');
```

---

## Module Loading System

### Module Loader

```typescript
// module-loader.ts

export class ModuleLoader {
  async loadModules(config: ModulesConfig): Promise<void> {
    // 1. Discover all modules from directory
    const manifests = await this.discoverModules('src/modules');

    // 2. Filter by enabled config (runtime configuration)
    const enabled = manifests.filter(m => config.enabledModules.includes(m.name));

    // 3. Sort by dependencies (topological sort)
    const sorted = this.topologicalSort(enabled);

    // 4. Load in dependency order
    for (const manifest of sorted) {
      await this.loadModule(manifest);
    }
  }

  private async loadModule(manifest: IModuleManifest): Promise<void> {
    // Verify dependencies are loaded
    for (const dep of manifest.dependencies) {
      if (!this.registry.isLoaded(dep)) {
        throw new Error(`Module ${manifest.name} requires ${dep}`);
      }
    }

    // Dynamic import and initialize
    const ModuleClass = (await import(`./modules/${manifest.name}/module`)).default;
    const module = new ModuleClass(manifest);
    await module.initialize(this.container);

    this.registry.register(module);
  }
}
```

### Runtime Configuration

```json
// config/modules.json
{
  "enabledModules": [
    "users-auth",
    "sites",
    "patrols"
  ],
  "disabledModules": [
    "incidents",
    "analytics"
  ],
  "moduleSettings": {
    "users-auth": {
      "jwtExpiry": "24h"
    },
    "sites": {
      "geofencingEnabled": true
    }
  }
}
```

---

## Database Migrations

### Migration Organization

```
backend/src/modules/
├── users-auth/infrastructure/database/migrations/
│   ├── 001-create-roles.ts
│   ├── 002-create-users.ts
│   └── 003-create-permissions.ts
├── sites/infrastructure/database/migrations/
│   ├── 010-create-sites.ts
│   ├── 011-create-zones.ts
│   └── 012-create-checkpoints.ts
└── patrols/infrastructure/database/migrations/
    ├── 020-create-patrol-templates.ts
    └── 021-create-patrol-runs.ts
```

**Numbering Strategy:** Use ranges (001-009, 010-019, 020-029) to avoid conflicts between modules.

### Migration Loader

```typescript
// infrastructure/database/module-migration-loader.ts

export class ModuleMigrationLoader {
  async loadMigrations(enabledModules: string[]): Promise<void> {
    for (const moduleName of enabledModules) {
      const migrationDir = `src/modules/${moduleName}/infrastructure/database/migrations`;
      await this.runMigrations(migrationDir);
    }
  }
}
```

---

## Mobile Modular Structure

### Gradle Module Configuration

```groovy
// settings.gradle
rootProject.name = "PatrolManager"

// Core modules
include ':app'
include ':core:domain'
include ':core:data'
include ':core:presentation'
include ':core:ui'
include ':core:network'
include ':core:database'

// Feature modules (static, bundled at build time)
include ':feature:auth'
include ':feature:users'
include ':feature:sites'
include ':feature:patrols'
include ':feature:incidents'
```

### Feature Module Structure

```
mobile/
├── core/                           # Shared
│   ├── domain/
│   ├── data/
│   ├── presentation/
│   │   ├── theme/
│   │   ├── components/
│   │   └── navigation/
│   └── di/
│
└── feature/                        # Feature Modules
    ├── auth/
    │   ├── domain/
    │   │   ├── model/
    │   │   ├── repository/
    │   │   └── usecase/
    │   ├── data/
    │   ├── presentation/
    │   │   ├── login/
    │   │   ├── logout/
    │   │   └── di/
    │   └── build.gradle.kts
    │
    ├── sites/
    │   └── ... (same structure)
    │
    └── patrols/
        └── ...
```

### Feature Module Registration

```kotlin
// core/presentation/navigation/FeatureNavigation.kt

interface FeatureNavigation {
    val route: String
    val startDestination: String
    @Composable fun NavGraphBuilder.register()
}

// Feature implements interface
// feature/auth/presentation/AuthNavigation.kt
object AuthNavigation : FeatureNavigation {
    override val route = "auth"
    override val startDestination = "login"

    @Composable
    override fun NavGraphBuilder.register() {
        navigation(startDestination, route) {
            composable("login") { LoginScreen() }
        }
    }
}

// DI collects all feature navigations
@Module
@InstallIn(SingletonComponent::class)
object FeatureModule {
    @Provides @IntoSet
    fun provideAuthNavigation(): FeatureNavigation = AuthNavigation

    @Provides
    fun provideFeatureNavigations(
        navigations: Set<@JvmSuppressWildcards FeatureNavigation>
    ): List<FeatureNavigation> = navigations.toList()
}
```

---

## Implementation Steps

### Phase 1: Core Foundation

**Files to Create:**

| File | Purpose |
|------|---------|
| `backend/src/core/domain/interfaces/module.interface.ts` | Module interface definitions |
| `backend/src/core/events/event-bus.ts` | Event bus for inter-module communication |
| `backend/src/core/di/container.ts` | DI container for service registration |
| `backend/module-loader.ts` | Dynamic module loader |
| `backend/config/modules.json` | Runtime module configuration |

### Phase 2: First Module (Users/Auth)

**Files to Create:**

| File | Purpose |
|------|---------|
| `backend/src/modules/users-auth/module.ts` | Module class |
| `backend/src/modules/users-auth/module.manifest.json` | Module metadata |
| `backend/src/modules/users-auth/domain/entities/user.entity.ts` | Domain entity |
| `backend/src/modules/users-auth/domain/services/auth.service.ts` | Business logic |
| `backend/src/modules/users-auth/infrastructure/database/models/user.model.ts` | Sequelize model |
| `backend/src/modules/users-auth/interfaces/http/controllers/auth.controller.ts` | HTTP controller |
| `backend/src/modules/users-auth/interfaces/http/routes/auth.routes.ts` | Route definitions |

### Phase 3: Second Module (Sites)

**Files to Create:**

| File | Purpose |
|------|---------|
| `backend/src/modules/sites/module.ts` | Module class |
| `backend/src/modules/sites/module.manifest.json` | Module metadata (depends on users-auth) |
| `... (same structure as users-auth)` | |

**Key Point:** Users/Auth module requires zero modifications to add Sites module.

---

## Development Workflow

### Adding a New Module

1. Create module directory: `backend/src/modules/<module-name>/`
2. Create `module.ts` implementing `IModule`
3. Create `module.manifest.json` with metadata
4. Implement domain, infrastructure, interfaces layers
5. Add module name to `config/modules.json` → `enabledModules`
6. Restart server → module loads automatically

### Enabling/Disabling Modules (Runtime)

```json
// config/modules.json
{
  "enabledModules": ["users-auth", "sites", "patrols"],
  "disabledModules": ["incidents"]  // Disabled but not removed
}
```

Restart server → only enabled modules load.

---

## Critical Files Summary

| File | Purpose |
|------|---------|
| `backend/src/core/domain/interfaces/module.interface.ts` | Core module system contracts |
| `backend/src/core/events/event-bus.ts` | Inter-module event communication |
| `backend/module-loader.ts` | Module discovery and loading logic |
| `backend/config/modules.json` | Runtime enable/disable configuration |
| `mobile/core/presentation/navigation/FeatureNavigation.kt` | Feature navigation registration |
| `settings.gradle` | Android Gradle module definitions |

---

## Architecture Rules

| Rule | Description |
|------|-------------|
| Module Self-Containment | All module code lives in its directory |
| No Direct Imports | Modules never import other modules directly |
| Event Communication | Use event bus for cross-module notifications |
| DI for Services | Register services in container, consume via interface |
| Manifest-Driven | Module metadata in manifest.json |
| Dependency Declaration | Declare dependencies in manifest, loader handles order |

---

## Benefits

1. **Plug-and-Play:** Add modules by dropping directory + config change
2. **Independent Development:** Each module has own domain, data, UI
3. **Runtime Flexibility:** Enable/disable without recompilation
4. **Parallel Teams:** Different teams can work on different modules
5. **Testable:** Test modules in isolation
6. **No Breaking Changes:** New modules don't modify existing code