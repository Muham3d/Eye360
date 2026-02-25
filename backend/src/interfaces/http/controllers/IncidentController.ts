/**
 * Incident Controller
 */

import { Request, Response } from 'express';
import { getIncidentService } from '../../../core/services/index';
import { asyncHandler } from '../middleware/errorHandler';
import type { AuthenticatedRequest } from '../middleware/authMiddleware';

export class IncidentController {
  reportIncident = asyncHandler(async (req: Request, res: Response) => {
    const service = getIncidentService();
    const userId = (req as AuthenticatedRequest).user?.id;

    const incident = await service.reportIncident({
      ...req.body,
      reportedBy: userId
    });

    res.status(201).json({ success: true, data: incident });
  });

  getIncident = asyncHandler(async (req: Request, res: Response) => {
    const service = getIncidentService();
    const incident = await service.getIncident(Number(req.params.id));
    res.status(200).json({ success: true, data: incident });
  });

  updateStatus = asyncHandler(async (req: Request, res: Response) => {
    const service = getIncidentService();
    const userId = (req as AuthenticatedRequest).user?.id;
    const { status } = req.body;

    const updated = await service.updateStatus(Number(req.params.id), status, Number(userId));
    res.status(200).json({ success: true, data: updated });
  });

  addComment = asyncHandler(async (req: Request, res: Response) => {
    const service = getIncidentService();
    const userId = (req as AuthenticatedRequest).user?.id;
    const { comment } = req.body;

    const result = await service.addComment(Number(req.params.id), Number(userId), comment);
    res.status(201).json({ success: true, data: result });
  });

  uploadEvidence = asyncHandler(async (req: Request, res: Response) => {
    const service = getIncidentService();
    // Assuming file upload middleware handles the file
    const result = await service.addEvidence(Number(req.params.id), req.body);
    res.status(201).json({ success: true, data: result });
  });
}

export default new IncidentController();
