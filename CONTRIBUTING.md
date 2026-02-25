# Contributing to PatrolManager

Thank you for your interest in contributing to PatrolManager! This guide outlines the processes and guidelines for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Git Workflow](#git-workflow)
- [Commit Message Format](#commit-message-format)
- [Pull Request Process](#pull-request-process)
- [Testing Requirements](#testing-requirements)
- [Code Review Process](#code-review-process)
- [Architecture Guidelines](#architecture-guidelines)

---

## Code of Conduct

### Our Pledge

We are committed to making participation in this project a harassment-free experience for everyone, regardless of level of experience, gender, gender identity and expression, sexual orientation, disability, personal appearance, body size, race, ethnicity, age, religion, or nationality.

### Our Standards

- **Resful communication**: Use welcoming and inclusive language
- **Constructive feedback**: Focus on what is best for the community
- **Collaboration**: Work together to resolve conflicts
- **Empathy**: Show empathy towards other community members

### Reporting Issues

If you experience or witness unacceptable behavior, please contact the project maintainers directly.

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. Read the [SETUP.md](./SETUP.md) and completed the local development setup
2. Read the [PROJECT_PLAN.md](./PROJECT_PLAN.md) to understand the project architecture
3. Reviewed the [CLAUDE.md](./CLAUDE.md) for project-specific guidelines
4. Set up your development environment with all required tools

### First-Time Setup

```bash
# 1. Fork and clone the repository
git clone https://github.com/your-username/patrol-manager.git
cd patrol-manager

# 2. Install dependencies
npm install
cd backend && npm install && cd ..

# 3. Set up environment
cp .env.example .env
cp backend/.env.example backend/.env

# 4. Start development database
npm run docker:up

# 5. Run migrations
npm run db:migrate
npm run db:seed:dev

# 6. Start development server
npm run dev
```

---

## Development Workflow

### 1. Find an Issue

- Browse [GitHub Issues](https://github.com/your-org/patrol-manager/issues)
- Look for issues labeled `good first issue` for newcomers
- Comment on the issue to claim it
- Ask questions if anything is unclear

### 2. Create a Branch

```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Create a feature branch
git checkout -b feature/issue-123-add-user-management
git checkout -b fix/issue-456-fix-auth-bug
git checkout -b docs/issue-789-update-api-docs
```

### Branch Naming Convention

| Type | Format | Example |
|------|--------|---------|
| Feature | `feature/<issue-id>-short-description` | `feature/123-add-patrol-routes` |
| Bug Fix | `fix/<issue-id>-short-description` | `fix/456-fix-gps-tracking` |
| Hotfix | `hotfix/<issue-id>-short-description` | `hotfix/789-security-patch` |
| Documentation | `docs/<issue-id>-short-description` | `docs/234-update-readme` |
| Refactor | `refactor/<issue-id>-short-description` | `refactor/567-improve-services` |
| Test | `test/<issue-id>-short-description` | `test/890-add-unit-tests` |
| Chore | `chore/<issue-id>-short-description` | `chore/321-update-dependencies` |

### 3. Make Your Changes

- Write code following the [Code Style Guidelines](#code-style-guidelines)
- Add tests for new functionality
- Update documentation as needed
- Run tests locally

```bash
# Run linter
npm run lint

# Run tests
npm test

# Build project
cd backend && npm run build
```

### 4. Commit Your Changes

Follow the [Commit Message Format](#commit-message-format):

```bash
git add .
git commit -m "feat: add user management API endpoints

- Implement CRUD operations for users
- Add validation middleware
- Add unit tests for user endpoints

Closes #123"
```

### 5. Push and Create Pull Request

```bash
# Push to your fork
git push origin feature/123-add-user-management

# Create pull request on GitHub
```

---

## Code Style Guidelines

### General Principles

1. **KISS**: Keep It Simple, Stupid
2. **DRY**: Don't Repeat Yourself
3. **YAGNI**: You Aren't Gonna Need It
4. **SOLID**: Follow SOLID principles for object-oriented design

### Backend (TypeScript/JavaScript)

#### TypeScript Best Practices

```typescript
// Use explicit types for function returns
function getUserById(id: string): Promise<User | null> {
  return User.findByPk(id);
}

// Use interfaces for object shapes
interface CreateUserDto {
  email: string;
  password: string;
  role: UserRole;
}

// Use enums for fixed sets
enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  SUPERVISOR = 'supervisor',
  GUARD = 'guard'
}

// Avoid 'any' type - use 'unknown' or specific types
function processData(data: unknown): void {
  if (typeof data === 'string') {
    console.log(data);
  }
}

// Use async/await instead of callbacks
async function fetchUserData(id: string): Promise<User> {
  const user = await User.findByPk(id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  return user;
}
```

#### Code Organization

```
backend/src/
├── core/                      # Framework-agnostic business logic
│   ├── domain/
│   │   ├── entities/          # Domain entities (no Sequelize)
│   │   ├── value-objects/     # Value objects
│   │   └── repositories/      # Repository interfaces
│   └── services/              # Business logic (no Express/Socket.io)
├── infrastructure/
│   ├── database/              # Sequelize models
│   │   ├── models/            # Model definitions
│   │   ├── repositories/      # Repository implementations
│   │   └── seeders/           # Database seeders
│   └── websocket/             # Socket.io handlers
└── interfaces/
    ├── http/                  # REST API
    │   ├── controllers/       # Thin controllers
    │   ├── middleware/        # Express middleware
    │   ├── routes/            # Route definitions
    │   └── validators/        # Request validators (Joi)
    └── web/                   # Admin web panel
        ├── views/             # EJS templates
        └── public/            # Static assets
```

#### Controller Guidelines

```typescript
// Controllers should be thin - validate and delegate
export class UserController {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // 1. Validate input
      const { error, value } = createUserSchema.validate(req.body);
      if (error) {
        throw new ValidationError(error.details);
      }

      // 2. Call service
      const user = await userService.create(value);

      // 3. Return response
      res.status(201).json({
        success: true,
        data: UserDTO.fromDomain(user)
      });
    } catch (error) {
      next(error);
    }
  }
}
```

#### Service Layer Guidelines

```typescript
// Services contain pure business logic - no Express types!
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private passwordHasher: PasswordHasher
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    // Business rules
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('User with this email already exists');
    }

    // Domain operations
    const hashedPassword = await this.passwordHasher.hash(dto.password);
    const user = User.create({
      ...dto,
      password: hashedPassword
    });

    return this.userRepository.save(user);
  }
}
```

#### Error Handling

```typescript
// Define custom error types
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super(400, 'Validation failed', { details });
  }
}

// Use error handling middleware
export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
        ...(error.details && { details: error.details })
      }
    });
  } else {
    res.status(500).json({
      success: false,
      error: { message: 'Internal server error' }
    });
  }
}
```

### Frontend (EJS + Tailwind CSS)

#### Template Organization

```ejs
<!-- Use partials for reusable components -->
<%- include('partials/header', { title: 'Users' }) %>

<!-- Use consistent indentation -->
<div class="container mx-auto px-4">
  <h1 class="text-2xl font-bold">Users</h1>
  <%- include('partials/user-table', { users }) %>
</div>

<%- include('partials/footer') %>
```

#### CSS Guidelines

```css
/* Use Tailwind utility classes */
<div class="flex items-center justify-between p-4 bg-white rounded-lg shadow">
  <h2 class="text-lg font-semibold text-gray-900">Title</h2>
  <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
    Action
  </button>
</div>

/* For custom styles, use @layer in main.css */
@layer components {
  .btn-primary {
    @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700;
  }
}
```

### Documentation Guidelines

#### Code Comments

```typescript
/**
 * Creates a new user in the system
 *
 * @param dto - The user creation data transfer object
 * @returns Promise resolving to the created user
 * @throws {ValidationError} If validation fails
 * @throws {ConflictError} If user with email already exists
 *
 * @example
 * ```typescript
 * const user = await userService.create({
 *   email: 'user@example.com',
 *   password: 'SecurePass123!',
 *   role: UserRole.GUARD
 * });
 * ```
 */
async create(dto: CreateUserDto): Promise<User> {
  // Implementation...
}
```

---

## Git Workflow

### Repository Model

We use the **Feature Branch Workflow**:

1. Main branch is always deployable
2. All work happens in feature branches
3. Pull requests require review before merging
4. Use rebase to keep history clean

### Branch Protection Rules

The `main` branch is protected:

- Require pull request reviews (1 approval)
- Require status checks to pass (tests, linter)
- Do not allow bypassing the above settings
- Require branches to be up to date before merging

### Rebase vs Merge

```bash
# Keep your feature branch up to date with main
git checkout feature/your-feature
git fetch origin
git rebase origin/main

# If conflicts occur, resolve them and continue
git add .
git rebase --continue
```

**When to rebase:**
- Before creating a pull request
- When your feature branch falls behind main
- To maintain a clean commit history

**When to merge:**
- When merging the pull request (use merge commit)

---

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, etc.) |
| `refactor` | Code refactoring |
| `perf` | Performance improvements |
| `test` | Adding or updating tests |
| `chore` | Build process or auxiliary tool changes |
| `ci` | CI/CD changes |
| `revert` | Revert a previous commit |

### Examples

```bash
# Simple feature
git commit -m "feat: add GPS tracking for patrol routes"

# Feature with scope
git commit -m "feat(auth): implement JWT refresh token flow"

# Bug fix
git commit -m "fix: resolve database connection pool exhaustion"

# Detailed commit
git commit -m "fix(users): prevent duplicate email registration

- Add unique constraint to email column
- Implement email existence check before user creation
- Add unit tests for duplicate email handling

Closes #123"

# Breaking change
git commit -m "feat!: change authentication from session to JWT

BREAKING CHANGE: All clients must now use JWT tokens instead of
cookie-based session authentication. Update API clients accordingly."

# Documentation
git commit -m "docs: update API documentation for patrol endpoints"
```

---

## Pull Request Process

### Before Creating a PR

1. **Update your branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout feature/your-feature
   git rebase origin/main
   ```

2. **Run all checks**
   ```bash
   npm run lint
   npm test
   cd backend && npm run build
   ```

3. **Update documentation**
   - Update README if needed
   - Add/update API documentation
   - Update CHANGELOG

### Pull Request Template

```markdown
## Description
<!-- Briefly describe what this PR does -->

## Type of Change
<!-- Mark the relevant option with an 'x' -->
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement

## Related Issue
<!-- Closes #issue_number or Fixes #issue_number -->
Closes #

## How Has This Been Tested?
<!-- Describe the tests you ran and how to reproduce them -->
- [ ] Unit tests
- [ ] Integration tests
- [ ] Manual testing

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code where necessary
- [ ] I have updated the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests for all new/updated functionality
- [ ] All tests pass locally
- [ ] Any dependent changes have been merged
```

### PR Review Process

1. **Automated checks**: All CI checks must pass
2. **Code review**: At least one maintainer approval required
3. **Address feedback**: Make requested changes
4. **Approval**: PR approved and ready to merge
5. **Squash merge**: Use squash merge to keep main clean

### Review Guidelines for Reviewers

- Be constructive and respectful
- Explain the reasoning behind suggestions
- Approve if the changes meet the standards
- Request changes if there are issues
- Use inline comments for specific feedback

---

## Testing Requirements

### Unit Tests

Write unit tests for:

- All service layer methods
- Complex business logic
- Utility functions
- Value objects

```typescript
describe('UserService', () => {
  describe('create', () => {
    it('should create a new user with hashed password', async () => {
      // Arrange
      const dto: CreateUserDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: UserRole.GUARD
      };

      // Act
      const user = await userService.create(dto);

      // Assert
      expect(user).toBeDefined();
      expect(user.email).toBe(dto.email);
      expect(user.password).not.toBe(dto.password); // Hashed
    });

    it('should throw ConflictError if email exists', async () => {
      // Arrange
      await userService.create(testUserDto);

      // Act & Assert
      await expect(userService.create(testUserDto))
        .rejects.toThrow(ConflictError);
    });
  });
});
```

### Integration Tests

Write integration tests for:

- API endpoints
- Database operations
- WebSocket events
- External service integrations

```typescript
describe('POST /api/users', () => {
  it('should create a new user', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({
        email: 'test@example.com',
        password: 'SecurePass123!',
        role: 'guard'
      })
      .expect(201);

    expect(response.body).toMatchObject({
      success: true,
      data: {
        email: 'test@example.com',
        role: 'guard'
      }
    });
  });
});
```

### Test Coverage

| Type | Minimum Coverage |
|------|------------------|
| Statements | 80% |
| Branches | 80% |
| Functions | 80% |
| Lines | 80% |

```bash
# Generate coverage report
npm run test:coverage

# View detailed HTML report
open coverage/lcov-report/index.html  # macOS
start coverage/lcov-report/index.html  # Windows
```

### E2E Tests

For critical user flows:

- User registration and login
- Guard clock-in/out
- SOS alert flow
- Patrol execution

These may be manual or automated depending on complexity.

---

## Code Review Process

### What Reviewers Look For

1. **Correctness**: Does the code work as intended?
2. **Design**: Is the solution well-architected?
3. **Style**: Does it follow project guidelines?
4. **Performance**: Are there potential performance issues?
5. **Security**: Are there security vulnerabilities?
6. **Tests**: Are tests adequate and passing?
7. **Documentation**: Is the code well-documented?

### Handling Review Feedback

1. **Acknowledge**: Respond to all comments
2. **Discuss**: If you disagree, explain why
3. **Update**: Make requested changes
4. **Re-request**: Ask for re-review when ready

### Review Turnaround

- Expect initial review within 2-3 business days
- Respond to feedback within 1-2 business days
- Urgent fixes will be prioritized

---

## Architecture Guidelines

### Core/UI Separation

**Critical Rule**: Business logic must be completely independent from UI/framework code.

#### Backend Layers

```
[EJS Views] → [Controllers] → [Services] → [Repositories] → [Sequelize]
```

**Dependency Rule**: Unidirectional - lower layers never depend on upper layers.

#### Key Rules

| Rule | Description |
|------|-------------|
| No Express in Services | Services cannot import Express types |
| Controllers are Thin | Controllers only validate and delegate |
| DTOs at Boundaries | Use DTOs for API inputs/outputs |
| Repository Pattern | All DB access through repositories |

#### Example Violations and Fixes

**Violation (Express in Service):**
```typescript
// DON'T DO THIS
import { Request } from 'express';

export class UserService {
  async getUser(req: Request): Promise<User> {
    // ...
  }
}
```

**Correct Approach:**
```typescript
// DO THIS
interface GetUserDto {
  id: string;
}

export class UserService {
  async getUser(dto: GetUserDto): Promise<User> {
    // ...
  }
}
```

---

## Security Considerations

When contributing, keep security in mind:

1. **Never commit secrets** - passwords, API keys, tokens
2. **Sanitize user input** - prevent injection attacks
3. **Use parameterized queries** - prevent SQL injection
4. **Implement rate limiting** - prevent abuse
5. **Validate file uploads** - check type, size, content
6. **Use HTTPS** - in production
7. **Keep dependencies updated** - run `npm audit`
8. **Follow OWASP guidelines** - for security best practices

---

## Questions?

If you have questions about contributing:

1. Check existing [GitHub Issues](https://github.com/your-org/patrol-manager/issues)
2. Review existing code and documentation
3. Start a discussion in the project discussions
4. Contact the maintainers

---

## License

By contributing to PatrolManager, you agree that your contributions will be licensed under the project's proprietary license.

---

**Thank you for contributing to PatrolManager!**
