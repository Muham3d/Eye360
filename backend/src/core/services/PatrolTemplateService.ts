/**
 * Patrol Template Service
 *
 * Business logic for patrol templates and checkpoint sequences.
 *
 * @module core/services/PatrolTemplateService
 */

import {
  ValidationError,
  NotFoundError,
} from '../domain/errors/index.js';
import type { IPatrolTemplateRepository } from '../domain/repositories/IPatrolTemplateRepository.js';
import type { IPatrolCheckpointRepository } from '../domain/repositories/IPatrolCheckpointRepository.js';

export class PatrolTemplateService {
  constructor(
    private readonly templateRepository: IPatrolTemplateRepository,
    private readonly patrolCheckpointRepository: IPatrolCheckpointRepository
  ) {}

  async createTemplate(data: any) {
    return this.templateRepository.create(data);
  }

  async getTemplateById(id: number) {
    return this.templateRepository.findById(id);
  }

  async getTemplateWithDetails(id: number) {
    const template = await this.templateRepository.findById(id);
    if (!template) return null;

    const checkpoints = await this.patrolCheckpointRepository.findByTemplateIdWithDetail(id);
    return { ...template, checkpoints };
  }

  async listTemplates(options: any = {}) {
    return this.templateRepository.findAll(options);
  }

  async updateCheckpointSequence(templateId: number, sequence: Array<{checkpointId: number, sequenceOrder: number}>) {
    return this.patrolCheckpointRepository.updateSequenceOrder(templateId, sequence);
  }
}

let instance: PatrolTemplateService | null = null;

export function initializePatrolTemplateService(
  templateRepository: IPatrolTemplateRepository,
  patrolCheckpointRepository: IPatrolCheckpointRepository
): PatrolTemplateService {
  instance = new PatrolTemplateService(templateRepository, patrolCheckpointRepository);
  return instance;
}

export function getPatrolTemplateService(): PatrolTemplateService {
  if (!instance) throw new Error('PatrolTemplateService not initialized');
  return instance;
}
