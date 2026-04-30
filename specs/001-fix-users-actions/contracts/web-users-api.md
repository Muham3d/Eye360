# Web Interface Contract: Users Module

**Feature**: 001-fix-users-actions
**Version**: 1.0.0
**Protocol**: HTTP/HTTPS (Web UI)
**Authentication**: Session-based (Passport.js)

---

## Overview

This document defines the HTTP contract for the Users module in the Admin Web Panel. These are the server-side endpoints that the EJS views interact with.

---

## Base URL

```
http://localhost:3000/users
```

---

## Endpoints

### 1. List Users

**Endpoint**: `GET /users`

**Description**: Retrieves a paginated list of users with optional filtering.

**Authentication**: Required (Admin, Manager)

**Query Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `page` | Integer | No | 1 | Page number (1-indexed) |
| `limit` | Integer | No | 20 | Items per page |
| `search` | String | No | - | Search email, first name, last name |
| `role` | String | No | - | Filter by role name |
| `status` | String | No | - | Filter by status (ACTIVE, INACTIVE, SUSPENDED) |

**Response**: Renders HTML view `views/users/index.ejs`

**View Context**:

```typescript
{
  users: Array<{
    id: string;
    email: string;
    fullName: string;
    role: {
      id: string;
      name: string;
    };
    status: string;
    lastLoginAt: Date | null;
    canEdit: boolean;
    canDelete: boolean;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: {
    search?: string;
    role?: string;
    status?: string;
  };
}
```

**Error Responses**:

| Status | Scenario |
|--------|----------|
| 401 | Not authenticated |
| 403 | Insufficient permissions |

---

### 2. Show User Form (Create/Edit)

**Endpoint**: `GET /users/new` or `GET /users/:id/edit`

**Description**: Displays the user creation or edit form.

**Authentication**: Required (Admin, Manager)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | For edit only | User ID to edit |

**Response**: Renders HTML view `views/users/form.ejs`

**View Context (Create)**:

```typescript
{
  user: null; // or empty object
  roles: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  errors: Record<string, string>;
}
```

**View Context (Edit)**:

```typescript
{
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
    roleId: string;
    status: string;
  };
  roles: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  errors: Record<string, string>;
}
```

**Error Responses**:

| Status | Scenario |
|--------|----------|
| 401 | Not authenticated |
| 403 | Insufficient permissions |
| 404 | User not found (edit only) |

---

### 3. Create User

**Endpoint**: `POST /users`

**Description**: Creates a new user account.

**Authentication**: Required (Admin, Manager)

**Content-Type**: `application/x-www-form-urlencoded` or `multipart/form-data`

**Request Body**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | String | Yes | Valid email, unique |
| `firstName` | String | Yes | Max 100 chars |
| `lastName` | String | Yes | Max 100 chars |
| `phone` | String | No | Valid phone format |
| `roleId` | String | Yes | Valid role ID |
| `status` | String | No | One of: ACTIVE, INACTIVE, SUSPENDED |
| `password` | String | Yes* | Min 8 chars if provided |
| `confirmPassword` | String | Yes* | Must match password |

*Password required for new users; can be set to send invitation email instead.

**Response**: Redirects to user list or form with errors

**Success Redirect**: `GET /users` with success message

**Error Response**: Re-renders form with validation errors

**View Context (Error)**:

```typescript
{
  user: { /* submitted values */ };
  roles: [ /* available roles */ ];
  errors: {
    email?: string;
    firstName?: string;
    lastName?: string;
    password?: string;
    confirmPassword?: string;
    roleId?: string;
  };
}
```

---

### 4. Update User

**Endpoint**: `POST /users/:id` or `PUT /users/:id`

**Description**: Updates an existing user account.

**Authentication**: Required (Admin, Manager)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | User ID to update |

**Content-Type**: `application/x-www-form-urlencoded` or `multipart/form-data`

**Request Body**:

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `email` | String | Yes | Valid email, unique |
| `firstName` | String | Yes | Max 100 chars |
| `lastName` | String | Yes | Max 100 chars |
| `phone` | String | No | Valid phone format |
| `roleId` | String | Yes | Valid role ID |
| `status` | String | No | One of: ACTIVE, INACTIVE, SUSPENDED |
| `password` | String | No | Min 8 chars if provided |
| `confirmPassword` | String | No | Must match password |
| `_method` | String | No | Must be "PUT" for POST override |

**Response**: Redirects to user list or form with errors

**Success Redirect**: `GET /users` with success message

**Error Response**: Re-renders form with validation errors

**Special Cases**:

| Scenario | Response |
|----------|----------|
| User not found | 404 with error page |
| Updating self | Allowed (except role/status changes may be restricted) |
| Conflict (version mismatch) | Re-render with conflict error |

---

### 5. Delete User

**Endpoint**: `POST /users/:id?_method=DELETE` or `DELETE /users/:id`

**Description**: Soft-deletes a user account.

**Authentication**: Required (Admin only)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | User ID to delete |

**Request Headers**:

| Header | Required | Description |
|--------|----------|-------------|
| `X-CSRF-Token` | Yes | CSRF protection token |

**Response**: Redirects to user list

**Success Redirect**: `GET /users` with success message

**Error Responses**:

| Status | Scenario |
|--------|----------|
| 401 | Not authenticated |
| 403 | Not admin OR attempting to delete self |
| 404 | User not found |

---

### 6. Toggle User Status

**Endpoint**: `POST /users/:id/toggle-status`

**Description**: Toggles a user's status between ACTIVE and INACTIVE.

**Authentication**: Required (Admin, Manager)

**Path Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | String | Yes | User ID to toggle |

**Response**: Redirects to user list with success message

**Error Responses**:

| Status | Scenario |
|--------|----------|
| 401 | Not authenticated |
| 403 | Insufficient permissions |
| 404 | User not found |

---

### 7. Bulk User Actions

**Endpoint**: `POST /users/bulk`

**Description**: Performs bulk operations on multiple users.

**Authentication**: Required (Admin only)

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | String | Yes | One of: delete, activate, deactivate, changeRole |
| `userIds` | Array | Yes | Array of user IDs |
| `roleId` | String | For changeRole | Target role ID |

**Response**: Redirects to user list with summary message

---

## View Rendering

### Flash Messages

All endpoints should set flash messages for user feedback:

```typescript
// Success
req.flash('success', 'User created successfully');

// Error
req.flash('error', 'Failed to create user');
```

Templates should display these messages prominently.

### Empty States

Views should handle empty data gracefully:

```html
<!-- Empty user list -->
<% if (users.length === 0) { %>
  <div class="empty-state">
    <p>No users found. <%= filters.search ? 'Try a different search.' : 'Create your first user!' %></p>
    <a href="/users/new" class="btn-primary">Create User</a>
  </div>
<% } %>
```

### Pagination Controls

The list view should include pagination controls:

```html
<!-- Previous page -->
<% if (pagination.page > 1) { %>
  <a href="?page=<%= pagination.page - 1 %>">Previous</a>
<% } %>

<!-- Page info -->
<span>Page <%= pagination.page %> of <%= pagination.totalPages %></span>

<!-- Next page -->
<% if (pagination.page < pagination.totalPages) { %>
  <a href="?page=<%= pagination.page + 1 %>">Next</a>
<% } %>
```

---

## Security Requirements

### CSRF Protection

All state-changing operations (POST, PUT, DELETE) must include CSRF tokens:

```html
<input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

### Authorization Checks

Each endpoint must verify:

1. User is authenticated
2. User has required role (Admin/Manager)
3. User has permission for specific action (delete = Admin only)
4. User is not attempting to delete their own account

### Input Validation

All inputs must be validated:

- Email format and uniqueness
- Field length limits
- Enum values for status and role
- Password strength (when provided)

### Output Encoding

All rendered values must be HTML-encoded:

```html
<%= user.email %> <!-- Automatically escaped by EJS -->
```

---

## Error Handling

### Validation Errors

- Return 400 status or re-render form with error messages
- Highlight invalid fields
- Preserve valid input values

### Not Found Errors

- Return 404 status
- Render friendly error page
- Provide navigation back to list

### Authorization Errors

- Return 403 status
- Render friendly error page
- Suggest contacting admin for permissions

### Server Errors

- Return 500 status
- Log error details
- Show generic error message to user
- Provide way to retry or go back

---

## Browser Compatibility

Supported browsers:

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Progressive enhancement approach:
- Core functionality works without JavaScript
- Enhanced UX with JavaScript (confirm dialogs, AJAX updates)
