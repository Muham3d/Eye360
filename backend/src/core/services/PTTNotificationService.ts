/**
 * Push-to-Talk Notification Service
 *
 * Manages PTT audio channel notifications and broadcasts.
 * Integrates with WebSocket for real-time audio streaming.
 *
 * @module core/services
 */

import { getIoInstance, WS_EVENTS } from '../../infrastructure/websocket/WebSocketServer.js';
import logger from '../../infrastructure/config/logger.js';

/**
 * PTT Channel Configuration
 */
export interface IPTTChannel {
  id: string;
  name: string;
  type: 'global' | 'site' | 'patrol';
  siteId?: number;
  patrolRunId?: number;
  memberIds: number[];
  maxParticipants?: number;
  isActive: boolean;
}

/**
 * PTT Session State
 */
export interface IPTTSession {
  channelId: string;
  currentSpeaker?: number; // userId
  speakerStartTime?: Date;
  isBroadcasting: boolean;
  listeners: Set<number>;
}

/**
 * PTT Notification Request
 */
export interface IPTTNotificationRequest {
  channelId: string;
  userId: number;
  type: 'request' | 'release' | 'audio';
  audioData?: string; // base64 encoded audio chunk
}

/**
 * PTT Notification Result
 */
export interface IPTTNotificationResult {
  success: boolean;
  channel: string;
  action: string;
  granted?: boolean;
  reason?: string;
}

/**
 * PTT Statistics
 */
export interface IPTTStatistics {
  totalChannels: number;
  activeChannels: number;
  totalSessions: number;
  totalDuration: number; // seconds
  averageSessionDuration: number; // seconds
}

/**
 * PTT Notification Service Class
 */
export class PTTNotificationService {
  private readonly channels: Map<string, IPTTChannel> = new Map();
  private readonly sessions: Map<string, IPTTSession> = new Map();
  private readonly sessionHistory: Array<{ channelId: string; userId: number; startTime: Date; endTime?: Date; duration?: number }> = [];

  /**
   * Create a new PTT channel
   */
  createChannel(config: Omit<IPTTChannel, 'isActive'>): IPTTChannel {
    const channel: IPTTChannel = {
      ...config,
      isActive: true,
    };

    this.channels.set(channel.id, channel);
    logger.info(`PTT Channel created: ${channel.id} (${channel.name})`);

    return channel;
  }

  /**
   * Get channel by ID
   */
  getChannel(channelId: string): IPTTChannel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Get channels for a user
   */
  getUserChannels(userId: number): IPTTChannel[] {
    return Array.from(this.channels.values()).filter(
      channel => channel.memberIds.includes(userId) && channel.isActive
    );
  }

  /**
   * Handle PTT notification from client
   */
  async handlePTTNotification(request: IPTTNotificationRequest): Promise<IPTTNotificationResult> {
    const channel = this.channels.get(request.channelId);
    if (!channel) {
      return {
        success: false,
        channel: request.channelId,
        action: request.type,
        reason: 'Channel not found',
      };
    }

    if (!channel.isActive) {
      return {
        success: false,
        channel: request.channelId,
        action: request.type,
        reason: 'Channel is not active',
      };
    }

    // Check if user is a channel member
    if (!channel.memberIds.includes(request.userId)) {
      return {
        success: false,
        channel: request.channelId,
        action: request.type,
        reason: 'User is not a channel member',
      };
    }

    switch (request.type) {
      case 'request':
        return this.handleSpeakRequest(request.channelId, request.userId);
      case 'release':
        return this.handleReleaseRequest(request.channelId, request.userId);
      case 'audio':
        return this.handleAudioData(request.channelId, request.userId, request.audioData!);
      default:
        return {
          success: false,
          channel: request.channelId,
          action: request.type,
          reason: 'Unknown action type',
        };
    }
  }

  /**
   * Handle speak request
   */
  private handleSpeakRequest(channelId: string, userId: number): IPTTNotificationResult {
    const session = this.sessions.get(channelId);

    // Check if someone is already speaking
    if (session?.currentSpeaker && session.currentSpeaker !== userId) {
      return {
        success: false,
        channel: channelId,
        action: 'request',
        granted: false,
        reason: `Channel busy (user ${session.currentSpeaker} is speaking)`,
      };
    }

    // Grant speaking permission
    const now = new Date();
    if (!session) {
      this.sessions.set(channelId, {
        channelId,
        currentSpeaker: userId,
        speakerStartTime: now,
        isBroadcasting: true,
        listeners: new Set(this.getChannel(channelId)?.memberIds || []),
      });
    } else {
      session.currentSpeaker = userId;
      session.speakerStartTime = now;
      session.isBroadcasting = true;
    }

    // Broadcast grant to all channel members
    const io = getIoInstance();
    io.of(WS_NAMESPACES.GUARDS).to(channelId).emit(WS_EVENTS.PTT_GRANTED, {
      channelId,
      userId,
      timestamp: now,
    });

    logger.info(`PTT: User ${userId} granted speaking on channel ${channelId}`);

    return {
      success: true,
      channel: channelId,
      action: 'request',
      granted: true,
    };
  }

  /**
   * Handle release request
   */
  private handleReleaseRequest(channelId: string, userId: number): IPTTNotificationResult {
    const session = this.sessions.get(channelId);

    if (!session || session.currentSpeaker !== userId) {
      return {
        success: false,
        channel: channelId,
        action: 'release',
        reason: 'User is not the current speaker',
      };
    }

    // Calculate session duration
    const duration = session.speakerStartTime
      ? (Date.now() - session.speakerStartTime.getTime()) / 1000
      : 0;

    // Record session history
    this.sessionHistory.push({
      channelId,
      userId: session.currentSpeaker,
      startTime: session.speakerStartTime!,
      endTime: new Date(),
      duration,
    });

    // Clear speaker
    session.currentSpeaker = undefined;
    session.speakerStartTime = undefined;
    session.isBroadcasting = false;

    // Broadcast release to all channel members
    const io = getIoInstance();
    io.of(WS_NAMESPACES.GUARDS).to(channelId).emit(WS_EVENTS.PTT_RELEASE, {
      channelId,
      userId,
      duration,
      timestamp: new Date(),
    });

    logger.info(`PTT: User ${userId} released speaking on channel ${channelId} (${duration}s)`);

    return {
      success: true,
      channel: channelId,
      action: 'release',
    };
  }

  /**
   * Handle audio data (broadcast to listeners)
   */
  private handleAudioData(channelId: string, userId: number, audioData: string): IPTTNotificationResult {
    const session = this.sessions.get(channelId);

    if (!session || session.currentSpeaker !== userId) {
      return {
        success: false,
        channel: channelId,
        action: 'audio',
        reason: 'User is not the current speaker',
      };
    }

    // Broadcast audio to all listeners except sender
    const io = getIoInstance();
    io.of(WS_NAMESPACES.GUARDS).to(channelId).except(`user:${userId}`).emit(WS_EVENTS.PTT_AUDIO_STREAM, {
      channelId,
      userId,
      audio: audioData,
      timestamp: new Date(),
    });

    return {
      success: true,
      channel: channelId,
      action: 'audio',
    };
  }

  /**
   * Add user to channel
   */
  addChannelMember(channelId: string, userId: number): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    if (!channel.memberIds.includes(userId)) {
      channel.memberIds.push(userId);
    }

    return true;
  }

  /**
   * Remove user from channel
   */
  removeChannelMember(channelId: string, userId: number): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    channel.memberIds = channel.memberIds.filter(id => id !== userId);

    // If user was speaking, release the mic
    const session = this.sessions.get(channelId);
    if (session?.currentSpeaker === userId) {
      this.handleReleaseRequest(channelId, userId);
    }

    return true;
  }

  /**
   * Deactivate a channel
   */
  deactivateChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (!channel) return false;

    channel.isActive = false;

    // End any active session
    const session = this.sessions.get(channelId);
    if (session?.currentSpeaker) {
      this.handleReleaseRequest(channelId, session.currentSpeaker);
    }

    this.sessions.delete(channelId);
    logger.info(`PTT Channel deactivated: ${channelId}`);

    return true;
  }

  /**
   * Get PTT statistics
   */
  getStatistics(): IPTTStatistics {
    const activeChannels = Array.from(this.sessions.values()).filter(s => s.isBroadcasting).length;

    const totalDuration = this.sessionHistory.reduce((sum, session) => sum + (session.duration || 0), 0);
    const averageSessionDuration = this.sessionHistory.length > 0
      ? totalDuration / this.sessionHistory.length
      : 0;

    return {
      totalChannels: this.channels.size,
      activeChannels,
      totalSessions: this.sessionHistory.length,
      totalDuration: Math.round(totalDuration),
      averageSessionDuration: Math.round(averageSessionDuration),
    };
  }

  /**
   * Clean up inactive channels
   */
  cleanupInactiveChannels(): number {
    let cleaned = 0;

    for (const [channelId, channel] of this.channels) {
      if (!channel.isActive) {
        this.channels.delete(channelId);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get all active channels
   */
  getActiveChannels(): IPTTChannel[] {
    return Array.from(this.channels.values()).filter(c => c.isActive);
  }
}

/**
 * Singleton instance management
 */
let pttNotificationServiceInstance: PTTNotificationService | null = null;

export function initializePTTNotificationService(): PTTNotificationService {
  pttNotificationServiceInstance = new PTTNotificationService();
  return pttNotificationServiceInstance;
}

export function getPTTNotificationService(): PTTNotificationService {
  if (!pttNotificationServiceInstance) {
    throw new Error('PTTNotificationService not initialized');
  }
  return pttNotificationServiceInstance;
}

export default PTTNotificationService;
