/**
 * Site Service
 *
 * Business logic for site management.
 *
 * @module core/services/SiteService
 */

import {
  ValidationError,
  NotFoundError,
} from '../domain/errors/index.js';
import type { ISiteRepository } from '../domain/repositories/ISiteRepository.js';
import type { ISite, ICreateSiteDTO, IUpdateSiteDTO, ISiteQueryOptions } from '../domain/entities/Site.js';

export class SiteService {
  constructor(private readonly siteRepository: ISiteRepository) {}

  async createSite(data: ICreateSiteDTO): Promise<ISite> {
    if (!data.name || data.name.trim().length === 0) {
      throw new ValidationError('Site name is required');
    }
    return this.siteRepository.create(data);
  }

  async updateSite(id: number, data: IUpdateSiteDTO): Promise<ISite> {
    const existing = await this.siteRepository.findById(id);
    if (!existing) throw new NotFoundError(`Site with ID ${id} not found`);
    
    const updated = await this.siteRepository.update(id, data);
    if (!updated) throw new Error('Failed to update site');
    return updated;
  }

  async getSiteById(id: number): Promise<ISite | null> {
    return this.siteRepository.findById(id);
  }

  async listSites(options: ISiteQueryOptions = {}) {
    return this.siteRepository.findAll(options);
  }

  async deleteSite(id: number): Promise<boolean> {
    return this.siteRepository.delete(id);
  }
}

let instance: SiteService | null = null;

export function initializeSiteService(siteRepository: ISiteRepository): SiteService {
  instance = new SiteService(siteRepository);
  return instance;
}

export function getSiteService(): SiteService {
  if (!instance) throw new Error('SiteService not initialized');
  return instance;
}
