# Research: Users Module Functional Integrity

**Feature**: 001-fix-users-actions
**Date**: 2026-03-07
**Status**: Complete

## Overview

This document captures research decisions for hardening the Users module in the Admin Web Panel. The focus is on fixing broken functionality, removing hardcoded data, and ensuring all actions work reliably.

## Research Questions & Decisions

### RQ-001: How to Fix Hardcoded Dashboard Statistics?

**Question**: The dashboard shows hardcoded statistics (activeGuards, activeSites, etc.). How should these be replaced with real data?

**Decision**: Create statistics aggregation methods in existing services

**Rationale**:
- The existing `UserService` can be extended with aggregation methods
- Statistics should be computed efficiently at the database level using Sequelize aggregations
- Cache results for a short period (5 minutes) to avoid performance impact

**Alternatives Considered**:
1. **Compute on every request**: Rejected due to performance concerns with large datasets
2. **Separate StatisticsService**: Rejected as over-engineering for simple counts
3. **Materialized views**: Rejected as premature optimization; can be added later if needed

**Implementation**:
- Add `getDashboardStats()` method to `UserService`
- Use Sequelize's `count()` and `findAll()` with appropriate `where` clauses
- Implement simple in-memory caching using a Map with TTL

---

### RQ-002: How to Handle Role/Status Fallback Values?

**Question**: Code has hardcoded fallback values like `'Guard'` for role. How should these be centralized?

**Decision**: Create constants file for domain values

**Rationale**:
- Centralized constants prevent typos and make changes easier
- Aligns with DRY principle
- Allows for easy internationalization in the future

**Alternatives Considered**:
1. **Database-driven**: Rejected as over-engineering; roles are stable domain concepts
2. **Environment variables**: Rejected; these are not configuration values but domain constants
3. **Keep as-is**: Rejected; violates DRY and makes maintenance harder

**Implementation**:
- Create `backend/src/core/domain/constants/UserConstants.ts`
- Define `DEFAULT_ROLE`, `DEFAULT_STATUS`, role names, status labels
- Import and use across controllers and views

---

### RQ-003: How to Implement Proper Delete Confirmation?

**Question**: User deletion requires explicit confirmation. What's the best approach for EJS views?

**Decision**: Use client-side confirmation with server-side verification

**Rationale**:
- Simple JavaScript `confirm()` is sufficient for basic confirmation
- Server-side should verify the request method (POST not GET) to prevent CSRF
- Follows existing patterns in the codebase

**Alternatives Considered**:
1. **Custom modal dialog**: Rejected as over-engineering for this feature
2. **Double-submit pattern**: Rejected as poor UX
3. **Soft delete with undo**: Already implemented; confirmation remains needed

**Implementation**:
- Add `onclick="return confirm('...')"` to delete buttons
- Ensure delete actions use POST/DELETE methods (not GET)
- Add CSRF token to all state-changing forms

---

### RQ-004: How to Prevent Self-Deletion?

**Question**: Users should not be able to delete their own accounts. Where should this validation occur?

**Decision**: Validate in controller before service call

**Rationale**:
- Controller has access to session user ID
- Follows pattern of input validation in controllers
- Service layer receives already-validated inputs

**Alternatives Considered**:
1. **Validate in service**: Rejected; service shouldn't know about sessions
2. **Database constraint**: Rejected; too complex to enforce at DB level
3. **Frontend only**: Rejected; not secure (can be bypassed)

**Implementation**:
- Add check in `WebUserController.deleteUser()`: `if (targetUserId === sessionUserId) throw new ForbiddenError(...)`
- Return clear error message explaining the restriction
- Disable/hide delete button for current user in the UI

---

### RQ-005: How to Handle Concurrent Edits?

**Question**: What happens when two admins edit the same user simultaneously?

**Decision**: Use optimistic locking with version field

**Rationale**:
- Prevents silent overwrites of changes
- Standard pattern for concurrent edit scenarios
- Can be implemented with minimal changes to existing schema

**Alternatives Considered**:
1. **Pessimistic locking**: Rejected; too complex for this use case
2. **Last write wins**: Rejected; causes data loss
3. **No handling**: Rejected; leads to data inconsistency

**Implementation**:
- Add `version` field to User model (already may exist)
- Increment on each update
- Check version in update operation; throw conflict error if mismatched
- Show conflict error to user with option to retry

---

### RQ-006: How to Structure Web Controller Tests?

**Question**: What testing approach should be used for the web controllers?

**Decision**: Integration tests with Supertest for full request/response cycle

**Rationale**:
- Tests the actual HTTP behavior including middleware
- Catches integration issues between controller, service, and routes
- Aligns with existing test infrastructure (Jest + Supertest)

**Alternatives Considered**:
1. **Unit tests only**: Rejected; doesn't catch integration issues
2. **End-to-end with Playwright**: Rejected; overkill for controller testing
3. **No tests**: Rejected; violates quality gate requirements

**Implementation**:
- Create `backend/tests/integration/web/user-workflow.test.ts`
- Test each user story scenario (view, edit, delete)
- Use test factories to create realistic test data
- Test error cases and edge cases

---

### RQ-007: How to Remove Hardcoded Data from EJS Views?

**Question**: What hardcoded data exists in views and how should it be removed?

**Decision**: Audit all EJS views and replace with dynamic data

**Rationale**:
- Views should only render data passed from controllers
- No business logic or data generation in views
- Consistent with MVC pattern

**Alternatives Considered**:
1. **Keep some hardcoded "sample" data**: Rejected; confuses testing and users
2. **Generate data in views**: Rejected; violates separation of concerns
3. **Use client-side data fetching**: Rejected; adds unnecessary complexity

**Implementation**:
- Audit `backend/src/interfaces/web/views/users/*.ejs` for hardcoded values
- Add proper data fetching to controllers
- Handle empty states explicitly (no "sample" rows)
- Use EJS conditionals for empty state messaging

---

## Technology Stack Confirmation

Based on existing codebase analysis:

| Component | Technology | Version |
|-----------|------------|---------|
| Backend Framework | Express.js | 4.19+ |
| Language | TypeScript/JavaScript | 5.3+ |
| Database | PostgreSQL | 15 |
| ORM | Sequelize | 6.x |
| Authentication | Passport.js | Sessions (web) |
| Views | EJS | Latest |
| Styling | Tailwind CSS | 3.4 |
| Testing | Jest + Supertest | Latest |

No new dependencies are required for this feature.

## Implementation Constraints

1. **No changes to core services layer** - UserService remains as-is
2. **No database schema changes** - Use existing User model structure
3. **No breaking API changes** - Maintain backward compatibility
4. **Follow existing patterns** - Match current code style and architecture
5. **Minimal JavaScript in views** - Keep views simple, logic in controllers

## Open Questions (None)

All technical unknowns have been resolved. No further research needed before implementation.
