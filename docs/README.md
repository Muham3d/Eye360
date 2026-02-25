# PatrolManager Documentation

Welcome to the PatrolManager documentation hub. This directory contains comprehensive documentation for developers, contributors, and users of the PatrolManager security guard management system.

## Quick Navigation

| Document | Description |
|----------|-------------|
| [**SETUP.md**](../SETUP.md) | Complete developer setup guide (prerequisites, installation, configuration) |
| [**CONTRIBUTING.md**](../CONTRIBUTING.md) | Contribution guidelines, code style, and workflow |
| [**PROJECT_PLAN.md**](../PROJECT_PLAN.md) | Complete 5-phase implementation roadmap |
| [**CLAUDE.md**](../CLAUDE.md) | Project instructions for AI-assisted development |

---

## Documentation Index

### Getting Started

| Document | Location | Description |
|----------|----------|-------------|
| **Developer Setup** | [../SETUP.md](../SETUP.md) | Prerequisites, installation, environment configuration |
| **Docker Quick Reference** | [docker/README.md](./docker/README.md) | Docker Compose commands and troubleshooting |
| **Troubleshooting FAQ** | [troubleshooting.md](./troubleshooting.md) | Common issues and solutions |

### Development Guides

| Document | Location | Description |
|----------|----------|-------------|
| **Contributing** | [../CONTRIBUTING.md](../CONTRIBUTING.md) | Code style, Git workflow, PR process |
| **Architecture Guidelines** | [../CLAUDE.md](../CLAUDE.md) | 4-layer architecture, core/UI separation |
| **Implementation Plan** | [../IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md) | Detailed technical specifications |

### API Documentation

| Document | Location | Description |
|----------|----------|-------------|
| **OpenAPI Specification** | [api/openapi.yaml](./api/openapi.yaml) | Complete API specification in OpenAPI 3.0 format |
| **API Reference** | [api/README.md](./api/README.md) | API endpoint documentation |
| **Swagger UI** | http://localhost:3000/api-docs | Interactive API documentation (when server is running) |

### Database Documentation

| Document | Location | Description |
|----------|----------|-------------|
| **Database Schema** | [database/schema.md](./database/schema.md) | Complete database schema and relationships |
| **Database Setup Summary** | [database-setup-summary.md](./database-setup-summary.md) | Quick reference for database setup |
| **Migrations** | [../backend/src/infrastructure/database/migrations/](../backend/src/infrastructure/database/migrations/) | Database migration files |

### Infrastructure Documentation

| Document | Location | Description |
|----------|----------|-------------|
| **Docker Reference** | [docker/README.md](./docker/README.md) | Docker Compose commands, services, volumes |
| **Configuration** | [../backend/.env.example](../backend/.env.example) | Environment configuration reference |

### Security Documentation

| Document | Location | Description |
|----------|----------|-------------|
| **Security Best Practices** | [security/security-best-practices.md](./security/security-best-practices.md) | Security guidelines for development |
| **Phase 1 Security Audit** | [security/phase1-audit.md](./security/phase1-audit.md) | Security audit findings and resolutions |
| **Vulnerability Tracker** | [security/vulnerabilities-tracker.md](./security/vulnerabilities-tracker.md) | Known vulnerabilities and fixes |

### Project Management

| Document | Location | Description |
|----------|----------|-------------|
| **Task Tracker** | [../TASK_TRACKER.md](../TASK_TRACKER.md) | Task tracking for all phases |
| **Phase Gate Execution** | [../PHASE_GATE_EXECUTION.md](../PHASE_GATE_EXECUTION.md) | Phase gate execution guidelines |
| **Execution Guide** | [../EXECUTION_GUIDE.md](../EXECUTION_GUIDE.md) | General execution guidelines |

### Code Reviews

| Document | Location | Description |
|----------|----------|-------------|
| **Phase 1 Code Review** | [reviews/phase1-code-review.md](./reviews/phase1-code-review.md) | Code review findings and improvements |

---

## Directory Structure

```
docs/
├── README.md                      # This file
├── docker/                        # Docker documentation
│   └── README.md                  # Docker Quick Reference
├── troubleshooting.md             # Troubleshooting FAQ
├── api/                           # API documentation
│   ├── README.md                  # API overview
│   └── openapi.yaml               # OpenAPI specification
├── database/                      # Database documentation
│   ├── schema.md                  # Database schema
│   └── README.md                  # Database overview
├── security/                      # Security documentation
│   ├── security-best-practices.md # Security guidelines
│   ├── phase1-audit.md            # Security audit report
│   └── vulnerabilities-tracker.md # Vulnerability tracking
└── reviews/                       # Code review documentation
    └── phase1-code-review.md      # Phase 1 review findings
```

---

## Key Concepts

### Backend Architecture

The backend follows a strict 4-layer architecture:

```
[EJS Views] → [Controllers] → [Services] → [Repositories] → [Sequelize]
```

**Critical Rule:** Business logic in Services must never import Express or Socket.io types.

### Mobile Architecture

The mobile app follows Clean Architecture:

```
[Compose UI] → [ViewModels] → [Use Cases] → [Repositories] → [Data Sources]
```

**Critical Rule:** Domain layer has zero Android framework dependencies.

### Core/UI Separation

Both platforms share the same design principle: core business logic is completely independent from UI/framework code. This allows UI changes without modifying core services.

---

## Development Workflow

1. **Setup**: Follow [SETUP.md](../SETUP.md) to configure your environment
2. **Branch**: Create a feature branch following [CONTRIBUTING.md](../CONTRIBUTING.md)
3. **Develop**: Write code following architecture guidelines in [CLAUDE.md](../CLAUDE.md)
4. **Test**: Run tests and ensure coverage targets are met
5. **Document**: Update relevant documentation
6. **PR**: Submit pull request following guidelines in [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## Quick Links

### External Resources

- [Express.js Documentation](https://expressjs.com/)
- [Sequelize Documentation](https://sequelize.org/)
- [Socket.io Documentation](https://socket.io/)
- [Jetpack Compose Documentation](https://developer.android.com/jetpack/compose)
- [OpenAPI Specification](https://swagger.io/specification/)
- [Docker Documentation](https://docs.docker.com/)

### Internal Resources

- Root [README.md](../README.md) - Project overview
- [CLAUDE.md](../CLAUDE.md) - AI development instructions
- [agents/](../agents/) - Multi-agent orchestration system

---

## Updating Documentation

When updating documentation:

1. **Keep it current** - Update docs when code changes
2. **Be concise** - Clear and to the point
3. **Use examples** - Code snippets help understanding
4. **Link related docs** - Cross-reference relevant sections
5. **Follow format** - Maintain consistency with existing docs

### Documentation Template

```markdown
## Title
Brief description of what this section covers.

### Subsection
| Parameter | Type | Description |
|-----------|------|-------------|
| name | string | The name parameter |

```typescript
// Code example
const example = "value";
```

**See also:** [Related Doc](./related-doc.md)
```

---

## Need Help?

If you can't find what you're looking for:

1. Check the [Troubleshooting FAQ](./troubleshooting.md)
2. Search [GitHub Issues](https://github.com/your-org/patrol-manager/issues)
3. Review [CONTRIBUTING.md](../CONTRIBUTING.md) for workflow questions
4. Contact the maintainers

---

**Last Updated:** 2025-02-24
