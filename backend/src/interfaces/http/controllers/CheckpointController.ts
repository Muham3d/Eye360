import { Request, Response } from 'express';
import { getCheckpointService } from '../../../core/services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class CheckpointController {
    createCheckpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getCheckpointService();
        const siteId = parseInt(req.params.siteId, 10);
        const checkpoint = await service.createCheckpoint({
            ...req.body,
            siteId,
        });

        res.status(201).json({ success: true, data: checkpoint });
    });

    listCheckpoints = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getCheckpointService();
        const siteId = parseInt(req.params.siteId, 10);
        const { page, limit, status, search, sortBy, sortOrder } = req.query;
        const checkpoints = await service.listCheckpoints({
            siteId,
            page: page ? parseInt(page as string, 10) : undefined,
            limit: limit ? parseInt(limit as string, 10) : undefined,
            status: status as any,
            search: search as string,
            sortBy: sortBy as any,
            sortOrder: sortOrder as any,
        });

        res.status(200).json({ success: true, data: checkpoints });
    });

    getCheckpointDetails = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getCheckpointService();
        const checkpointId = parseInt(req.params.id, 10);
        const checkpoint = await service.getCheckpointById(checkpointId);

        if (!checkpoint) {
            res.status(404).json({ success: false, message: 'Checkpoint not found' });
            return;
        }

        res.status(200).json({ success: true, data: checkpoint });
    });

    updateCheckpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getCheckpointService();
        const checkpointId = parseInt(req.params.id, 10);
        const checkpoint = await service.updateCheckpoint(checkpointId, req.body);

        res.status(200).json({ success: true, data: checkpoint });
    });

    deleteCheckpoint = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getCheckpointService();
        const checkpointId = parseInt(req.params.id, 10);
        await service.deleteCheckpoint(checkpointId);

        res.status(204).end();
    });

    reorderCheckpoints = asyncHandler(async (req: Request, res: Response): Promise<void> => {
        const service = getCheckpointService();
        const siteId = parseInt(req.params.siteId, 10);
        await service.reorderCheckpoints(siteId, req.body.orders);

        res.status(200).json({ success: true, message: 'Checkpoints reordered successfully' });
    });
}

export default new CheckpointController();
