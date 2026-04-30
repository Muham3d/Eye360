# Quickstart Guide: Users Module Functional Integrity

**Feature**: 001-fix-users-actions
**Branch**: `001-fix-users-actions`
**Date**: 2026-03-07

---

## Overview

This guide provides quick steps to set up, test, and validate the Users Module Functional Integrity feature.

---

## Prerequisites

### Software Required

- **Node.js**: v20+ (LTS)
- **PostgreSQL**: v15+
- **Git**: Latest version

### Database Setup

```bash
# Start PostgreSQL (Docker)
docker run -d \
  --name patrolmanager-postgres \
  -e POSTGRES_DB=patrolmanager \
  -e POSTGRES_USER=patrolmanager \
  -e POSTGRES_PASSWORD=patrolmanager \
  -p 5432:5432 \
  postgres:15-alpine

# Or use existing PostgreSQL instance
```

---

## Installation

### 1. Clone and Switch to Feature Branch

```bash
cd C:\Users\Mohamed\Desktop\Projects\Eye360
git checkout 001-fix-users-actions
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment

Create `backend/.env` (if not exists):

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=patrolmanager
DB_USER=patrolmanager
DB_PASS=patrolmanager

# Session
SESSION_SECRET=your-secret-key-change-in-production

# JWT (for mobile API)
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
```

### 4. Run Database Migrations

```bash
cd backend
npm run db:migrate
```

### 5. Seed Test Data (Optional)

```bash
npm run db:seed
```

---

## Running the Application

### Development Mode

```bash
cd backend
npm run dev
```

The server will start at `http://localhost:3000`

### Production Mode (for testing)

```bash
cd backend
npm run build
npm start
```

---

## Test Scenarios

### Prerequisite: Create Test Admin User

If not already created:

```bash
# In backend directory
node -e "
const bcrypt = require('bcrypt');
const { User } = require('./src/infrastructure/database/models');

(async () => {
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  await User.create({
    email: 'admin@test.com',
    password: hashedPassword,
    firstName: 'Admin',
    lastName: 'User',
    roleId: 1, // Admin role
    status: 'ACTIVE'
  });
  console.log('Admin user created: admin@test.com / Admin123!');
})();
"
```

---

### Manual Test Steps

#### Test 1: Users List Functionality (US1)

1. **Sign In**
   - Navigate to: `http://localhost:3000/auth/login`
   - Login: `admin@test.com` / `Admin123!`

2. **Open Users List**
   - Navigate to: `http://localhost:3000/users`
   - Verify: List loads without errors
   - Verify: All columns display correctly (Name, Email, Role, Status, Actions)

3. **Test Edit Action**
   - Click "Edit" button on any user row
   - Verify: Edit form loads with pre-filled data
   - Verify: All fields show correct values
   - Make a change (e.g., update phone number)
   - Click "Save"
   - Verify: Redirects to list with success message
   - Verify: Updated values appear in list

4. **Test Delete Action**
   - Click "Delete" button on a test user (not your own account)
   - Verify: Confirmation dialog appears
   - Confirm deletion
   - Verify: User is removed from list
   - Verify: Success message appears

5. **Test Self-Deletion Prevention**
   - Attempt to delete your own account
   - Verify: Error message appears explaining restriction
   - Verify: You remain logged in

#### Test 2: Data Accuracy (US2)

1. **Create Multiple Test Users**
   - Create at least 3 users with different names, emails, roles
   - Note their details

2. **Cross-Reference Values**
   - Open each user from the list
   - Verify: Edit form values match list values
   - Verify: Different users show different data (no mixing)
   - Update one user
   - Verify: Changes reflect in both list and edit form

3. **Test Refresh Behavior**
   - Update a user in a different browser/incognito
   - Refresh your list view
   - Verify: Latest data appears (not cached/old data)

#### Test 3: No Hardcoded Data (US3)

1. **Change Underlying Data**
   - Update a user's role via direct database or API
   - Refresh the users list
   - Verify: New role appears correctly

2. **Test Empty States**
   - Search for non-existent user (e.g., "nonexistentuser12345")
   - Verify: Empty state message appears
   - Verify: No hardcoded sample rows visible

3. **Inspect Source Code** (for developers)
   - Open `backend/src/interfaces/web/views/users/index.ejs`
   - Search for hardcoded values (sample names, fake emails)
   - Verify: All data comes from passed context variables

---

## Automated Testing

### Run All Tests

```bash
cd backend
npm test
```

### Run Specific Test Suite

```bash
# User workflow integration tests
npm test -- user-workflow

# Web controller unit tests
npm test -- WebUserController
```

### Run Tests with Coverage

```bash
npm test -- --coverage
```

Coverage goal: 80%+ for modified files

---

## Common Issues & Solutions

### Issue: Database Connection Failed

**Solution**:
- Verify PostgreSQL is running: `docker ps` or `pg_isready`
- Check `.env` database credentials
- Test connection: `psql -h localhost -U patrolmanager -d patrolmanager`

### Issue: Login Fails

**Solution**:
- Verify admin user exists in database
- Check email is correct
- Reset password:
  ```sql
  UPDATE users SET password = '<bcrypt_hash>' WHERE email = 'admin@test.com';
  ```

### Issue: Users List Shows No Data

**Solution**:
- Check database has users: `SELECT COUNT(*) FROM users;`
- Verify no soft-delete filter issue: `SELECT * FROM users WHERE deleted_at IS NULL;`
- Check controller logs for errors

### Issue: Actions Return 403 Forbidden

**Solution**:
- Verify your user has Admin or Manager role
- Check session is active
- Look for authorization middleware issues in routes

### Issue: CSRF Token Errors

**Solution**:
- Verify CSRF token is included in forms
- Check session middleware is configured
- Ensure `csrfToken` is passed to views

### Issue: Version Conflict Error

**Solution**:
- This occurs when two users edit the same user simultaneously
- Refresh the page and re-apply your changes
- The version field prevents silent data overwrites

### Issue: Migration Required

**Solution**:
- Run the migration to add the version field:
  ```bash
  npm run db:migrate
  ```
- This adds optimistic locking to prevent concurrent edit conflicts

---

## Validation Checklist

Use this checklist to verify feature completion:

### User Story 1: Manage Users Reliably (P1)

- [ ] Users list loads without errors
- [ ] Edit button opens correct user with pre-filled data
- [ ] Delete button requires confirmation
- [ ] Delete action removes user from list
- [ ] Self-deletion is blocked with clear message
- [ ] All action buttons work (no dead clicks)
- [ ] Success/error messages appear for all actions

### User Story 2: View Accurate Data (P2)

- [ ] Edit form data matches list data for same user
- [ ] Different users show different data (no crossover)
- [ ] Saved changes appear in both list and edit form
- [ ] Refresh shows latest data (not stale)

### User Story 3: No Hardcoded Data (P3)

- [ ] No hardcoded sample rows appear in any state
- [ ] Empty results show appropriate message (no fake data)
- [ ] All displayed values come from database
- [ ] Source code has no hardcoded user records

### Edge Cases

- [ ] Editing non-existent user shows 404 (not crash)
- [ ] Deleting self shows clear error (not silent fail)
- [ ] Rapid button clicks don't cause duplicates
- [ ] Long names/emails don't break layout
- [ ] Disabled/unavailable buttons are visually distinct

---

## Development Tips

### Debugging

Enable debug logging:

```bash
export DEBUG=patrolmanager:*
npm run dev
```

### Hot Reload

The dev server supports hot reload for EJS views. Changes to views are reflected immediately without restart.

### Database Inspection

Use Adminer or pgAdmin for visual database inspection:

```bash
docker run -d -p 8080:8080 adminer
# Navigate to http://localhost:8080
# Connect with credentials from .env
```

### Useful Queries

```sql
-- List all active users with roles
SELECT u.id, u.email, u.first_name, u.last_name, r.name as role, u.status
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE u.deleted_at IS NULL
ORDER BY u.created_at DESC;

-- Find users by status
SELECT * FROM users WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- Check for duplicate emails
SELECT email, COUNT(*) as count
FROM users
WHERE deleted_at IS NULL
GROUP BY email
HAVING COUNT(*) > 1;
```

---

## Implementation Notes

### New Files Created

**Domain Constants**:
- `backend/src/core/domain/constants/UserConstants.ts` - Centralized role/status values, validation messages, and error messages

**DTOs**:
- `backend/src/interfaces/http/dtos/UserListDto.ts` - User list view model
- `backend/src/interfaces/http/dtos/UserFormDto.ts` - User form view model

**Middleware**:
- `backend/src/interfaces/http/middleware/csrfMiddleware.ts` - CSRF token validation

**Migrations**:
- `backend/src/infrastructure/database/migrations/20260307000001-add-version-field-to-users.js` - Adds version field for optimistic locking

**Tests**:
- `backend/tests/integration/web/user-list.test.ts` - List action tests
- `backend/tests/integration/web/user-edit.test.ts` - Edit action tests
- `backend/tests/integration/web/user-delete.test.ts` - Delete action tests
- `backend/tests/integration/web/user-data-accuracy.test.ts` - Data accuracy tests
- `backend/tests/integration/web/user-empty-states.test.ts` - Empty state tests

**Error Pages**:
- `backend/src/interfaces/web/views/errors/404.ejs` - Not found error page
- `backend/src/interfaces/web/views/errors/403.ejs` - Forbidden error page

### Key Implementation Changes

1. **Self-Deletion Prevention**: Users cannot delete their own accounts
2. **CSRF Protection**: All state-changing operations require valid CSRF token
3. **Concurrent Edit Detection**: Version field prevents data overwrites
4. **Centralized Constants**: No more hardcoded role/status values
5. **Dynamic Dashboard Stats**: Statistics now fetched from database
6. **Proper Empty States**: No fake data shown when results are empty

### Database Migration Required

Run the migration to add the version field:

```bash
cd backend
npm run db:migrate
```

---

## Next Steps

After verification:

1. **Run full test suite**: `npm test`
2. **Check code coverage**: `npm test -- --coverage`
3. **Review code**: Self-review or use `/speckit.analyze`
4. **Commit changes**: `git add . && git commit -m "Fix: Users module functionality"`
5. **Create PR**: `gh pr create` (if using GitHub)

---

## Support

For issues or questions:

1. Check the main documentation: `PROJECT_PLAN.md`, `CLAUDE.md`
2. Review implementation plan: `specs/001-fix-users-actions/plan.md`
3. Review data model: `specs/001-fix-users-actions/data-model.md`
4. Review contracts: `specs/001-fix-users-actions/contracts/`
