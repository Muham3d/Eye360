import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SiteService, initializeSiteService, getSiteService } from '../../../src/core/services/SiteService.js';
import type { ISiteRepository } from '../../../src/core/domain/repositories/ISiteRepository.js';
import {
  ValidationError,
  NotFoundError,
} from '../../../src/core/domain/errors/index.js';
import {
  createSiteFactory,
  createSiteDTOFactory,
  updateSiteDTOFactory,
  createPaginatedResultFactory,
  createSiteStatisticsFactory,
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
    } as unknown as jest.Mocked<ISiteRepository>;

    siteService = new SiteService(mockSiteRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSite', () => {
    it('should create a site successfully', async () => {
      const siteDTO = createSiteDTOFactory();
      const createdSite = createSiteFactory({ ...siteDTO, id: 1 });

      mockSiteRepository.create.mockResolvedValue(createdSite);

      const result = await siteService.createSite(siteDTO);

      expect(result).toEqual(createdSite);
      expect(mockSiteRepository.create).toHaveBeenCalledWith(siteDTO);
    });

    it('should throw ValidationError if name is missing', async () => {
      const siteDTO = createSiteDTOFactory({ name: '' });

      await expect(siteService.createSite(siteDTO)).rejects.toThrow(ValidationError);
      await expect(siteService.createSite(siteDTO)).rejects.toThrow('Site name is required');
      expect(mockSiteRepository.create).not.toHaveBeenCalled();
    });

    it('should throw ValidationError if name contains only spaces', async () => {
      const siteDTO = createSiteDTOFactory({ name: '   ' });

      await expect(siteService.createSite(siteDTO)).rejects.toThrow(ValidationError);
      await expect(siteService.createSite(siteDTO)).rejects.toThrow('Site name is required');
      expect(mockSiteRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateSite', () => {
    it('should update a site successfully', async () => {
      const existingSite = createSiteFactory({ id: 1 });
      const updateDTO = updateSiteDTOFactory();
      const updatedSite = createSiteFactory({ ...existingSite, ...updateDTO });

      mockSiteRepository.findById.mockResolvedValue(existingSite);
      mockSiteRepository.update.mockResolvedValue(updatedSite);

      const result = await siteService.updateSite(1, updateDTO);

      expect(result).toEqual(updatedSite);
      expect(mockSiteRepository.findById).toHaveBeenCalledWith(1);
      expect(mockSiteRepository.update).toHaveBeenCalledWith(1, updateDTO);
    });

    it('should throw NotFoundError if site is not found', async () => {
      const updateDTO = updateSiteDTOFactory();
      mockSiteRepository.findById.mockResolvedValue(null);

      await expect(siteService.updateSite(999, updateDTO)).rejects.toThrow(NotFoundError);
      await expect(siteService.updateSite(999, updateDTO)).rejects.toThrow('Site with ID 999 not found');
      expect(mockSiteRepository.update).not.toHaveBeenCalled();
    });

    it('should throw Error if update fails (returns null)', async () => {
      const existingSite = createSiteFactory({ id: 1 });
      const updateDTO = updateSiteDTOFactory();

      mockSiteRepository.findById.mockResolvedValue(existingSite);
      mockSiteRepository.update.mockResolvedValue(null);

      await expect(siteService.updateSite(1, updateDTO)).rejects.toThrow(Error);
      await expect(siteService.updateSite(1, updateDTO)).rejects.toThrow('Failed to update site');
    });
  });

  describe('getSiteById', () => {
    it('should return site if found', async () => {
      const site = createSiteFactory({ id: 1 });
      mockSiteRepository.findById.mockResolvedValue(site);

      const result = await siteService.getSiteById(1);

      expect(result).toEqual(site);
      expect(mockSiteRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should return null if site not found', async () => {
      mockSiteRepository.findById.mockResolvedValue(null);

      const result = await siteService.getSiteById(999);

      expect(result).toBeNull();
      expect(mockSiteRepository.findById).toHaveBeenCalledWith(999);
    });
  });

  describe('listSites', () => {
    it('should return paginated list of sites', async () => {
      const sites = [createSiteFactory({ id: 1 }), createSiteFactory({ id: 2 })];
      const paginatedResult = createPaginatedResultFactory(sites);
      const queryOptions = { page: 1, limit: 10 };

      mockSiteRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await siteService.listSites(queryOptions);

      expect(result).toEqual(paginatedResult);
      expect(mockSiteRepository.findAll).toHaveBeenCalledWith(queryOptions);
    });

    it('should work with no options provided', async () => {
      const paginatedResult = createPaginatedResultFactory([]);
      mockSiteRepository.findAll.mockResolvedValue(paginatedResult);

      const result = await siteService.listSites();

      expect(result).toEqual(paginatedResult);
      expect(mockSiteRepository.findAll).toHaveBeenCalledWith({});
    });
  });

  describe('deleteSite', () => {
    it('should delete a site successfully', async () => {
      const site = createSiteFactory({ id: 1 });
      mockSiteRepository.findById.mockResolvedValue(site);
      mockSiteRepository.delete.mockResolvedValue(true);

      const result = await siteService.deleteSite(1);

      expect(result).toBe(true);
      expect(mockSiteRepository.findById).toHaveBeenCalledWith(1);
      expect(mockSiteRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError if site to delete is not found', async () => {
      mockSiteRepository.findById.mockResolvedValue(null);

      await expect(siteService.deleteSite(999)).rejects.toThrow(NotFoundError);
      await expect(siteService.deleteSite(999)).rejects.toThrow('Site with ID 999 not found');
      expect(mockSiteRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('getSiteStatistics', () => {
    it('should return site statistics successfully', async () => {
      const site = createSiteFactory({ id: 1 });
      const stats = createSiteStatisticsFactory({ siteId: 1 });

      mockSiteRepository.findById.mockResolvedValue(site);
      mockSiteRepository.getStatistics.mockResolvedValue(stats);

      const result = await siteService.getSiteStatistics(1);

      expect(result).toEqual(stats);
      expect(mockSiteRepository.findById).toHaveBeenCalledWith(1);
      expect(mockSiteRepository.getStatistics).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundError if site is not found', async () => {
      mockSiteRepository.findById.mockResolvedValue(null);

      await expect(siteService.getSiteStatistics(999)).rejects.toThrow(NotFoundError);
      await expect(siteService.getSiteStatistics(999)).rejects.toThrow('Site with ID 999 not found');
      expect(mockSiteRepository.getStatistics).not.toHaveBeenCalled();
    });
  });

  describe('initialization', () => {
    it('should initialize and return the service instance', () => {
      const instance = initializeSiteService(mockSiteRepository);
      expect(instance).toBeInstanceOf(SiteService);
    });

    it('should return the initialized service instance via getSiteService', () => {
      initializeSiteService(mockSiteRepository);
      const instance = getSiteService();
      expect(instance).toBeInstanceOf(SiteService);
    });


    });
  });
});
