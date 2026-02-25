/**
 * Web Template Controller
 *
 * Handles patrol template management for the admin web panel.
 *
 * @module interfaces/http/controllers/WebTemplateController
 */

import { getPatrolTemplateService, getSiteService, getCheckpointService } from '../../../core/services/index';
import { asyncHandler } from '../middleware/errorHandler';
import { renderView } from '../../web/config/ejs';

export class WebTemplateController {
  getIndex = asyncHandler(async (req, res) => {
    const service = getPatrolTemplateService();
    const templates = await service.listTemplates(req.query);
    
    renderView(res, 'templates/index', {
      title: 'Patrol Templates - PatrolManager',
      templates: templates.data,
      pagination: templates
    });
  });

  getDesigner = asyncHandler(async (req, res) => {
    const service = getPatrolTemplateService();
    const template = await service.getTemplateWithDetails(Number(req.params.id));
    const checkpointService = getCheckpointService();
    const availableCheckpoints = await checkpointService.getCheckpointsBySite(template.site_id);

    renderView(res, 'templates/designer', {
      title: 'Template Designer - PatrolManager',
      template,
      availableCheckpoints
    });
  });

  postUpdateSequence = asyncHandler(async (req, res) => {
    const service = getPatrolTemplateService();
    const { sequence } = req.body; // Array of {checkpointId, sequenceOrder}
    await service.updateCheckpointSequence(Number(req.params.id), sequence);
    res.json({ success: true });
  });
}

export default new WebTemplateController();
