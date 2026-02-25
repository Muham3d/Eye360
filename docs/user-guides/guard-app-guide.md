# PatrolManager Guard Mobile App User Guide

## Table of Contents

1. [Getting Started](#getting-started)
2. [Clock In/Out](#clock-inout)
3. [Starting Patrols](#starting-patrols)
4. [Checkpoint Verification](#checkpoint-verification)
5. [Reporting Incidents](#reporting-incidents)
6. [SOS Emergency Button](#sos-emergency-button)
7. [Push-to-Talk](#push-to-talk)
8. [Offline Mode](#offline-mode)
9. [App Settings](#app-settings)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Android Version | 8.0 (Oreo) | 11.0 or higher |
| RAM | 2 GB | 4 GB or higher |
| Storage | 500 MB free | 1 GB free |
| GPS | GPS/GNSS capable | High-accuracy GNSS |
| Camera | 5 MP rear camera | 8 MP or higher |
| NFC | Optional | Required for NFC checkpoints |
| Internet | WiFi or Cellular | LTE/5G preferred |

### Installation

1. **Download the App:**
   - Google Play Store: Search "PatrolManager Guard"
   - Or use the provided APK file from your supervisor

2. **Install:**
   - Tap "Install"
   - Grant required permissions when prompted:
     - **Location:** Required for GPS tracking and checkpoint verification
     - **Camera:** Required for QR code scanning and incident photos
     - **Storage:** Required for saving offline data
     - **Microphone:** Required for Push-to-Talk
     - **Notifications:** Required for alerts and messages

3. **Launch the App:**
   - Tap the PatrolManager icon on your home screen

### First-Time Login

1. When you first open the app, you'll see the **Login** screen
2. Enter your **email address** and **password** (provided by your supervisor)
3. Tap **Sign In**

> **Note:** You must be connected to the internet for your first login.

### Changing Your Password

For security, you should change your temporary password:

1. After logging in, you may be prompted to change your password
2. Enter your **current password**
3. Enter and confirm your **new password**
4. Tap **Change Password**

### Creating a PIN (Optional)

For quick access, set up a 4-digit PIN:

1. Tap the **menu icon** (three lines) in the top-left
2. Go to **Settings** > **Security**
3. Tap **Set Up PIN**
4. Enter a 4-digit PIN
5. Confirm your PIN

> **Tip:** Use PIN instead of password for daily logins. You'll still need your password for sensitive actions like changing your PIN.

### App Overview

The main screen displays:

```
┌─────────────────────────────────────┐
│  ☰  PatrolManager        [Your Name]│
├─────────────────────────────────────┤
│                                     │
│         TODAY'S STATUS              │
│         ─────────────               │
│         Shift: OFF DUTY             │
│         Next Patrol: 2:00 PM        │
│                                     │
│  ┌─────────────┐  ┌─────────────┐  │
│  │  CLOCK IN   │  │   MY SITE   │  │
│  │             │  │             │  │
│  └─────────────┘  └─────────────┘  │
│                                     │
│  ┌─────────────┐  ┌─────────────┐  │
│  │   PATROLS   │  │  INCIDENTS  │  │
│  │             │  │             │  │
│  └─────────────┘  └─────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

### Navigation Menu

Tap the menu icon (three lines) to access:

| Option | Description |
|--------|-------------|
| **Dashboard** | Main screen with today's overview |
| **Patrols** | View and start assigned patrols |
| **Incidents** | View and report incidents |
| **History** | Past patrols and incidents |
| **Profile** | Your personal information |
| **Settings** | App configuration |
| **Help** | In-app help and support |
| **Logout** | Sign out of the app |

---

## Clock In/Out

### Clocking In

You must clock in before starting any patrol or being visible on tracking.

1. From the **Dashboard**, tap **Clock In**
2. The app will verify your location:

   - **GPS Verification:** Ensure you're within your assigned site's geofence
   - **Wait for confirmation:** "Location verified - Clock in successful"

3. If verification succeeds, your status changes to **ON DUTY**

#### What Happens When You Clock In

| Action | Description |
|--------|-------------|
| Status Change | Your status shows as "On Duty" to supervisors |
| GPS Tracking | Your location begins updating (every 5 seconds) |
| Patrol Availability | Assigned patrols become available |
| Notifications | You'll receive patrol and incident notifications |

#### Clock In Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Outside geofence" | You're not at your assigned site | Move to the correct site location |
| "GPS signal weak" | Poor GPS accuracy | Wait outside, away from buildings |
| "Site not assigned" | No site assigned to you | Contact your supervisor |

### Clocking Out

When your shift is complete:

1. From the **Dashboard**, tap **Clock Out**
2. Confirm by tapping **Yes, Clock Out**
3. Your status changes to **OFF DUTY**

#### What Happens When You Clock Out

| Action | Description |
|--------|-------------|
| Status Change | Your status shows as "Off Duty" |
| GPS Tracking | Location updates stop |
| Active Patrols | You'll be prompted to complete or pause any active patrol |
| Shift Recording | Your shift time is recorded for reports |

> **Important:** Always clock out properly. Failure to do so may affect your attendance records.

### Break Mode

To take a break without clocking out:

1. Tap the **menu icon** > **Go on Break**
2. Select break duration (15, 30, or 60 minutes)
3. Tap **Start Break**

Your status changes to **ON BREAK**. GPS tracking continues, but you won't be assigned new patrols.

To return from break:
- Tap **End Break** from the notification or Dashboard

---

## Starting Patrols

### Viewing Assigned Patrols

1. From the **Dashboard**, tap **Patrols**
2. You'll see:
   - **Upcoming Patrols:** Scheduled for today/future
   - **Active Patrols:** Currently in progress
   - **Completed Patrols:** Finished today

### Patrol List Information

| Information | Description |
|-------------|-------------|
| Template Name | Name of the patrol route |
| Scheduled Time | When the patrol should start |
| Checkpoints | Number of checkpoints to verify |
| Estimated Time | How long the patrol takes |
| Status | Scheduled, In Progress, Paused, Completed |

### Starting a Patrol

1. From **Patrols**, tap on an **upcoming patrol**
2. Review the patrol details:
   - Patrol name
   - Number of checkpoints
   - Required verification methods (NFC, QR, GPS)
   - Special notes

3. Tap **Start Patrol**

4. **Location Check:**
   - The app verifies you're at the correct site
   - If successful, the patrol begins
   - If not, you'll see an error message

5. **Patrol Active Screen:**
   - Shows current checkpoint
   - Progress bar (e.g., "3 of 10 checkpoints")
   - Map with your position and route

### Patrol States

| State | Description |
|-------|-------------|
| **Scheduled** | Patrol is assigned but not started |
| **In Progress** | You are actively patrolling |
| **Paused** | Patrol is temporarily stopped |
| **Completed** | All mandatory checkpoints verified |
| **Abandoned** | Patrol was cancelled before completion |

### Pausing a Patrol

To temporarily stop a patrol:

1. Tap the **pause icon** from the active patrol screen
2. Select a reason:
   - Rest break
   - Responding to incident
   - Equipment issue
   - Other
3. Tap **Confirm Pause**

The patrol is saved, and you can resume later by tapping **Resume Patrol**.

### Resuming a Paused Patrol

1. From **Patrols**, tap on the paused patrol
2. Tap **Resume Patrol**
3. Verify your location (if required)
4. Continue from where you left off

### Completing a Patrol

A patrol is complete when:

- All **mandatory checkpoints** have been verified
- Or your supervisor ends the patrol

**Automatic Completion:**
- Once all mandatory checkpoints are done, tap **Finish Patrol**
- Confirm by tapping **Yes, Complete**
- Your completion time is recorded

**Manual Completion (Supervisor):**
- Your supervisor may complete the patrol remotely
- You'll receive a notification when this happens

### What If You Can't Complete a Patrol?

If you're unable to finish:

1. Try to verify as many checkpoints as possible
2. Tap **Menu** > **Report Issue** from the patrol screen
3. Explain why you couldn't complete
4. Submit the report
5. Your supervisor will be notified

> **Note:** Frequent incomplete patrols may affect your performance metrics.

---

## Checkpoint Verification

During a patrol, you must verify checkpoints to show you visited each location.

### Checkpoint Types

| Type | How to Verify | When Used |
|------|---------------|-----------|
| **NFC** | Tap phone against NFC tag | Indoor checkpoints, high-security areas |
| **QR Code** | Scan QR code with camera | Areas without NFC, outdoor checkpoints |
| **GPS** | Be within range of checkpoint | Large outdoor areas, perimeters |
| **Multiple** | Use any of above methods | Backup verification options |

### Verifying a Checkpoint

#### NFC Checkpoint

1. Navigate to the checkpoint location
2. From the patrol screen, tap the current checkpoint
3. Tap **Verify with NFC**
4. Hold your phone **close to the NFC tag** (within 4cm)
5. Wait for the confirmation vibration and sound
6. The checkpoint is marked as verified

> **Tip:** Keep your phone screen awake and the app open for best NFC detection.

#### QR Code Checkpoint

1. Navigate to the checkpoint location
2. Find the QR code poster/sign at the location
3. From the patrol screen, tap the current checkpoint
4. Tap **Verify with QR Code**
5. Point your camera at the QR code
6. Wait for automatic detection (line up QR code in frame)
7. The checkpoint is verified when the code is scanned

#### GPS Checkpoint

1. Navigate to the checkpoint location
2. Get within the verification radius (usually 30 meters)
3. From the patrol screen, tap the current checkpoint
4. Tap **Verify with GPS**
5. The app checks your current location
6. If you're within range, the checkpoint is verified

> **Note:** GPS verification depends on your phone's accuracy. If verification fails, try moving to an open area away from buildings.

### Checkpoint Requirements

Some checkpoints may require additional actions:

| Requirement | Description |
|-------------|-------------|
| **Photo Required** | You must take a photo at the checkpoint |
| **Notes Required** | You must enter text notes |
| **Time Limit** | Checkpoint must be verified within X minutes |
| **Sequential Only** | Must be completed in order (can't skip ahead) |

### Taking Required Photos

If a checkpoint requires a photo:

1. After verifying the checkpoint, tap **Take Photo**
2. Your camera opens
3. Take a clear photo of the area
4. Tap **Use Photo** or retake if needed
5. Tap **Submit** to upload

### Adding Checkpoint Notes

1. After verifying, tap **Add Notes**
2. Type your observations
3. Tap **Submit**

### Checkpoint Status Indicators

| Icon | Status |
|------|--------|
| ✓ | Verified |
| ○ | Not yet started |
| ◐ | In progress (attempting to verify) |
| ✗ | Verification failed (try again) |
| ⚠ | Optional checkpoint |
| ! | Mandatory checkpoint |

### Skipping Optional Checkpoints

If a checkpoint is not mandatory:

1. Tap the checkpoint
2. Tap **Skip Checkpoint**
3. Confirm by tapping **Yes, Skip**

> **Warning:** Mandatory checkpoints cannot be skipped. You must verify all mandatory checkpoints to complete the patrol.

### Checkpoint Verification Issues

| Issue | Solution |
|-------|----------|
| "NFC not detected" | Ensure NFC is enabled in phone settings; hold phone closer to tag; try different angle |
| "QR code not scanning" | Ensure good lighting; steady your phone; clean camera lens; try closer/further distance |
| "GPS accuracy too low" | Wait for better GPS signal; move to open area; stay away from tall buildings |
| "Outside verification radius" | Move closer to the checkpoint location; check the map for exact position |

---

## Reporting Incidents

Report any security, safety, or maintenance issues you observe.

### When to Report an Incident

Report incidents when you observe:

- Suspicious activity or people
- Safety hazards (spills, obstacles, broken equipment)
- Unauthorized access
- Medical emergencies
- Fire or smoke
- Maintenance issues
- Any other concern

### Creating an Incident Report

1. Tap the **+** button or **Report Incident** from the menu
2. Fill in the incident details:

#### Basic Information

| Field | Description |
|-------|-------------|
| **Title** | Short summary (e.g., "Broken window, Building A") |
| **Type** | Security, Safety, Maintenance, Medical, Other |
| **Priority** | Low, Medium, High, Critical |
| **Description** | Detailed description of what happened |
| **Location** | GPS is auto-filled; can be adjusted manually |

3. **Add Evidence (Required for most types):**
   - Tap **Add Photo** to take pictures
   - Tap **Add Video** to record a video
   - Take multiple photos if needed
   - Add captions to each photo for clarity

4. **Review and Submit:**
   - Review all information
   - Tap **Submit Report**

### Incident Types Explained

| Type | Examples | Priority |
|------|----------|----------|
| **Security** | Suspicious person, trespassing, theft attempt | High |
| **Safety** | Wet floor, broken glass, tripping hazard | Medium |
| **Maintenance** | Light out, elevator not working, leak | Low |
| **Medical** | Injury, illness, medical emergency | Critical |
| **Other** | Noise complaint, lost and found | Varies |

### Setting Priority

| Priority | When to Use |
|----------|-------------|
| **Low** | Minor issues with no immediate risk |
| **Medium** | Issues that need attention but not urgent |
| **High** | Urgent situations requiring prompt response |
| **Critical** | Life-threatening or severe situations |

> **Tip:** If unsure, choose a higher priority. It's better to over-report than under-report.

### Adding Photos/Video

1. Tap **Add Evidence**
2. Choose **Photo** or **Video**
3. For photos:
   - Tap the shutter button to take a photo
   - Review and retake if needed
   - Tap **Add** to include
   - Add optional caption
4. For videos:
   - Tap record to start
   - Tap stop when done
   - Review and retake if needed
   - Tap **Add** to include

### After Submitting

Once submitted:

- Your supervisor is notified immediately
- The incident appears in your incident history
- You may receive follow-up notifications

### Viewing Your Incidents

1. Tap **Incidents** from the menu
2. You'll see:
   - **Open Incidents:** Awaiting resolution
   - **In Progress:** Being investigated
   - **Resolved:** Completed and closed
3. Tap any incident to view details and updates

### Responding to Incident Updates

If a supervisor comments on your incident:

1. You'll receive a notification
2. Tap the notification to view
3. Read the supervisor's message
4. Optionally reply with additional information

### Updating an Incident

To add more information to an incident you reported:

1. Open the incident from **Incidents**
2. Tap **Add Comment**
3. Type your update
4. Optionally add more photos
5. Tap **Submit**

---

## SOS Emergency Button

The SOS button is for **emergency situations only**. Use it when you need immediate assistance.

### When to Use SOS

Use the SOS button for:

- **Medical emergencies** - Heart attack, injury, unconscious person
- **Violent situations** - Assault, fight, weapon present
- **Fire** - Active fire or smoke
- **Immediate danger** - Any threat to personal safety
- **Pursuit in progress** - Chasing a suspect

> **Important:** Only use SOS for true emergencies. Misuse may result in disciplinary action.

### Activating SOS

1. From any screen, tap the red **SOS button** (top-right corner)
2. You'll see a confirmation screen
3. Tap and hold **ACTIVATE SOS** for 3 seconds
4. SOS is activated

### What Happens When You Activate SOS

| Action | Description |
|--------|-------------|
| **Immediate Alert** | All supervisors receive emergency notification |
| **Location Broadcast** | Your current GPS location is sent |
| **Map Update** | Your location appears as red emergency marker on admin map |
| **Audio Alert** | Supervisors hear emergency alert sound |
| **Guard Notification** | Nearby guards receive "Assist nearby guard" alert |

### During Active SOS

While SOS is active:

1. **Stay on the line:** The app maintains connection
2. **Your location updates continuously** (every 2 seconds)
3. **You can use PTT** to communicate with supervisors
4. **Do NOT deactivate** until the situation is resolved

### Canceling SOS

Only cancel SOS when the emergency is resolved:

1. Tap the active SOS banner
2. Tap **Deactivate SOS**
3. Select a resolution reason:
   - **False alarm** (accidentally triggered)
   - **Situation resolved**
   - **Assistance arrived**
4. Tap **Confirm Deactivation**

> **Warning:** You may be asked to explain why SOS was activated. Always be prepared to provide details.

### SOS Best Practices

| Do | Don't |
|----|-------|
| Use only for real emergencies | Use for non-urgent issues |
| Stay calm and provide clear information | Deactivate before help arrives |
| Keep the app open and phone charged | Ignore supervisor communications |
| Follow supervisor instructions | Leave the area until told to do so |

### False Alarms

If you accidentally trigger SOS:

1. Immediately deactivate (within 10 seconds if possible)
2. Select "False alarm" as the reason
3. Your supervisor will still be notified but will know it was accidental

> **Note:** Repeated false alarms may be subject to review.

---

## Push-to-Talk (PTT)

Push-to-Talk allows voice communication with supervisors and other guards.

### Accessing PTT

1. From the active patrol screen, tap the **microphone icon**
2. Or tap **PTT** from the menu

### PTT Channels

| Channel | Who Can Hear | When to Use |
|---------|--------------|-------------|
| **Global** | All guards and supervisors | General announcements |
| **Site** | Guards at your site | Site-specific communication |
| **Emergency** | On-duty supervisors and nearby guards | During active SOS |

### Using PTT

1. Select the desired channel
2. **Press and hold** the microphone button
3. Speak clearly into your phone
4. **Release** the button to listen

> **Remember:** PTT is half-duplex - only one person can speak at a time. Wait for the channel to be clear before speaking.

### PTT Indicators

| Indicator | Meaning |
|-----------|---------|
| Green light | Channel is clear, you can speak |
| Red light | Someone else is speaking |
| Yellow light | Requesting permission to speak |
| Audio icon | Audio is playing, listen |

### PTT Best Practices

| Best Practice | Description |
|---------------|-------------|
| **Be brief** | Keep messages short and to the point |
| **Be clear** | Speak slowly and clearly |
| **Identify yourself** | State your name and location |
| **Wait for clear channel** | Don't interrupt ongoing communication |
| **Test before shift** | Verify PTT works before starting patrol |

### PTT Issues

| Issue | Solution |
|-------|----------|
| Can't hear others | Check phone volume; ensure app has permission |
| Others can't hear you | Check microphone permission; speak closer to mic |
| Channel always busy | Someone may be holding button; wait or try different channel |
| No connection | Check internet connection; PTT requires online mode |

---

## Offline Mode

The app works offline when you don't have internet connectivity.

### How Offline Mode Works

| Feature | Online | Offline |
|---------|--------|---------|
| Clock In/Out | ✓ | ✓ (syncs when online) |
| Start Patrol | ✓ | ✓ |
| Checkpoint Verification | ✓ | ✓ (queued for sync) |
| Report Incident | ✓ | ✓ (queued for sync) |
| SOS Alert | ✓ | Limited (requires SMS) |
| PTT | ✓ | ✗ |
| Live Tracking | ✓ | ✗ |

### Offline Indicators

| Indicator | Meaning |
|-----------|---------|
| Green icon | Online - all features available |
| Yellow icon | Limited connectivity - some features may be slow |
| Red icon | Offline - working in offline mode |
| Sync icon | Syncing queued data |

### What Gets Queued Offline

When offline, the following actions are saved and queued for sync:

- Clock in/out times
- Checkpoint verifications
- Incident reports (including photos)
- Patrol completions
- Comments and notes

### Automatic Sync

When you regain connectivity:

1. The app automatically detects internet connection
2. Queued items sync automatically in the background
3. You'll see a **"Syncing..."** notification
4. Once complete, you'll see **"Sync complete"**

> **Note:** Photos may take longer to sync depending on file size and connection speed.

### Manual Sync

To manually trigger sync:

1. Tap the **sync icon** from the Dashboard
2. The app attempts to sync all queued items
3. View sync progress and any errors

### Sync Queue

To view what's waiting to sync:

1. Tap **Settings** > **Sync Queue**
2. You'll see:
   - Number of items waiting to sync
   - Time each item was created
   - Sync status for each item

### Offline Considerations

| Consideration | Details |
|---------------|---------|
| **Storage Space** | Offline data uses phone storage; keep space available |
| **Battery** | Offline sync may use more battery when reconnecting |
| **Time Limits** | Sync queued items within 24 hours for best results |
| **Verification** | Some verifications may be re-checked when syncing |

---

## App Settings

### Accessing Settings

1. Tap the **menu icon** (three lines)
2. Tap **Settings**

### Available Settings

#### Account Settings

| Setting | Description |
|---------|-------------|
| **Profile** | View and edit your personal information |
| **Change Password** | Update your password |
| **Set PIN** | Configure quick-access PIN |
| **Notifications** | Configure notification preferences |

#### Notification Preferences

Choose what notifications you receive:

| Notification Type | Options |
|-------------------|---------|
| Patrol Reminders | On / Off |
| Incident Updates | On / Off |
| SOS Alerts | On / Off (cannot be disabled) |
| PTT Calls | On / Off |
| Sync Complete | On / Off |

#### App Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Dark Mode** | Use dark theme | Off |
| **GPS Accuracy Warning** | Warn when GPS accuracy is low | On |
| **Vibration** | Vibrate for notifications | On |
| **Sound Effects** | Play sounds for actions | On |
| **Auto-Start PTT** | Auto-start PTT during SOS | On |

#### Map Settings

| Setting | Description | Default |
|---------|-------------|---------|
| **Map Type** | Standard, Satellite, Hybrid | Standard |
| **Show Route** | Display patrol route on map | On |
| **Center on Location** | Auto-center map on your position | On |

#### Data & Storage

| Setting | Description |
|---------|-------------|
| **Clear Cache** | Free up storage by clearing cached data |
| **Offline Data** | View/manage offline data storage |
| **Data Usage** | View cellular data used by app |
| **WiFi Only** | Limit large transfers to WiFi only |

#### About

| Information | Description |
|-------------|-------------|
| **App Version** | Current installed version |
| **Build Number** | Specific build identifier |
| **Terms of Service** | Legal terms |
| **Privacy Policy** | Privacy information |
| **Licenses** | Third-party software licenses |

### Clearing Cache

If the app is running slowly or using too much storage:

1. Tap **Settings** > **Data & Storage**
2. Tap **Clear Cache**
3. Confirm by tapping **Clear**

> **Warning:** Clearing cache will remove offline maps. They will be re-downloaded when needed.

### Checking for Updates

1. Tap **Settings** > **About**
2. Tap **Check for Updates**
3. If an update is available, you'll be directed to the Play Store

---

## Troubleshooting

### Common Issues and Solutions

#### App Won't Open

| Possible Cause | Solution |
|----------------|----------|
| App crashed | Clear app data and restart |
| Outdated version | Update to latest version |
| Phone storage full | Free up space on your phone |
| Corrupted install | Reinstall the app |

#### Can't Log In

| Issue | Solution |
|-------|----------|
| Wrong password | Use "Forgot Password" link |
| Account locked | Contact supervisor to unlock |
| No internet | Check WiFi/cellular connection |
| Server down | Wait and try again later |

#### GPS Not Working

| Issue | Solution |
|-------|----------|
| GPS permission denied | Go to phone Settings > Apps > PatrolManager > Permissions > Enable Location |
| Location not updating | Enable "High Accuracy" mode in phone location settings |
| Poor accuracy | Move to open area away from buildings |
| GPS always shows 0 accuracy | Restart phone; check if other apps can get location |

#### NFC Not Working

| Issue | Solution |
|-------|----------|
| NFC not detected | Ensure NFC is enabled in phone settings |
| Phone too far from tag | Move phone closer (within 4cm) |
| NFC tag damaged | Report to supervisor for tag replacement |
| Phone doesn't support NFC | Use alternative verification method (QR/GPS) |

#### Camera Not Working

| Issue | Solution |
|-------|----------|
| Black screen | Check camera permission in app settings |
| Can't scan QR code | Clean camera lens; improve lighting |
| Photo saving failed | Check phone storage space |

#### Battery Draining Too Fast

| Cause | Solution |
|-------|----------|
| GPS tracking | Reduce GPS update frequency (supervisor setting) |
| Screen staying on | Set screen timeout shorter |
| Background apps | Close other apps running in background |
| Old battery | Consider phone battery replacement |

#### Sync Not Working

| Issue | Solution |
|-------|----------|
| Items stuck in queue | Check internet connection; manually sync |
| Sync errors | Note the error and contact supervisor |
| Photos not uploading | Check connection; try on WiFi |

#### Notifications Not Received

| Issue | Solution |
|-------|----------|
| Notifications disabled | Enable notifications in phone settings for PatrolManager |
| Do Not Disturb on | Turn off Do Not Disturb mode |
| Battery optimization | Exclude PatrolManager from battery optimization |

### Error Messages

| Error Message | Meaning | Solution |
|---------------|---------|----------|
| "Location not found" | GPS can't determine position | Move to open area; check GPS settings |
| "Outside geofence" | You're not at assigned site | Go to correct site location |
| "Checkpoint verification failed" | Verification didn't complete | Try verification method again |
| "Network error" | Can't connect to server | Check internet connection |
| "Sync queue full" | Too many items waiting to sync | Connect to WiFi and sync |
| "Camera permission required" | App needs camera access | Enable camera in phone settings |
| "Storage full" | No space to save data/photos | Free up phone storage |

### Getting Help

If you can't resolve an issue:

1. **In-App Help:**
   - Tap **Help** from the menu
   - Browse frequently asked questions
   - Search for your issue

2. **Contact Your Supervisor:**
   - For shift and patrol issues
   - For account and login problems
   - For equipment problems

3. **Technical Support:**
   - Email: support@patrolmanager.com
   - Include: Your name, issue description, error message, phone model

### Diagnostics

To help diagnose issues:

1. Tap **Settings** > **Diagnostics**
2. You can run:
   - **Connection Test** - Check server connectivity
   - **GPS Test** - Verify GPS is working
   - **NFC Test** - Test NFC functionality
   - **Camera Test** - Verify camera access
   - **Send Diagnostic Report** - Email diagnostic info to support

---

## Best Practices

### Before Your Shift

1. **Charge your phone** - Start with at least 80% battery
2. **Check connectivity** - Verify you have internet access
3. **Test GPS** - Open maps to confirm GPS is working
4. **Review patrols** - Check what patrols are scheduled
5. **Report issues** - Let your supervisor know if you have equipment problems

### During Your Shift

1. **Carry your phone** - Keep it with you at all times
2. **Stay on duty** - Don't clock out without completing your shift
3. **Verify checkpoints** - Complete all mandatory checkpoints
4. **Report promptly** - Report incidents as soon as they occur
5. **Stay aware** - Keep the app open to receive notifications

### Battery Management

| Tip | Benefit |
|-----|---------|
| Lower screen brightness | Extends battery life |
| Close unused apps | Reduces background drain |
| Use WiFi when available | Less power than cellular |
| Keep phone cool | Heat reduces battery efficiency |
| Carry a power bank | Backup for long shifts |

### Communication Tips

| Tip | Benefit |
|-----|---------|
| Use PTT for quick updates | Faster than typing |
| Be specific in reports | Helps supervisors respond appropriately |
| Include photos in incidents | Provides evidence and context |
| Check notifications regularly | Stay informed of updates |

---

## Quick Reference

### Common Tasks

| Task | Steps |
|------|-------|
| Clock In | Dashboard > Clock In > Wait for verification |
| Start Patrol | Patrols > Tap patrol > Start Patrol |
| Verify Checkpoint | Patrol screen > Tap checkpoint > Choose method > Verify |
| Report Incident | + button > Fill details > Add photo > Submit |
| Activate SOS | Tap SOS button > Hold for 3 seconds |
| Use PTT | Tap microphone > Hold button > Speak > Release |
| Clock Out | Dashboard > Clock Out > Confirm |

### Important Numbers

| Contact | When to Call |
|---------|--------------|
| Supervisor | Shift issues, patrol questions |
| Emergency Services (911) | Life-threatening emergency |
| IT Support | App or phone problems |

### Emergency Procedures

1. **Medical Emergency:**
   - Call 911 immediately
   - Activate SOS in app
   - Provide first aid if trained
   - Wait for help to arrive

2. **Fire:**
   - Activate fire alarm
   - Call 911
   - Activate SOS in app
   - Evacuate if safe to do so

3. **Violent Situation:**
   - Do NOT intervene directly
   - Activate SOS immediately
   - Move to safe location
   - Observe and report details

---

## Appendix

### Glossary

| Term | Definition |
|------|------------|
| **Geofence** | Virtual boundary around a site |
| **Checkpoint** | Location to verify during patrol |
| **NFC** | Near Field Communication (tap-to-verify) |
| **QR Code** | Quick Response code (scan-to-verify) |
| **GPS** | Global Positioning System |
| **PTT** | Push-to-Talk voice communication |
| **SOS** | Emergency alert |
| **Template** | Pre-defined patrol route |
| **Sync** | Synchronizing data with server |

### App Icons Reference

| Icon | Meaning |
|------|---------|
| ☰ | Menu |
| ✓ | Verified / Complete |
| ○ | Not started |
| ⚠ | Warning |
| ! | Alert / Important |
| SOS | Emergency button |
| 📷 | Camera / Photo |
| 🎤 | Microphone / PTT |
| 🔄 | Sync / Refresh |
| ⚙ | Settings |
| 📍 | Location / GPS |
| 📱 | Mobile / Device |

### Supported Android Versions

| Version | Supported | Notes |
|---------|-----------|-------|
| Android 14 | ✓ | Fully supported |
| Android 13 | ✓ | Fully supported |
| Android 12 | ✓ | Fully supported |
| Android 11 | ✓ | Fully supported |
| Android 10 | ✓ | Fully supported |
| Android 9 (Pie) | ✓ | Fully supported |
| Android 8 (Oreo) | ⚠ | Supported, but some features limited |
| Android 7 and below | ✗ | Not supported |

---

**Version:** 1.0
**Last Updated:** February 2025
**For:** PatrolManager Guard Mobile App (Android)
