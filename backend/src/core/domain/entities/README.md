# Domain Entities

## Purpose
Rich domain models that encapsulate business behavior and state.

## Entity Types

### User
Represents users in the system with role-based access control.

**Roles**: Admin, Manager, Supervisor, Guard

**Business Rules**:
- Email must be unique
- Password must meet complexity requirements
- Users can only be modified by higher role levels
- Managers can only manage their assigned sites

### Site
Represents a physical location where guards patrol.

**Business Rules**:
- Geofence must be a valid polygon
- Sites must have at least one checkpoint
- Sites can be active or inactive
- Geofence validation for clock-in/out

### Checkpoint
Represents a verification point within a site.

**Types**: NFC, QR Code, GPS Location

**Business Rules**:
- Must belong to a site
- GPS checkpoints have accuracy radius
- Cannot be deleted if used in active patrol template

### PatrolTemplate
Represents a predefined sequence of checkpoints for scheduled patrols.

**Business Rules**:
- Must have at least two checkpoints
- Checkpoints must belong to the same site
- Can have estimated duration per checkpoint
- Templates can be active or inactive

### PatrolRun
Represents an executed instance of a patrol template.

**Status**: Pending, In Progress, Completed, Failed, Abandoned

**Business Rules**:
- Must be started by an active guard
- GPS validation required for each checkpoint
- Cannot complete if all checkpoints not verified
- Tracks start/end time and actual route taken

### Incident
Represents a reported event during a patrol or independently.

**Status**: Open, Investigating, Resolved, Closed

**Severity**: Low, Medium, High, Critical

**Business Rules**:
- Requires evidence (images, notes)
- Automatic escalation for high/critical severity
- Must be assigned to supervisor or manager
- Tracks response time and resolution

## TODO

- [ ] Implement User entity
- [ ] Implement Site entity
- [ ] Implement Checkpoint entity
- [ ] Implement PatrolTemplate entity
- [ ] Implement PatrolRun entity
- [ ] Implement Incident entity
