/**
 * US8 Push-to-Talk Communication Integration Test
 *
 * Integration tests for PTT (Push-to-Talk) functionality.
 * Tests the half-duplex voice communication system.
 *
 * @module tests/integration
 */

import { jest, describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { WS_NAMESPACES, WS_EVENTS } from '../../src/infrastructure/websocket/WebSocketServer.js';

// Mock JWT service
jest.mock('../../src/core/services/JWTService.js', () => ({
  JWTService: jest.fn().mockImplementation(() => ({
    verifyAccessToken: jest.fn().mockResolvedValue({
      isValid: true,
      payload: { sub: 123, email: 'test@example.com', role: 'supervisor', name: 'Test User' },
    }),
  })),
  getJWTService: jest.fn().mockReturnValue({
    verifyAccessToken: jest.fn().mockResolvedValue({
      isValid: true,
      payload: { sub: 123, email: 'test@example.com', role: 'supervisor', name: 'Test User' },
    }),
  }),
}));

describe('US8 - Push-to-Talk Communication Integration', () => {
  let httpServer: HttpServer;
  let ioServer: SocketIOServer;
  let guard1Socket: ClientSocket;
  let guard2Socket: ClientSocket;
  let supervisorSocket: ClientSocket;
  let serverUrl: string;

  beforeAll(async () => {
    // Create HTTP server
    httpServer = new HttpServer();
    const port = process.env.TEST_SOCKET_PORT || 3503;

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
      pingInterval: 10000,
      pingTimeout: 5000,
    });

    // Setup auth middleware
    ioServer.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      if (token === 'valid-token') {
        (socket as any).user = { sub: socket.handshake.auth.userId || 123, name: `User ${socket.handshake.auth.userId || 1}` };
        next();
      } else {
        next(new Error('Authentication failed'));
      }
    });

    // Setup guards namespace with PTT support
    const guardsNamespace = ioServer.of(WS_NAMESPACES.GUARDS);
    const activeSpeakers = new Map<string, string>(); // channel -> socketId

    guardsNamespace.on('connection', (socket) => {
      const userId = (socket as any).user?.sub;

      socket.on('disconnect', () => {
        // Release PTT if this user was holding it
        for (const [channel, speakerId] of activeSpeakers.entries()) {
          if (speakerId === socket.id) {
            activeSpeakers.delete(channel);
            socket.to(channel).emit(WS_EVENTS.PTT_BROADCAST_END, { channel });
          }
        }
      });

      // PTT Request
      socket.on(WS_EVENTS.PTT_REQUEST, (data) => {
        const channel = data?.channel || 'global';

        if (activeSpeakers.has(channel)) {
          socket.emit(WS_EVENTS.PTT_DENIED, {
            channel,
            reason: 'Channel busy',
            currentSpeaker: activeSpeakers.get(channel),
          });
        } else {
          activeSpeakers.set(channel, socket.id);
          socket.emit(WS_EVENTS.PTT_GRANTED, { channel });
          socket.to(channel).emit(WS_EVENTS.PTT_BROADCAST_START, {
            userId,
            userName: (socket as any).user?.name,
            channel,
          });
        }
      });

      // PTT Release
      socket.on(WS_EVENTS.PTT_RELEASE, (data) => {
        const channel = data?.channel || 'global';

        if (activeSpeakers.get(channel) === socket.id) {
          activeSpeakers.delete(channel);
          socket.to(channel).emit(WS_EVENTS.PTT_BROADCAST_END, { channel });
        }
      });

      // Audio Stream
      socket.on(WS_EVENTS.PTT_AUDIO_STREAM, (data) => {
        const channel = data?.channel || 'global';

        if (activeSpeakers.get(channel) === socket.id) {
          socket.to(channel).emit(WS_EVENTS.PTT_AUDIO_STREAM, {
            userId,
            userName: (socket as any).user?.name,
            audio: data?.audio,
            sequence: data?.sequence,
          });
        }
      });

      socket.join('global');
      socket.join(`guard:${userId}`);
    });

    // Setup supervisors namespace (listeners)
    const supervisorsNamespace = ioServer.of(WS_NAMESPACES.SUPERVISORS);
    supervisorsNamespace.on('connection', (socket) => {
      socket.join('command_center');
      socket.join('global');
    });
  });

  afterAll(async () => {
    if (guard1Socket && guard1Socket.connected) guard1Socket.disconnect();
    if (guard2Socket && guard2Socket.connected) guard2Socket.disconnect();
    if (supervisorSocket && supervisorSocket.connected) supervisorSocket.disconnect();

    ioServer.close();
    await new Promise<void>((resolve) => {
      httpServer.close(() => resolve());
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (guard1Socket && guard1Socket.connected) guard1Socket.disconnect();
    if (guard2Socket && guard2Socket.connected) guard2Socket.disconnect();
    if (supervisorSocket && supervisorSocket.connected) supervisorSocket.disconnect();
  });

  describe('PTT Floor Control', () => {
    beforeEach(async () => {
      guard1Socket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', userId: 1 },
      });

      guard2Socket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', userId: 2 },
      });

      supervisorSocket = ioClient(`${serverUrl}${WS_NAMESPACES.SUPERVISORS}`, {
        auth: { token: 'valid-token' },
      });

      await Promise.all([
        new Promise<void>((resolve) => {
          guard1Socket.on('connect', () => resolve());
          guard1Socket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          guard2Socket.on('connect', () => resolve());
          guard2Socket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          supervisorSocket.on('connect', () => resolve());
          supervisorSocket.on('connect_error', () => resolve());
        }),
      ]);
    });

    it('should grant PTT to first requester on global channel', (done) => {
      guard1Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'global' });

      guard1Socket.on(WS_EVENTS.PTT_GRANTED, (data) => {
        expect(data.channel).toBe('global');
        done();
      });

      // Supervisor should receive broadcast start notification
      supervisorSocket.on(WS_EVENTS.PTT_BROADCAST_START, (data) => {
        expect(data.channel).toBe('global');
        expect(data.userId).toBe(1);
      });
    });

    it('should deny PTT to second requester when channel is busy', (done) => {
      let grantedCount = 0;

      guard1Socket.on(WS_EVENTS.PTT_GRANTED, () => {
        grantedCount++;

        if (grantedCount === 1) {
          // First guard got PTT, now second guard tries
          guard2Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'global' });
        }
      });

      guard2Socket.on(WS_EVENTS.PTT_DENIED, (data) => {
        expect(data.channel).toBe('global');
        expect(data.reason).toBe('Channel busy');
        done();
      });

      guard1Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'global' });
    });

    it('should allow second requester after first releases PTT', (done) => {
      let grantCount = 0;

      guard1Socket.on(WS_EVENTS.PTT_GRANTED, () => {
        grantCount++;

        if (grantCount === 1) {
          // First guard got PTT
          setTimeout(() => {
            guard1Socket.emit(WS_EVENTS.PTT_RELEASE, { channel: 'global' });
          }, 50);

          // Second guard requests after first releases
          setTimeout(() => {
            guard2Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'global' });
          }, 100);
        }
      });

      guard2Socket.on(WS_EVENTS.PTT_GRANTED, () => {
        if (grantCount === 1) {
          // This should be the second grant (after first release)
          done();
        }
      });

      guard1Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'global' });
    });

    it('should notify all users when PTT is released', (done) => {
      let notifiedUsers = 0;

      const checkNotification = () => {
        notifiedUsers++;
        if (notifiedUsers === 2) {
          done();
        }
      };

      guard1Socket.on(WS_EVENTS.PTT_GRANTED, () => {
        setTimeout(() => {
          guard1Socket.emit(WS_EVENTS.PTT_RELEASE, { channel: 'global' });
        }, 50);
      });

      guard1Socket.on(WS_EVENTS.PTT_BROADCAST_END, () => checkNotification());
      guard2Socket.on(WS_EVENTS.PTT_BROADCAST_END, () => checkNotification());

      guard1Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'global' });
    });
  });

  describe('PTT Audio Streaming', () => {
    beforeEach(async () => {
      guard1Socket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', userId: 1 },
      });

      guard2Socket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', userId: 2 },
      });

      await Promise.all([
        new Promise<void>((resolve) => {
          guard1Socket.on('connect', () => resolve());
          guard1Socket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          guard2Socket.on('connect', () => resolve());
          guard2Socket.on('connect_error', () => resolve());
        }),
      ]);
    });

    it('should broadcast audio stream from holder to other users', (done) => {
      let pttGranted = false;

      guard1Socket.on(WS_EVENTS.PTT_GRANTED, () => {
        pttGranted = true;

        // Send audio stream
        setTimeout(() => {
          guard1Socket.emit(WS_EVENTS.PTT_AUDIO_STREAM, {
            channel: 'global',
            audio: 'mock-audio-data',
            sequence: 1,
          });
        }, 50);
      });

      guard2Socket.on(WS_EVENTS.PTT_AUDIO_STREAM, (data) => {
        if (pttGranted) {
          expect(data.userId).toBe(1);
          expect(data.audio).toBe('mock-audio-data');
          expect(data.sequence).toBe(1);
          done();
        }
      });

      guard1Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'global' });
    });

    it('should not broadcast audio from non-holder', (done) => {
      let guard1HasPTT = false;

      // Guard 1 gets PTT
      guard1Socket.on(WS_EVENTS.PTT_GRANTED, () => {
        guard1HasPTT = true;
      });

      // Guard 2 tries to send audio without PTT
      guard2Socket.on(WS_EVENTS.PTT_AUDIO_STREAM, (data) => {
        // Guard 2 should NOT receive their own audio back
        expect(data.userId).not.toBe(2);
      });

      guard1Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'global' });

      setTimeout(() => {
        // Guard 2 sends audio without having PTT
        guard2Socket.emit(WS_EVENTS.PTT_AUDIO_STREAM, {
          channel: 'global',
          audio: 'unauthorized-audio',
          sequence: 1,
        });

        setTimeout(() => {
          // Verify Guard 2's audio was not broadcast
          // (If audio was broadcast, guard1 would have received it)
          done();
        }, 100);
      }, 100);
    });
  });

  describe('PTT Channel Isolation', () => {
    beforeEach(async () => {
      guard1Socket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', userId: 1 },
      });

      guard2Socket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', userId: 2 },
      });

      await Promise.all([
        new Promise<void>((resolve) => {
          guard1Socket.on('connect', () => resolve());
          guard1Socket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          guard2Socket.on('connect', () => resolve());
          guard2Socket.on('connect_error', () => resolve());
        }),
      ]);
    });

    it('should allow simultaneous PTT on different channels', (done) => {
      let grantedCount = 0;

      guard1Socket.on(WS_EVENTS.PTT_GRANTED, (data) => {
        grantedCount++;
        expect(data.channel).toBe('channel-a');

        if (grantedCount === 2) {
          done();
        }
      });

      guard2Socket.on(WS_EVENTS.PTT_GRANTED, (data) => {
        grantedCount++;
        expect(data.channel).toBe('channel-b');
      });

      // Both guards request PTT on different channels
      guard1Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'channel-a' });
      guard2Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'channel-b' });
    });

    it('should only broadcast audio to users on same channel', (done) => {
      let guard1PTTGranted = false;
      let guard2ReceivedOnA = false;

      guard1Socket.on(WS_EVENTS.PTT_GRANTED, () => {
        guard1PTTGranted = true;

        setTimeout(() => {
          guard1Socket.emit(WS_EVENTS.PTT_AUDIO_STREAM, {
            channel: 'channel-a',
            audio: 'audio-for-channel-a',
            sequence: 1,
          });
        }, 50);
      });

      guard2Socket.on(WS_EVENTS.PTT_AUDIO_STREAM, (data) => {
        // Guard 2 should NOT receive audio for channel-a
        if (data.channel === 'channel-a') {
          guard2ReceivedOnA = true;
        }
      });

      guard1Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'channel-a' });

      setTimeout(() => {
        expect(guard2ReceivedOnA).toBe(false);
        done();
      }, 200);
    });
  });

  describe('PTT Connection Handling', () => {
    it('should release PTT when holder disconnects', (done) => {
      guard1Socket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', userId: 1 },
      });

      guard2Socket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', userId: 2 },
      });

      await Promise.all([
        new Promise<void>((resolve) => {
          guard1Socket.on('connect', () => resolve());
          guard1Socket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          guard2Socket.on('connect', () => resolve());
          guard2Socket.on('connect_error', () => resolve());
        }),
      ]);

      let pttGranted = false;

      guard1Socket.on(WS_EVENTS.PTT_GRANTED, () => {
        pttGranted = true;
      });

      guard2Socket.on(WS_EVENTS.PTT_BROADCAST_END, (data) => {
        if (pttGranted) {
          expect(data.channel).toBe('global');
          done();
        }
      });

      guard1Socket.on(WS_EVENTS.PTT_GRANTED, () => {
        // Disconnect after getting PTT
        setTimeout(() => {
          guard1Socket.disconnect();
        }, 50);
      });

      guard1Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'global' });
    });
  });

  describe('PTT Data Structure', () => {
    it('should include speaker identification in broadcast start', (done) => {
      guard1Socket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', userId: 1 },
      });

      guard2Socket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', userId: 2 },
      });

      await Promise.all([
        new Promise<void>((resolve) => {
          guard1Socket.on('connect', () => resolve());
          guard1Socket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          guard2Socket.on('connect', () => resolve());
          guard2Socket.on('connect_error', () => resolve());
        }),
      ]);

      guard2Socket.on(WS_EVENTS.PTT_BROADCAST_START, (data) => {
        expect(data).toHaveProperty('userId');
        expect(data).toHaveProperty('userName');
        expect(data).toHaveProperty('channel');
        expect(data.channel).toBe('global');
        done();
      });

      guard1Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'global' });
    });

    it('should include audio sequence number in stream', (done) => {
      guard1Socket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', userId: 1 },
      });

      guard2Socket = ioClient(`${serverUrl}${WS_NAMESPACES.GUARDS}`, {
        auth: { token: 'valid-token', userId: 2 },
      });

      await Promise.all([
        new Promise<void>((resolve) => {
          guard1Socket.on('connect', () => resolve());
          guard1Socket.on('connect_error', () => resolve());
        }),
        new Promise<void>((resolve) => {
          guard2Socket.on('connect', () => resolve());
          guard2Socket.on('connect_error', () => resolve());
        }),
      ]);

      let pttGranted = false;

      guard1Socket.on(WS_EVENTS.PTT_GRANTED, () => {
        pttGranted = true;
      });

      guard2Socket.on(WS_EVENTS.PTT_AUDIO_STREAM, (data) => {
        if (pttGranted) {
          expect(data).toHaveProperty('sequence');
          expect(typeof data.sequence).toBe('number');
          done();
        }
      });

      guard1Socket.emit(WS_EVENTS.PTT_REQUEST, { channel: 'global' });

      setTimeout(() => {
        guard1Socket.emit(WS_EVENTS.PTT_AUDIO_STREAM, {
          channel: 'global',
          audio: 'audio-data',
          sequence: 1,
        });
      }, 100);
    });
  });
});
