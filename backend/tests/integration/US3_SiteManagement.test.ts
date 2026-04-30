import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express, { type Router } from 'express';

// Import domain entities directly
import { VerificationType } from '../../src/core/domain/entities/Checkpoint';

// Import services directly, avoiding the index.ts with its .js imports
// We'll mock the services themselves

// Import controllers (no .js for ESM jest)
import SiteController from '../../src/interfaces/http/controllers/SiteController';
import CheckpointController from '../../src/interfaces/http/controllers/CheckpointController';

// Mock auth middleware to bypass real authentication (no .js for ESM jest)
jest.mock('../../src/interfaces/http/middleware/authMiddleware', () => ({
    authMiddleware: (req: any, res: any, next: any) => {
        req.user = { id: 1, email: 'admin@example.com', role: 'admin', tenantId: 'tenant-123' };
        next();
    },
    requireRole: () => (req: any, res: any, next: any) => next(),
    authorize: () => (req: any, res: any, next: any) => next(),
    sessionAuthMiddleware: (req: any, res: any, next: any) => {
        req.session = { user: { id: 1, email: 'admin@example.com', role: 'admin', tenantId: 'tenant-123' } };
        next();
    },
    optionalAuthMiddleware: (req: any, res: any, next: any) => next()
}));

// Mock the services module to avoid .js import issues
jest.mock('../../src/core/services/SiteService', () => ({
    SiteService: jest.fn().mockImplementation(() => ({
        createSite: jest.fn(),
        listSites: jest.fn(),
        getSiteById: jest.fn(),
        updateSite: jest.fn(),
        deleteSite: jest.fn(),
    })),
    initializeSiteService: jest.fn(),
    getSiteService: jest.fn().mockReturnValue({
        createSite: jest.fn(),
        listSites: jest.fn(),
        getSiteById: jest.fn(),
        updateSite: jest.fn(),
        deleteSite: jest.fn(),
    }),
}));

jest.mock('../../src/core/services/CheckpointService', () => ({
    CheckpointService: jest.fn().mockImplementation(() => ({
        createCheckpoint: jest.fn(),
        listCheckpoints: jest.fn(),
        getCheckpointById: jest.fn(),
        updateCheckpoint: jest.fn(),
        deleteCheckpoint: jest.fn(),
        reorderCheckpoints: jest.fn(),
    })),
    initializeCheckpointService: jest.fn(),
    getCheckpointService: jest.fn().mockReturnValue({
        createCheckpoint: jest.fn(),
        listCheckpoints: jest.fn(),
        getCheckpointById: jest.fn(),
        updateCheckpoint: jest.fn(),
        deleteCheckpoint: jest.fn(),
        reorderCheckpoints: jest.fn(),
    }),
}));

// Import the mocked services to set up mock implementations
import { getSiteService } from '../../src/core/services/SiteService';
import { getCheckpointService } from '../../src/core/services/CheckpointService';

// Get the mocked service instances
const mockSiteService = getSiteService() as any;
const mockCheckpointService = getCheckpointService() as any;

// Setup mock implementations
beforeEach(() => {
    jest.clearAllMocks();
});

// Create a test Express app (avoiding import.meta issues in app.ts)
function createTestApp() {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Setup site routes
    const router = Router();
    router.get('/', SiteController.listSites);
    router.post('/', SiteController.createSite);
    router.get('/:id', SiteController.getSiteDetails);
    router.patch('/:id', SiteController.updateSite);
    router.delete('/:id', SiteController.deleteSite);

    // Setup checkpoint routes as nested routes
    router.get('/:siteId/checkpoints', CheckpointController.listCheckpoints);
    router.post('/:siteId/checkpoints', CheckpointController.createCheckpoint);
    router.get('/:siteId/checkpoints/:id', CheckpointController.getCheckpointDetails);
    router.patch('/:siteId/checkpoints/:id', CheckpointController.updateCheckpoint);
    router.delete('/:siteId/checkpoints/:id', CheckpointController.deleteCheckpoint);
    router.post('/:siteId/checkpoints/reorder', CheckpointController.reorderCheckpoints);

    app.use('/api/v1/sites', router);

    // Error handler
    app.use((err: any, req: any, res: any, next: any) => {
        res.status(err.status || 500).json({
            success: false,
            message: err.message || 'Internal server error'
        });
    });

    return app;
}

const app = createTestApp();

describe('US3 - Site & Checkpoint Management Integration', () => {
    let createdSiteId = 1;

    describe('Site Management API', () => {
        it('should create a new site', async () => {
            const siteData = {
                name: 'Main Office',
                address: '123 Business St',
                geofenceBoundary: {
                    type: 'Polygon',
                    coordinates: [[[0, 0], [0, 0.01], [0.01, 0.01], [0.01, 0], [0, 0]]]
                },
                timezone: 'UTC'
            };

            mockSiteService.createSite.mockResolvedValue({ id: 1, ...siteData, tenantId: 'tenant-123' });

            const response = await request(app)
                .post('/api/v1/sites')
                .send(siteData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data.name).toBe(siteData.name);
            createdSiteId = response.body.data.id;
        });

        it('should list all sites for the tenant', async () => {
            mockSiteService.listSites.mockResolvedValue({
                items: [{ id: 1, name: 'Main Office' }],
                total: 1,
                page: 1,
                limit: 10,
                pages: 1
            });

            const response = await request(app)
                .get('/api/v1/sites');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(Array.isArray(response.body.data.items)).toBe(true);
        });

        it('should get a site by ID', async () => {
            mockSiteService.getSiteById.mockResolvedValue({ id: createdSiteId, name: 'Main Office', tenantId: 'tenant-123' });

            const response = await request(app)
                .get(`/api/v1/sites/${createdSiteId}`);

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe(createdSiteId);
        });

        it('should update a site', async () => {
            const updateData = { name: 'Main Office Updated' };
            mockSiteService.updateSite.mockResolvedValue({ id: createdSiteId, name: updateData.name, tenantId: 'tenant-123' });

            const response = await request(app)
                .patch(`/api/v1/sites/${createdSiteId}`)
                .send(updateData);

            expect(response.status).toBe(200);
            expect(response.body.data.name).toBe(updateData.name);
        });
    });

    describe('Checkpoint Management API', () => {
        let createdCheckpointId = 1;

        it('should add a checkpoint to a site', async () => {
            const checkpointData = {
                name: 'Front Gate',
                location: { type: 'Point', coordinates: [0.005, 0.005] },
                verificationType: VerificationType.QR,
                qrCode: 'GATE-001'
            };

            mockCheckpointService.createCheckpoint.mockResolvedValue({ id: 1, ...checkpointData, siteId: createdSiteId, tenantId: 'tenant-123' });

            const response = await request(app)
                .post(`/api/v1/sites/${createdSiteId}/checkpoints`)
                .send(checkpointData);

            expect(response.status).toBe(201);
            expect(response.body.data.name).toBe(checkpointData.name);
            createdCheckpointId = response.body.data.id;
        });

        it('should list checkpoints for a site', async () => {
            mockCheckpointService.listCheckpoints.mockResolvedValue({
                items: [{ id: 1, name: 'Front Gate' }],
                total: 1,
                page: 1,
                limit: 10,
                pages: 1
            });

            const response = await request(app)
                .get(`/api/v1/sites/${createdSiteId}/checkpoints`);

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body.data.items)).toBe(true);
            expect(response.body.data.items.length).toBeGreaterThan(0);
        });

        it('should delete a checkpoint', async () => {
            mockCheckpointService.deleteCheckpoint.mockResolvedValue(true);

            const response = await request(app)
                .delete(`/api/v1/sites/${createdSiteId}/checkpoints/${createdCheckpointId}`);

            expect(response.status).toBe(204);
        });
    });

    it('should delete a site', async () => {
        mockSiteService.deleteSite.mockResolvedValue(true);

        const response = await request(app)
            .delete(`/api/v1/sites/${createdSiteId}`);

        expect(response.status).toBe(204);
    });
});
