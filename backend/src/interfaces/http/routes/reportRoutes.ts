/**
 * Report Routes
 *
 * Route definitions for report generation and export endpoints.
 *
 * @module interfaces/http/routes
 */

import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';

const router = Router();
const reportController = new ReportController();

/**
 * @route   GET /api/reports/site/:siteId
 * @desc    Generate a site performance report
 * @access  Private (Manager, Admin)
 */
router.get('/site/:siteId', (req, res) => reportController.getSiteReport(req, res));

/**
 * @route   GET /api/reports/site/:siteId/export
 * @desc    Export a site performance report
 * @access  Private (Manager, Admin)
 */
router.get('/site/:siteId/export', (req, res) => reportController.exportSiteReport(req, res));

/**
 * @route   POST /api/reports/comparison
 * @desc    Generate a multi-site comparison report
 * @access  Private (Manager, Admin)
 */
router.post('/comparison', (req, res) => reportController.getComparisonReport(req, res));

/**
 * @route   GET /api/reports/attendance/:siteId
 * @desc    Export attendance report for a site
 * @access  Private (Manager, Admin)
 */
router.get('/attendance/:siteId', (req, res) => reportController.exportAttendanceReport(req, res));

/**
 * @route   GET /api/reports/patrols/:siteId
 * @desc    Get patrol details for a site
 * @access  Private (Supervisor, Manager, Admin)
 */
router.get('/patrols/:siteId', (req, res) => reportController.getPatrolDetails(req, res));

/**
 * @route   GET /api/reports/incidents/:siteId
 * @desc    Get incident details for a site
 * @access  Private (Supervisor, Manager, Admin)
 */
router.get('/incidents/:siteId', (req, res) => reportController.getIncidentDetails(req, res));

/**
 * @route   POST /api/reports/export/csv
 * @desc    Export custom data to CSV
 * @access  Private (Manager, Admin)
 */
router.post('/export/csv', (req, res) => reportController.exportToCSV(req, res));

/**
 * @route   POST /api/reports/export/excel
 * @desc    Export custom data to Excel
 * @access  Private (Manager, Admin)
 */
router.post('/export/excel', (req, res) => reportController.exportToExcel(req, res));

/**
 * @route   POST /api/reports/export/json
 * @desc    Export custom data to JSON
 * @access  Private (Manager, Admin)
 */
router.post('/export/json', (req, res) => reportController.exportToJSON(req, res));

export default router;
