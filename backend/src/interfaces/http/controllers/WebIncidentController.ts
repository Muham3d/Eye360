/**
 * Web Incident Controller
 */

import { getIncidentService } from '../../../core/services/index';
import { asyncHandler } from '../middleware/errorHandler';
import { renderView } from '../../web/config/ejs';

export class WebIncidentController {
  getIndex = asyncHandler(async (req, res) => {
    const service = getIncidentService();
    const result = await service.listIncidents(req.query);
    
    renderView(res, 'incidents/index', {
      title: 'Incident Reports - PatrolManager',
      incidents: result?.data || []
    });
  });

  getDetail = asyncHandler(async (req, res) => {
    const service = getIncidentService();
    const incident = await service.getIncident(Number(req.params.id));
    
    renderView(res, 'incidents/detail', {
      title: `Incident #${incident.id} - PatrolManager`,
      incident
    });
  });

  postComment = asyncHandler(async (req, res) => {
    const service = getIncidentService();
    const userId = (req as any).user?.id;
    await service.addComment(Number(req.params.id), Number(userId), req.body.comment);
    res.redirect(`/incidents/${req.params.id}`);
  });

  postStatus = asyncHandler(async (req, res) => {
    const service = getIncidentService();
    const userId = (req as any).user?.id;
    await service.updateStatus(Number(req.params.id), req.body.status, Number(userId));
    res.redirect(`/incidents/${req.params.id}`);
  });
}

export default new WebIncidentController();
