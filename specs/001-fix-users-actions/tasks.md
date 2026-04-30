# Tasks: Users Module Functional Integrity

**Input**: Design documents from `/specs/001-fix-users-actions/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/web-users-api.md

**Tests**: Test tasks included based on quality gate requirements (Jest + Supertest for backend)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/` (4-layer architecture: core/domain, core/services, infrastructure, interfaces)
- **Web Views**: `backend/src/interfaces/web/views/`
- **Tests**: `backend/tests/`

---

## Phase 1: Setup (Feature Preparation)

**Purpose**: Prepare the existing codebase for this feature implementation

- [X] T001 Verify existing codebase structure matches plan.md expectations
- [X] T002 Review current Users module implementation in backend/src/interfaces/web/
- [X] T003 [P] Create UserConstants.ts for centralized role/status values in backend/src/core/domain/constants/
- [X] T004 [P] Audit EJS views for hardcoded data in backend/src/interfaces/web/views/users/

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Review and ensure UserService has required aggregation methods in backend/src/core/services/UserService.ts
- [X] T006 [P] Create UserListDto and UserFormDto interfaces in backend/src/interfaces/http/dtos/
- [X] T007 [P] Setup flash message middleware for success/error feedback in backend/src/interfaces/http/middleware/
- [X] T008 Ensure CSRF token protection is configured for all forms in backend/src/server.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Manage Users Reliably from List (Priority: P1) 🎯 MVP

**Goal**: Fix all user list action buttons (view, edit, delete) so they work correctly without errors

**Independent Test**: Sign in as admin, open Users list, click each action button for at least one user, verify each action reaches the correct destination or performs the expected action with no server error

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T009 [P] [US1] Create integration test for list user action in backend/tests/integration/web/user-list.test.ts
- [X] T010 [P] [US1] Create integration test for edit user action in backend/tests/integration/web/user-edit.test.ts
- [X] T011 [P] [US1] Create integration test for delete user action in backend/tests/integration/web/user-delete.test.ts

### Implementation for User Story 1

- [X] T012 [P] [US1] Fix Users list route GET /users to pass proper data to view in backend/src/interfaces/web/routes/index.js
- [X] T013 [P] [US1] Fix Users list view index.ejs to render users from passed data in backend/src/interfaces/web/views/users/index.ejs
- [X] T014 [P] [US1] Fix Edit user route GET /users/:id/edit to load correct user in backend/src/interfaces/web/routes/index.js
- [X] T015 [P] [US1] Fix Edit form view form.ejs to pre-fill with user data in backend/src/interfaces/web/views/users/form.ejs
- [X] T016 [US1] Fix Create user route POST /users with proper validation in backend/src/interfaces/http/controllers/WebUserController.js
- [X] T017 [US1] Fix Update user route POST /users/:id with proper validation in backend/src/interfaces/http/controllers/WebUserController.js
- [X] T018 [US1] Fix Delete user route DELETE /users/:id with confirmation check in backend/src/interfaces/http/controllers/WebUserController.js
- [X] T019 [US1] Add self-deletion prevention check in delete route in backend/src/interfaces/http/controllers/WebUserController.js
- [X] T020 [P] [US1] Add CSRF token to all forms in backend/src/interfaces/web/views/users/form.ejs
- [X] T021 [P] [US1] Add client-side confirmation dialog to delete buttons in backend/src/interfaces/web/views/users/index.ejs
- [X] T022 [US1] Implement success/error flash messages for all user actions in backend/src/interfaces/http/controllers/WebUserController.js

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - View Accurate User Details (Priority: P2)

**Goal**: Ensure all displayed user data comes from real database records, not hardcoded values

**Independent Test**: Open at least two distinct users from the list and compare displayed values with corresponding list values and saved changes after refresh

### Tests for User Story 2

- [X] T023 [P] [US2] Create integration test for data accuracy across views in backend/tests/integration/web/user-data-accuracy.test.ts

### Implementation for User Story 2

- [X] T024 [P] [US2] Remove any hardcoded user fallback values in WebUserController in backend/src/interfaces/http/controllers/WebUserController.js
- [X] T025 [P] [US2] Ensure list view data comes from UserService (not hardcoded) in backend/src/interfaces/web/routes/index.js
- [X] T026 [P] [US2] Ensure form view data comes from UserService (not hardcoded) in backend/src/interfaces/web/routes/index.js
- [X] T027 [US2] Add version field check for concurrent edit detection in backend/src/interfaces/http/controllers/WebUserController.js
- [X] T028 [US2] Display conflict error when version mismatch occurs in backend/src/interfaces/web/views/users/form.ejs

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Eliminate Hardcoded Frontend User Data (Priority: P3)

**Goal**: Remove all hardcoded user data from the frontend, ensure only live application data is rendered

**Independent Test**: Inspect all Users module screens and interactions while changing underlying user records; confirm rendered content updates from actual records and no static placeholder records appear

### Tests for User Story 3

- [X] T029 [P] [US3] Create integration test for empty state handling in backend/tests/integration/web/user-empty-states.test.ts

### Implementation for User Story 3

- [X] T030 [P] [US3] Replace hardcoded dashboard statistics with database queries in backend/src/interfaces/web/routes/index.js
- [X] T031 [P] [US3] Add getDashboardStats method to UserService in backend/src/core/services/UserService.ts
- [X] T032 [P] [US3] Implement empty state message for no users in list in backend/src/interfaces/web/views/users/index.ejs
- [X] T033 [P] [US3] Implement empty state message for filtered search with no results in backend/src/interfaces/web/views/users/index.ejs
- [X] T034 [US3] Remove any hardcoded sample user rows from views in backend/src/interfaces/web/views/users/index.ejs
- [X] T035 [US3] Remove any hardcoded sample profile values from views in backend/src/interfaces/web/views/users/form.ejs

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T036 [P] Add pagination controls to users list in backend/src/interfaces/web/views/users/index.ejs
- [X] T037 [P] Add search/filter functionality to users list in backend/src/interfaces/web/views/users/index.ejs
- [X] T038 [P] Add role/status filter dropdowns to users list in backend/src/interfaces/web/views/users/index.ejs
- [X] T039 Implement proper error pages for 404 (user not found) in backend/src/interfaces/web/views/errors/
- [X] T040 Implement proper error pages for 403 (forbidden) in backend/src/interfaces/web/views/errors/
- [X] T041 [P] Add accessibility improvements (ARIA labels, keyboard navigation) in backend/src/interfaces/web/views/users/
- [X] T042 Update quickstart.md with any additional setup steps discovered during implementation
- [X] T043 Run full validation checklist from quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1) can proceed independently
  - User Story 2 (P2) can proceed independently (but enhances US1)
  - User Story 3 (P3) can proceed independently (but enhances US1+US2)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

```
Foundational (Phase 2)
    │
    ├─────────────────┬─────────────────┬─────────────────┐
    │                 │                 │                 │
    ▼                 ▼                 ▼                 ▼
User Story 1 (P1)  User Story 2 (P2)  User Story 3 (P3)  Polish (Phase 6)
🎯 MVP           (Data Accuracy)   (No Hardcoded)    (Enhancements)
```

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Independent of US1, but enhances it
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Independent of US1/US2, but enhances them

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Routes/Controllers updated before views (backend drives frontend)
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Within Setup (Phase 1)**:
- T003 and T004 can run in parallel (different files)

**Within Foundational (Phase 2)**:
- T006 and T007 can run in parallel (different files)

**Within User Story 1 (Phase 3)**:
- T009, T010, T011 (all tests) can run in parallel
- T012, T013 (list) can run in parallel
- T014, T015 (edit) can run in parallel
- T020, T021 (security) can run in parallel

**Within User Story 2 (Phase 4)**:
- T024, T025, T026 (different routes) can run in parallel

**Within User Story 3 (Phase 5)**:
- T030, T032, T033 (different views/empty states) can run in parallel

**Within Polish (Phase 6)**:
- T036, T037, T038, T041 can run in parallel

**Cross-Story**:
- Once Foundational phase completes, all three user stories can be worked on in parallel by different developers

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: "Create integration test for list user action in backend/tests/integration/web/user-list.test.ts"
Task: "Create integration test for edit user action in backend/tests/integration/web/user-edit.test.ts"
Task: "Create integration test for delete user action in backend/tests/integration/web/user-delete.test.ts"

# Launch list route and view updates together:
Task: "Fix Users list route GET /users to pass proper data to view in backend/src/interfaces/web/routes/index.js"
Task: "Fix Users list view index.ejs to render users from passed data in backend/src/interfaces/web/views/users/index.ejs"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T008) - CRITICAL
3. Complete Phase 3: User Story 1 (T009-T022)
4. **STOP and VALIDATE**: Test User Story 1 independently using quickstart.md
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Polish → Final deployment

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T008)
2. Once Foundational is done:
   - Developer A: User Story 1 (T009-T022)
   - Developer B: User Story 2 (T023-T028)
   - Developer C: User Story 3 (T029-T035)
3. Stories complete and integrate independently
4. Team: Polish phase (T036-T043)

---

## Task Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| Phase 1: Setup | 4 | Feature preparation and audit |
| Phase 2: Foundational | 4 | Core infrastructure (BLOCKS all) |
| Phase 3: US1 | 14 | List actions working (P1 - MVP) |
| Phase 4: US2 | 6 | Data accuracy (P2) |
| Phase 5: US3 | 7 | No hardcoded data (P3) |
| Phase 6: Polish | 8 | Cross-cutting enhancements |
| **Total** | **43** | **All tasks** |

### Task Count per User Story

- **User Story 1 (P1 - MVP)**: 14 tasks (3 tests + 11 implementation)
- **User Story 2 (P2)**: 6 tasks (1 test + 5 implementation)
- **User Story 3 (P3)**: 7 tasks (1 test + 6 implementation)

### Parallel Opportunities

- **Setup**: 2 tasks can run in parallel
- **Foundational**: 2 tasks can run in parallel
- **User Story 1**: 8 tasks can run in parallel
- **User Story 2**: 4 tasks can run in parallel
- **User Story 3**: 4 tasks can run in parallel
- **Polish**: 4 tasks can run in parallel

### Independent Test Criteria

- **US1**: All action buttons work, self-deletion blocked, success/error messages show
- **US2**: Data consistent across views, no hardcoded fallback values
- **US3**: Empty states handled, no sample data visible, all data from database

### Suggested MVP Scope

**MVP = Phase 1 + Phase 2 + Phase 3 (User Story 1 only)**

- Tasks T001-T022 (22 tasks total)
- Delivers: Working Users list with functional view/edit/delete actions
- Testable independently before adding more features

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Tests must fail before implementing (TDD approach)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Follow project constitution: No Express in services, controllers are thin, use repository pattern
