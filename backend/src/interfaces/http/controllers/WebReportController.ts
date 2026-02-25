/**
 * Web Report Controller
 */

import { getReportService, getSiteService } from '../../../core/services/index';
import { asyncHandler } from '../middleware/errorHandler';
import { renderView } from '../../web/config/ejs';

export class WebReportController {
  getIndex = asyncHandler(async (req, res) => {
    const siteService = getSiteService();
    const sites = await siteService.listSites({ limit: 100 });
    
    renderView(res, 'reports/index', {
      title: 'Reports - PatrolManager',
      sites: sites.data
    });
  });

  postGenerate = asyncHandler(async (req, res) => {
    const service = getReportService();
    const { type, siteId, start, end } = req.body;
    
    // Logic to trigger generation
    const reportData = await service.generateSiteReport(Number(siteId), { 
      start: new Date(start), 
      end: new Date(end) 
    });

    const csv = await service.exportToCSV([reportData.metrics]);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${type}_report.csv"`);
    res.send(csv);
  });
}

export default new WebReportController();
