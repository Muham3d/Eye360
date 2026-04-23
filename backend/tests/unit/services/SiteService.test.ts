/**
 * SiteService Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SiteService } from '../../../src/core/services/SiteService.js';
import type { ISiteRepository } from '../../../src/core/domain/repositories/ISiteRepository.js';
import { ValidationError, NotFoundError } from '../../../src/core/domain/errors/index.js';
import {
  createSiteFactory,
  createSiteDTOFactory,
  createUpdateSiteDTOFactory,
  createPaginatedResultFactory,
} from '../../utils/test-factories.js';

describe('SiteService', () => {
  let siteService: SiteService;
  let mockSiteRepository: jest.Mocked<ISiteRepository>;

  beforeEach(() => {
    mockSiteRepository = {
      findById: jest.fn(),
      findByName: jest.fn(),
      findAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      nameExists: jest.fn(),
      getStatistics: jest.fn(),
      validateGeofence: jest.fn(),
      isLocationInGeofence: jest.fn(),
      findSitesByLocation: jest.fn(),
      findByCreatedBy: jest.fn(),
      findActive: jest.fn(),
      archive: jest.fn(),
      calculateGeofenceArea: jest.fn(),
      calculateGeofencePerimeter: jest.fn(),
    } as any;

    siteService = new SiteService(mockSiteRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSite', () => {
    it('should create a site with valid data', async () => {
      const siteData = createSiteDTOFactory();
      const expectedSite = createSiteFactory(siteData);
      mockSiteRepository.create.mockResolvedValue(expectedSite);

      const result = await siteService.createSite(siteData);

      expect(result).toEqual(expectedSite);
      expect(mockSiteRepository.create).toHaveBeenCalledWith(siteData);
    });

    it('should throw ValidationError if name is missing', async () => {
      const siteData = createSiteDTOFactory({ name: '' });

      await expect(siteService.createSite(siteData))
        .rejects.toThrow(ValidationError);
      await expect(siteService.createSite(siteData))
        .rejects.toThrow('Site name is required');
    });

    it('should throw ValidationError if name is only whitespace', async () => {
      const siteData = createSiteDTOFactory({ name: '   ' });

      await expect(siteService.createSite(siteData))
        .rejects.toThrow(ValidationError);
      await expect(siteService.createSite(siteData))
        .rejects.toThrow('Site name is required');
    });
  });

  describe('updateSite', () => {
    it('should update a site successfully', async () => {
      const siteId = 1;
      const updateData = createUpdateSiteDTOFactory();
      const existingSite = createSiteFactory({ id: siteId });
      const updatedSite = createSiteFactory({ ...existingSite, ...updateData });

      mockSiteRepository.findById.mockResolvedValue(existingSite);
      mockSiteRepository.update.mockResolvedValue(updatedSite);

      const result = await siteService.updateSite(siteId, updateData);

      expect(result).toEqual(updatedSite);
      expect(mockSiteRepository.findById).toHaveBeenCalledWith(siteId);
      expect(mockSiteRepository.update).toHaveBeenCalledWith(siteId, updateData);
    });

    it('should throw NotFoundError if site does not exist', async () => {
      const siteId = 999;
      const updateData = createUpdateSiteDTOFactory();
      mockSiteRepository.findById.mockResolvedValue(null);

      await expect(siteService.updateSite(siteId, updateData))
        .rejects.toThrow(NotFoundError);
      expect(mockSiteRepository.update).not.toHaveBeenCalled();
    });

    it('should throw Error if repository update fails', async () => {
      const siteId = 1;
      const updateData = createUpdateSiteDTOFactory();
      const existingSite = createSiteFactory({ id: siteId });

      mockSiteRepository.findById.mockResolvedValue(existingSite);
      mockSiteRepository.update.mockResolvedValue(null);

      await expect(siteService.updateSite(siteId, updateData))
        .rejects.toThrow('Failed to update site');
    });
  });

  describe('getSiteById', () => {
    it('should return a site if it exists', async () => {
      const siteId = 1;
      const site = createSiteFactory({ id: siteId });
      mockSiteRepository.findById.mockResolvedValue(site);

      const result = await siteService.getSiteById(siteId);

      expect(result).toEqual(site);
      expect(mockSiteRepository.findById).toHaveBeenCalledWith(siteId);
    });

    it('should return null if site does not exist', async () => {
      const siteId = 999;
      mockSiteRepository.findById.mockResolvedValue(null);

      const result = await siteService.getSiteById(siteId);

      expect(result).toBeNull();
    });
  });

  describe('listSites', () => {
    it('should return a list of sites', async () => {
      const sites = [createSiteFactory({ id: 1 }), createSiteFactory({ id: 2 })];
      const paginatedResult = createPaginatedResultFactory(sites);
      mockSiteRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await siteService.listSites();

      expect(result).toEqual(paginatedResult);
      expect(mockSiteRepository.findAll).toHaveBeenCalled();
    });

    it('should pass options to repository', async () => {
      const options = { page: 2, limit: 10 };
      const paginatedResult = createPaginatedResultFactory([]);
      mockSiteRepository.findAll.mockResolvedValue(paginatedResult);

      await siteService.listSites(options);

      expect(mockSiteRepository.findAll).toHaveBeenCalledWith(options);
    });
  });

  describe('deleteSite', () => {
    it('should delete a site successfully', async () => {
      const siteId = 1;
      mockSiteRepository.delete.mockResolvedValue(true);

      const result = await siteService.deleteSite(siteId);

      expect(result).toBe(true);
      expect(mockSiteRepository.delete).toHaveBeenCalledWith(siteId);
    });

    it('should return false if site deletion fails', async () => {
      const siteId = 999;
      mockSiteRepository.delete.mockResolvedValue(false);

      const result = await siteService.deleteSite(siteId);

      expect(result).toBe(false);
    });
  });
});
