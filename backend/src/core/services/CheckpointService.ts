/**
 * Checkpoint Service
 *
 * Business logic for checkpoint management.
 *
 * @module core/services/CheckpointService
 */

import {
  ValidationError,
  NotFoundError,
} from '../domain/errors/index.js';
import type { ICheckpointRepository } from '../domain/repositories/ICheckpointRepository.js';
import type { ICheckpoint, ICreateCheckpointDTO, IUpdateCheckpointDTO, ICheckpointQueryOptions } from '../domain/entities/Checkpoint.js';

export class CheckpointService {
  constructor(private readonly checkpointRepository: ICheckpointRepository) {}

  async createCheckpoint(data: ICreateCheckpointDTO): Promise<ICheckpoint> {
    if (!data.name) throw new ValidationError('Checkpoint name is required');
    return this.checkpointRepository.create(data);
  }

  async updateCheckpoint(id: number, data: IUpdateCheckpointDTO): Promise<ICheckpoint> {
    const existing = await this.checkpointRepository.findById(id);
    if (!existing) throw new NotFoundError(`Checkpoint with ID ${id} not found`);
    
    const updated = await this.checkpointRepository.update(id, data);
    if (!updated) throw new Error('Failed to update checkpoint');
    return updated;
  }

  async getCheckpointById(id: number): Promise<ICheckpoint | null> {
    return this.checkpointRepository.findById(id);
  }

  async listCheckpoints(options: ICheckpointQueryOptions = {}) {
    return this.checkpointRepository.findAll(options);
  }

  async deleteCheckpoint(id: number): Promise<boolean> {
    return this.checkpointRepository.delete(id);
  }

  async getCheckpointsBySite(siteId: number) {
    return this.checkpointRepository.findBySiteId(siteId);
  }
}

let instance: CheckpointService | null = null;

export function initializeCheckpointService(checkpointRepository: ICheckpointRepository): CheckpointService {
  instance = new CheckpointService(checkpointRepository);
  return instance;
}

export function getCheckpointService(): CheckpointService {
  if (!instance) throw new Error('CheckpointService not initialized');
  return instance;
}
