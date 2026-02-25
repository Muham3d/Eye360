# PatrolManager API Usage Guide

This guide provides comprehensive information on using the PatrolManager RESTful API, including authentication methods, request/response formats, error handling, and practical examples.

## Table of Contents

- [Getting Started](#getting-started)
- [Authentication](#authentication)
- [Request/Response Format](#requestresponse-format)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)
- [Pagination](#pagination)
- [Filtering and Sorting](#filtering-and-sorting)
- [Code Examples](#code-examples)
- [Best Practices](#best-practices)

---

## Getting Started

### Base URLs

| Environment | Base URL |
|-------------|----------|
| **Development** | `http://localhost:3000/api/v1` |
| **Production** | `https://api.patrolmanager.com/api/v1` |

### Interactive Documentation

Access the interactive Swagger UI documentation at:
- **Development**: `http://localhost:3000/api-docs`
- **Production**: `https://api.patrolmanager.com/api-docs`

The Swagger UI provides:
- Complete API reference
- Interactive "Try it out" functionality
- Request/response examples
- Schema definitions

---

## Authentication

The PatrolManager API supports two authentication methods:

### 1. JWT Bearer Token (Mobile Clients)

Mobile Android apps authenticate using JWT tokens.

#### Login Flow

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "john.doe@patrolmanager.com",
  "password": "SecurePass123",
  "clientType": "mobile",
  "deviceId": "android_a1b2c3d4"
}
```

#### Response

```json
{
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "john.doe@patrolmanager.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "guard",
      "status": "active"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 3600
  }
}
```

#### Using the Token

Include the JWT token in the `Authorization` header:

```bash
GET /api/v1/auth/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Token Refresh

When the access token expires (1 hour), use the refresh token to obtain a new one:

```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 2. Session Cookie (Web Clients)

Web admin panel uses session-based authentication.

#### Login Flow

```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@patrolmanager.com",
  "password": "AdminPass123",
  "clientType": "web"
}
```

The server sets an `HttpOnly`, `Secure` session cookie automatically:

```
Set-Cookie: connect.sid=s%3A...; Path=/; HttpOnly; Secure; SameSite=Strict
```

#### Using the Session

Subsequent requests automatically include the session cookie. No additional headers needed.

### 3. Token Storage Best Practices

| Client Type | Storage Method | Security Notes |
|-------------|---------------|----------------|
| **Mobile** | Encrypted SharedPreferences / Keychain | Use Android Keystore or iOS Keychain |
| **Web (SPA)** | Memory or HttpOnly cookie | Never store in localStorage |
| **Web (Server)** | HttpOnly session cookie | Most secure option for web |

---

## Request/Response Format

### Request Format

#### Content Types

All API requests (except file uploads) must use:

```
Content-Type: application/json
```

#### Date Format

All datetime fields use ISO 8601 format:

```
2024-02-23T10:30:45Z
```

#### UUID Format

All ID fields use UUID v4 format:

```
550e8400-e29b-41d4-a716-446655440000
```

### Response Format

#### Success Response

Successful responses follow this structure:

```json
{
  "data": {
    // Response data here
  },
  "meta": {
    // Optional metadata (pagination, etc.)
  }
}
```

#### Error Response

Error responses always include:

```json
{
  "error": {
    "code": "AUTH_001",
    "message": "Invalid credentials",
    "details": {
      // Additional error context
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Type | Description |
|------|------|-------------|
| **200** | Success | Request succeeded |
| **201** | Created | Resource created successfully |
| **204** | No Content | Request succeeded with no response body |
| **400** | Bad Request | Invalid request parameters |
| **401** | Unauthorized | Authentication required or failed |
| **403** | Forbidden | Insufficient permissions |
| **404** | Not Found | Resource not found |
| **409** | Conflict | Resource already exists |
| **422** | Unprocessable Entity | Validation failed |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Server Error | Internal server error |

### Error Categories

#### Authentication Errors (AUTH_xxx)

| Code | Message | Resolution |
|------|---------|------------|
| AUTH_001 | Invalid credentials | Check email/password combination |
| AUTH_002 | Account not found | Verify account exists |
| AUTH_003 | Account is inactive | Contact administrator |
| AUTH_004 | Account is suspended | Contact administrator |
| AUTH_005 | Invalid or expired token | Refresh or re-authenticate |
| AUTH_006 | Token refresh failed | Re-authenticate |
| AUTH_007 | Invalid password reset token | Request new reset link |
| AUTH_008 | Password already used | Use a different password |
| AUTH_009 | Too many login attempts | Wait before retrying |

#### Validation Errors (VAL_xxx)

| Code | Message | Resolution |
|------|---------|------------|
| VAL_001 | Required field missing | Include all required fields |
| VAL_002 | Invalid email format | Use valid email format |
| VAL_003 | Invalid password format | Password must have uppercase, lowercase, and number |
| VAL_004 | Invalid phone number format | Use E.164 format: +1234567890 |
| VAL_005 | Invalid UUID format | Use valid UUID v4 format |
| VAL_006 | Invalid enum value | Use allowed enum values |
| VAL_007 | Value out of range | Use value within allowed range |
| VAL_008 | Duplicate value exists | Use a unique value |

#### Authorization Errors (AUTHZ_xxx)

| Code | Message | Resolution |
|------|---------|------------|
| AUTHZ_001 | Insufficient permissions | Contact administrator for access |
| AUTHZ_002 | Resource access denied | Verify resource access rights |
| AUTHZ_003 | Action not allowed for user role | Check role permissions |

#### Resource Errors (RES_xxx)

| Code | Message | Resolution |
|------|---------|------------|
| RES_001 | Resource not found | Verify resource ID |
| RES_002 | Resource already exists | Use unique identifier |
| RES_003 | Resource is locked | Wait and retry |
| RES_004 | Resource has dependencies | Remove dependencies first |

#### Rate Limiting (RATE_xxx)

| Code | Message | Resolution |
|------|---------|------------|
| RATE_001 | Rate limit exceeded | Wait before retrying |
| RATE_002 | Too many requests | Reduce request frequency |

#### Server Errors (SRV_xxx)

| Code | Message | Resolution |
|------|---------|------------|
| SRV_001 | Internal server error | Contact support |
| SRV_002 | Database error | Contact support |
| SRV_003 | External service unavailable | Retry later |
| SRV_004 | File upload failed | Check file size and format |

### Error Handling Example

```javascript
try {
  const response = await fetch('/api/v1/users/123', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const error = await response.json();

    // Handle specific error codes
    switch (error.error.code) {
      case 'AUTH_005':
        // Token expired - refresh it
        await refreshToken();
        break;
      case 'AUTHZ_001':
        // Permission denied - show error
        showErrorMessage('You do not have permission to access this resource');
        break;
      case 'RES_001':
        // Not found - redirect
        navigateToNotFound();
        break;
      default:
        showErrorMessage(error.error.message);
    }
    return;
  }

  const data = await response.json();
  // Process data...
} catch (error) {
  console.error('Request failed:', error);
}
```

---

## Rate Limiting

### Rate Limits by Endpoint Type

| Client Type | Limit | Window |
|-------------|-------|--------|
| **Unauthenticated** | 100 requests | 15 minutes |
| **Authenticated** | 1000 requests | 15 minutes |
| **Auth endpoints** | 10 requests | 1 minute per IP |
| **Password change** | 20 requests | 1 hour per user |

### Rate Limit Headers

Every API response includes rate limit headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1708694400
Retry-After: 60 (only when limited)
```

### Handling Rate Limits

```javascript
const response = await fetch('/api/v1/users', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
  const resetTime = response.headers.get('X-RateLimit-Reset');

  // Wait and retry
  setTimeout(() => {
    // Retry request
  }, retryAfter * 1000);
}
```

### Best Practices to Avoid Rate Limits

1. **Use pagination** for list endpoints
2. **Cache data** client-side when appropriate
3. **Use webhooks** instead of polling (when available)
4. **Batch requests** when possible
5. **Implement exponential backoff** for retries

---

## Pagination

### Pagination Parameters

List endpoints support pagination via query parameters:

| Parameter | Type | Default | Max | Description |
|-----------|------|---------|-----|-------------|
| `page` | integer | 1 | - | Page number |
| `limit` | integer | 20 | 100 | Items per page |

### Response Format

```json
{
  "data": [
    // Array of items
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Pagination Example

```bash
GET /api/v1/users?page=2&limit=50
```

```javascript
async function getAllUsers() {
  let allUsers = [];
  let page = 1;
  const limit = 100;

  while (true) {
    const response = await fetch(
      `/api/v1/users?page=${page}&limit=${limit}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    const result = await response.json();
    allUsers = allUsers.concat(result.data);

    if (page >= result.meta.totalPages) break;
    page++;
  }

  return allUsers;
}
```

---

## Filtering and Sorting

### Filtering

Most list endpoints support filtering:

| Parameter | Description | Example |
|-----------|-------------|---------|
| `role` | Filter by user role | `?role=guard` |
| `status` | Filter by status | `?status=active` |
| `search` | Search in name, email, employee ID | `?search=john` |
| `siteId` | Filter by assigned site | `?siteId=uuid` |

```bash
GET /api/v1/users?role=guard&status=active&search=john
```

### Sorting

Sort results using `sortBy` and `sortOrder`:

| Parameter | Values | Default |
|-----------|--------|---------|
| `sortBy` | `firstName`, `lastName`, `email`, `createdAt`, `lastLoginAt` | `createdAt` |
| `sortOrder` | `asc`, `desc` | `desc` |

```bash
GET /api/v1/users?sortBy=lastName&sortOrder=asc
```

---

## Code Examples

### JavaScript/Fetch

#### Login (Mobile)

```javascript
async function login(email, password) {
  const response = await fetch('/api/v1/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      clientType: 'mobile',
      deviceId: 'android_a1b2c3d4'
    })
  });

  if (!response.ok) {
    throw new Error('Login failed');
  }

  const result = await response.json();

  // Store tokens securely
  secureStorage.setItem('accessToken', result.data.token);
  secureStorage.setItem('refreshToken', result.data.refreshToken);

  return result.data.user;
}
```

#### Get User Profile

```javascript
async function getUserProfile(accessToken) {
  const response = await fetch('/api/v1/auth/me', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }

  return await response.json();
}
```

#### Create User

```javascript
async function createUser(accessToken, userData) {
  const response = await fetch('/api/v1/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
}

// Usage
const newUser = await createUser(accessToken, {
  email: 'jane.doe@patrolmanager.com',
  password: 'SecurePass123',
  firstName: 'Jane',
  lastName: 'Doe',
  role: 'guard',
  phone: '+1234567890',
  employeeId: 'EMP-2024-002'
});
```

### cURL Examples

#### Login (Mobile)

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

#### Login (Web)

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

#### Get User Profile (with JWT)

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Get User Profile (with Session)

```bash
curl -X GET http://localhost:3000/api/v1/auth/me \
  -b cookies.txt
```

#### Create User

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

#### List Users with Filters

```bash
curl -X GET "http://localhost:3000/api/v1/users?page=1&limit=20&role=guard&status=active&sortBy=lastName&sortOrder=asc" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### Change Password

```bash
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "OldPass123",
    "newPassword": "NewSecurePass123"
  }'
```

---

## Best Practices

### Security

1. **Always use HTTPS** in production
2. **Never log tokens** or passwords
3. **Validate all input** on the client side
4. **Store tokens securely** (Keychain/Keystore for mobile)
5. **Implement token refresh** before expiration
6. **Rotate refresh tokens** after use
7. **Use strong passwords** (minimum 8 characters, mixed case, numbers)

### Performance

1. **Use pagination** for large datasets
2. **Filter at the source** using query parameters
3. **Cache static data** (roles, permissions)
4. **Request only needed fields** when available
5. **Use compression** for large payloads
6. **Implement retry logic** with exponential backoff

### Error Handling

1. **Always check HTTP status** before processing response
2. **Handle specific error codes** appropriately
3. **Display user-friendly messages** for validation errors
4. **Log server errors** for debugging
5. **Implement circuit breakers** for external service failures

### Testing

1. **Use Swagger UI** for manual testing
2. **Write integration tests** for critical flows
3. **Test error scenarios** (invalid tokens, rate limits)
4. **Mock external dependencies** in tests

---

## Additional Resources

- [OpenAPI Specification](./openapi.yaml)
- [Authentication Flows](./authentication-flows.md)
- [Error Reference](./error-reference.md)
- [Swagger UI](http://localhost:3000/api-docs)

---

## Support

For API-related questions or issues:

- **Email**: support@patrolmanager.com
- **Documentation**: https://docs.patrolmanager.com
- **Status Page**: https://status.patrolmanager.com
