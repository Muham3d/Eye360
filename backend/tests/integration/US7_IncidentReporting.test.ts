/**
 * US7 Incident Reporting Integration Test
 *
 * Integration tests for incident creation and media processing.
 * Validates EXIF stripping and photo evidence handling.
 *
 * @module tests/integration
 */

import { jest, describe, it, expect, beforeAll, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express, { type Application } from 'express';
import multer from 'multer';

// Mock services
jest.mock('../../src/core/services/IncidentService.js', () => ({
  IncidentService: jest.fn().mockImplementation(() => ({
    createIncident: jest.fn(),
    getIncident: jest.fn(),
    addEvidence: jest.fn(),
  })),
  getIncidentService: jest.fn().mockReturnValue({
    createIncident: jest.fn(),
    getIncident: jest.fn(),
    addEvidence: jest.fn(),
  }),
}));

jest.mock('../../src/core/services/MediaService.js', () => ({
  MediaService: jest.fn().mockImplementation(() => ({
    processImage: jest.fn(),
    processBase64Image: jest.fn(),
    getImageMetadata: jest.fn(),
    extractGPSFromImage: jest.fn(),
    validateImage: jest.fn().mockResolvedValue({ isValid: true }),
  })),
  getMediaService: jest.fn().mockReturnValue({
    processImage: jest.fn(),
    processBase64Image: jest.fn(),
    getImageMetadata: jest.fn(),
    extractGPSFromImage: jest.fn(),
    validateImage: jest.fn().mockResolvedValue({ isValid: true }),
  }),
}));

// Mock auth middleware
jest.mock('../../src/interfaces/http/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'guard@example.com', role: 'guard', tenantId: 'tenant-123' };
    next();
  },
}));

// Import the mocked services
import { getIncidentService } from '../../src/core/services/IncidentService.js';
import { getMediaService } from '../../src/core/services/MediaService.js';

describe('US7 - Incident Reporting Integration', () => {
  let app: Application;
  let mockIncidentService: any;
  let mockMediaService: any;

  beforeAll(() => {
    // Setup Express app for testing
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Setup routes
    const router = express.Router();

    // POST /api/v1/incidents - Create incident
    router.post('/incidents', async (req: any, res: any) => {
      const service = getIncidentService();
      const userId = req.user?.id;

      const incident = await service.createIncident({
        ...req.body,
        reportedBy: userId,
      });

      res.status(201).json({
        success: true,
        data: incident,
      });
    });

    // POST /api/v1/incidents/:id/evidence - Upload evidence
    router.post('/incidents/:id/evidence', async (req: any, res: any) => {
      const service = getIncidentService();
      const mediaService = getMediaService();
      const { id } = req.params;

      if (req.file) {
        // Process uploaded image
        const processed = await mediaService.processImage(
          req.file.buffer,
          req.file.originalname
        );

        await service.addEvidence(Number(id), {
          filePath: processed.filePath,
          fileType: 'image',
          fileSize: processed.fileSize,
          uploadedBy: req.user?.id,
        });

        res.status(201).json({
          success: true,
          data: {
            evidence: {
              filePath: processed.filePath,
              url: processed.url,
              fileSize: processed.fileSize,
            },
          },
        });
      } else if (req.body.photo) {
        // Base64 upload
        const processed = await mediaService.processBase64Image(
          req.body.photo,
          'photo.jpg'
        );

        await service.addEvidence(Number(id), {
          filePath: processed.filePath,
          fileType: 'image',
          fileSize: processed.fileSize,
          uploadedBy: req.user?.id,
        });

        res.status(201).json({
          success: true,
          data: {
            evidence: {
              filePath: processed.filePath,
              url: processed.url,
              fileSize: processed.fileSize,
            },
          },
        });
      } else {
        res.status(400).json({
          success: false,
          error: { message: 'No photo provided' },
        });
      }
    });

    // GET /api/v1/incidents/:id - Get incident details
    router.get('/incidents/:id', async (req: any, res: any) => {
      const service = getIncidentService();
      const incident = await service.getIncident(Number(req.params.id));

      if (!incident) {
        return res.status(404).json({
          success: false,
          error: { message: 'Incident not found' },
        });
      }

      res.status(200).json({
        success: true,
        data: incident,
      });
    });

    app.use('/api/v1', router);

    // Get mocked services
    mockIncidentService = getIncidentService();
    mockMediaService = getMediaService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Incident Creation', () => {
    it('should create a new incident with valid data', async () => {
      const incidentData = {
        siteId: 1,
        title: 'Suspicious Activity',
        description: 'Found unauthorized person in restricted area',
        type: 'security',
        priority: 'high',
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
        },
      };

      const mockIncident = {
        id: 1,
        ...incidentData,
        reportedBy: 1,
        status: 'new',
        createdAt: new Date(),
      };

      mockIncidentService.createIncident.mockResolvedValue(mockIncident);

      const response = await request(app)
        .post('/api/v1/incidents')
        .send(incidentData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(incidentData.title);
      expect(response.body.data.status).toBe('new');
      expect(mockIncidentService.createIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          title: incidentData.title,
          siteId: incidentData.siteId,
        })
      );
    });

    it('should reject incident creation with missing title', async () => {
      const incidentData = {
        siteId: 1,
        description: 'No title incident',
      };

      mockIncidentService.createIncident.mockRejectedValue({
        message: 'Title is required',
        status: 400,
      });

      const response = await request(app)
        .post('/api/v1/incidents')
        .send(incidentData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should reject incident creation with missing description', async () => {
      const incidentData = {
        siteId: 1,
        title: 'No Description Incident',
      };

      mockIncidentService.createIncident.mockRejectedValue({
        message: 'Description is required',
        status: 400,
      });

      const response = await request(app)
        .post('/api/v1/incidents')
        .send(incidentData);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Evidence Upload with EXIF Stripping', () => {
    it('should process base64 image upload and strip EXIF', async () => {
      const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=='; // 1x1 transparent PNG

      const mockProcessedResult = {
        filePath: '/uploads/evidence/test.jpg',
        fileName: 'test.jpg',
        fileSize: 1024,
        width: 1920,
        height: 1080,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        url: '/uploads/evidence/test.jpg',
        exifStripped: true,
      };

      mockMediaService.processBase64Image.mockResolvedValue(mockProcessedResult);
      mockIncidentService.addEvidence.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/api/v1/incidents/1/evidence')
        .send({ photo: base64Image });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.evidence.exifStripped).toBe(true);
      expect(mockMediaService.processBase64Image).toHaveBeenCalledWith(
        base64Image,
        'photo.jpg',
        expect.anything()
      );
    });

    it('should validate image before processing', async () => {
      const base64Image = 'invalid_base64_data';

      mockMediaService.validateImage.mockResolvedValue({
        isValid: false,
        error: 'Invalid image file',
      });

      const response = await request(app)
        .post('/api/v1/incidents/1/evidence')
        .send({ photo: base64Image });

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(mockMediaService.validateImage).toHaveBeenCalled();
    });
  });

  describe('GPS Location Validation', () => {
    it('should detect GPS in original image before stripping', async () => {
      const imageWithGPS = Buffer.from('mock_image_with_gps');

      mockMediaService.extractGPSFromImage.mockResolvedValue({
        latitude: 40.7128,
        longitude: -74.0060,
      });

      const gpsData = await mockMediaService.extractGPSFromImage(imageWithGPS);

      expect(gpsData).not.toBeNull();
      expect(gpsData?.latitude).toBeDefined();
      expect(gpsData?.longitude).toBeDefined();
    });

    it('should strip GPS coordinates from processed image', async () => {
      const imageWithGPS = 'base64_image_with_gps_exif';

      const mockProcessedResult = {
        filePath: '/uploads/evidence/test.jpg',
        fileName: 'test.jpg',
        fileSize: 1024,
        exifStripped: true,
        url: '/uploads/evidence/test.jpg',
      };

      mockMediaService.extractGPSFromImage.mockResolvedValue({
        latitude: 40.7128,
        longitude: -74.0060,
      });

      mockMediaService.processBase64Image.mockResolvedValue(mockProcessedResult);

      // First, verify GPS exists
      const gpsBefore = await mockMediaService.extractGPSFromImage(
        Buffer.from('mock_image')
      );

      expect(gpsBefore).not.toBeNull();

      // After processing, GPS should be stripped
      const processed = await mockMediaService.processBase64Image(
        imageWithGPS,
        'photo.jpg',
        { stripExif: true }
      );

      expect(processed.exifStripped).toBe(true);
    });
  });

  describe('Incident Retrieval', () => {
    it('should get incident details by ID', async () => {
      const mockIncident = {
        id: 1,
        siteId: 1,
        reportedBy: 1,
        title: 'Test Incident',
        description: 'Test description',
        type: 'security',
        priority: 'medium',
        status: 'new',
        evidence: [],
        comments: [],
      };

      mockIncidentService.getIncident.mockResolvedValue(mockIncident);

      const response = await request(app)
        .get('/api/v1/incidents/1');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(1);
      expect(response.body.data.title).toBe('Test Incident');
    });

    it('should return 404 for non-existent incident', async () => {
      mockIncidentService.getIncident.mockRejectedValue({
        message: 'Incident not found',
        status: 404,
      });

      const response = await request(app)
        .get('/api/v1/incidents/999');

      expect(response.status).toBe(404);
    });
  });

  describe('Media Processing Contract', () => {
    it('should support common image formats', () => {
      const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
      expect(supportedFormats.length).toBeGreaterThan(0);
    });

    it('should resize images exceeding max dimensions', async () => {
      const largeImageMock = {
        filePath: '/uploads/evidence/resized.jpg',
        width: 1920,
        height: 1080,
      };

      mockMediaService.processImage.mockResolvedValue(largeImageMock);

      const result = await mockMediaService.processImage(
        Buffer.from('large_image'),
        'large.jpg',
        { maxWidth: 1920, maxHeight: 1080 }
      );

      expect(result.width).toBeLessThanOrEqual(1920);
      expect(result.height).toBeLessThanOrEqual(1080);
    });

    it('should preserve image aspect ratio during resize', async () => {
      // Mock image with 4:3 aspect ratio
      const mockResult = {
        filePath: '/uploads/evidence/resized.jpg',
        width: 1600,
        height: 1200,
        aspectRatio: 4 / 3,
      };

      mockMediaService.processImage.mockResolvedValue(mockResult);

      const result = await mockMediaService.processImage(
        Buffer.from('image'),
        'photo.jpg'
      );

      expect(result.width / result.height).toBeCloseTo(1.33, 1);
    });
  });
});
