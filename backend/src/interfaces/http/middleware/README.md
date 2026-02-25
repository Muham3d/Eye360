# HTTP Middleware

## Purpose
Express middleware for cross-cutting concerns.

## Contents
- Authentication (JWT for API, session for web)
- Authorization (RBAC checks)
- Request validation
- Error handling
- Logging
- Rate limiting
- CORS

## Rules
- Middleware should be composable
- Authentication/authorization are boundary concerns
- Business validation goes in services, not middleware
