/**
 * Web Site Controller
 *
 * Handles site management for the admin web panel.
 *
 * @module interfaces/http/controllers/WebSiteController
 */

import { getSiteService } from '../../../core/services/index';
import { asyncHandler } from '../middleware/errorHandler';
import { renderView } from '../../web/config/ejs';

export class WebSiteController {
  getIndex = asyncHandler(async (req, res) => {
    const service = getSiteService();
    const sites = await service.listSites(req.query);
    
    renderView(res, 'sites/index', {
      title: 'Sites - PatrolManager',
      sites: sites.data,
      pagination: sites
    });
  });

  getCreate = asyncHandler(async (req, res) => {
    renderView(res, 'sites/form', {
      title: 'Create Site - PatrolManager',
      mode: 'create',
      site: {},
      errors: {}
    });
  });

  postCreate = asyncHandler(async (req, res) => {
    const service = getSiteService();
    try {
      await service.createSite(req.body);
      res.redirect('/sites');
    } catch (error) {
      renderView(res, 'sites/form', {
        title: 'Create Site - PatrolManager',
        mode: 'create',
        site: req.body,
        errors: { general: error.message }
      });
    }
  });

  getEdit = asyncHandler(async (req, res) => {
    const service = getSiteService();
    const site = await service.getSiteById(Number(req.params.id));
    renderView(res, 'sites/form', {
      title: 'Edit Site - PatrolManager',
      mode: 'edit',
      site,
      errors: {}
    });
  });
}

export default new WebSiteController();
