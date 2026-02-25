# PatrolManager Admin Panel User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [User Management](#user-management)
4. [Site Management](#site-management)
5. [Patrol Templates](#patrol-templates)
6. [Incident Management](#incident-management)
7. [Real-time Tracking](#real-time-tracking)
8. [Reports & Analytics](#reports--analytics)
9. [Settings & Configuration](#settings--configuration)

---

## Getting Started

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Browser | Chrome 90+, Firefox 88+, Edge 90+ | Latest Chrome/Edge |
| Screen Resolution | 1280x720 | 1920x1080 or higher |
| Internet | Stable broadband connection | Low latency connection |

### Login

1. Navigate to your PatrolManager admin URL (e.g., `https://patrolmanager.yourcompany.com`)
2. Enter your email address and password
3. Click **Sign In**

> **Note:** Your account must have Admin, Manager, or Supervisor role to access the admin panel. Guards cannot access the web interface.

### First Login - Password Change

For security purposes, you may be required to change your password on first login:

1. Enter your current password
2. Enter your new password (minimum 8 characters, must include uppercase, lowercase, and number)
3. Confirm the new password
4. Click **Change Password**

### Session Management

- Sessions automatically expire after **24 hours** of inactivity
- You will be prompted 5 minutes before session expiration
- Click **Stay Logged In** to extend your session

---

## Dashboard Overview

The dashboard provides a real-time overview of your security operations.

### Dashboard Widgets

| Widget | Description |
|--------|-------------|
| **Active Guards** | Number of guards currently on shift |
| **Active Patrols** | Patrols currently in progress |
| **Pending Incidents** | Incidents requiring attention |
| **SOS Alerts** | Active emergency alerts |
| **Today's Patrols** | Scheduled vs completed patrol statistics |
| **Site Status** | Overview of all monitored sites |

### Live Map

The center of the dashboard displays a live map showing:

- **Guard positions** (blue dots) with names
- **Site boundaries** (shaded polygons)
- **Checkpoint locations** (numbered markers)
- **Active patrol routes** (highlighted paths)
- **SOS alert locations** (red pulsing markers)

> **Tip:** Click on any guard marker to see their details including current shift, active patrol, and last checkpoint verified.

### Alert Feed

The right sidebar shows real-time alerts:

| Alert Type | Color | Description |
|------------|-------|-------------|
| SOS | Red | Emergency panic button activated |
| Incident | Orange | New incident reported |
| Patrol Started | Green | Guard began a patrol |
| Checkpoint | Blue | Checkpoint verified |
| Geofence Breach | Yellow | Guard left assigned area |

---

## User Management

Manage all users in the system including guards, supervisors, managers, and admins.

### User Roles

| Role | Level | Permissions |
|------|-------|-------------|
| **Admin** | 1 | Full system access, user management, settings |
| **Manager** | 2 | Site management, patrol assignment, reports |
| **Supervisor** | 3 | Patrol oversight, incident management, guard monitoring |
| **Guard** | 4 | Mobile app only, patrol execution, incident reporting |

### Adding a New User

1. Navigate to **Users** > **All Users**
2. Click **+ Add User** button
3. Fill in the required fields:

| Field | Description | Required |
|-------|-------------|----------|
| Email | Unique email address for login | Yes |
| First Name | User's first name | Yes |
| Last Name | User's last name | Yes |
| Phone | Contact phone number | No |
| Role | Select from dropdown | Yes |
| Status | Active, Inactive, Suspended, Pending | Yes |

4. Click **Create User**
5. The user will receive an email with temporary password

### Editing Users

1. Navigate to **Users** > **All Users**
2. Click on the user's name or email
3. Modify the desired fields
4. Click **Save Changes**

> **Warning:** Changing a user's role will immediately affect their permissions.

### Deleting vs. Disabling Users

| Action | Effect |
|--------|--------|
| **Delete** | Permanently removes the user (cannot be undone) |
| **Disable** | Sets status to inactive - user cannot login but data is preserved |

### Resetting User Passwords

1. Navigate to **Users** > **All Users**
2. Click on the user
3. Click **Reset Password**
4. Enter the new password or use auto-generate
5. Click **Send Password Reset Email**

### Assigning Guards to Sites

1. Navigate to **Users** > **Guards**
2. Click on a guard
3. In the **Assigned Sites** section, click **+ Add Site**
4. Select sites from the dropdown
5. Click **Save**

### Viewing User Activity

Navigate to **Users** > **Activity Log** to see:

- Login history
- Patrol completions
- Incidents reported
- Checkpoint verifications

---

## Site Management

Create and manage patrol locations with geofence boundaries.

### Creating a New Site

1. Navigate to **Sites** > **All Sites**
2. Click **+ Add Site**
3. Fill in the site information:

| Field | Description |
|-------|-------------|
| Site Name | Display name for the location |
| Address | Physical address |
| Site Code | Short identifier (e.g., "HQ-01") |
| Timezone | Local timezone for accurate scheduling |
| Status | Active or Inactive |

4. Define the **Geofence Boundary**:
   - Click on the map to place boundary points
   - Double-click to complete the polygon
   - Use **Edit Points** to adjust the boundary

5. Click **Create Site**

### Geofence Configuration

| Setting | Description |
|---------|-------------|
| Buffer Zone | Grace area around boundary (default: 5m) |
| Breach Alert Time | Minutes outside geofence before alert (default: 5min) |
| GPS Accuracy | Maximum acceptable GPS accuracy (default: 20m) |

### Site Checkpoints

Checkpoints are verification points within a site that guards must visit during patrols.

#### Adding Checkpoints

1. Navigate to **Sites** > **All Sites**
2. Click on a site
3. Go to **Checkpoints** tab
4. Click **+ Add Checkpoint**
5. Fill in checkpoint details:

| Field | Description |
|-------|-------------|
| Name | Checkpoint display name |
| Code | Unique identifier (e.g., "CP-001") |
| Type | NFC, QR, GPS, or Multiple |
| Location | GPS coordinates (click on map or enter manually) |
| Is Mandatory | Whether this checkpoint must be completed |

6. Configure verification method based on type:

**NFC Checkpoint:**
- Enter the NFC tag ID (scan tag with NFC reader)
- Requires guards to physically tap their phone

**QR Code Checkpoint:**
- System generates QR code automatically
- Print and place at checkpoint location
- Guards scan with their phone camera

**GPS Checkpoint:**
- Set verification radius (default: 30 meters)
- Guards verify by being within range

**Multiple Methods:**
- Allow guards to use any configured method
- Useful for backup verification

7. Click **Save Checkpoint**

#### Managing Checkpoints

| Action | Description |
|--------|-------------|
| **Edit** | Modify checkpoint details or location |
| **Deactivate** | Temporarily disable without deleting |
| **Delete** | Permanently remove (requires confirmation) |
| **Reorder** | Change sequence for sequential patrols |

### Site Zones

For larger sites, create zones to organize checkpoints:

1. Navigate to **Sites** > **All Sites**
2. Click on a site
3. Go to **Zones** tab
4. Click **+ Add Zone**
5. Define zone boundary and assign checkpoints

---

## Patrol Templates

Patrol templates define scheduled routes that guards follow.

### Creating a Patrol Template

1. Navigate to **Patrols** > **Templates**
2. Click **+ Create Template**
3. Fill in template details:

| Field | Description |
|-------|-------------|
| Template Name | Descriptive name for the patrol |
| Site | Select site from dropdown |
| Estimated Duration | Expected time to complete (minutes) |
| Is Sequential | Whether checkpoints must be visited in order |
| Requires Photo Evidence | Guards must upload photos at checkpoints |

4. **Add Checkpoints to Route:**
   - Select checkpoints from available list
   - Set checkpoint time limits (optional)
   - Mark mandatory vs optional checkpoints
   - Rearrange using drag-and-drop

5. **Configure Schedule:**
   - Set frequency: Once, Daily, Weekly, Custom
   - Specify start time window
   - Set grace period for late starts

6. Click **Save Template**

### Template Status

| Status | Description |
|--------|-------------|
| **Draft** | Not yet ready for scheduling |
| **Active** | Available for assignment |
| **Archived** | No longer in use, preserved for history |

### Assigning Patrols to Guards

1. Navigate to **Patrols** > **Schedule**
2. Click **+ Assign Patrol**
3. Select template and guard
4. Set date and time
5. Click **Assign**

> **Tip:** Use **Bulk Assign** to schedule multiple guards at once.

### Monitoring Patrol Runs

Navigate to **Patrols** > **Active Runs** to see:

| Information | Description |
|-------------|-------------|
| Guard Name | Assigned guard |
| Progress | Checkpoints completed / total |
| Current Position | Last known GPS location |
| Status | In Progress, Paused, Completed, etc. |
| Started At | Time patrol began |
| Estimated Completion | Expected finish time |

### Patrol Actions

| Action | Description |
|--------|-------------|
| **View Details** | Full patrol run information with checkpoint log |
| **Send Message** | Send notification to guard's device |
| **Pause Patrol** | Temporarily suspend patrol |
| **Abort Patrol** | Cancel patrol (requires reason) |
| **Extend Time** | Add more time to patrol duration |

---

## Incident Management

Handle security incidents reported by guards or supervisors.

### Incident Workflow

```
NEW → INVESTIGATING → RESOLVED → CLOSED
```

### Viewing Incidents

1. Navigate to **Incidents** > **All Incidents**
2. Filter by status, priority, site, or date range
3. Click on incident to view details

### Incident Details View

| Section | Description |
|---------|-------------|
| **Basic Info** | Title, type, priority, status, timestamp |
| **Location** | GPS coordinates with map view |
| **Reporter** | Guard who created the incident |
| **Assignment** | Currently assigned user |
| **Description** | Detailed incident description |
| **Evidence** | Photos, videos, audio attachments |
| **Comments** | Communication thread |
| **Activity Log** | All status changes and actions |

### Incident Types

| Type | Description |
|------|-------------|
| **Security** | Suspicious activity, unauthorized access |
| **Safety** | Hazards, injuries, medical emergencies |
| **Maintenance** | Equipment issues, facility problems |
| **Medical** | Health-related incidents |
| **Other** | General incidents |

### Priority Levels

| Priority | Response Time | Description |
|----------|---------------|-------------|
| **Low** | Within 24 hours | Minor issues |
| **Medium** | Within 4 hours | Moderate concern |
| **High** | Within 1 hour | Significant issue |
| **Critical** | Immediate | Life-threatening or severe |

### Managing Incidents

#### Assigning an Incident

1. Open the incident
2. Click **Assign**
3. Select a supervisor or manager
4. Optionally add assignment notes
5. Click **Save**

#### Changing Incident Status

| Status | When to Use |
|--------|-------------|
| **New** | Initial state when incident is created |
| **Investigating** | Someone is actively looking into it |
| **Resolved** | Issue has been addressed |
| **Closed** | Incident is complete and documented |

1. Open the incident
2. Click **Change Status**
3. Select new status
4. Add resolution notes (required for Resolved/Closed)
5. Click **Update Status**

#### Adding Comments

1. Scroll to **Comments** section
2. Type your message
3. Click **Post Comment**
4. Assigned users will receive notification

#### Uploading Additional Evidence

1. Scroll to **Evidence** section
2. Click **+ Upload Evidence**
3. Select file (image, video, or audio)
4. Add caption/description
5. Click **Upload**

### Bulk Incident Actions

Navigate to **Incidents** > **Bulk Actions** to:

- Export incidents to CSV/Excel
- Change status for multiple incidents
- Reassign multiple incidents
- Delete resolved incidents (older than 30 days)

---

## Real-time Tracking

Monitor guard positions and activities in real-time.

### Live Command Center

Navigate to **Tracking** > **Live Map** for the command center view.

#### Map Features

| Feature | Description |
|---------|-------------|
| **Guard Markers** | Real-time positions with names |
| **Patrol Routes** | Highlighted paths for active patrols |
| **Geofence Boundaries** | Site perimeters |
| **Checkpoint Locations** | All checkpoint positions |
| **SOS Indicators** | Pulsing red markers for emergencies |

#### Guard List Panel

The left panel shows all active guards:

| Column | Description |
|--------|-------------|
| **Name** | Guard's name |
| **Status** | On Patrol, On Break, Idle, Offline |
| **Site** | Current assigned site |
| **Last Checkpoint** | Most recent verification |
| **Battery** | Device battery level |

#### Filter Options

- **By Site:** Show guards at specific location
- **By Status:** Show only active, on break, etc.
- **By Role:** Show guards, supervisors only
- **Search:** Find guard by name

### Guard Detail View

Click on any guard to see:

1. **Current Status** - On patrol, break, idle
2. **Active Patrol** - Template name, progress percentage
3. **Last Checkpoint** - Location and time verified
4. **GPS Coordinates** - Latitude, longitude, accuracy
5. **Device Status** - Battery level, signal strength
6. **Shift Information** - Clock in time, scheduled end

### SOS Alert Management

When a guard triggers SOS:

1. **Immediate Notification:**
   - Red pulsing marker appears on map
   - Alert notification sent to all supervisors/managers
   - Alert sound plays (if enabled)

2. **Responding to SOS:**
   - Click on the SOS marker
   - View guard details and last known location
   - Click **Respond to SOS**
   - System notifies all nearby guards
   - Use PTT to communicate with affected guard

3. **Resolving SOS:**
   - Once situation is resolved, click **Resolve SOS**
   - Add incident notes
   - Optionally create formal incident report

### Push-to-Talk (PTT)

Communicate with guards using voice:

1. Click the **PTT** button on a guard's detail view
2. Select channel: Global, Site, or Emergency
3. Press and hold microphone button to speak
4. Release to listen for response

> **Note:** PTT is half-duplex - only one person can speak at a time.

---

## Reports & Analytics

Generate and view reports on patrol operations, incidents, and guard performance.

### Available Reports

| Report Type | Description |
|-------------|-------------|
| **Patrol Summary** | Completed vs missed patrols |
| **Incident Report** | Incidents by type, status, location |
| **Guard Performance** | Individual guard statistics |
| **Site Performance** | Site-specific metrics |
| **Checkpoint Analysis** | Most/least verified checkpoints |
| **Shift Report** | Shift attendance and duration |
| **Compliance Report** | Adherence to schedules |

### Generating Reports

1. Navigate to **Reports** > **Generate Report**
2. Select report type
3. Set date range (Today, Yesterday, Last 7 Days, Custom)
4. Apply filters:
   - Site(s)
   - Guard(s)
   - Patrol template(s)
   - Incident type(s)
5. Click **Generate**

### Report Formats

| Format | Best For | Features |
|--------|----------|----------|
| **Web View** | Quick viewing | Interactive charts, drill-down |
| **PDF** | Printing/sharing | Formatted, paginated |
| **CSV** | Data analysis | Spreadsheet compatible |
| **Excel** | Advanced analysis | Includes charts and formulas |

### Dashboard Analytics

Navigate to **Reports** > **Analytics** for visual insights:

#### Key Metrics

| Metric | Description |
|--------|-------------|
| **Patrol Completion Rate** | Percentage of scheduled patrols completed |
| **Average Patrol Duration** | Mean time to complete patrols |
| **Incident Response Time** | Average time from report to investigation |
| **Geofence Compliance** | Percentage of time guards within boundaries |
| **Checkpoint Verification Rate** | Percentage of checkpoints verified |

#### Charts and Graphs

- **Patrol Trends:** Line chart showing patrol completion over time
- **Incident Distribution:** Pie chart by incident type
- **Guard Performance:** Bar chart comparing guards
- **Site Comparison:** Multi-site metrics side-by-side
- **Hourly Activity:** Heat map of guard activity by hour

### Scheduling Automated Reports

1. Navigate to **Reports** > **Scheduled Reports**
2. Click **+ New Schedule**
3. Configure:

| Setting | Options |
|---------|---------|
| Report Name | Custom identifier |
| Report Type | Select from available reports |
| Frequency | Daily, Weekly, Monthly |
| Recipients | Email addresses |
| Format | PDF, Excel, CSV |
| Filters | Site, guards, date range |

4. Click **Save Schedule**

---

## Settings & Configuration

Configure system-wide settings and preferences.

### Navigation

Navigate to **Settings** to access configuration options.

### System Settings

| Setting | Description |
|---------|-------------|
| **Company Name** | Display name for your organization |
| **Timezone** | Default timezone for the system |
| **Date Format** | Preferred date display format |
| **Default Language** | System language (future feature) |

### Security Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Session Timeout | Auto-logout after inactivity | 24 hours |
| Password Expiry | Force password change | 90 days |
| Failed Login Lockout | Lock account after failed attempts | 5 attempts |
| Minimum Password Length | Required characters | 8 |
| Two-Factor Authentication | Require 2FA for admins | Optional |

### GPS & Geofence Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Max GPS Accuracy | Reject GPS above this accuracy | 20 meters |
| GPS Update Interval | How often guards send location | 5 seconds |
| Geofence Buffer | Grace zone around boundaries | 5 meters |
| Geofence Breach Alert | Time outside before alert | 5 minutes |
| Checkpoint Radius | GPS verification distance | 30 meters |

### Notification Settings

Configure how and when notifications are sent:

| Notification Type | Email | SMS | Push | In-App |
|-------------------|-------|-----|-------|--------|
| New Incident | ✓ | ✓ | ✓ | ✓ |
| SOS Alert | ✓ | ✓ | ✓ | ✓ |
| Patrol Missed | ✓ | ✓ | ✓ | |
| Patrol Completed | | | ✓ | |
| Geofence Breach | ✓ | ✓ | ✓ | ✓ |
| Assignment Changed | ✓ | | ✓ | ✓ |

### Mobile App Settings

Settings that affect the guard mobile app:

| Setting | Description | Default |
|---------|-------------|---------|
| Require Photo Evidence | Force photo at checkpoints | No |
| Allow GPS Checkpoint Only | Disable NFC/QR requirement | No |
| Offline Mode Enabled | Allow operation without internet | Yes |
| Background Location | Require continuous GPS during shift | Yes |
| Battery Saver Mode | Reduce GPS frequency at low battery | Yes |

### Integration Settings

Configure third-party integrations:

| Integration | Description |
|-------------|-------------|
| **Email Provider** | SMTP settings for notifications |
| **SMS Gateway** | Text message service |
| **Push Notifications** | Firebase Cloud Messaging |
| **Maps Provider** | Google Maps / Mapbox |
| **Storage Provider** | AWS S3 / Azure Blob for media |

### Audit Log

Navigate to **Settings** > **Audit Log** to view all system changes:

| Timestamp | User | Action | Details |
|-----------|------|--------|---------|
| 2024-02-25 10:30 | admin@company.com | User Created | Created guard: John Smith |
| 2024-02-25 10:25 | manager@company.com | Site Updated | Modified geofence for HQ |
| 2024-02-25 10:15 | supervisor@company.com | Incident Resolved | Resolved incident #1234 |

Export audit log for compliance and record-keeping.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + K` | Quick search |
| `Ctrl + D` | Go to Dashboard |
| `Ctrl + U` | Go to Users |
| `Ctrl + P` | Go to Patrols |
| `Ctrl + I` | Go to Incidents |
| `Ctrl + T` | Go to Tracking |
| `Ctrl + R` | Go to Reports |
| `ESC` | Close modal/sidebar |

---

## Help & Support

### Getting Help

- **In-App Help:** Click the **?** icon in the top-right corner
- **Documentation:** Access full documentation at `[docs URL]`
- **Support Email:** Contact support@patrolmanager.com
- **Phone:** Call [support phone number] for urgent issues

### Reporting Issues

To report a bug or request a feature:

1. Navigate to **Settings** > **Feedback**
2. Select issue type: Bug, Feature Request, General Inquiry
3. Describe the issue in detail
4. Attach screenshots if applicable
5. Click **Submit**

---

## Best Practices

### For Admins

1. **Regular Security Reviews**
   - Review user access monthly
   - Remove inactive accounts
   - Audit permission changes

2. **Site Maintenance**
   - Verify checkpoint locations quarterly
   - Update geofence boundaries as needed
   - Review and archive old templates

3. **Training**
   - Train new supervisors on incident management
   - Conduct regular refresher training
   - Share incident reports for learning

### For Managers

1. **Patrol Optimization**
   - Review completion rates weekly
   - Adjust schedules based on patterns
   - Identify frequently missed checkpoints

2. **Resource Allocation**
   - Monitor guard-to-site ratios
   - Adjust assignments based on incident volume
   - Plan for peak times and events

3. **Performance Monitoring**
   - Review individual guard metrics
   - Recognize high performers
   - Address performance issues early

### For Supervisors

1. **Active Monitoring**
   - Check live map regularly during shifts
   - Respond promptly to SOS alerts
   - Verify patrol progress

2. **Incident Management**
   - Investigate new incidents quickly
   - Document all actions thoroughly
   - Communicate status changes

3. **Guard Support**
   - Use PTT for quick communication
   - Provide guidance during patrols
   - Report equipment issues

---

## Appendix

### Common Terms

| Term | Definition |
|------|------------|
| **Geofence** | Virtual boundary defined by GPS coordinates |
| **Checkpoint** | Location where guards verify presence |
| **Patrol Template** | Pre-defined route with checkpoints |
| **Patrol Run** | Execution of a patrol template |
| **SOS** | Emergency panic button on mobile app |
| **PTT** | Push-to-Talk voice communication |
| **NFC** | Near Field Communication (tap verification) |
| **QR Code** | Quick Response code (scan verification) |

### Status Reference

| Entity | Status Values |
|--------|---------------|
| User | Active, Inactive, Suspended, Pending |
| Site | Active, Inactive |
| Patrol Template | Draft, Active, Archived |
| Patrol Run | Scheduled, In Progress, Paused, Completed, Abandoned, Failed, Skipped |
| Incident | New, Investigating, Resolved, Closed |
| User Session | Active, Expired, Revoked |

### Permissions Matrix

See the full permissions matrix in **Settings** > **Permissions** for detailed role capabilities.
