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
    createSite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getSiteService();
        const site = await service.createSite(req.body);

        res.status(201).json({
            success: true,
            data: site
        });
    });

    listSites = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getSiteService();
        const { page, limit, status, search, sortBy, sortOrder } = req.query;
        const sites = await service.listSites({
            page: page ? parseInt(page as string, 10) : undefined,
            limit: limit ? parseInt(limit as string, 10) : undefined,
            status: status as any,
            search: search as string,
            sortBy: sortBy as any,
            sortOrder: sortOrder as any,
        });

        res.status(200).json({ success: true, data: sites });
    });

    getSiteDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getSiteService();
        const siteId = parseInt(req.params.id, 10);
        const site = await service.getSiteById(siteId);

        if (!site) {
            res.status(404).json({ success: false, message: 'Site not found' });
            return;
        }

        res.status(200).json({ success: true, data: site });
    });

    updateSite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getSiteService();
        const siteId = parseInt(req.params.id, 10);
        const site = await service.updateSite(siteId, req.body);

        res.status(200).json({ success: true, data: site });
    });

    deleteSite = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getSiteService();
        const siteId = parseInt(req.params.id, 10);
        await service.deleteSite(siteId);

        res.status(204).end();
    });

    getSiteStatistics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getSiteService();
        const siteId = parseInt(req.params.id, 10);
        const stats = await service.getSiteStatistics(siteId);

        res.status(200).json({ success: true, data: stats });
    });
}

export default new SiteController();
