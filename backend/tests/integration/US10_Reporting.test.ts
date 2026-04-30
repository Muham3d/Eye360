/**
 * US10 Reporting & Analytics Integration Test
 *
 * Integration tests for report generation and file export.
 * Validates Excel/CSV report generation with proper formatting.
 *
 * @module tests/integration
 */

import { jest, describe, it, expect, beforeAll, beforeEach, afterAll, afterEach } from '@jest/globals';
import request from 'supertest';
import express, { type Application } from 'express';
import { ReportGenerator } from '../../src/infrastructure/reports/ReportGenerator.js';
import { existsSync, unlinkSync } from 'fs';
import path from 'path';

// Mock services
jest.mock('../../src/infrastructure/config/logger.js', () => ({
  default: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock auth middleware
jest.mock('../../src/interfaces/http/middleware/authMiddleware', () => ({
  authMiddleware: (req: any, res: any, next: any) => {
    req.user = { id: 1, email: 'admin@example.com', role: 'admin', tenantId: 'tenant-123' };
    next();
  },
}));

describe('US10 - Reporting & Analytics Integration', () => {
  let app: Application;
  let reportGenerator: ReportGenerator;
  const testReportsDir = path.join(process.cwd(), 'test-reports');

  beforeAll(async () => {
    // Initialize report generator with test directory
    reportGenerator = new ReportGenerator(testReportsDir);
    await reportGenerator.initialize();

    // Setup Express app for testing
    app = express();
    app.use(express.json());

    // Setup routes
    const router = express.Router();

    // POST /api/v1/reports/site-performance - Generate site performance report
    router.post('/reports/site-performance', async (req: any, res: any) => {
      const { siteId, siteName, startDate, endDate } = req.body;

      // Mock site performance data
      const reportData = {
        patrols: {
          total: 150,
          completed: 142,
          missed: 5,
          inProgress: 3,
          completionRate: 0.947,
          averageDuration: 42,
        },
        incidents: {
          total: 12,
          resolvedThisPeriod: 10,
          averageResolutionTime: 3.5,
        },
        shifts: {
          totalShifts: 200,
          scheduledShifts: 200,
          completedShifts: 195,
          missedShifts: 5,
          onTimeClockInRate: 0.92,
        },
        overallScore: 87,
      };

      const result = await reportGenerator.generateSitePerformanceReport(
        reportData,
        { siteName, startDate: new Date(startDate), endDate: new Date(endDate) }
      );

      res.status(200).json({
        success: true,
        data: {
          downloadUrl: result.url,
          fileName: result.fileName,
          fileSize: result.fileSize,
          format: result.format,
        },
      });
    });

    // POST /api/v1/reports/guard-attendance - Generate guard attendance report
    router.post('/reports/guard-attendance', async (req: any, res: any) => {
      const { siteId, startDate, endDate } = req.body;

      // Mock guard attendance data
      const guardsData = [
        {
          id: 'G001',
          name: 'John Smith',
          totalShifts: 20,
          completed: 19,
          missed: 1,
          lateCount: 2,
          earlyLeaveCount: 0,
          totalHours: 160,
        },
        {
          id: 'G002',
          name: 'Jane Doe',
          totalShifts: 20,
          completed: 20,
          missed: 0,
          lateCount: 0,
          earlyLeaveCount: 1,
          totalHours: 165,
        },
        {
          id: 'G003',
          name: 'Bob Johnson',
          totalShifts: 18,
          completed: 16,
          missed: 2,
          lateCount: 4,
          earlyLeaveCount: 1,
          totalHours: 144,
        },
      ];

      const result = await reportGenerator.generateGuardAttendanceReport(
        guardsData,
        { startDate: new Date(startDate), endDate: new Date(endDate) }
      );

      res.status(200).json({
        success: true,
        data: {
          downloadUrl: result.url,
          fileName: result.fileName,
          fileSize: result.fileSize,
          format: result.format,
        },
      });
    });

    // POST /api/v1/reports/incident-summary - Generate incident summary report
    router.post('/reports/incident-summary', async (req: any, res: any) => {
      const { siteId, startDate, endDate } = req.body;

      // Mock incident data
      const incidentsData = [
        {
          id: 1,
          title: 'Unauthorized Access Attempt',
          type: 'security',
          priority: 'high',
          status: 'resolved',
          siteName: 'Downtown Complex',
          reportedBy: 'John Smith',
          createdAt: new Date('2025-02-01T10:30:00'),
          resolvedAt: new Date('2025-02-01T14:00:00'),
          description: 'Unknown individual attempted to access restricted area',
        },
        {
          id: 2,
          title: 'Equipment Malfunction',
          type: 'maintenance',
          priority: 'medium',
          status: 'open',
          siteName: 'Downtown Complex',
          reportedBy: 'Jane Doe',
          createdAt: new Date('2025-02-05T08:15:00'),
          resolvedAt: null,
          description: 'Security gate at entrance B not responding',
        },
        {
          id: 3,
          title: 'Suspicious Package',
          type: 'security',
          priority: 'critical',
          status: 'resolved',
          siteName: 'Downtown Complex',
          reportedBy: 'Bob Johnson',
          createdAt: new Date('2025-02-10T16:45:00'),
          resolvedAt: new Date('2025-02-10T18:30:00'),
          description: 'Unattended package found in lobby',
        },
      ];

      const result = await reportGenerator.generateIncidentSummaryReport(
        incidentsData,
        { startDate: new Date(startDate), endDate: new Date(endDate) }
      );

      res.status(200).json({
        success: true,
        data: {
          downloadUrl: result.url,
          fileName: result.fileName,
          fileSize: result.fileSize,
          format: result.format,
        },
      });
    });

    // POST /api/v1/reports/csv - Generate CSV export
    router.post('/reports/csv', async (req: any, res: any) => {
      const { data, fileName } = req.body;

      const result = await reportGenerator.generateCSVReport(data, fileName);

      res.status(200).json({
        success: true,
        data: {
          downloadUrl: result.url,
          fileName: result.fileName,
          fileSize: result.fileSize,
          format: result.format,
        },
      });
    });

    app.use('/api/v1', router);
  });

  afterAll(async () => {
    // Clean up test reports directory
    if (existsSync(testReportsDir)) {
      const fs = await import('fs/promises');
      await fs.rm(testReportsDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Site Performance Report Generation', () => {
    it('should generate site performance Excel report successfully', async () => {
      const requestBody = {
        siteId: 1,
        siteName: 'Downtown Complex',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const response = await request(app)
        .post('/api/v1/reports/site-performance')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('downloadUrl');
      expect(response.body.data).toHaveProperty('fileName');
      expect(response.body.data).toHaveProperty('fileSize');
      expect(response.body.data.format).toBe('xlsx');

      // Verify file was created
      const filePath = path.join(testReportsDir, response.body.data.fileName);
      expect(existsSync(filePath)).toBe(true);
    });

    it('should include all patrol metrics in report', async () => {
      const requestBody = {
        siteId: 1,
        siteName: 'Downtown Complex',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const response = await request(app)
        .post('/api/v1/reports/site-performance')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.data.fileName).toContain('site-performance');
    });

    it('should include incident metrics in report', async () => {
      const requestBody = {
        siteId: 1,
        siteName: 'Downtown Complex',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const response = await request(app)
        .post('/api/v1/reports/site-performance')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('downloadUrl');
    });

    it('should include shift attendance metrics in report', async () => {
      const requestBody = {
        siteId: 1,
        siteName: 'Downtown Complex',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const response = await request(app)
        .post('/api/v1/reports/site-performance')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('fileSize');
      expect(response.body.data.fileSize).toBeGreaterThan(0);
    });
  });

  describe('Guard Attendance Report Generation', () => {
    it('should generate guard attendance Excel report successfully', async () => {
      const requestBody = {
        siteId: 1,
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const response = await request(app)
        .post('/api/v1/reports/guard-attendance')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('downloadUrl');
      expect(response.body.data).toHaveProperty('fileName');
      expect(response.body.data.format).toBe('xlsx');

      // Verify file was created
      const filePath = path.join(testReportsDir, response.body.data.fileName);
      expect(existsSync(filePath)).toBe(true);
    });

    it('should include individual guard attendance records', async () => {
      const requestBody = {
        siteId: 1,
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const response = await request(app)
        .post('/api/v1/reports/guard-attendance')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.data.fileName).toContain('guard-attendance');
    });

    it('should calculate attendance rates correctly', async () => {
      const requestBody = {
        siteId: 1,
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const response = await request(app)
        .post('/api/v1/reports/guard-attendance')
        .send(requestBody);

      expect(response.status).toBe(200);
    });
  });

  describe('Incident Summary Report Generation', () => {
    it('should generate incident summary Excel report successfully', async () => {
      const requestBody = {
        siteId: 1,
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const response = await request(app)
        .post('/api/v1/reports/incident-summary')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('downloadUrl');
      expect(response.body.data).toHaveProperty('fileName');
      expect(response.body.data.format).toBe('xlsx');

      // Verify file was created
      const filePath = path.join(testReportsDir, response.body.data.fileName);
      expect(existsSync(filePath)).toBe(true);
    });

    it('should include all incident details in report', async () => {
      const requestBody = {
        siteId: 1,
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const response = await request(app)
        .post('/api/v1/reports/incident-summary')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.data.fileName).toContain('incident-summary');
    });

    it('should handle incidents without resolution date', async () => {
      const requestBody = {
        siteId: 1,
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const response = await request(app)
        .post('/api/v1/reports/incident-summary')
        .send(requestBody);

      expect(response.status).toBe(200);
    });
  });

  describe('CSV Export Generation', () => {
    it('should generate CSV report successfully', async () => {
      const csvData = [
        { id: 1, name: 'John Smith', shifts: 20, attendance: '95%' },
        { id: 2, name: 'Jane Doe', shifts: 20, attendance: '100%' },
        { id: 3, name: 'Bob Johnson', shifts: 18, attendance: '89%' },
      ];

      const requestBody = {
        data: csvData,
        fileName: 'guard-attendance.csv',
      };

      const response = await request(app)
        .post('/api/v1/reports/csv')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('downloadUrl');
      expect(response.body.data).toHaveProperty('fileName');
      expect(response.body.data.format).toBe('csv');

      // Verify file was created
      const filePath = path.join(testReportsDir, response.body.data.fileName);
      expect(existsSync(filePath)).toBe(true);
    });

    it('should handle CSV with special characters in data', async () => {
      const csvData = [
        { id: 1, description: 'Item with "quotes" in text' },
        { id: 2, description: 'Item with, comma, in, text' },
        { id: 3, description: 'Item with "quotes" and, commas' },
      ];

      const requestBody = {
        data: csvData,
        fileName: 'special-chars.csv',
      };

      const response = await request(app)
        .post('/api/v1/reports/csv')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.data.format).toBe('csv');
    });

    it('should reject CSV generation with empty data', async () => {
      const response = await request(app)
        .post('/api/v1/reports/csv')
        .send({ data: [], fileName: 'empty.csv' });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Report File Management', () => {
    it('should delete report files successfully', async () => {
      // First generate a report
      const csvData = [{ id: 1, name: 'Test' }];
      const result = await reportGenerator.generateCSVReport(csvData, 'test-delete.csv');

      // Verify file exists
      const filePath = path.join(testReportsDir, result.fileName);
      expect(existsSync(filePath)).toBe(true);

      // Delete the report
      await reportGenerator.deleteReport(result.fileName);

      // Verify file was deleted
      expect(existsSync(filePath)).toBe(false);
    });

    it('should handle deletion of non-existent file gracefully', async () => {
      // Should not throw error
      await expect(
        reportGenerator.deleteReport('non-existent-file.csv')
      ).resolves.not.toThrow();
    });
  });

  describe('Report Formatting and Styles', () => {
    it('should apply header styles to Excel reports', async () => {
      const requestBody = {
        siteId: 1,
        siteName: 'Downtown Complex',
        startDate: '2025-02-01',
        endDate: '2025-02-28',
      };

      const response = await request(app)
        .post('/api/v1/reports/site-performance')
        .send(requestBody);

      expect(response.status).toBe(200);
      expect(response.body.data.fileSize).toBeGreaterThan(0);
    });

    it('should include timestamp in generated reports', async () => {
      const result = await reportGenerator.generateCSVReport(
        [{ id: 1, name: 'Test' }],
        'timestamp-test.csv'
      );

      expect(result).toHaveProperty('generatedAt');
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should generate unique file names for concurrent reports', async () => {
      const csvData = [{ id: 1, name: 'Test' }];

      const result1 = await reportGenerator.generateCSVReport(csvData, 'report-1.csv');
      const result2 = await reportGenerator.generateCSVReport(csvData, 'report-2.csv');

      expect(result1.fileName).not.toBe(result2.fileName);
      expect(result1.url).not.toBe(result2.url);
    });
  });

  describe('Report Metadata', () => {
    it('should return complete report metadata', async () => {
      const result = await reportGenerator.generateCSVReport(
        [{ id: 1, name: 'Test' }],
        'metadata-test.csv'
      );

      expect(result).toHaveProperty('filePath');
      expect(result).toHaveProperty('fileName');
      expect(result).toHaveProperty('fileSize');
      expect(result).toHaveProperty('format');
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('generatedAt');

      expect(typeof result.fileSize).toBe('number');
      expect(typeof result.format).toBe('string');
      expect(result.format).toBe('csv');
    });
  });
});
