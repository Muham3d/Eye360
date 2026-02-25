# PatrolManager API Error Reference

This document provides a comprehensive reference of all error codes returned by the PatrolManager API, including descriptions, causes, and resolution steps.

## Table of Contents

- [Error Response Format](#error-response-format)
- [Authentication Errors](#authentication-errors)
- [Validation Errors](#validation-errors)
- [Authorization Errors](#authorization-errors)
- [Resource Errors](#resource-errors)
- [Rate Limiting Errors](#rate-limiting-errors)
- [Server Errors](#server-errors)
- [HTTP Status Codes](#http-status-codes)

---

## Error Response Format

All API errors follow a consistent structure:

```json
{
  "error": {
    "code": "AUTH_001",
    "message": "Invalid credentials",
    "details": {
      "field": "email",
      "reason": "User not found"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `error.code` | string | Unique error identifier (e.g., `AUTH_001`) |
| `error.message` | string | Human-readable error message |
| `error.details` | object | Additional context (optional) |
| `timestamp` | string | ISO 8601 timestamp of when the error occurred |

---

## Authentication Errors

Error codes in the `AUTH_xxx` range relate to authentication and identity verification.

### AUTH_001 - Invalid Credentials

**Description:** The provided email and password combination is incorrect.

**HTTP Status:** 401 Unauthorized

**Example Response:**

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

**Possible Causes:**
- Incorrect email or password
- User typed wrong credentials
- Caps lock was enabled
- Password was recently changed

**Resolution Steps:**
1. Verify the email and password are correct
2. Check if caps lock is enabled
3. Use the "Forgot Password" feature if needed
4. Contact administrator if issue persists

** Prevention:**
- Implement password strength requirements
- Use password managers to avoid typos
- Show password visibility toggle

---

### AUTH_002 - Account Not Found

**Description:** No account exists with the provided email address.

**HTTP Status:** 404 Not Found

**Example Response:**

```json
{
  "error": {
    "code": "AUTH_002",
    "message": "Account not found",
    "details": {
      "email": "unknown@example.com"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Possible Causes:**
- Email address was entered incorrectly
- User account was deleted
- User is trying to access with wrong email

**Resolution Steps:**
1. Verify the email address is correct
2. Contact administrator to confirm account exists
3. Check if account was recently deleted

---

### AUTH_003 - Account is Inactive

**Description:** The user account exists but has not been activated.

**HTTP Status:** 403 Forbidden

**Example Response:**

```json
{
  "error": {
    "code": "AUTH_003",
    "message": "Account is inactive",
    "details": {
      "reason": "Account requires activation"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Possible Causes:**
- New account waiting for admin approval
- User hasn't completed registration process
- Account was deactivated

**Resolution Steps:**
1. Check email for activation link
2. Contact administrator to activate account
3. Complete registration process if pending

---

### AUTH_004 - Account is Suspended

**Description:** The user account has been suspended due to policy violation.

**HTTP Status:** 403 Forbidden

**Example Response:**

```json
{
  "error": {
    "code": "AUTH_004",
    "message": "Account is suspended",
    "details": {
      "reason": "Policy violation - unauthorized site access",
      "suspendedAt": "2024-02-20T15:30:00Z",
      "contact": "admin@patrolmanager.com"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Possible Causes:**
- Security policy violation
- Terms of service violation
- Suspicious activity detected
- Admin manually suspended account

**Resolution Steps:**
1. Review the suspension reason in details
2. Contact administrator
3. Appeal the suspension if appropriate

---

### AUTH_005 - Invalid or Expired Token

**Description:** The provided JWT token is invalid, malformed, or has expired.

**HTTP Status:** 401 Unauthorized

**Example Response:**

```json
{
  "error": {
    "code": "AUTH_005",
    "message": "Invalid or expired token",
    "details": {
      "reason": "Token expired at 2024-02-23T09:00:00Z"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Possible Causes:**
- Access token expired (1 hour lifetime)
- Token was tampered with
- Refresh token also expired
- Server token secret changed

**Resolution Steps:**
1. Use refresh token to get new access token
2. If refresh fails, re-authenticate
3. Check system time is synchronized
4. Implement automatic token refresh in client

**Client Implementation:**

```javascript
async function makeRequest(url, options = {}) {
  let token = getAccessToken();

  // Check if token is about to expire
  if (isTokenExpiringSoon(token)) {
    token = await refreshToken();
  }

  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  let response = await fetch(url, options);

  // If 401, try refresh once
  if (response.status === 401) {
    token = await refreshToken();
    options.headers['Authorization'] = `Bearer ${token}`;
    response = await fetch(url, options);
  }

  return response;
}
```

---

### AUTH_006 - Token Refresh Failed

**Description:** The refresh token is invalid, expired, or has been revoked.

**HTTP Status:** 401 Unauthorized

**Example Response:**

```json
{
  "error": {
    "code": "AUTH_006",
    "message": "Token refresh failed",
    "details": {
      "reason": "Refresh token not found or revoked"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Possible Causes:**
- Refresh token expired (7 day lifetime)
- Refresh token was revoked (logout)
- User changed password
- Administrator revoked all sessions

**Resolution Steps:**
1. Clear stored tokens
2. Redirect user to login screen
3. User must re-authenticate

**Client Implementation:**

```javascript
async function refreshToken() {
  const refreshToken = getRefreshToken();

  try {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      throw new Error('Refresh failed');
    }

    const data = await response.json();
    storeTokens(data.data.token, data.data.refreshToken);
    return data.data.token;
  } catch (error) {
    // Clear tokens and redirect to login
    clearTokens();
    window.location.href = '/login';
    throw error;
  }
}
```

---

### AUTH_007 - Invalid Password Reset Token

**Description:** The password reset token is invalid, expired, or has already been used.

**HTTP Status:** 401 Unauthorized

**Example Response:**

```json
{
  "error": {
    "code": "AUTH_007",
    "message": "Invalid or expired reset token",
    "details": {
      "reason": "Token expired or already used"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Possible Causes:**
- Reset token expired (1 hour lifetime)
- Token was already used
- Token was revoked by new password reset request

**Resolution Steps:**
1. Request a new password reset
2. Use the reset link within 1 hour
3. Ensure the link is clicked only once

---

### AUTH_008 - Password Already Used

**Description:** The new password was previously used by the user.

**HTTP Status:** 400 Bad Request

**Example Response:**

```json
{
  "error": {
    "code": "AUTH_008",
    "message": "Password already used",
    "details": {
      "policy": "Last 5 passwords cannot be reused"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Possible Causes:**
- User is reusing a recent password
- Password history check is enabled

**Resolution Steps:**
1. Choose a different password
2. Ensure password is not in the recent history
3. Use a password generator for uniqueness

---

### AUTH_009 - Too Many Login Attempts

**Description:** Too many failed login attempts from the same IP or account.

**HTTP Status:** 429 Too Many Requests

**Example Response:**

```json
{
  "error": {
    "code": "AUTH_009",
    "message": "Too many login attempts",
    "details": {
      "retryAfter": 300,
      "attempts": 5,
      "lockoutDuration": "5 minutes"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Headers:**

```
Retry-After: 300
```

**Possible Causes:**
- Multiple failed login attempts
- Brute force attack detection
- Account temporarily locked

**Resolution Steps:**
1. Wait for the lockout period (check `retryAfter`)
2. Use "Forgot Password" feature
3. Contact administrator if issue persists

---

## Validation Errors

Error codes in the `VAL_xxx` range relate to input validation failures.

### VAL_001 - Required Field Missing

**Description:** A required field is missing from the request.

**HTTP Status:** 400 Bad Request

**Example Response:**

```json
{
  "error": {
    "code": "VAL_001",
    "message": "Required field missing",
    "details": {
      "field": "email",
      "requiredFields": ["email", "password", "firstName", "lastName"]
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Include all required fields
2. Check API documentation for required fields
3. Ensure field names are spelled correctly

---

### VAL_002 - Invalid Email Format

**Description:** The email address format is invalid.

**HTTP Status:** 400 Bad Request

**Example Response:**

```json
{
  "error": {
    "code": "VAL_002",
    "message": "Invalid email format",
    "details": {
      "field": "email",
      "value": "invalid-email",
      "pattern": "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Valid Email Format:**
- Standard format: `user@domain.com`
- Subdomains: `user@mail.domain.com`
- Special characters: `user+tag@domain.com`

**Resolution Steps:**
1. Verify email format is correct
2. Use email validation in client before sending
3. Check for typos in email address

---

### VAL_003 - Invalid Password Format

**Description:** The password does not meet security requirements.

**HTTP Status:** 400 Bad Request

**Example Response:**

```json
{
  "error": {
    "code": "VAL_003",
    "message": "Invalid password format",
    "details": {
      "field": "password",
      "requirements": {
        "minLength": 8,
        "maxLength": 128,
        "requiresUppercase": true,
        "requiresLowercase": true,
        "requiresNumber": true,
        "pattern": "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,}$"
      }
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Password Requirements:**
- Minimum length: 8 characters
- Maximum length: 128 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Optional: Special characters recommended

**Resolution Steps:**
1. Create a password that meets all requirements
2. Use a password with mixed case, numbers, and symbols
3. Consider using a password generator

**Client Validation:**

```javascript
function validatePassword(password) {
  const requirements = {
    minLength: 8,
    maxLength: 128,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    isValidLength: password.length >= 8 && password.length <= 128
  };

  const errors = [];

  if (!requirements.isValidLength) {
    errors.push(`Password must be between 8 and 128 characters`);
  }
  if (!requirements.hasUppercase) {
    errors.push(`Password must contain at least one uppercase letter`);
  }
  if (!requirements.hasLowercase) {
    errors.push(`Password must contain at least one lowercase letter`);
  }
  if (!requirements.hasNumber) {
    errors.push(`Password must contain at least one number`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
```

---

### VAL_004 - Invalid Phone Number Format

**Description:** The phone number format is invalid.

**HTTP Status:** 400 Bad Request

**Example Response:**

```json
{
  "error": {
    "code": "VAL_004",
    "message": "Invalid phone number format",
    "details": {
      "field": "phone",
      "value": "123-456-7890",
      "expectedFormat": "E.164: +1234567890"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Valid Format:** E.164 international format
- Country code prefix: `+`
- Example: `+1234567890`

**Resolution Steps:**
1. Use E.164 format with country code
2. Remove spaces, dashes, and parentheses
3. Add `+` prefix for country code

---

### VAL_005 - Invalid UUID Format

**Description:** The provided UUID is not a valid UUID v4 format.

**HTTP Status:** 400 Bad Request

**Example Response:**

```json
{
  "error": {
    "code": "VAL_005",
    "message": "Invalid UUID format",
    "details": {
      "field": "id",
      "value": "not-a-uuid",
      "expectedFormat": "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Valid UUID Format:**
- 8-4-4-4-12 hexadecimal groups
- Example: `550e8400-e29b-41d4-a716-446655440000`

**Resolution Steps:**
1. Use the UUID returned by the API
2. Validate UUID format in client before sending
3. Don't modify or truncate UUIDs

---

### VAL_006 - Invalid Enum Value

**Description:** The provided value is not in the allowed enum values.

**HTTP Status:** 400 Bad Request

**Example Response:**

```json
{
  "error": {
    "code": "VAL_006",
    "message": "Invalid enum value",
    "details": {
      "field": "role",
      "value": "superadmin",
      "allowedValues": ["admin", "manager", "supervisor", "guard"]
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Use one of the allowed values
2. Check API documentation for valid enum values
3. Use dropdowns/selects in client UI

---

### VAL_007 - Value Out of Range

**Description:** A numeric value is outside the allowed range.

**HTTP Status:** 400 Bad Request

**Example Response:**

```json
{
  "error": {
    "code": "VAL_007",
    "message": "Value out of range",
    "details": {
      "field": "page",
      "value": 0,
      "min": 1,
      "max": 1000
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Use a value within the specified range
2. Validate ranges in client before sending
3. Implement range constraints in UI

---

### VAL_008 - Duplicate Value Exists

**Description:** A unique constraint violation has occurred.

**HTTP Status:** 409 Conflict

**Example Response:**

```json
{
  "error": {
    "code": "VAL_008",
    "message": "Duplicate value exists",
    "details": {
      "field": "email",
      "value": "john.doe@patrolmanager.com",
      "conflict": "A user with this email already exists"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Use a different value for the unique field
2. Check if resource already exists before creating
3. Provide search functionality for users

---

## Authorization Errors

Error codes in the `AUTHZ_xxx` range relate to permission and access control issues.

### AUTHZ_001 - Insufficient Permissions

**Description:** The user does not have the required role or permission.

**HTTP Status:** 403 Forbidden

**Example Response:**

```json
{
  "error": {
    "code": "AUTHZ_001",
    "message": "Insufficient permissions",
    "details": {
      "required": ["admin"],
      "current": "guard",
      "action": "users.create"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Contact administrator for required permissions
2. Use an account with appropriate role
3. Check role permissions in documentation

---

### AUTHZ_002 - Resource Access Denied

**Description:** The user is not allowed to access this specific resource.

**HTTP Status:** 403 Forbidden

**Example Response:**

```json
{
  "error": {
    "code": "AUTHZ_002",
    "message": "Resource access denied",
    "details": {
      "resource": "User",
      "resourceId": "550e8400-e29b-41d4-a716-446655440000",
      "reason": "Can only access resources in assigned sites"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Verify you have access to this resource
2. Check site assignments
3. Contact administrator for access

---

### AUTHZ_003 - Action Not Allowed for User Role

**Description:** The user's role does not permit this action.

**HTTP Status:** 403 Forbidden

**Example Response:**

```json
{
  "error": {
    "code": "AUTHZ_003",
    "message": "Action not allowed for user role",
    "details": {
      "role": "supervisor",
      "action": "users.delete",
      "allowedRoles": ["admin"]
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Use an account with appropriate role
2. Check role-based access control matrix
3. Contact administrator

---

## Resource Errors

Error codes in the `RES_xxx` range relate to resource management issues.

### RES_001 - Resource Not Found

**Description:** The requested resource does not exist.

**HTTP Status:** 404 Not Found

**Example Response:**

```json
{
  "error": {
    "code": "RES_001",
    "message": "Resource not found",
    "details": {
      "resource": "User",
      "id": "550e8400-e29b-41d4-a716-446655440000"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Verify the resource ID is correct
2. Check if resource was deleted
3. Search for the resource first

---

### RES_002 - Resource Already Exists

**Description:** Attempting to create a resource that already exists.

**HTTP Status:** 409 Conflict

**Example Response:**

```json
{
  "error": {
    "code": "RES_002",
    "message": "Resource already exists",
    "details": {
      "resource": "User",
      "field": "email",
      "value": "john.doe@patrolmanager.com"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Check if resource exists before creating
2. Use unique identifiers
3. Update existing resource instead of creating new

---

### RES_003 - Resource is Locked

**Description:** The resource is currently locked by another operation.

**HTTP Status:** 423 Locked

**Example Response:**

```json
{
  "error": {
    "code": "RES_003",
    "message": "Resource is locked",
    "details": {
      "resource": "Incident",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "lockedBy": "admin@patrolmanager.com",
      "lockedAt": "2024-02-23T10:00:00Z"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Wait and retry later
2. Contact the user who locked the resource
3. Force unlock if necessary (admin only)

---

### RES_004 - Resource Has Dependencies

**Description:** Cannot delete resource because other resources depend on it.

**HTTP Status:** 409 Conflict

**Example Response:**

```json
{
  "error": {
    "code": "RES_004",
    "message": "Resource has dependencies",
    "details": {
      "resource": "Site",
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "dependencies": {
        "checkpoints": 15,
        "patrols": 8,
        "incidents": 3
      },
      "message": "Cannot delete site with active checkpoints, patrols, or incidents"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Remove or reassign dependencies first
2. Use soft delete instead
3. Contact administrator for assistance

---

## Rate Limiting Errors

Error codes in the `RATE_xxx` range relate to API rate limiting.

### RATE_001 - Rate Limit Exceeded

**Description:** API request rate limit has been exceeded.

**HTTP Status:** 429 Too Many Requests

**Example Response:**

```json
{
  "error": {
    "code": "RATE_001",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 1000,
      "remaining": 0,
      "reset": 1708695000,
      "retryAfter": 300
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Headers:**

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1708695000
Retry-After: 300
```

**Resolution Steps:**
1. Wait for rate limit to reset (check `retryAfter`)
2. Implement exponential backoff
3. Reduce request frequency
4. Use pagination and filtering
5. Cache responses when possible

**Client Implementation:**

```javascript
class RateLimitedClient {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
  }

  async request(url, options = {}) {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, options, resolve, reject });
      this.processQueue();
    });
  }

  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const { url, options, resolve, reject } = this.queue.shift();

    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;

        // Put back in front of queue
        this.queue.unshift({ url, options, resolve, reject });

        // Wait and retry
        setTimeout(() => {
          this.isProcessing = false;
          this.processQueue();
        }, retryAfter * 1000);
      } else {
        resolve(response);
        this.isProcessing = false;
        this.processQueue();
      }
    } catch (error) {
      reject(error);
      this.isProcessing = false;
      this.processQueue();
    }
  }
}
```

---

### RATE_002 - Too Many Requests

**Description:** Too many requests in a short time period.

**HTTP Status:** 429 Too Many Requests

**Example Response:**

```json
{
  "error": {
    "code": "RATE_002",
    "message": "Too many requests",
    "details": {
      "window": "60 seconds",
      "maxRequests": 10,
      "currentRequests": 15
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Implement request throttling in client
2. Use debouncing for user input
3. Batch requests when possible
4. Implement request queuing

---

## Server Errors

Error codes in the `SRV_xxx` range indicate server-side issues.

### SRV_001 - Internal Server Error

**Description:** An unexpected error occurred on the server.

**HTTP Status:** 500 Internal Server Error

**Example Response:**

```json
{
  "error": {
    "code": "SRV_001",
    "message": "Internal server error",
    "details": {
      "requestId": "req_abc123",
      "message": "An unexpected error occurred. Please try again."
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Retry the request
2. Check service status page
3. Report issue with request ID to support
4. Ensure request payload is valid

---

### SRV_002 - Database Error

**Description:** A database operation failed.

**HTTP Status:** 500 Internal Server Error

**Example Response:**

```json
{
  "error": {
    "code": "SRV_002",
    "message": "Database error",
    "details": {
      "operation": "query",
      "message": "Failed to execute query"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Retry the request
2. Check if database is operational
3. Report issue to support

---

### SRV_003 - External Service Unavailable

**Description:** An external service (email, SMS, etc.) is unavailable.

**HTTP Status:** 503 Service Unavailable

**Example Response:**

```json
{
  "error": {
    "code": "SRV_003",
    "message": "External service unavailable",
    "details": {
      "service": "EmailProvider",
      "action": "sendPasswordReset"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Retry the request later
2. Check service status page
3. Use alternative method if available

---

### SRV_004 - File Upload Failed

**Description:** File upload operation failed.

**HTTP Status:** 500 Internal Server Error

**Example Response:**

```json
{
  "error": {
    "code": "SRV_004",
    "message": "File upload failed",
    "details": {
      "reason": "File size exceeds limit",
      "maxSize": "10MB",
      "receivedSize": "15MB"
    }
  },
  "timestamp": "2024-02-23T10:00:00Z"
}
```

**Resolution Steps:**
1. Check file size is within limits
2. Verify file format is supported
3. Check network connection
4. Retry the upload

---

## HTTP Status Codes

Quick reference for HTTP status codes used by the API.

| Status | Category | Description |
|--------|----------|-------------|
| **200** | Success | Request succeeded |
| **201** | Success | Resource created |
| **204** | Success | No content (delete successful) |
| **400** | Client Error | Bad request (validation error) |
| **401** | Client Error | Unauthorized (authentication required) |
| **403** | Client Error | Forbidden (authorization required) |
| **404** | Client Error | Not found |
| **409** | Client Error | Conflict (duplicate exists) |
| **422** | Client Error | Unprocessable entity |
| **423** | Client Error | Locked |
| **429** | Client Error | Too many requests (rate limited) |
| **500** | Server Error | Internal server error |
| **503** | Server Error | Service unavailable |

---

## Error Handling Best Practices

### Client-Side Error Handling

```javascript
class ApiClient {
  async request(url, options = {}) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      // Handle non-success responses
      if (!response.ok) {
        return this.handleError(response);
      }

      return await response.json();
    } catch (error) {
      // Network or parsing errors
      return this.handleNetworkError(error);
    }
  }

  async handleError(response) {
    const error = await response.json().catch(() => ({
      error: {
        code: 'SRV_001',
        message: 'Unknown error'
      }
    }));

    // Log error for debugging
    console.error('API Error:', {
      status: response.status,
      code: error.error.code,
      message: error.error.message,
      details: error.error.details
    });

    // Handle specific error codes
    switch (error.error.code) {
      case 'AUTH_005':
      case 'AUTH_006':
        // Token issues - refresh or re-authenticate
        return this.handleAuthError(error);

      case 'RATE_001':
      case 'RATE_002':
        // Rate limited - wait and retry
        return this.handleRateLimitError(response, error);

      case 'VAL_001':
      case 'VAL_002':
      case 'VAL_003':
        // Validation errors - show form errors
        return this.handleValidationError(error);

      case 'AUTHZ_001':
      case 'AUTHZ_002':
      case 'AUTHZ_003':
        // Authorization errors - show permission error
        return this.handleAuthzError(error);

      case 'RES_001':
        // Not found - show 404 page
        return this.handleNotFoundError(error);

      default:
        // Generic error handler
        return this.handleGenericError(error);
    }
  }

  handleAuthError(error) {
    // Clear tokens and redirect to login
    clearTokens();
    window.location.href = '/login';
    return { error: 'Session expired. Please log in again.' };
  }

  handleRateLimitError(response, error) {
    const retryAfter = response.headers.get('Retry-After');
    const message = `Rate limit exceeded. Please retry in ${retryAfter} seconds.`;
    return { error: message, retryAfter };
  }

  handleValidationError(error) {
    // Return error details for form display
    return {
      error: 'Validation failed',
      details: error.error.details
    };
  }

  handleAuthzError(error) {
    return {
      error: 'You do not have permission to perform this action',
      details: error.error.details
    };
  }

  handleNotFoundError(error) {
    return {
      error: 'The requested resource was not found'
    };
  }

  handleGenericError(error) {
    return {
      error: error.error.message || 'An unexpected error occurred'
    };
  }

  handleNetworkError(error) {
    console.error('Network Error:', error);
    return {
      error: 'Network error. Please check your connection and try again.'
    };
  }
}
```

### Error Logging

```javascript
function logError(error, context = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    error: {
      code: error.error?.code,
      message: error.error?.message,
      details: error.error?.details
    },
    context,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Send to error tracking service
  if (typeof window.trackError === 'function') {
    window.trackError(logEntry);
  }

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', logEntry);
  }
}
```

---

## Additional Resources

- [API Usage Guide](./usage-guide.md)
- [Authentication Flows](./authentication-flows.md)
- [OpenAPI Specification](./openapi.yaml)
- [Swagger UI](http://localhost:3000/api-docs)
