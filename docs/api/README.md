# PatrolManager API Documentation

This directory contains comprehensive documentation for the PatrolManager RESTful API.

## Documentation Files

| File | Description |
|------|-------------|
| **[README.md](./README.md)** | This file - API overview and quick reference |
| **[openapi.yaml](./openapi.yaml)** | OpenAPI 3.0 specification |
| **[usage-guide.md](./usage-guide.md)** | Comprehensive API usage guide with code examples |
| **[authentication-flows.md](./authentication-flows.md)** | Authentication flow diagrams and implementation |
| **[error-reference.md](./error-reference.md)** | Complete error code reference |

## Quick Start

### Interactive Documentation

Access the interactive Swagger UI documentation at:
- **Development**: `http://localhost:3000/api-docs`
- **Production**: `https://api.patrolmanager.com/api-docs`

### Base URLs

| Environment | Base URL |
|-------------|----------|
| **Development** | `http://localhost:3000/api/v1` |
| **Production** | `https://api.patrolmanager.com/api/v1` |

## API Overview

## API Overview

The PatrolManager API is a RESTful service that supports authentication and authorization via two methods:

- **JWT Bearer Token**: Used by mobile clients (Android Guard App)
- **Session Cookie**: Used by web admin panel

### Base URL

- **Development**: `http://localhost:3000/api/v1`
- **Production**: `https://api.patrolmanager.com/api/v1`

## Authentication Methods

### JWT Bearer Token (Mobile)

Mobile clients authenticate using JWT tokens:

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Session Cookie (Web)

Web clients authenticate using session cookies (set automatically by the server):

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Cookie: connect.sid=s%3A..."
```

## User Roles

| Role | Level | Description |
|------|-------|-------------|
| **admin** | 100 | Full system access, user/role management |
| **manager** | 75 | Site management, reports, supervisor assignments |
| **supervisor** | 50 | Guard management, patrol oversight, incident handling |
| **guard** | 25 | Patrol execution, incident reporting, SOS |

## API Endpoints Summary

### Authentication Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Register new user (Admin only) | Yes (Admin) |
| POST | `/auth/login` | User login | No |
| POST | `/auth/logout` | User logout | Yes |
| POST | `/auth/logout-all` | Logout from all devices | Yes |
| POST | `/auth/refresh` | Refresh JWT token | No |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |
| POST | `/auth/change-password` | Change password | Yes |
| GET | `/auth/me` | Get current user profile | Yes |

### User Management Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/users` | List users (paginated, filtered) | Yes |
| GET | `/users/stats` | Get user statistics | Yes (Admin, Manager) |
| GET | `/users/search` | Search users by name/email | Yes |
| POST | `/users` | Create user (Admin only) | Yes (Admin) |
| GET | `/users/:id` | Get user by ID | Yes |
| PUT | `/users/:id` | Update user | Yes |
| DELETE | `/users/:id` | Soft delete user (Admin only) | Yes (Admin) |
| PUT | `/users/:id/role` | Change user role (Admin only) | Yes (Admin) |
| PUT | `/users/:id/status` | Change user status | Yes |
| PUT | `/users/:id/suspend` | Suspend user | Yes (Admin, Manager) |
| PUT | `/users/:id/reactivate` | Reactivate user | Yes (Admin, Manager) |

### Role & Permission Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/roles` | List all roles | Yes |
| GET | `/roles/summaries` | Get role summaries (UI) | Yes |
| GET | `/roles/system` | Get system roles | Yes |
| GET | `/roles/custom` | Get custom roles | Yes |
| GET | `/roles/compare` | Compare roles by hierarchy | Yes |
| GET | `/roles/:id` | Get role with permissions | Yes |
| GET | `/roles/:id/permissions` | Get role permissions | Yes |
| GET | `/roles/:id/hierarchy` | Get role hierarchy info | Yes |
| GET | `/roles/:id/users` | Get users with role | Yes (Admin, Manager, Supervisor) |
| GET | `/permissions` | List all permissions | Yes |
| GET | `/permissions/check` | Check user permission | Yes |

## Request/Response Format

### Error Response Format

All errors follow this consistent structure:

```json
{
  "error": {
    "code": "AUTH_001",
    "message": "Invalid credentials",
    "details": {}
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

### Pagination

List endpoints support pagination via query parameters:

- `page`: Page number (default: 1)
- `limit`: Items per page, max 100 (default: 20)

Response includes pagination metadata:

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

## Rate Limiting

| Client Type | Limit |
|-------------|-------|
| Unauthenticated | 100 requests per 15 minutes |
| Authenticated | 1000 requests per 15 minutes |
| Auth endpoints | 10 requests per minute per IP |

Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Request quota
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Unix timestamp when quota resets
- `Retry-After`: Seconds until retry is allowed (when limited)

## Error Codes Reference

### Authentication Errors (AUTH_xxx)

| Code | Description |
|------|-------------|
| AUTH_001 | Invalid credentials |
| AUTH_002 | Account not found |
| AUTH_003 | Account is inactive |
| AUTH_004 | Account is suspended |
| AUTH_005 | Invalid or expired token |
| AUTH_006 | Token refresh failed |
| AUTH_007 | Invalid password reset token |
| AUTH_008 | Password already used |
| AUTH_009 | Too many login attempts |

### Validation Errors (VAL_xxx)

| Code | Description |
|------|-------------|
| VAL_001 | Required field missing |
| VAL_002 | Invalid email format |
| VAL_003 | Invalid password format |
| VAL_004 | Invalid phone number format |
| VAL_005 | Invalid UUID format |
| VAL_006 | Invalid enum value |
| VAL_007 | Value out of range |
| VAL_008 | Duplicate value exists |

### Authorization Errors (AUTHZ_xxx)

| Code | Description |
|------|-------------|
| AUTHZ_001 | Insufficient permissions |
| AUTHZ_002 | Resource access denied |
| AUTHZ_003 | Action not allowed for user role |

### Resource Errors (RES_xxx)

| Code | Description |
|------|-------------|
| RES_001 | Resource not found |
| RES_002 | Resource already exists |
| RES_003 | Resource is locked |
| RES_004 | Resource has dependencies |

### Rate Limiting (RATE_xxx)

| Code | Description |
|------|-------------|
| RATE_001 | Rate limit exceeded |
| RATE_002 | Too many requests |

### Server Errors (SRV_xxx)

| Code | Description |
|------|-------------|
| SRV_001 | Internal server error |
| SRV_002 | Database error |
| SRV_003 | External service unavailable |
| SRV_004 | File upload failed |

## Usage Examples

### Login (Mobile)

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@patrolmanager.com",
    "password": "SecurePass123",
    "clientType": "mobile",
    "deviceId": "android_a1b2c3d4"
  }'
```

### Login (Web)

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{
    "email": "admin@patrolmanager.com",
    "password": "AdminPass123",
    "clientType": "web"
  }'
```

### Create User (Admin)

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane.doe@patrolmanager.com",
    "password": "SecurePass123",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "guard",
    "phone": "+1234567890",
    "employeeId": "EMP-2024-002",
    "status": "active"
  }'
```

### List Users with Filters

```bash
curl -X GET "http://localhost:3000/api/v1/users?page=1&limit=20&role=guard&status=active&sortBy=lastName&sortOrder=asc" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### Change Password

```bash
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPass123",
    "newPassword": "NewSecurePass123"
  }'
```

## OpenAPI Tools

To work with the API specification:

1. **Swagger UI**: Interactive documentation is available at `/api-docs` on the running server
2. **OpenAPI Generator**: Generate client SDKs using [openapi-generator](https://openapi-generator.tech)
3. **Validate**: Use [spectral](https://github.com/stoplightio/spectral) to validate the specification

```bash
# Install spectral
npm install -g @stoplight/spectral

# Validate the OpenAPI spec
spectral lint docs/api/openapi.yaml
```

## Additional Documentation

For more detailed information, see:

- **[Usage Guide](./usage-guide.md)** - Comprehensive API usage guide with code examples
- **[Authentication Flows](./authentication-flows.md)** - Detailed authentication flow diagrams
- **[Error Reference](./error-reference.md)** - Complete error code reference with resolution steps

## Next Steps

The following endpoints will be added in subsequent phases:

- **Phase 2**: Sites, Checkpoints, Patrol Templates, Patrol Runs
- **Phase 3**: WebSocket events for real-time tracking
- **Phase 4**: Incidents, Evidence uploads, Communication
- **Phase 5**: Reports, Shifts, Analytics
