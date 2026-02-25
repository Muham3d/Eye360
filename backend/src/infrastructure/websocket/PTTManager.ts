/**
 * PTT Manager
 *
 * Manages speaker locks for half-duplex PTT channels.
 */

import { Socket } from 'socket.io';
import logger from '../config/logger.js';

export class PTTManager {
  private activeSpeakers: Map<string, string> = new Map(); // channel -> socketId

  async handlePTTRequest(socket: Socket, channel: string) {
    if (this.activeSpeakers.has(channel)) {
      socket.emit('ptt_denied', { channel, reason: 'Channel busy' });
      return;
    }

    this.activeSpeakers.set(channel, socket.id);
    socket.emit('ptt_granted', { channel });
    socket.to(channel).emit('ptt_broadcast_start', { userId: (socket as any).user?.sub, channel });
    logger.info(`PTT Granted: ${socket.id} on channel ${channel}`);
  }

  handlePTTRelease(socket: Socket, channel: string) {
    if (this.activeSpeakers.get(channel) === socket.id) {
      this.activeSpeakers.delete(channel);
      socket.to(channel).emit('ptt_broadcast_end', { channel });
      logger.info(`PTT Released: ${socket.id} on channel ${channel}`);
    }
  }

  handleAudioStream(socket: Socket, data: { channel: string, audio: any }) {
    if (this.activeSpeakers.get(data.channel) === socket.id) {
      socket.to(data.channel).emit('ptt_audio_stream', {
        userId: (socket as any).user?.sub,
        audio: data.audio
      });
    }
  }

  handleDisconnect(socketId: string) {
    for (const [channel, speakerId] of this.activeSpeakers.entries()) {
      if (speakerId === socketId) {
        this.activeSpeakers.delete(channel);
      }
    }
  }
}

export default new PTTManager();
