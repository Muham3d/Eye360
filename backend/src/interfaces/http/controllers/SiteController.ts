/**
 * Site Controller
 *
 * API controller for site management.
 *
 * @module interfaces/http/controllers/SiteController
 */

import { Request, Response } from 'express';
import { getSiteService } from '../../../core/services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class SiteController {
    /**
     * Create a new site
     */
    createSite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getSiteService();
        const user = (req as any).user;

        if (!user?.tenantId) {
            res.status(400).json({ success: false, message: 'Tenant context is missing' });
            return;
        }

        const site = await service.createSite({
            ...req.body,
            tenantId: user.tenantId,
            createdById: user.id
        });

        res.status(201).json({
            success: true,
            data: site
        });
    });

    /**
     * List all sites for current tenant
     */
    listSites = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getSiteService();
        const user = (req as any).user;

        if (!user?.tenantId) {
            res.status(400).json({ success: false, message: 'Tenant context is missing' });
            return;
        }

        const sites = await service.listSites(user.tenantId, req.query);

        res.status(200).json({
            success: true,
            data: sites
        });
    });

    /**
     * Get specific site details
     */
    getSiteDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getSiteService();
        const user = (req as any).user;
        const siteId = parseInt(req.params.id, 10);

        if (!user?.tenantId) {
            res.status(400).json({ success: false, message: 'Tenant context is missing' });
            return;
        }

        const site = await service.getSiteById(siteId, user.tenantId);

        if (!site) {
            res.status(404).json({
                success: false,
                message: 'Site not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: site
        });
    });

    /**
     * Update a site
     */
    updateSite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getSiteService();
        const user = (req as any).user;
        const siteId = parseInt(req.params.id, 10);

        if (!user?.tenantId) {
            res.status(400).json({ success: false, message: 'Tenant context is missing' });
            return;
        }

        const site = await service.updateSite(siteId, user.tenantId, req.body);

        res.status(200).json({
            success: true,
            data: site
        });
    });

    /**
     * Delete a site
     */
    deleteSite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getSiteService();
        const user = (req as any).user;
        const siteId = parseInt(req.params.id, 10);

        if (!user?.tenantId) {
            res.status(400).json({ success: false, message: 'Tenant context is missing' });
            return;
        }

        await service.deleteSite(siteId, user.tenantId);

        res.status(204).end();
    });

    /**
     * Get site statistics
     */
    getSiteStatistics = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
        res.status(501).json({ message: 'Not implemented' });
    });
}

export default new SiteController();
