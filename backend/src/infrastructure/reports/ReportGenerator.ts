/**
 * Report Generator
 *
 * Handles report generation and export to Excel/CSV formats.
 * Uses ExcelJS for Excel file generation with formatting.
 *
 * @module infrastructure/reports
 */

import ExcelJS from 'exceljs';
import { writeFile } from 'fs/promises';
import path from 'path';
import { format } from 'date-fns';
import logger from '../../config/logger.js';

/**
 * Report Generation Result
 */
export interface IReportGenerationResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  format: 'xlsx' | 'csv';
  url: string;
  generatedAt: Date;
}

/**
 * Report Cell Style
 */
interface IReportStyle {
  font?: { bold?: boolean; size?: number };
  fill?: { type: string; fgColor?: { argb: boolean; r: number; g: number; b: number } } };
  alignment?: { horizontal: 'left' | 'center' | 'right'; vertical: 'top' | 'middle' | 'bottom' };
  border?: { top: { style: string; color: { argb: boolean; r: number; g: number; b: number } } };
  numFmt?: string;
}

/**
 * Default styles for report elements
 */
const STYLES = {
  header: {
    font: { bold: true, size: 12, color: { argb: true, r: 255, g: 255, b: 255 } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: true, r: 31, g: 78, b: 120 } },
    alignment: { horizontal: 'center', vertical: 'middle' },
    border: { top: { style: 'thin', color: { argb: true, r: 217, g: 217, b: 217 } } },
  },
  title: {
    font: { bold: true, size: 16, color: { argb: true, r: 31, g: 78, b: 120 } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  },
  subtitle: {
    font: { bold: false, size: 11, color: { argb: true, r: 68, g: 68, b: 68 } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  },
  data: {
    font: { size: 11 },
    alignment: { horizontal: 'left', vertical: 'middle' },
  },
  number: {
    numFmt: '#,##0.00',
    alignment: { horizontal: 'right', vertical: 'middle' },
  },
  currency: {
    numFmt: '"$"#,##0.00',
    alignment: { horizontal: 'right', vertical: 'middle' },
  },
  percentage: {
    numFmt: '0.0%',
    alignment: { horizontal: 'right', vertical: 'middle' },
  },
  date: {
    numFmt: 'yyyy-mm-dd hh:mm',
    alignment: { horizontal: 'left', vertical: 'middle' },
  },
  totalRow: {
    font: { bold: true, size: 11 },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: true, r: 242, g: 242, g: 242 } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  },
} as const;

/**
 * Report Generator Class
 *
 * Generates Excel and CSV reports for various data types:
 * - Site performance reports
 * Guard attendance reports
 * Incident summary reports
 * Patrol completion reports
 */
export class ReportGenerator {
  private readonly outputDir: string;

  constructor(outputDir: string = './reports') {
    this.outputDir = outputDir;
  }

  /**
   * Initialize the reports directory
   */
  async initialize(): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      logger.info(`Reports directory initialized: ${this.outputDir}`);
    } catch (error) {
      logger.error('Failed to initialize reports directory:', error);
      throw error;
    }
  }

  /**
   * Generate Site Performance Report (Excel)
   */
  async generateSitePerformanceReport(
    data: any,
    options: { siteName: string; startDate: Date; endDate: Date }
  ): Promise<IReportGenerationResult> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Site Performance');

    // Add title
    worksheet.mergeCells('A1:G1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `Site Performance Report - ${options.siteName}`;
    titleCell.style = STYLES.title;

    // Add subtitle
    worksheet.mergeCells('A2:G2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = `${format(options.startDate, 'MMM dd, yyyy')} - ${format(options.endDate, 'MMM dd, yyyy')}`;
    subtitleCell.style = STYLES.subtitle;

    // Add headers
    const headers = [
      'Metric',
      'Value',
      'Target',
      'Variance',
      'Trend',
      'Notes',
    ];
    const headerRow = 4;
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(`${String.fromCharCode(65 + index)}${headerRow}`);
      cell.value = header;
      cell.style = STYLES.header;
    });

    // Set column widths
    worksheet.columns = [
      { width: 30 }, // Metric
      { width: 15 }, // Value
      { width: 15 }, // Target
      { width: 12 }, // Variance
      { width: 12 }, // Trend
      { width: 30 }, // Notes
    ];

    let row = 5;

    // Patrol Metrics
    worksheet.mergeCells(`A${row}:G${row}`);
    worksheet.getCell(`A${row}`).value = 'Patrol Metrics';
    worksheet.getCell(`A${row}`).style = STYLES.subtitle;
    row++;

    this.addReportRow(worksheet, row, 'Total Patrols', data.patrols?.total || 0);
    this.addReportRow(worksheet, row + 1, 'Completed', data.patrols?.completed || 0, data.patrols?.total || 0);
    this.addReportRow(worksheet, row + 2, 'Missed', data.patrols?.missed || 0, data.patrols?.total || 0);
    this.addReportRow(worksheet, row + 3, 'In Progress', data.patrols?.inProgress || 0, data.patrols?.total || 0);
    this.addReportRow(worksheet, row + 4, 'Completion Rate', data.patrols?.completionRate || 0, 0.95, 'percentage');
    this.addReportRow(worksheet, row + 5, 'Avg Duration (min)', data.patrols?.averageDuration || 0, 45, 'number');
    row += 7;

    // Incident Metrics
    worksheet.mergeCells(`A${row}:G${row}`);
    worksheet.getCell(`A${row}`).value = 'Incident Metrics';
    worksheet.getCell(`A${row}`).style = STYLES.subtitle;
    row++;

    this.addReportRow(worksheet, row, 'Total Incidents', data.incidents?.total || 0);
    this.addReportRow(worksheet, row + 1, 'Resolved This Period', data.incidents?.resolvedThisPeriod || 0);
    this.addReportRow(worksheet, row + 2, 'Avg Resolution Time (hrs)', data.incidents?.averageResolutionTime || 0, 4, 'number');
    row += 4;

    // Shift/Attendance Metrics
    worksheet.mergeCells(`A${row}:G${row}`);
    worksheet.getCell(`A${row}`).value = 'Shift/Attendance Metrics';
    worksheet.getCell(`A${row}`).style = STYLES.subtitle;
    row++;

    this.addReportRow(worksheet, row, 'Total Shifts', data.shifts?.totalShifts || 0);
    this.addReportRow(worksheet, row + 1, 'Completed Shifts', data.shifts?.completedShifts || 0, data.shifts?.scheduledShifts || 0);
    this.addReportRow(worksheet, row + 2, 'Missed Shifts', data.shifts?.missedShifts || 0);
    this.addReportRow(worksheet, row + 3, 'On-Time Clock-In Rate', data.shifts?.onTimeClockInRate || 0, 0.90, 'percentage');
    row += 5;

    // Overall Score
    worksheet.mergeCells(`A${row}:G${row}`);
    worksheet.getCell(`A${row}`).value = 'Overall Performance Score';
    worksheet.getCell(`A${row}`).style = STYLES.subtitle;
    row++;

    this.addReportRow(worksheet, row, 'Score', data.overallScore || 0, 80, 'number');
    row++;

    // Add generated timestamp
    worksheet.mergeCells(`A${row}:G${row}`);
    worksheet.getCell(`A${row}`).value = `Generated: ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}`;
    worksheet.getCell(`A${row}`).style = STYLES.subtitle;
    row += 2;

    // Add borders to all data cells
    const lastRow = row - 1;
    for (let r = headerRow; r <= lastRow; r++) {
      for (let c = 1; c <= 7; c++) {
        const cell = worksheet.getCell(`${String.fromCharCode(64 + c)}${r}`);
        if (!cell.style) {
          cell.style = STYLES.data;
        }
        if (!cell.style.alignment) {
          cell.style.alignment = STYLES.data.alignment;
        }
      }
    }

    // Generate file
    const fileName = `site-performance-${Date.now()}.xlsx`;
    const filePath = path.join(this.outputDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    const stats = await import('fs/promises').then(fs => fs.stat(filePath));

    logger.info(`Report generated: ${fileName} (${stats.size} bytes)`);

    return {
      filePath,
      fileName,
      fileSize: stats.size,
      format: 'xlsx',
      url: `/reports/${fileName}`,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate Guard Attendance Report (Excel)
   */
  async generateGuardAttendanceReport(
    guards: any[],
    options: { startDate: Date; endDate: Date; siteName?: string }
  ): Promise<IReportGenerationResult> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Guard Attendance');

    // Add title
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = options.siteName
      ? `Guard Attendance Report - ${options.siteName}`
      : 'Guard Attendance Report';
    titleCell.style = STYLES.title;

    // Add subtitle
    worksheet.mergeCells('A2:J2');
    const subtitleCell = worksheet.getCell('A2');
    subtitleCell.value = `${format(options.startDate, 'MMM dd, yyyy')} - ${format(options.endDate, 'yyyy')}`;
    subtitleCell.style = STYLES.subtitle;

    // Add headers
    const headers = [
      'Guard ID',
      'Guard Name',
      'Total Shifts',
      'Completed',
      'Missed',
      'Late',
      'Early Leave',
      'Total Hours',
      'Attendance Rate',
    ];
    const headerRow = 4;
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(`${String.fromCharCode(65 + index)}${headerRow}`);
      cell.value = header;
      cell.style = STYLES.header;
    });

    // Set column widths
    worksheet.columns = [
      { width: 10 },
      { width: 20 },
      { width: 12 },
      { width: 12 },
      { width: 10 },
      { width: 10 },
      { width: 12 },
      { width: 12 },
      { width: 12 },
      { width: 15 },
    ];

    // Add data rows
    let row = 5;
    guards.forEach((guard, index) => {
      const attendanceRate = guard.totalShifts > 0
        ? ((guard.completed || 0) / guard.totalShifts)
        : 0;

      worksheet.getCell(`A${row}`).value = guard.id;
      worksheet.getCell(`B${row}`).value = guard.name;
      worksheet.getCell(`C${row}`).value = guard.totalShifts;
      worksheet.getCell(`D${row}`).value = guard.completed;
      worksheet.getCell(`E${row}`).value = guard.missed;
      worksheet.getCell(`F${row}`).value = guard.lateCount || 0;
      worksheet.getCell(`G${row}`).value = guard.earlyLeaveCount || 0;
      worksheet.getCell(`H${row}`).value = guard.totalHours;
      worksheet.getCell(`I${row}`).value = attendanceRate;
      worksheet.getCell(`I${row}`).numFmt = STYLES.percentage.numFmt;

      // Style data rows
      for (let c = 1; c <= 9; c++) {
        const cell = worksheet.getCell(`${String.fromCharCode(64 + c)}${row}`);
        cell.style = STYLES.data;
      }

      row++;
    });

    // Add total row
    const totalRow = row;
    worksheet.getCell(`A${totalRow}`).value = 'TOTAL';
    worksheet.getCell(`A${totalRow}`).style = STYLES.totalRow;
    for (let c = 3; c <= 8; c++) {
      const cell = worksheet.getCell(`${String.fromCharCode(64 + c)}${totalRow}`);
      cell.style = STYLES.totalRow;
      cell.formula = this.sumColumnFormula(c, 5, row - 1);
    }

    // Generate file
    const fileName = `guard-attendance-${Date.now()}.xlsx`;
    const filePath = path.join(this.outputDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    const stats = await import('fs/promises').then(fs => fs.stat(filePath));

    return {
      filePath,
      fileName,
      fileSize: stats.size,
      format: 'xlsx',
      url: `/reports/${fileName}`,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate Incident Summary Report (Excel)
   */
  async generateIncidentSummaryReport(
    incidents: any[],
    options: { startDate: Date; endDate: Date; siteName?: string }
  ): Promise<IReportGenerationResult> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Incident Summary');

    // Add title
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = options.siteName
      ? `Incident Summary Report - ${options.siteName}`
      : 'Incident Summary Report';
    titleCell.style = STYLES.title;

    // Add headers
    const headers = [
      'ID',
      'Title',
      'Type',
      'Priority',
      'Status',
      'Site',
      'Reported By',
      'Created Date',
      'Resolved Date',
      'Description',
    ];
    const headerRow = 4;
    headers.forEach((header, index) => {
      const cell = worksheet.getCell(`${String.fromCharCode(65 + index)}${headerRow}`);
      cell.value = header;
      cell.style = STYLES.header;
    });

    // Set column widths
    worksheet.columns = [
      { width: 8 },
      { width: 25 },
      { width: 12 },
      { width: 10 },
      { width: 12 },
      { width: 15 },
      { width: 15 },
      { width: 15 },
      { width: 12 },
      { width: 40 },
    ];

    // Add data rows
    let row = 5;
    incidents.forEach((incident) => {
      worksheet.getCell(`A${row}`).value = incident.id;
      worksheet.getCell(`B${row}`).value = incident.title;
      worksheet.getCell(`C${row}`).value = incident.type;
      worksheet.getCell(`D${row}`).value = incident.priority;
      worksheet.getCell(`E${row}`).value = incident.status;
      worksheet.getCell(`F${row}`).value = incident.siteName || '';
      worksheet.getCell(`G${row}`).value = incident.reportedBy || '';
      worksheet.getCell(`H${row}`).value = incident.createdAt;
      worksheet.getCell(`H${row}`).numFmt = STYLES.date.numFmt;
      worksheet.getCell(`I${row}`).value = incident.resolvedAt || '';
      worksheet.getCell(`I${row}`).numFmt = STYLES.date.numFmt;
      worksheet.getCell(`J${row}`).value = incident.description || '';

      // Style data rows
      for (let c = 1; c <= 10; c++) {
        const cell = worksheet.getCell(`${String.fromCharCode(64 + c)}${row}`);
        cell.style = STYLES.data;
      }

      row++;
    });

    // Generate file
    const fileName = `incident-summary-${Date.now()}.xlsx`;
    const filePath = path.join(this.outputDir, fileName);

    await workbook.xlsx.writeFile(filePath);

    const stats = await import('fs/promises').then(fs => fs.stat(filePath));

    return {
      filePath,
      fileName,
      fileSize: stats.size,
      format: 'xlsx',
      url: `/reports/${fileName}`,
      generatedAt: new Date(),
    };
  }

  /**
   * Generate CSV Export
   */
  async generateCSVReport(
    data: any[],
    fileName: string,
    options?: { delimiter?: string }
  ): Promise<IReportGenerationResult> {
    const delimiter = options?.delimiter || ',';

    // Extract headers from first object
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(delimiter),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header];
          // Escape values containing delimiter or quotes
          if (typeof value === 'string' && (value.includes(delimiter) || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(delimiter)
      ),
    ];

    const csvContent = csvRows.join('\n');
    const filePath = path.join(this.outputDir, fileName);

    const fs = await import('fs/promises');
    await fs.writeFile(filePath, csvContent, 'utf-8');

    const stats = await fs.stat(filePath);

    logger.info(`CSV report generated: ${fileName} (${stats.size} bytes)`);

    return {
      filePath,
      fileName,
      fileSize: stats.size,
      format: 'csv',
      url: `/reports/${fileName}`,
      generatedAt: new Date(),
    };
  }

  /**
   * Add a row to the report with optional styling
   */
  private addReportRow(
    worksheet: ExcelJS.Worksheet,
    row: number,
    label: string,
    value?: number,
    target?: number,
    styleType?: 'number' | 'percentage'
  ): void {
    const labelCell = worksheet.getCell(`A${row}`);
    const valueCell = worksheet.getCell(`B${row}`);
    const targetCell = worksheet.getCell(`C${row}`);
    const varianceCell = worksheet.getCell(`D${row}`);

    labelCell.value = label;
    labelCell.style = STYLES.data;

    if (value !== undefined) {
      valueCell.value = value;
      if (styleType === 'percentage') {
        valueCell.numFmt = STYLES.percentage.numFmt;
      } else {
        valueCell.numFmt = STYLES.number.numFmt;
      }
      valueCell.style = STYLES.data;
    }

    if (target !== undefined) {
      targetCell.value = target;
      targetCell.style = STYLES.data;

      // Calculate variance
      if (value !== undefined) {
        const variance = value - target;
        varianceCell.value = variance;
        varianceCell.style = variance < 0 ? { ...STYLES.data, font: { color: { argb: true, r: 220, g: 53, b: 69 } } } : STYLES.data;
      }
    }
  }

  /**
   * Generate Excel formula for sum of column
   */
  private sumColumnFormula(
    column: number,
    startRow: number,
    endRow: number
  ): string {
    const colLetter = String.fromCharCode(64 + column);
    return `SUM(${colLetter}${startRow}:${colLetter}${endRow})`;
  }

  /**
   * Delete a report file
   */
  async deleteReport(fileName: string): Promise<void> {
    const fs = await import('fs/promises');
    const filePath = path.join(this.outputDir, fileName);

    try {
      await fs.unlink(filePath);
      logger.info(`Report deleted: ${fileName}`);
    } catch (error) {
      logger.warn(`Failed to delete report ${fileName}:`, error);
    }
  }
}

/**
 * Singleton instance management
 */
let reportGeneratorInstance: ReportGenerator | null = null;

export function initializeReportGenerator(outputDir?: string): ReportGenerator {
  reportGeneratorInstance = new ReportGenerator(outputDir);
  return reportGeneratorInstance;
}

export function getReportGenerator(): ReportGenerator {
  if (!reportGeneratorInstance) {
    throw new Error('ReportGenerator not initialized');
  }
  return reportGeneratorInstance;
}

export default ReportGenerator;
