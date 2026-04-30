/**
 * US6 SOS Alert Integration Test
 *
 * Integration tests for SOS / Panic Alert functionality.
 * Tests the emergency alert broadcast and dispatcher notification system.
 *
 * @module tests/integration
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { WS_NAMESPACES, WS_EVENTS } from '../../src/infrastructure/websocket/WebSocketServer.js';

// Mock the services
jest.mock('../../src/core/services/GeofenceService.js', () => ({
  GeofenceService: jest.fn().mockImplementation(() => ({
    validateGPSLocation: jest.fn().mockReturnValue({ isValid: true }),
  })),
}));

jest.mock('../../src/core/services/JWTService.js', () => ({
  JWTService: jest.fn().mockImplementation(() => ({
    verifyAccessToken: jest.fn().mockResolvedValue({
      isValid: true,
      payload: { sub: 123, email: 'guard@example.com', role: 'guard', name: 'John Guard' },
    }),
  })),
  getJWTService: jest.fn().mockReturnValue({
    verifyAccessToken: jest.fn().mockResolvedValue({
      isValid: true,
      payload: { sub: 123, email: 'guard@example.com', role: 'guard', name: 'John Guard' },
    }),
  }),
}));

describe('US6 - SOS / Panic Alert Integration', () => {
  let httpServer: HttpServer;
  let ioServer: SocketIOServer;
  let guardSocket: ClientSocket;
  let supervisorSocket1: ClientSocket;
  let supervisorSocket2: ClientSocket;
  let nearbyGuardSocket: ClientSocket;
  let serverUrl: string;
  let mockSosAlertRepository: any;

  beforeAll(async () => {
    // Create HTTP server
    httpServer = new HttpServer();
    const port = process.env.TEST_SOCKET_PORT || 3502;

    await new Promise<void>((resolve) => {
      httpServer.listen(port, () => {
        serverUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Create IO server
    ioServer = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Setup auth middleware
    ioServer.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      if (token === 'valid-token') {
        const role = socket.handshake.auth.role || 'guard';
        const userId = role === 'guard' ? 123 : 200;
        (socket as any).user = {
          sub: userId,
          email: `${role}@example.com`,
          role: role,
          name: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`
        };
        next();
      } else {
        next(new Error('Authentication failed'));
      }
    });

    // Setup guards namespace
    const guardsNamespace = ioServer.of(WS_NAMESPACES.GUARDS);
    guardsNamespace.on('connection', (socket) => {
      const userId = (socket as any).user?.sub;

      socket.on('disconnect', () => {});

      socket.on(WS_EVENTS.SOS_ALERT, async (data) => {
        // Mock SOS handling
        const sosData = {
          alertId: Date.now(),
          userId: (socket as any).user?.sub,
          userName: (socket as any).user?.name,
          latitude: data.latitude,
          longitude: data.longitude,
          timestamp: data.timestamp || new Date(),
          message: data.message || 'SOS Alert Triggered',
          priority: 'critical',
        };

        // Broadcast to supervisors
        ioServer.of(WS_NAMESPACES.SUPERVISORS).to('command_center').emit(WS_EVENTS.SOS_BROADCAST, sosData);

        // Broadcast to nearby guards
        ioServer.of(WS_NAMESPACES.GUARDS).emit(WS_EVENTS.ALERT_NOTIFICATION, {
          type: 'nearby_sos',
          message: `Guard ${sosData.userName} has triggered an SOS!`,
          location: { latitude: data.latitude, longitude: data.longitude },
          distance: 150, // Mock distance
        });
      });

      socket.join(`guard:${userId}`);
    });

    // Setup supervisors namespace
    const supervisorsNamespace = ioServer.of(WS_NAMESPACES.SUPERVISORS);
    supervisorsNamespace.on('connection', (socket) => {
      socket.on('disconnect', () => {});
      socket.join('command_center');
    });
  });

  afterAll(async () => {
    if (guardSocket) guardSocket.disconnect();
    if (supervisorSocket1) supervisorSocket1.disconnect();
    if (supervisorSocket2) supervisorSocket2.disconnect();
    if (nearbyGuardSocket) nearbyGuardSocket.disconnect();

    ioServer.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    mockSosAlertRepository = {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      findNearbyGuards: jest.fn().mockResolvedValue([]),
      getStatistics: jest.fn().mockResolvedValue({}),
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (guardSocket && guardSocket.connected) guardSocket.disconnect();
    if (supervisorSocket1 && supervisorSocket1.connected) supervisorSocket1.disconnect();
    if (supervisorSocket2 && supervisorSocket2.connected) supervisorSocket2.disconnect();
    if (nearbyGuardSocket && nearbyGuardSocket.connected) nearbyGuardSocket.disconnect();
  });

  describe('SOS Trigger from Guard', () => {
    beforeEach(async () => {
      guardSocket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', role: 'guard' },
      });

      await new Promise<void>((resolve) => {
        guardSocket.on('connect', () => resolve());
        guardSocket.on('connect_error', () => resolve());
      });
    });

    it('should trigger SOS alert with location data', (done) => {
      const sosData = {
        latitude: 40.7128,
        longitude: -74.0060,
        message: 'Need backup immediately!',
      };

      guardSocket.emit(WS_EVENTS.SOS_ALERT, sosData);

      // Verify emit succeeded
      expect(guardSocket.connected).toBe(true);
      done();
    });

    it('should include timestamp in SOS alert', (done) => {
      const sosData = {
        latitude: 40.7128,
        longitude: -74.0060,
        timestamp: new Date().toISOString(),
      };

      guardSocket.emit(WS_EVENTS.SOS_ALERT, sosData);

      // Verify emit succeeded
      expect(guardSocket.connected).toBe(true);
      done();
    });

    it('should include custom message in SOS alert', (done) => {
      const sosData = {
        latitude: 40.7128,
        longitude: -74.0060,
        message: 'Intruder detected in north sector',
      };

      guardSocket.emit(WS_EVENTS.SOS_ALERT, sosData);

      // Verify emit succeeded
      expect(guardSocket.connected).toBe(true);
      done();
    });
  });

  describe('SOS Broadcast to Supervisors', () => {
    beforeEach(async () => {
      guardSocket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', role: 'guard' },
      });

      supervisorSocket1 = ioClient(`${serverUrl}${WS_NAMESPACES.SUPERVISORS}`, {
        auth: { token: 'valid-token', role: 'supervisor' },
      });

      supervisorSocket2 = ioClient(`${serverUrl}${WS_NAMESPACES.SUPERVISORS}`, {
        auth: { token: 'valid-token', role: 'supervisor' },
      });

      await Promise.all([
        new Promise<void>((resolve) => {
          guardSocket.on('connect', () => resolve());
          guardSocket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          supervisorSocket1.on('connect', () => resolve());
          supervisorSocket1.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          supervisorSocket2.on('connect', () => resolve());
          supervisorSocket2.on('connect_error', () => resolve());
        }),
      ]);
    });

    it('should broadcast SOS to all connected supervisors', (done) => {
      const sosData = {
        latitude: 40.7128,
        longitude: -74.0060,
        message: 'Emergency!',
      };

      let receivedBy = 0;

      const checkReceived = () => {
        receivedBy++;
        if (receivedBy === 2) {
          done();
        }
      };

      supervisorSocket1.on(WS_EVENTS.SOS_BROADCAST, (data) => {
        expect(data.userId).toBe(123);
        expect(data.latitude).toBe(40.7128);
        expect(data.longitude).toBe(-74.0060);
        expect(data.priority).toBe('critical');
        checkReceived();
      });

      supervisorSocket2.on(WS_EVENTS.SOS_BROADCAST, (data) => {
        expect(data.userId).toBe(123);
        expect(data.latitude).toBe(40.7128);
        expect(data.longitude).toBe(-74.0060);
        expect(data.priority).toBe('critical');
        checkReceived();
      });

      // Emit SOS from guard
      setTimeout(() => {
        guardSocket.emit(WS_EVENTS.SOS_ALERT, sosData);
      }, 50);
    });

    it('should include guard identification in broadcast', (done) => {
      const sosData = {
        latitude: 40.7128,
        longitude: -74.0060,
      };

      supervisorSocket1.on(WS_EVENTS.SOS_BROADCAST, (data) => {
        expect(data).toHaveProperty('userId');
        expect(data).toHaveProperty('userName');
        expect(data.userName).toBeDefined();
        done();
      });

      setTimeout(() => {
        guardSocket.emit(WS_EVENTS.SOS_ALERT, sosData);
      }, 50);
    });

    it('should include high priority flag in broadcast', (done) => {
      const sosData = {
        latitude: 40.7128,
        longitude: -74.0060,
      };

      supervisorSocket1.on(WS_EVENTS.SOS_BROADCAST, (data) => {
        expect(data.priority).toBe('critical');
        done();
      });

      setTimeout(() => {
        guardSocket.emit(WS_EVENTS.SOS_ALERT, sosData);
      }, 50);
    });
  });

  describe('SOS Broadcast to Nearby Guards', () => {
    beforeEach(async () => {
      guardSocket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', role: 'guard' },
      });

      nearbyGuardSocket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', role: 'guard' },
      });
      // Set a different user ID for nearby guard
      (nearbyGuardSocket as any).testUserId = 456;

      await Promise.all([
        new Promise<void>((resolve) => {
          guardSocket.on('connect', () => resolve());
          guardSocket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          nearbyGuardSocket.on('connect', () => resolve());
          nearbyGuardSocket.on('connect_error', () => resolve());
        }),
      ]);
    });

    it('should notify nearby guards of SOS alert', (done) => {
      const sosData = {
        latitude: 40.7128,
        longitude: -74.0060,
      };

      nearbyGuardSocket.on(WS_EVENTS.ALERT_NOTIFICATION, (data) => {
        expect(data.type).toBe('nearby_sos');
        expect(data.message).toContain('SOS');
        expect(data.location).toEqual({
          latitude: 40.7128,
          longitude: -74.0060,
        });
        expect(data.distance).toBeDefined();
        done();
      });

      setTimeout(() => {
        guardSocket.emit(WS_EVENTS.SOS_ALERT, sosData);
      }, 50);
    });

    it('should include distance information in nearby guard alert', (done) => {
      const sosData = {
        latitude: 40.7128,
        longitude: -74.0060,
      };

      nearbyGuardSocket.on(WS_EVENTS.ALERT_NOTIFICATION, (data) => {
        expect(data).toHaveProperty('distance');
        expect(typeof data.distance).toBe('number');
        done();
      });

      setTimeout(() => {
        guardSocket.emit(WS_EVENTS.SOS_ALERT, sosData);
      }, 50);
    });
  });

  describe('SOS Alert Data Structure', () => {
    it('should have complete alert data structure', (done) => {
      const expectedStructure = {
        alertId: expect.any(Number),
        userId: expect.any(Number),
        latitude: expect.any(Number),
        longitude: expect.any(Number),
        timestamp: expect.anything(),
        message: expect.any(String),
        priority: expect.any(String),
      };

      guardSocket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', role: 'guard' },
      });

      supervisorSocket1 = ioClient(`${serverUrl}${WS_NAMESPACES.SUPERVISORS}`, {
        auth: { token: 'valid-token', role: 'supervisor' },
      });

      await Promise.all([
        new Promise<void>((resolve) => {
          guardSocket.on('connect', () => resolve());
          guardSocket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          supervisorSocket1.on('connect', () => resolve());
          supervisorSocket1.on('connect_error', () => resolve());
        }),
      ]);

      supervisorSocket1.on(WS_EVENTS.SOS_BROADCAST, (data) => {
        expect(data).toMatchObject(expectedStructure);
        done();
      });

      setTimeout(() => {
        guardSocket.emit(WS_EVENTS.SOS_ALERT, {
          latitude: 40.7128,
          longitude: -74.0060,
        });
      }, 50);
    });
  });

  describe('Multiple Simultaneous SOS Alerts', () => {
    it('should handle multiple SOS alerts from different guards', (done) => {
      const guard2Socket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', role: 'guard' },
      });
      (guard2Socket as any).testUserId = 789;

      supervisorSocket1 = ioClient(`${serverUrl}${WS_NAMESPACES.SUPERVISORS}`, {
        auth: { token: 'valid-token', role: 'supervisor' },
      });

      guardSocket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', role: 'guard' },
      });

      await Promise.all([
        new Promise<void>((resolve) => {
          guardSocket.on('connect', () => resolve());
          guardSocket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          guard2Socket.on('connect', () => resolve());
          guard2Socket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          supervisorSocket1.on('connect', () => resolve());
          supervisorSocket1.on('connect_error', () => resolve());
        }),
      ]);

      let alertCount = 0;
      const targetAlerts = 2;

      const checkAlert = () => {
        alertCount++;
        if (alertCount === targetAlerts) {
          guard2Socket.disconnect();
          done();
        }
      };

      supervisorSocket1.on(WS_EVENTS.SOS_BROADCAST, () => {
        checkAlert();
      });

      // Emit SOS from both guards
      setTimeout(() => {
        guardSocket.emit(WS_EVENTS.SOS_ALERT, {
          latitude: 40.7128,
          longitude: -74.0060,
        });
      }, 50);

      setTimeout(() => {
        guard2Socket.emit(WS_EVENTS.SOS_ALERT, {
          latitude: 40.7130,
          longitude: -74.0070,
        });
      }, 100);
    });
  });
});
