/**
 * US5 Real-time Tracking Integration Test
 *
 * Integration tests for Socket.io location broadcast functionality.
 * Tests the real-time guard tracking system.
 *
 * @module tests/integration
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { getRealTimeService } from '../../src/core/services/index.js';
import { WS_NAMESPACES, WS_EVENTS } from '../../src/infrastructure/websocket/WebSocketServer.js';

// Mock the services
jest.mock('../../src/core/services/GeofenceService.js', () => ({
  GeofenceService: jest.fn().mockImplementation(() => ({
    validateGPSLocation: jest.fn().mockReturnValue({ isValid: true }),
  })),
}));

jest.mock('../../src/core/domain/repositories/ISOSAlertRepository.js', () => ({
  // Mock will be created dynamically
}));

jest.mock('../../src/core/domain/repositories/ILocationHistoryRepository.js', () => ({
  // Mock will be created dynamically
}));

jest.mock('../../src/core/services/JWTService.js', () => ({
  JWTService: jest.fn().mockImplementation(() => ({
    verifyAccessToken: jest.fn().mockResolvedValue({
      isValid: true,
      payload: { sub: 123, email: 'test@example.com', role: 'guard' },
    }),
  })),
  getJWTService: jest.fn().mockReturnValue({
    verifyAccessToken: jest.fn().mockResolvedValue({
      isValid: true,
      payload: { sub: 123, email: 'test@example.com', role: 'guard' },
    }),
  }),
}));

describe('US5 - Real-time Guard Tracking Integration', () => {
  let httpServer: HttpServer;
  let ioServer: SocketIOServer;
  let guardSocket: ClientSocket;
  let supervisorSocket: ClientSocket;
  let serverUrl: string;
  let mockRealTimeService: any;

  beforeAll(async () => {
    // Create HTTP server
    httpServer = new HttpServer();

    // Get port from environment or use default
    const port = process.env.TEST_SOCKET_PORT || 3501;

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

    // Setup simple auth middleware
    ioServer.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      if (token === 'valid-token') {
        (socket as any).user = { sub: 123, email: 'test@example.com', role: 'guard' };
        next();
      } else {
        next(new Error('Authentication failed'));
      }
    });

    // Setup guards namespace
    const guardsNamespace = ioServer.of(WS_NAMESPACES.GUARDS);
    guardsNamespace.on('connection', (socket) => {
      const userId = (socket as any).user?.sub;

      socket.on('disconnect', () => {
        if (mockRealTimeService) {
          mockRealTimeService.removeGuard(userId);
        }
      });

      socket.on(WS_EVENTS.LOCATION_UPDATE, async (data) => {
        if (mockRealTimeService) {
          await mockRealTimeService.handleLocationUpdate({
            userId,
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: data.accuracy,
            timestamp: new Date(data.timestamp || Date.now()),
            activePatrolId: data.activePatrolId
          });
        }
      });

      socket.on(WS_EVENTS.SOS_ALERT, async (data) => {
        if (mockRealTimeService) {
          await mockRealTimeService.handleSOSAlert({
            userId,
            latitude: data.latitude,
            longitude: data.longitude,
            timestamp: new Date(),
            message: data.message
          });
        }
      });

      socket.join(`guard:${userId}`);
      socket.join('global');
    });

    // Setup supervisors namespace
    const supervisorsNamespace = ioServer.of(WS_NAMESPACES.SUPERVISORS);
    supervisorsNamespace.on('connection', (socket) => {
      socket.join('command_center');
      socket.join('global');
    });
  });

  afterAll(async () => {
    if (guardSocket) guardSocket.disconnect();
    if (supervisorSocket) supervisorSocket.disconnect();

    ioServer.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    // Reset mock
    mockRealTimeService = {
      handleLocationUpdate: jest.fn().mockResolvedValue(undefined),
      handleSOSAlert: jest.fn().mockResolvedValue(undefined),
      removeGuard: jest.fn(),
      getActiveGuards: jest.fn().mockReturnValue([]),
    };

    jest.clearAllMocks();
  });

  afterEach(() => {
    if (guardSocket && guardSocket.connected) {
      guardSocket.disconnect();
    }
    if (supervisorSocket && supervisorSocket.connected) {
      supervisorSocket.disconnect();
    }
  });

  describe('Guard Connection and Authentication', () => {
    it('should allow guard to connect with valid token', async () => {
      guardSocket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token' },
      });

      await new Promise<void>((resolve) => {
        guardSocket.on('connect', () => resolve());
        guardSocket.on('connect_error', () => resolve());
      });

      expect(guardSocket.connected).toBe(true);
    });

    it('should reject guard connection with invalid token', async () => {
      guardSocket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'invalid-token' },
      });

      await new Promise<void>((resolve) => {
        guardSocket.on('connect', () => resolve());
        guardSocket.on('connect_error', () => resolve());
      });

      expect(guardSocket.connected).toBe(false);
    });
  });

  describe('Supervisor Connection', () => {
    it('should allow supervisor to connect with valid token', async () => {
      supervisorSocket = ioClient(`${serverUrl}${WS_NAMESPACES.SUPERVISORS}`, {
        auth: { token: 'valid-token' },
      });

      await new Promise<void>((resolve) => {
        supervisorSocket.on('connect', () => resolve());
        supervisorSocket.on('connect_error', () => resolve());
      });

      expect(supervisorSocket.connected).toBe(true);
    });

    it('should join command_center room on connection', async () => {
      supervisorSocket = ioClient(`${serverUrl}${WS_NAMESPACES.SUPERVISORS}`, {
        auth: { token: 'valid-token' },
      });

      await new Promise<void>((resolve) => {
        supervisorSocket.on('connect', () => resolve());
        supervisorSocket.on('connect_error', () => resolve());
      });

      const rooms = supervisorSocket.rooms;
      expect(rooms.has('command_center')).toBe(true);
    });
  });

  describe('Location Update Broadcasting', () => {
    beforeEach(async () => {
      // Connect guard and supervisor
      guardSocket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token' },
      });

      supervisorSocket = ioClient(`${serverUrl}${WS_NAMESPACES.SUPERVISORS}`, {
        auth: { token: 'valid-token' },
      });

      await Promise.all([
        new Promise<void>((resolve) => {
          guardSocket.on('connect', () => resolve());
          guardSocket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          supervisorSocket.on('connect', () => resolve());
          supervisorSocket.on('connect_error', () => resolve());
        }),
      ]);
    });

    it('should receive location update on supervisor dashboard', (done) => {
      const locationData = {
        userId: 123,
        latitude: 40.7128,
        longitude: -74.0060,
        accuracy: 5.0,
        timestamp: new Date().toISOString(),
      };

      supervisorSocket.on(WS_EVENTS.GUARD_TRACKING, (data) => {
        expect(data.userId).toBe(123);
        expect(data.latitude).toBe(40.7128);
        expect(data.longitude).toBe(-74.0060);
        expect(data.accuracy).toBe(5.0);
        done();
      });

      // Emit location update from guard
      guardSocket.emit(WS_EVENTS.LOCATION_UPDATE, locationData);
    });

    it('should handle multiple location updates efficiently', (done) => {
      let updateCount = 0;
      const targetUpdates = 3;

      supervisorSocket.on(WS_EVENTS.GUARD_TRACKING, () => {
        updateCount++;
        if (updateCount === targetUpdates) {
          expect(updateCount).toBe(targetUpdates);
          done();
        }
      });

      // Emit multiple location updates
      for (let i = 0; i < targetUpdates; i++) {
        setTimeout(() => {
          guardSocket.emit(WS_EVENTS.LOCATION_UPDATE, {
            userId: 123,
            latitude: 40.7128 + (i * 0.0001),
            longitude: -74.0060 + (i * 0.0001),
            timestamp: new Date().toISOString(),
          });
        }, i * 50);
      }
    });
  });

  describe('SOS Alert Broadcasting', () => {
    beforeEach(async () => {
      guardSocket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token' },
      });

      supervisorSocket = ioClient(`${serverUrl}${WS_NAMESPACES.SUPERVISORS}`, {
        auth: { token: 'valid-token' },
      });

      await Promise.all([
        new Promise<void>((resolve) => {
          guardSocket.on('connect', () => resolve());
          guardSocket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          supervisorSocket.on('connect', () => resolve());
          supervisorSocket.on('connect_error', () => resolve());
        }),
      ]);
    });

    it('should broadcast SOS alert to all supervisors', (done) => {
      const sosData = {
        userId: 123,
        latitude: 40.7128,
        longitude: -74.0060,
        message: 'Emergency help needed!',
      };

      supervisorSocket.on(WS_EVENTS.SOS_BROADCAST, (data) => {
        expect(data.userId).toBe(123);
        expect(data.latitude).toBe(40.7128);
        expect(data.longitude).toBe(-74.0060);
        expect(data.message).toContain('Emergency');
        done();
      });

      guardSocket.emit(WS_EVENTS.SOS_ALERT, sosData);
    });

    it('should include high priority in SOS broadcast', (done) => {
      const sosData = {
        userId: 123,
        latitude: 40.7128,
        longitude: -74.0060,
        message: 'SOS',
      };

      supervisorSocket.on(WS_EVENTS.SOS_BROADCAST, (data) => {
        expect(data).toHaveProperty('priority');
        expect(data.priority).toBeDefined();
        done();
      });

      guardSocket.emit(WS_EVENTS.SOS_ALERT, sosData);
    });
  });

  describe('Guard Disconnection', () => {
    it('should remove guard from active list on disconnect', async () => {
      guardSocket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token' },
      });

      await new Promise<void>((resolve) => {
        guardSocket.on('connect', () => resolve());
        guardSocket.on('connect_error', () => resolve());
      });

      expect(guardSocket.connected).toBe(true);

      guardSocket.disconnect();

      // Give time for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(mockRealTimeService.removeGuard).toHaveBeenCalledWith(123);
    });
  });

  describe('Room Management', () => {
    it('should join guard-specific room on connection', async () => {
      guardSocket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token' },
      });

      await new Promise<void>((resolve) => {
        guardSocket.on('connect', () => resolve());
        guardSocket.on('connect_error', () => resolve());
      });

      const rooms = guardSocket.rooms;
      expect(rooms.has('guard:123')).toBe(true);
    });

    it('should join global room on connection', async () => {
      guardSocket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token' },
      });

      await new Promise<void>((resolve) => {
        guardSocket.on('connect', () => resolve());
        guardSocket.on('connect_error', () => resolve());
      });

      const rooms = guardSocket.rooms;
      expect(rooms.has('global')).toBe(true);
    });
  });
});
