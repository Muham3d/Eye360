# HTTP Routes Layer

## Purpose
Defines all REST API endpoints and maps them to controllers.

## Structure

```
routes/
├── index.ts           # Central route registration
├── auth.routes.ts     # Authentication endpoints
├── user.routes.ts     # User management endpoints
├── site.routes.ts     # Site management endpoints
├── checkpoint.routes.ts  # Checkpoint endpoints
├── patrol.routes.ts   # Patrol execution endpoints
└── incident.routes.ts # Incident reporting endpoints
```

## Route Organization by Version

All API routes should be prefixed with `/api/v1`:

- `POST /api/v1/auth/login` - User login (JWT for mobile, session for web)
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh JWT token
- `GET /api/v1/users` - List users (paginated, filtered)
- `POST /api/v1/users` - Create new user
- `GET /api/v1/users/:id` - Get user details
- `PUT /api/v1/users/:id` - Update user
- `DELETE /api/v1/users/:id` - Delete user (soft delete)
- `GET /api/v1/sites` - List sites
- `POST /api/v1/sites` - Create site
- `GET /api/v1/sites/:id` - Get site details
- `PUT /api/v1/sites/:id` - Update site
- `DELETE /api/v1/sites/:id` - Delete site
- `GET /api/v1/checkpoints` - List checkpoints
- `POST /api/v1/checkpoints` - Create checkpoint
- `GET /api/v1/checkpoints/:id` - Get checkpoint details
- `POST /api/v1/patrols` - Start/record patrol
- `GET /api/v1/patrols/:id` - Get patrol details
- `POST /api/v1/patrols/:id/checkpoints/:checkpointId/verify` - Verify checkpoint
- `GET /api/v1/incidents` - List incidents
- `POST /api/v1/incidents` - Report incident
- `GET /api/v1/incidents/:id` - Get incident details

## Rules

| Rule | Description |
|------|-------------|
| **Thin Routes** | Routes only map endpoints to controllers |
| **Validation** | Use validation middleware before controller |
| **Auth First** | Apply auth middleware to protected routes |
| **RESTful** | Follow REST conventions for HTTP methods |
| **Versioning** | Include API version in path (`/api/v1`) |
| **No Logic** | Routes contain NO business logic |

## Route Template

```typescript
import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/validationMiddleware.js';
import { someController } from '../controllers/some.controller.js';

const router = Router();

// POST /api/v1/resource
router.post(
  '/resource',
  authMiddleware,
  validateRequest({ body: createSchema }),
  asyncHandler(someController.create)
);

export default router;
```

## TODO

- [ ] Implement auth routes
- [ ] Implement user routes
- [ ] Implement site routes
- [ ] Implement checkpoint routes
- [ ] Implement patrol routes
- [ ] Implement incident routes
