/**
 * Checkpoint Controller
 *
 * API controller for checkpoint management.
 *
 * @module interfaces/http/controllers/CheckpointController
 */

import { Request, Response } from 'express';
import { getCheckpointService } from '../../../core/services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class CheckpointController {
    /**
     * Add a checkpoint to a site
     */
    createCheckpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getCheckpointService();
        const user = (req as any).user;
        const siteId = parseInt(req.params.siteId, 10);

        if (!user?.tenantId) {
            res.status(400).json({ success: false, message: 'Tenant context is missing' });
            return;
        }

        const checkpoint = await service.createCheckpoint({
            ...req.body,
            tenantId: user.tenantId,
            siteId
        });

        res.status(201).json({
            success: true,
            data: checkpoint
        });
    });

    /**
     * List all checkpoints for a site
     */
    listCheckpoints = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getCheckpointService();
        const user = (req as any).user;
        const siteId = parseInt(req.params.siteId, 10);

        if (!user?.tenantId) {
            res.status(400).json({ success: false, message: 'Tenant context is missing' });
            return;
        }

        const checkpoints = await service.listCheckpoints(user.tenantId, siteId, req.query);

        res.status(200).json({
            success: true,
            data: checkpoints
        });
    });

    /**
     * Get specific checkpoint details
     */
    getCheckpointDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getCheckpointService();
        const user = (req as any).user;
        const checkpointId = parseInt(req.params.id, 10);

        if (!user?.tenantId) {
            res.status(400).json({ success: false, message: 'Tenant context is missing' });
            return;
        }

        const checkpoint = await service.getCheckpointById(checkpointId, user.tenantId);

        if (!checkpoint) {
            res.status(404).json({
                success: false,
                message: 'Checkpoint not found'
            });
            return;
        }

        res.status(200).json({
            success: true,
            data: checkpoint
        });
    });

    /**
     * Update a checkpoint
     */
    updateCheckpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getCheckpointService();
        const user = (req as any).user;
        const checkpointId = parseInt(req.params.id, 10);

        if (!user?.tenantId) {
            res.status(400).json({ success: false, message: 'Tenant context is missing' });
            return;
        }

        const checkpoint = await service.updateCheckpoint(checkpointId, user.tenantId, req.body);

        res.status(200).json({
            success: true,
            data: checkpoint
        });
    });

    /**
     * Delete a checkpoint
     */
    deleteCheckpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getCheckpointService();
        const user = (req as any).user;
        const checkpointId = parseInt(req.params.id, 10);

        if (!user?.tenantId) {
            res.status(400).json({ success: false, message: 'Tenant context is missing' });
            return;
        }

        await service.deleteCheckpoint(checkpointId, user.tenantId);

        res.status(204).end();
    });

    /**
     * Reorder checkpoints within a site
     */
    reorderCheckpoints = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getCheckpointService();
        const user = (req as any).user;
        const siteId = parseInt(req.params.siteId, 10);

        if (!user?.tenantId) {
            res.status(400).json({ success: false, message: 'Tenant context is missing' });
            return;
        }

        await service.reorderCheckpoints(siteId, user.tenantId, req.body.orders);

        res.status(200).json({
            success: true,
            message: 'Checkpoints reordered successfully'
        });
    });
}

export default new CheckpointController();
