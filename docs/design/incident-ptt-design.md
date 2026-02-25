# Incident & Communication Design Specification

## 1. Incident Domain Model

### Incident Entity
- `id`: Primary Key
- `site_id`: Reference to Site
- `reported_by`: Reference to User (Guard)
- `assigned_to`: Reference to User (Supervisor/Manager)
- `title`: Short summary
- `description`: Detailed report
- `type`: `SECURITY`, `SAFETY`, `MAINTENANCE`, `MEDICAL`, `OTHER`
- `priority`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `status`: `NEW`, `INVESTIGATING`, `RESOLVED`, `CLOSED`
- `location`: GeoJSON Point (where incident occurred)
- `patrol_run_id`: Optional reference to active patrol
- `resolved_at`: Timestamp
- `closed_at`: Timestamp

### Incident Evidence
- `id`: Primary Key
- `incident_id`: Reference to Incident
- `file_path`: URL or local path to file
- `file_type`: `IMAGE`, `VIDEO`, `AUDIO`
- `caption`: Optional description
- `uploaded_at`: Timestamp

### Incident Comment
- `id`: Primary Key
- `incident_id`: Reference to Incident
- `user_id`: Reference to User
- `comment`: Text content
- `created_at`: Timestamp

## 2. Push-to-Talk (PTT) Architecture

### PTT Protocol
- Use WebSockets (Socket.io) for low-latency audio signaling.
- **Half-Duplex**: Only one person can "talk" in a channel at a time.
- **Channels**: 
    - `Global`: All guards and supervisors.
    - `Site`: Guards assigned to a specific site.
    - `Emergency`: High priority broadcast.

### Events
- `ptt_request`: Request permission to speak.
- `ptt_granted`: Permission granted.
- `ptt_denied`: Channel busy.
- `ptt_audio_stream`: Binary audio data chunks.
- `ptt_release`: Finished speaking.

## 3. Workflow
1. Guard triggers "Create Incident" from Mobile.
2. Captures photo/video evidence.
3. System alerts supervisors via WebSocket (`WS_EVENTS.ALERT_NOTIFICATION`).
4. Supervisor assigns incident to themselves or another user.
5. Communication occurs via comments and PTT.
6. Incident is moved through states to `CLOSED`.
