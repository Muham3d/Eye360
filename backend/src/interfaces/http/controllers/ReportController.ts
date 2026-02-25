/**
 * Report Controller
 *
 * HTTP controller for report generation and export endpoints.
 * Handles site performance reports, attendance reports, and data exports.
 *
 * @module interfaces/http/controllers
 */

import { Request, Response } from 'express';
import { getReportService } from '../../../core/services/ReportService';
import { ExportFormat } from '../../../core/services/ReportService';

/**
 * Report Controller
 *
 * Handles all report-related HTTP requests:
 * - Site performance reports
 * - Attendance reports
 * - Export to CSV/Excel/JSON
 * - Comparison reports
 */
export class ReportController {
  /**
   * Generate a site performance report
   * GET /api/reports/site/:siteId?startDate=2024-01-01&endDate=2024-01-31
   */
  async getSiteReport(req: Request, res: Response): Promise<void> {
    try {
      const siteId = parseInt(req.params.siteId);
      if (isNaN(siteId)) {
        res.status(400).json({ error: 'Invalid site ID' });
        return;
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const report = await getReportService().generateSiteReport(siteId, { start: startDate, end: endDate });
      res.status(200).json(report);
    } catch (error) {
      console.error('Error generating site report:', error);
      res.status(500).json({ error: 'Failed to generate site report' });
    }
  }

  /**
   * Export a site report
   * GET /api/reports/site/:siteId/export?format=csv&includeDetails=true
   */
  async exportSiteReport(req: Request, res: Response): Promise<void> {
    try {
      const siteId = parseInt(req.params.siteId);
      if (isNaN(siteId)) {
        res.status(400).json({ error: 'Invalid site ID' });
        return;
      }

      const format = (req.query.format as ExportFormat) || ExportFormat.CSV;
      const includeDetails = req.query.includeDetails === 'true';

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const result = await getReportService().exportSiteReport(siteId, { start: startDate, end: endDate }, format, includeDetails);

      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', result.size);

      if (typeof result.data === 'string') {
        res.send(result.data);
      } else {
        res.send(result.data);
      }
    } catch (error) {
      console.error('Error exporting site report:', error);
      res.status(500).json({ error: 'Failed to export site report' });
    }
  }

  /**
   * Generate a multi-site comparison report
   * POST /api/reports/comparison
   *
   * Request body:
   * {
   *   "siteIds": [1, 2, 3],
   *   "startDate": "2024-01-01",
   *   "endDate": "2024-01-31"
   * }
   */
  async getComparisonReport(req: Request, res: Response): Promise<void> {
    try {
      const { siteIds, startDate, endDate } = req.body;

      if (!Array.isArray(siteIds) || siteIds.length === 0) {
        res.status(400).json({ error: 'siteIds must be a non-empty array' });
        return;
      }

      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate) : new Date();

      const reports = await getReportService().generateComparisonReport(siteIds, { start, end });
      res.status(200).json({ reports, count: reports.length });
    } catch (error) {
      console.error('Error generating comparison report:', error);
      res.status(500).json({ error: 'Failed to generate comparison report' });
    }
  }

  /**
   * Export attendance report
   * GET /api/reports/attendance/:siteId?startDate=2024-01-01&endDate=2024-01-31
   */
  async exportAttendanceReport(req: Request, res: Response): Promise<void> {
    try {
      const siteId = parseInt(req.params.siteId);
      if (isNaN(siteId)) {
        res.status(400).json({ error: 'Invalid site ID' });
        return;
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const result = await getReportService().exportAttendanceReport(siteId, { start: startDate, end: endDate });

      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', result.size);

      res.send(result.data);
    } catch (error) {
      console.error('Error exporting attendance report:', error);
      res.status(500).json({ error: 'Failed to export attendance report' });
    }
  }

  /**
   * Get patrol details for a site
   * GET /api/reports/patrols/:siteId?startDate=2024-01-01&endDate=2024-01-31
   */
  async getPatrolDetails(req: Request, res: Response): Promise<void> {
    try {
      const siteId = parseInt(req.params.siteId);
      if (isNaN(siteId)) {
        res.status(400).json({ error: 'Invalid site ID' });
        return;
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const details = await getReportService().generatePatrolDetails(siteId, { start: startDate, end: endDate });
      res.status(200).json({ details, count: details.length });
    } catch (error) {
      console.error('Error getting patrol details:', error);
      res.status(500).json({ error: 'Failed to get patrol details' });
    }
  }

  /**
   * Get incident details for a site
   * GET /api/reports/incidents/:siteId?startDate=2024-01-01&endDate=2024-01-31
   */
  async getIncidentDetails(req: Request, res: Response): Promise<void> {
    try {
      const siteId = parseInt(req.params.siteId);
      if (isNaN(siteId)) {
        res.status(400).json({ error: 'Invalid site ID' });
        return;
      }

      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const details = await getReportService().generateIncidentDetails(siteId, { start: startDate, end: endDate });
      res.status(200).json({ details, count: details.length });
    } catch (error) {
      console.error('Error getting incident details:', error);
      res.status(500).json({ error: 'Failed to get incident details' });
    }
  }

  /**
   * Export custom data to CSV
   * POST /api/reports/export/csv
   *
   * Request body:
   * {
   *   "data": [{ "col1": "value1", "col2": "value2" }],
   *   "filename": "my-export"
   * }
   */
  async exportToCSV(req: Request, res: Response): Promise<void> {
    try {
      const { data, filename } = req.body;

      if (!Array.isArray(data) || data.length === 0) {
        res.status(400).json({ error: 'Data must be a non-empty array' });
        return;
      }

      const result = await getReportService().exportToCSV(data, filename || 'export');

      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', result.size);

      res.send(result.data);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      res.status(500).json({ error: 'Failed to export to CSV' });
    }
  }

  /**
   * Export custom data to Excel
   * POST /api/reports/export/excel
   *
   * Request body:
   * {
   *   "data": [{ "col1": "value1", "col2": "value2" }],
   *   "filename": "my-export"
   * }
   */
  async exportToExcel(req: Request, res: Response): Promise<void> {
    try {
      const { data, filename } = req.body;

      if (!Array.isArray(data) || data.length === 0) {
        res.status(400).json({ error: 'Data must be a non-empty array' });
        return;
      }

      const result = await getReportService().exportToExcel(data, filename || 'export');

      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', result.size);

      res.send(result.data);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      res.status(500).json({ error: 'Failed to export to Excel' });
    }
  }

  /**
   * Export custom data to JSON
   * POST /api/reports/export/json
   *
   * Request body:
   * {
   *   "data": { "key": "value" },
   *   "filename": "my-export"
   * }
   */
  async exportToJSON(req: Request, res: Response): Promise<void> {
    try {
      const { data, filename } = req.body;

      if (!data) {
        res.status(400).json({ error: 'Data is required' });
        return;
      }

      const result = await getReportService().exportToJSON(data, filename || 'export');

      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', result.mimeType);
      res.setHeader('Content-Length', result.size);

      res.send(result.data);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      res.status(500).json({ error: 'Failed to export to JSON' });
    }
  }
}

export default ReportController;
