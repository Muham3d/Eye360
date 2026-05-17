/**
 * Report Service
 *
 * Core service for generating site performance reports with Excel/CSV export capabilities.
 * Handles scheduled reporting, data aggregation, and export formatting.
 *
 * @module core/services
 */

import type { IPatrolRunRepository } from '../domain/repositories/IPatrolRunRepository.js';
import type { IIncidentRepository } from '../domain/repositories/IIncidentRepository.js';
import type { IShiftRepository } from '../domain/repositories/IShiftRepository.js';
import type { ISiteRepository } from '../domain/repositories/ISiteRepository.js';
import type {
  IShiftStatistics,
  IAttendanceRecord,
} from '../domain/entities/Shift.js';
import type {
  IIncidentStatistics,
} from '../domain/entities/Incident.js';
import ExcelJS from 'exceljs';

/**
 * Report Date Range
 */
export interface IReportDateRange {
  start: Date;
  end: Date;
}

/**
 * Site Performance Report
 * Comprehensive report for a site including all metrics
 */
export interface ISitePerformanceReport {
  siteId: number;
  siteName: string;
  period: IReportDateRange;
  generatedAt: Date;

  // Patrol Metrics
  patrols: {
    total: number;
    completed: number;
    missed: number;
    inProgress: number;
    completionRate: number;
    averageDuration: number; // minutes
    checkpointsVerified: number;
    checkpointsTotal: number;
  };

  // Incident Metrics
  incidents: {
    total: number;
    byStatus: Record<string, number>;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
    averageResolutionTime: number; // hours
    resolvedThisPeriod: number;
  };

  // Shift/Attendance Metrics
  shifts: {
    totalShifts: number;
    scheduledShifts: number;
    completedShifts: number;
    missedShifts: number;
    cancelledShifts: number;
    totalHours: number;
    averageShiftDuration: number;
    onTimeClockInRate: number;
    averageOvertime: number;
    activeGuards: number;
  };

  // Overall Score
  overallScore: number; // 0-100
}

/**
 * Patrol Detail Record
 * Individual patrol record for detailed reports
 */
export interface IPatrolDetailRecord {
  id: number;
  guardName: string;
  siteName: string;
  templateName: string;
  scheduledStart: Date;
  actualStart?: Date;
  completedAt?: Date;
  status: string;
  checkpointsCompleted: number;
  checkpointsTotal: number;
  duration?: number; // minutes
  notes?: string;
}

/**
 * Incident Detail Record
 * Individual incident record for detailed reports
 */
export interface IIncidentDetailRecord {
  id: number;
  title: string;
  type: string;
  priority: string;
  status: string;
  siteName: string;
  reportedBy: string;
  assignedTo?: string;
  createdAt: Date;
  resolvedAt?: Date;
  resolutionTime?: number; // hours
  evidenceCount: number;
  commentCount: number;
}

/**
 * Export Format
 */
export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'excel',
  JSON = 'json',
}

/**
 * Export Result
 * Result of an export operation
 */
export interface IExportResult {
  format: ExportFormat;
  filename: string;
  data: string | Buffer;
  mimeType: string;
  size: number; // bytes
}

/**
 * Scheduled Report Configuration
 */
export interface IScheduledReportConfig {
  name: string;
  description?: string;
  sites: number[]; // Site IDs to include (empty = all sites)
  recipients: string[]; // Email addresses
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  format: ExportFormat;
  includeDetails: boolean;
  enabled: boolean;
}

/**
 * Report Service
 *
 * Provides comprehensive reporting capabilities:
 * - Site performance reports
 * - Attendance reports
 * - Incident summaries
 * - Export to CSV/Excel
 */
export class ReportService {
  constructor(
    private readonly patrolRepo: IPatrolRunRepository,
    private readonly incidentRepo: IIncidentRepository,
    private readonly shiftRepo: IShiftRepository,
    private readonly siteRepo: ISiteRepository
  ) {}

  /**
   * Generate a comprehensive site performance report
   *
   * @param siteId - Site ID
   * @param range - Date range
   * @returns Site performance report
   */
  async generateSiteReport(siteId: number, range: IReportDateRange): Promise<ISitePerformanceReport> {
    const site = await this.siteRepo.findById(siteId);
    if (!site) {
      throw new Error(`Site ${siteId} not found`);
    }

    // Get patrol data, incidents, and shifts in parallel
    const [patrolRuns, incidents, incidentStats, shiftStats] = await Promise.all([
      this.patrolRepo.findBySiteId(siteId),
      this.incidentRepo.findBySite(siteId),
      this.incidentRepo.getStatistics(),
      this.shiftRepo.getStatistics(range.start, range.end),
    ]);

    const completedPatrols = patrolRuns.filter((p) => p.status === 'completed');
    const missedPatrols = patrolRuns.filter((p) => p.status === 'missed');
    const inProgressPatrols = patrolRuns.filter((p) => p.status === 'in_progress');

    let totalCheckpoints = 0;
    let verifiedCheckpoints = 0;
    let totalPatrolDuration = 0;

    // Fetch details for all completed patrols in parallel
    const patrolDetails = await Promise.all(
      completedPatrols.map((patrol) => this.patrolRepo.findById(patrol.id))
    );

    for (let i = 0; i < completedPatrols.length; i++) {
      const details = patrolDetails[i];
      const patrol = completedPatrols[i];

      if (details) {
        totalCheckpoints += details.checkpoints?.length || 0;
        verifiedCheckpoints += details.checkpoints?.filter((c) => c.verified).length || 0;
        if (patrol.startedAt && patrol.completedAt) {
          totalPatrolDuration += (new Date(patrol.completedAt).getTime() - new Date(patrol.startedAt).getTime()) / (1000 * 60);
        }
      }
    }

    // Calculate overall score (0-100)
    const patrolScore = patrolRuns.length > 0 ? (completedPatrols.length / patrolRuns.length) * 40 : 0;
    const attendanceScore = shiftStats.totalShifts > 0 ? (shiftStats.completedShifts / shiftStats.totalShifts) * 30 : 0;
    const incidentScore = incidents.length === 0 ? 30 : Math.max(0, 30 - (incidents.length * 2)); // Fewer incidents is better
    const overallScore = Math.min(100, Math.round(patrolScore + attendanceScore + incidentScore));

    return {
      siteId,
      siteName: site.name,
      period: range,
      generatedAt: new Date(),
      patrols: {
        total: patrolRuns.length,
        completed: completedPatrols.length,
        missed: missedPatrols.length,
        inProgress: inProgressPatrols.length,
        completionRate: patrolRuns.length > 0 ? (completedPatrols.length / patrolRuns.length) * 100 : 0,
        averageDuration: completedPatrols.length > 0 ? totalPatrolDuration / completedPatrols.length : 0,
        checkpointsVerified: verifiedCheckpoints,
        checkpointsTotal: totalCheckpoints,
      },
      incidents: {
        total: incidents.length,
        byStatus: incidentStats.byStatus,
        byPriority: incidentStats.byPriority,
        byType: incidentStats.byType,
        averageResolutionTime: incidentStats.averageResolutionTime,
        resolvedThisPeriod: incidentStats.resolvedThisWeek,
      },
      shifts: {
        totalShifts: shiftStats.totalShifts,
        scheduledShifts: shiftStats.scheduledShifts,
        completedShifts: shiftStats.completedShifts,
        missedShifts: shiftStats.missedShifts,
        cancelledShifts: shiftStats.cancelledShifts,
        totalHours: Object.values(shiftStats.bySite).reduce((sum, s) => sum + s.totalHours, 0),
        averageShiftDuration: shiftStats.averageShiftDuration,
        onTimeClockInRate: shiftStats.onTimeClockInRate,
        averageOvertime: shiftStats.averageOvertime,
        activeGuards: Object.keys(shiftStats.byGuard).length,
      },
      overallScore,
    };
  }

  /**
   * Generate detailed patrol records for a site
   *
   * @param siteId - Site ID
   * @param range - Date range
   * @returns List of patrol detail records
   */
  async generatePatrolDetails(siteId: number, range: IReportDateRange): Promise<IPatrolDetailRecord[]> {
    const patrolRuns = await this.patrolRepo.findBySiteId(siteId);

    const filteredPatrols = patrolRuns.filter(
      (patrol) => patrol.scheduledAt >= range.start && patrol.scheduledAt <= range.end
    );

    const fullPatrols = await Promise.all(
      filteredPatrols.map((patrol) => this.patrolRepo.findById(patrol.id))
    );

    const details: IPatrolDetailRecord[] = [];

    for (let i = 0; i < filteredPatrols.length; i++) {
      const patrol = filteredPatrols[i];
      const fullPatrol = fullPatrols[i];

      if (!fullPatrol) continue;

      const checkpointsCompleted = fullPatrol.checkpoints?.filter((c) => c.verified).length || 0;
      const checkpointsTotal = fullPatrol.checkpoints?.length || 0;

      let duration: number | undefined;
      if (patrol.startedAt && patrol.completedAt) {
        duration = (new Date(patrol.completedAt).getTime() - new Date(patrol.startedAt).getTime()) / (1000 * 60);
      }

      details.push({
        id: patrol.id,
        guardName: `${patrol.guard?.firstName || ''} ${patrol.guard?.lastName || ''}`.trim() || 'Unknown',
        siteName: patrol.site?.name || 'Unknown',
        templateName: patrol.template?.name || 'Unknown',
        scheduledStart: patrol.scheduledAt,
        actualStart: patrol.startedAt,
        completedAt: patrol.completedAt,
        status: patrol.status,
        checkpointsCompleted,
        checkpointsTotal,
        duration,
        notes: patrol.notes,
      });
    }

    return details;
  }

  /**
   * Generate detailed incident records for a site
   *
   * @param siteId - Site ID
   * @param range - Date range
   * @returns List of incident detail records
   */
  async generateIncidentDetails(siteId: number, range: IReportDateRange): Promise<IIncidentDetailRecord[]> {
    const incidents = await this.incidentRepo.findBySite(siteId);

    const details: IIncidentDetailRecord[] = [];

    for (const incident of incidents) {
      if (incident.createdAt >= range.start && incident.createdAt <= range.end) {
        let resolutionTime: number | undefined;
        if (incident.resolvedAt) {
          resolutionTime = (new Date(incident.resolvedAt).getTime() - new Date(incident.createdAt).getTime()) / (1000 * 60 * 60);
        }

        details.push({
          id: incident.id,
          title: incident.title,
          type: incident.type,
          priority: incident.priority,
          status: incident.status,
          siteName: incident.site?.name || 'Unknown',
          reportedBy: `${incident.reportedBy}` || 'Unknown',
          assignedTo: incident.assignedTo ? `${incident.assignedTo}` : undefined,
          createdAt: incident.createdAt,
          resolvedAt: incident.resolvedAt,
          resolutionTime,
          evidenceCount: incident.evidence.length,
          commentCount: incident.comments.length,
        });
      }
    }

    return details;
  }

  /**
   * Export data to CSV format
   *
   * @param data - Array of objects to export
   * @param filename - Output filename
   * @returns Export result with CSV data
   */
  async exportToCSV(data: Record<string, any>[], filename: string): Promise<IExportResult> {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Get headers from first object
    const headers = Object.keys(data[0]);

    // Format date objects and convert values to strings
    const formatValue = (value: any): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'object' && value instanceof Date) {
        return value.toISOString();
      }
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
    };

    // Build CSV content
    const csvRows: string[] = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
      const values = headers.map((header) => {
        const value = formatValue(row[header]);
        // Escape values containing commas or quotes
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');

    return {
      format: ExportFormat.CSV,
      filename: `${filename}.csv`,
      data: csvContent,
      mimeType: 'text/csv',
      size: Buffer.byteLength(csvContent, 'utf8'),
    };
  }

  /**
   * Export data to real Excel format using exceljs
   */
  async exportToExcel(data: Record<string, any>[], filename: string, sheetName: string = 'Report'): Promise<IExportResult> {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'PatrolManager';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet(sheetName);

    // Add headers
    const headers = Object.keys(data[0]);
    const headerRow = worksheet.addRow(headers);
    headerRow.font = { bold: true, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };
    headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    for (const row of data) {
      const values = headers.map((h) => {
        const val = row[h];
        if (val instanceof Date) return val.toISOString();
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return val;
      });
      worksheet.addRow(values);
    }

    // Auto-fit column widths
    worksheet.columns.forEach((col) => {
      let maxLen = 10;
      col.eachCell?.({ includeEmpty: false }, (cell) => {
        const len = String(cell.value || '').length;
        if (len > maxLen) maxLen = Math.min(len + 2, 50);
      });
      col.width = maxLen;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      format: ExportFormat.EXCEL,
      filename: `${filename}.xlsx`,
      data: Buffer.from(buffer),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: buffer.byteLength,
    };
  }

  /**
   * Export data to JSON format
   *
   * @param data - Data to export
   * @param filename - Output filename
   * @returns Export result with JSON data
   */
  async exportToJSON(data: any, filename: string): Promise<IExportResult> {
    const jsonContent = JSON.stringify(data, null, 2);

    return {
      format: ExportFormat.JSON,
      filename: `${filename}.json`,
      data: jsonContent,
      mimeType: 'application/json',
      size: Buffer.byteLength(jsonContent, 'utf8'),
    };
  }

  /**
   * Export a site report to the specified format
   *
   * @param siteId - Site ID
   * @param range - Date range
   * @param format - Export format
   * @param includeDetails - Include detailed records
   * @returns Export result
   */
  async exportSiteReport(
    siteId: number,
    range: IReportDateRange,
    format: ExportFormat,
    includeDetails: boolean = false
  ): Promise<IExportResult> {
    const report = await this.generateSiteReport(siteId, range);

    let exportData: Record<string, any>;

    if (includeDetails) {
      const patrolDetails = await this.generatePatrolDetails(siteId, range);
      const incidentDetails = await this.generateIncidentDetails(siteId, range);

      exportData = {
        report,
        details: {
          patrols: patrolDetails,
          incidents: incidentDetails,
        },
      };
    } else {
      exportData = { report };
    }

    switch (format) {
      case ExportFormat.CSV:
        // Flatten report for CSV
        const flatData = this.flattenReportForCSV(report);
        return this.exportToCSV(flatData, `site-${siteId}-report-${range.start.toISOString().split('T')[0]}`);

      case ExportFormat.EXCEL:
        const flatDataExcel = this.flattenReportForCSV(report);
        return this.exportToExcel(flatDataExcel, `site-${siteId}-report-${range.start.toISOString().split('T')[0]}`);

      case ExportFormat.JSON:
        return this.exportToJSON(exportData, `site-${siteId}-report-${range.start.toISOString().split('T')[0]}`);

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Export attendance report to CSV
   *
   * @param siteId - Site ID
   * @param range - Date range
   * @returns Export result
   */
  async exportAttendanceReport(siteId: number, range: IReportDateRange): Promise<IExportResult> {
    const attendance = await this.shiftRepo.getAttendanceReport(siteId, range.start, range.end);

    const csvData = attendance.map((record) => ({
      'Guard Name': record.guardName,
      'Site': record.siteName,
      'Shift Type': record.type,
      'Scheduled Start': record.scheduledStart.toISOString(),
      'Scheduled End': record.scheduledEnd.toISOString(),
      'Actual Start': record.actualStart?.toISOString() || '',
      'Actual End': record.actualEnd?.toISOString() || '',
      'Status': record.status,
      'Is Late': record.isLate ? 'Yes' : 'No',
      'Minutes Late': record.minutesLate || 0,
      'Early Leave': record.hasEarlyLeave ? 'Yes' : 'No',
      'Minutes Early': record.minutesEarly || 0,
      'Overtime (min)': record.overtimeMinutes || 0,
      'Notes': record.notes || '',
    }));

    return this.exportToCSV(csvData, `attendance-site-${siteId}-${range.start.toISOString().split('T')[0]}`);
  }

  /**
   * Generate a multi-site comparison report
   *
   * @param siteIds - Array of site IDs
   * @param range - Date range
   * @returns Array of site reports for comparison
   */
  async generateComparisonReport(siteIds: number[], range: IReportDateRange): Promise<ISitePerformanceReport[]> {
    const reportPromises = siteIds.map(async (siteId) => {
      try {
        return await this.generateSiteReport(siteId, range);
      } catch (error) {
        console.error(`Failed to generate report for site ${siteId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(reportPromises);
    const reports = results.filter((report): report is ISitePerformanceReport => report !== null);

    // Sort by overall score
    reports.sort((a, b) => b.overallScore - a.overallScore);

    return reports;
  }

  /**
   * Flatten a site report for CSV export
   *
   * @param report - Site performance report
   * @returns Flattened data for CSV
   */
  private flattenReportForCSV(report: ISitePerformanceReport): Record<string, any>[] {
    return [
      {
        'Site ID': report.siteId,
        'Site Name': report.siteName,
        'Report Period Start': report.period.start.toISOString(),
        'Report Period End': report.period.end.toISOString(),
        'Generated At': report.generatedAt.toISOString(),
        'Overall Score': report.overallScore,
        // Patrol metrics
        'Total Patrols': report.patrols.total,
        'Completed Patrols': report.patrols.completed,
        'Missed Patrols': report.patrols.missed,
        'Patrol Completion Rate (%)': report.patrols.completionRate.toFixed(2),
        'Average Patrol Duration (min)': report.patrols.averageDuration.toFixed(2),
        'Checkpoints Verified': report.patrols.checkpointsVerified,
        'Total Checkpoints': report.patrols.checkpointsTotal,
        // Incident metrics
        'Total Incidents': report.incidents.total,
        'New Incidents': report.incidents.byStatus.new || 0,
        'Investigating Incidents': report.incidents.byStatus.investigating || 0,
        'Resolved Incidents': report.incidents.byStatus.resolved || 0,
        'Closed Incidents': report.incidents.byStatus.closed || 0,
        'Critical Incidents': report.incidents.byPriority.critical || 0,
        'High Priority Incidents': report.incidents.byPriority.high || 0,
        'Average Resolution Time (hrs)': report.incidents.averageResolutionTime.toFixed(2),
        // Shift metrics
        'Total Shifts': report.shifts.totalShifts,
        'Completed Shifts': report.shifts.completedShifts,
        'Missed Shifts': report.shifts.missedShifts,
        'Total Hours Worked': report.shifts.totalHours.toFixed(2),
        'Average Shift Duration (min)': report.shifts.averageShiftDuration.toFixed(2),
        'On-Time Clock-In Rate (%)': report.shifts.onTimeClockInRate.toFixed(2),
        'Average Overtime (min)': report.shifts.averageOvertime.toFixed(2),
        'Active Guards': report.shifts.activeGuards,
      },
    ];
  }
}

/**
 * Service singleton instance
 */
let reportServiceInstance: ReportService | null = null;

/**
 * Initialize the ReportService singleton
 *
 * @param patrolRepo - Patrol run repository
 * @param incidentRepo - Incident repository
 * @param shiftRepo - Shift repository
 * @param siteRepo - Site repository
 * @returns ReportService instance
 */
export function initializeReportService(
  patrolRepo: IPatrolRunRepository,
  incidentRepo: IIncidentRepository,
  shiftRepo: IShiftRepository,
  siteRepo: ISiteRepository
): ReportService {
  if (!reportServiceInstance) {
    reportServiceInstance = new ReportService(patrolRepo, incidentRepo, shiftRepo, siteRepo);
  }
  return reportServiceInstance;
}

/**
 * Get the ReportService singleton instance
 *
 * @returns ReportService instance or throws if not initialized
 */
export function getReportService(): ReportService {
  if (!reportServiceInstance) {
    throw new Error('ReportService not initialized. Call initializeReportService first.');
  }
  return reportServiceInstance;
}
