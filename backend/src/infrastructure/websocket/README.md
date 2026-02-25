# WebSocket Infrastructure

## Purpose
Socket.io event handlers for real-time features (live tracking, SOS, dispatch).

## Contents
- Socket.io server initialization
- Event handlers for real-time features
- Connection management
- Room management (for site-specific channels)
- Authentication middleware for socket connections

## Structure

```
websocket/
├── index.ts            # Socket.io initialization and event registration
├── handlers/           # Event handlers
│   ├── location.handler.ts     # GPS location updates
│   ├── sos.handler.ts          # SOS alert broadcasts
│   ├── dispatch.handler.ts     # Dispatch notifications
│   └── patrol.handler.ts       # Patrol status updates
└── middleware/
    ├── auth.middleware.ts       # Socket authentication
    └── room.middleware.ts       # Room/Channel access control
```

## Rules

| Rule | Description |
|------|-------------|
| **Thin Handlers** | Handlers only map events to service calls |
| **No Business Logic** | All logic lives in services |
| **No Socket.io in Services** | Services must not know about Socket.io |
| **Delegation Pattern** | Handlers delegate to services, then emit responses |

## Real-time Features

### Live Guard Tracking
- Event: `guard:location:update`
- Auth: Required (JWT token)
- Room: `site:{siteId}`
- Broadcasts to: Supervisors/Managers on same site

### SOS Alerts
- Event: `sos:create`
- Auth: Required
- Room: `site:{siteId}`, `dispatch`
- Broadcasts to: All dispatchers, site supervisors
- Priority: High/Critical incidents

### Dispatch Notifications
- Event: `dispatch:assign`
- Auth: Manager/Supervisor only
- Room: `guard:{guardId}`
- Emits to: Specific guard

### Patrol Status
- Event: `patrol:status:update`
- Auth: Required
- Room: `site:{siteId}`
- Broadcasts to: Site supervisors

## Socket Event Template

```typescript
import { Socket } from 'socket.io';
import { patrolService } from '@core/services/index.js';

export const patrolHandler = (socket: Socket) => {
  // Join room for user's sites
  socket.on('patrol:join', async (data) => {
    const { siteId } = data;
    // Verify user has access to site
    await patrolService.verifyAccess(socket.data.userId, siteId);
    socket.join(`site:${siteId}`);
  });

  // Handle location updates
  socket.on('patrol:location:update', async (data) => {
    const update = await patrolService.updateLocation({
      guardId: socket.data.userId,
      ...data,
    });

    // Broadcast to site room
    socket.to(`site:${data.siteId}`).emit('patrol:location:updated', update);
  });
};
```

## TODO

- [ ] Implement socket authentication middleware
- [ ] Implement location update handler
- [ ] Implement SOS alert handler
- [ ] Implement dispatch handler
- [ ] Implement patrol status handler
- [ ] Implement room access control
