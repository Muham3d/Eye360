/**
 * Web Checkpoint Controller
 *
 * Handles checkpoint management for the admin web panel.
 *
 * @module interfaces/http/controllers/WebCheckpointController
 */

import { getCheckpointService, getSiteService } from '../../../core/services/index';
import { asyncHandler } from '../middleware/errorHandler';
import { renderView } from '../../web/config/ejs';

export class WebCheckpointController {
  getIndex = asyncHandler(async (req, res) => {
    const service = getCheckpointService();
    const checkpoints = await service.listCheckpoints(req.query);
    
    renderView(res, 'checkpoints/index', {
      title: 'Checkpoints - PatrolManager',
      checkpoints: checkpoints.data,
      pagination: checkpoints
    });
  });

  getCreate = asyncHandler(async (req, res) => {
    const siteService = getSiteService();
    const sites = await siteService.listSites({ limit: 100 });
    
    renderView(res, 'checkpoints/form', {
      title: 'Create Checkpoint - PatrolManager',
      mode: 'create',
      checkpoint: { site_id: req.query.siteId },
      sites: sites.data,
      errors: {}
    });
  });

  postCreate = asyncHandler(async (req, res) => {
    const service = getCheckpointService();
    try {
      await service.createCheckpoint(req.body);
      res.redirect('/checkpoints');
    } catch (error) {
      const siteService = getSiteService();
      const sites = await siteService.listSites({ limit: 100 });
      renderView(res, 'checkpoints/form', {
        title: 'Create Checkpoint - PatrolManager',
        mode: 'create',
        checkpoint: req.body,
        sites: sites.data,
        errors: { general: error.message }
      });
    }
  });
}

export default new WebCheckpointController();
