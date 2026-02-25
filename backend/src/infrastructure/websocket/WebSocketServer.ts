/**
 * WebSocket Server
 *
 * Handles real-time communication using Socket.io.
 * Manages namespaces for guards and supervisors.
 *
 * @module infrastructure/websocket
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { type Server as HttpServer } from 'http';
import { getJWTService, getRealTimeService } from '../../core/services/index.js';
import logger from '../config/logger.js';
import pttManager from './PTTManager.js';

/**
 * WebSocket Events
 */
export const WS_EVENTS = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  AUTHENTICATE: 'authenticate',
  ERROR: 'error',
  
  // Guard Events (Client to Server)
  LOCATION_UPDATE: 'location_update',
  SOS_ALERT: 'sos_alert',
  PATROL_START: 'patrol_start',
  PATROL_CHECKPOINT: 'patrol_checkpoint',
  
  // PTT Events
  PTT_REQUEST: 'ptt_request',
  PTT_GRANTED: 'ptt_granted',
  PTT_DENIED: 'ptt_denied',
  PTT_AUDIO_STREAM: 'ptt_audio_stream',
  PTT_RELEASE: 'ptt_release',
  PTT_BROADCAST_START: 'ptt_broadcast_start',
  PTT_BROADCAST_END: 'ptt_broadcast_end',
  
  // Supervisor Events (Server to Client)
  GUARD_TRACKING: 'guard_tracking',
  SOS_BROADCAST: 'sos_broadcast',
  ALERT_NOTIFICATION: 'alert_notification',
};

/**
 * WebSocket Namespaces
 */
export const WS_NAMESPACES = {
  GUARDS: '/guards',
  SUPERVISORS: '/supervisors',
};

/**
 * Initialize WebSocket Server
 * @param httpServer - The HTTP server instance to attach to
 */
export function initializeWebSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*', 
      methods: ['GET', 'POST'],
    },
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const jwtService = getJWTService();
      const verification = await jwtService.verifyAccessToken(token);

      if (!verification.isValid || !verification.payload) {
        return next(new Error('Authentication error: Invalid token'));
      }

      // Attach user info to socket
      (socket as any).user = verification.payload;
      next();
    } catch (error) {
      logger.error('WebSocket Auth Error:', error);
      next(new Error('Authentication error'));
    }
  });

  // Guard Namespace
  const guardsNamespace = io.of(WS_NAMESPACES.GUARDS);
  guardsNamespace.on(WS_EVENTS.CONNECTION, (socket: Socket) => {
    const userId = (socket as any).user?.sub;
    const realTimeService = getRealTimeService();
    
    logger.info(`Guard connected: ${userId} (Socket: ${socket.id})`);

    socket.on(WS_EVENTS.DISCONNECT, () => {
      logger.info(`Guard disconnected: ${userId}`);
      realTimeService.removeGuard(userId);
      pttManager.handleDisconnect(socket.id);
    });

    // Handle Location Update
    socket.on(WS_EVENTS.LOCATION_UPDATE, async (data) => {
      await realTimeService.handleLocationUpdate({
        userId,
        latitude: data.latitude,
        longitude: data.longitude,
        accuracy: data.accuracy,
        timestamp: new Date(data.timestamp || Date.now()),
        activePatrolId: data.activePatrolId
      });
    });

    // Handle SOS Alert
    socket.on(WS_EVENTS.SOS_ALERT, async (data) => {
      await realTimeService.handleSOSAlert({
        userId,
        latitude: data.latitude,
        longitude: data.longitude,
        timestamp: new Date(),
        message: data.message
      });
    });

    // Handle PTT
    socket.on(WS_EVENTS.PTT_REQUEST, (data) => pttManager.handlePTTRequest(socket, data.channel || 'global'));
    socket.on(WS_EVENTS.PTT_RELEASE, (data) => pttManager.handlePTTRelease(socket, data.channel || 'global'));
    socket.on(WS_EVENTS.PTT_AUDIO_STREAM, (data) => pttManager.handleAudioStream(socket, data));

    // Join room for the specific guard
    socket.join(`guard:${userId}`);
    socket.join('global');
  });

  // Supervisor Namespace
  const supervisorsNamespace = io.of(WS_NAMESPACES.SUPERVISORS);
  supervisorsNamespace.on(WS_EVENTS.CONNECTION, (socket: Socket) => {
    const userId = (socket as any).user?.sub;
    logger.info(`Supervisor connected: ${userId} (Socket: ${socket.id})`);

    socket.on(WS_EVENTS.DISCONNECT, () => {
      logger.info(`Supervisor disconnected: ${userId}`);
    });

    // Join room for the supervisor
    socket.join('command_center');
    socket.join('global');
  });

  logger.info('WebSocket Server Initialized with PTT support');
  return io;
}

/**
 * Global IO Instance
 */
let ioInstance: SocketIOServer | null = null;

export function setIoInstance(io: SocketIOServer): void {
  ioInstance = io;
}

export function getIoInstance(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('WebSocket IO instance not set');
  }
  return ioInstance;
}
