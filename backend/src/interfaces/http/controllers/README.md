# HTTP Controllers Layer

## Purpose
Thin controller layer that handles HTTP requests/responses and delegates to services.

## Responsibilities

1. **Request Validation**: Validate request input using middleware
2. **Response Formatting**: Format service responses for HTTP
3. **Error Handling**: Pass errors to error handler middleware
4. **Status Codes**: Return appropriate HTTP status codes

## Structure

```
controllers/
├── index.ts           # Controller exports
├── auth.controller.ts # Authentication controller
├── user.controller.ts # User management controller
├── site.controller.ts # Site management controller
├── checkpoint.controller.ts  # Checkpoint controller
├── patrol.controller.ts      # Patrol execution controller
└── incident.controller.ts    # Incident reporting controller
```

## Controller Template

```typescript
import { Request, Response, NextFunction } from 'express';
import { someService } from '@core/services/some.service.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const someController = {
  // GET /api/v1/resources
  findAll: asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query;

    const result = await someService.findAll({
      page: Number(page),
      limit: Number(limit),
    });

    res.status(200).json({
      success: true,
      data: result.items,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: Math.ceil(result.total / result.limit),
      },
    });
  }),

  // GET /api/v1/resources/:id
  findById: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const resource = await someService.findById(Number(id));

    res.status(200).json({
      success: true,
      data: resource,
    });
  }),

  // POST /api/v1/resources
  create: asyncHandler(async (req: Request, res: Response) => {
    const dto = req.body;
    const resource = await someService.create(dto);

    res.status(201).json({
      success: true,
      data: resource,
    });
  }),

  // PUT /api/v1/resources/:id
  update: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const dto = req.body;
    const resource = await someService.update(Number(id), dto);

    res.status(200).json({
      success: true,
      data: resource,
    });
  }),

  // DELETE /api/v1/resources/:id
  delete: asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await someService.delete(Number(id));

    res.status(204).send();
  }),
};
```

## Rules

| Rule | Description |
|------|-------------|
| **Thin Controllers** | Only validate, delegate, format response |
| **No Business Logic** | All logic lives in services |
| **DTOs at Boundaries** | Use DTOs, not domain entities |
| **Use asyncHandler** | Wrap async functions for error handling |
| **No Express in Services** | Services must not import Express types |

## TODO

- [ ] Implement authentication controller
- [ ] Implement user management controller
- [ ] Implement site management controller
- [ ] Implement checkpoint controller
- [ ] Implement patrol execution controller
- [ ] Implement incident reporting controller
