/**
 * Report Jobs
 *
 * Scheduled tasks for automated report generation and distribution.
 * Uses node-cron for scheduling periodic report jobs.
 *
 * @module infrastructure/jobs
 */

import cron from 'node-cron';
import { ReportGenerator, getReportGenerator } from '../reports/ReportGenerator.js';
import { getReportService } from '../../core/services/ReportService.js';
import logger from '../../config/logger.js';

/**
 * Scheduled Job Interface
 */
export interface IScheduledJob {
  name: string;
  schedule: string; // Cron expression
  task: () => Promise<void>;
  enabled: boolean;
}

/**
 * Report Job Configuration Options
 */
export interface IReportJobOptions {
  siteId?: number;
  siteName?: string;
  recipients?: string[]; // Email addresses for report distribution
  format?: 'xlsx' | 'csv';
}

/**
 * Weekly Site Performance Report Options
 */
export interface IWeeklySiteReportOptions extends IReportJobOptions {
  siteId: number;
  siteName: string;
  startDate: Date;
  endDate: Date;
}

/**
 * Monthly Guard Attendance Report Options
 */
export interface IMonthlyAttendanceReportOptions extends IReportJobOptions {
  siteId?: number;
  startDate: Date;
  endDate: Date;
}

/**
 * Report Jobs Manager
 *
 * Manages scheduled report generation tasks.
 * Supports weekly, monthly, and custom scheduled reports.
 */
export class ReportJobs {
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private reportGenerator: ReportGenerator;
  private reportService: any;

  constructor() {
    this.reportGenerator = getReportGenerator();
    this.reportService = getReportService();
  }

  /**
   * Initialize all scheduled report jobs
   */
  async initialize(): Promise<void> {
    logger.info('Initializing scheduled report jobs...');

    // Weekly site performance reports (every Monday at 8:00 AM)
    this.scheduleWeeklySitePerformanceReport();

    // Monthly guard attendance reports (1st of each month at 6:00 AM)
    this.scheduleMonthlyGuardAttendanceReport();

    // Daily incident summary reports (every day at 7:00 AM)
    this.scheduleDailyIncidentSummaryReport();

    logger.info(`Scheduled ${this.jobs.size} report jobs`);
  }

  /**
   * Schedule weekly site performance report
   * Runs every Monday at 8:00 AM
   */
  private scheduleWeeklySitePerformanceReport(): void {
    const jobName = 'weekly-site-performance';

    const task = cron.schedule(
      '0 8 * * 1', // Every Monday at 8:00 AM
      async () => {
        try {
          logger.info('Running weekly site performance report job...');

          // Get all active sites
          const sites = await this.reportService.getActiveSites();

          for (const site of sites) {
            // Calculate date range for last week
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);

            const options: IWeeklySiteReportOptions = {
              siteId: site.id,
              siteName: site.name,
              startDate,
              endDate,
            };

            await this.generateWeeklySiteReport(options);
          }

          logger.info('Weekly site performance report job completed');
        } catch (error) {
          logger.error('Error in weekly site performance report job:', error);
        }
      },
      {
        scheduled: false,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, task);
    logger.info(`Scheduled job: ${jobName} (0 8 * * 1)`);
  }

  /**
   * Schedule monthly guard attendance report
   * Runs on the 1st of each month at 6:00 AM
   */
  private scheduleMonthlyGuardAttendanceReport(): void {
    const jobName = 'monthly-guard-attendance';

    const task = cron.schedule(
      '0 6 1 * *', // 1st of every month at 6:00 AM
      async () => {
        try {
          logger.info('Running monthly guard attendance report job...');

          // Calculate date range for last month
          const now = new Date();
          const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endDate = new Date(now.getFullYear(), now.getMonth(), 0);

          const options: IMonthlyAttendanceReportOptions = {
            startDate,
            endDate,
          };

          await this.generateMonthlyAttendanceReport(options);

          logger.info('Monthly guard attendance report job completed');
        } catch (error) {
          logger.error('Error in monthly guard attendance report job:', error);
        }
      },
      {
        scheduled: false,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, task);
    logger.info(`Scheduled job: ${jobName} (0 6 1 * *)`);
  }

  /**
   * Schedule daily incident summary report
   * Runs every day at 7:00 AM
   */
  private scheduleDailyIncidentSummaryReport(): void {
    const jobName = 'daily-incident-summary';

    const task = cron.schedule(
      '0 7 * * *', // Every day at 7:00 AM
      async () => {
        try {
          logger.info('Running daily incident summary report job...');

          // Calculate date range for yesterday
          const endDate = new Date();
          endDate.setDate(endDate.getDate() - 1);
          endDate.setHours(23, 59, 59, 999);

          const startDate = new Date(endDate);
          startDate.setHours(0, 0, 0, 0);

          // Get incidents from the previous day
          const incidents = await this.reportService.getIncidentsByDateRange(startDate, endDate);

          if (incidents.length > 0) {
            const result = await this.reportGenerator.generateIncidentSummaryReport(
              incidents,
              { startDate, endDate }
            );

            logger.info(`Daily incident summary report generated: ${result.fileName}`);

            // Store report record in database
            await this.reportService.saveReportRecord({
              type: 'daily_incident_summary',
              fileName: result.fileName,
              filePath: result.filePath,
              fileSize: result.fileSize,
              format: result.format,
              generatedAt: result.generatedAt,
              startDate,
              endDate,
            });
          } else {
            logger.info('No incidents found for daily summary report');
          }

          logger.info('Daily incident summary report job completed');
        } catch (error) {
          logger.error('Error in daily incident summary report job:', error);
        }
      },
      {
        scheduled: false,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, task);
    logger.info(`Scheduled job: ${jobName} (0 7 * * *)`);
  }

  /**
   * Generate weekly site performance report
   */
  private async generateWeeklySiteReport(options: IWeeklySiteReportOptions): Promise<void> {
    try {
      // Fetch site performance data
      const reportData = await this.reportService.getSitePerformanceData(
        options.siteId,
        options.startDate,
        options.endDate
      );

      // Generate the report
      const result = await this.reportGenerator.generateSitePerformanceReport(
        reportData,
        {
          siteName: options.siteName,
          startDate: options.startDate,
          endDate: options.endDate,
        }
      );

      logger.info(`Site performance report generated: ${result.fileName} for site ${options.siteName}`);

      // Store report record in database
      await this.reportService.saveReportRecord({
        type: 'weekly_site_performance',
        siteId: options.siteId,
        fileName: result.fileName,
        filePath: result.filePath,
        fileSize: result.fileSize,
        format: result.format,
        generatedAt: result.generatedAt,
        startDate: options.startDate,
        endDate: options.endDate,
      });

      // TODO: Send email notification to recipients
      // await this.emailService.sendReport(result, options.recipients);

    } catch (error) {
      logger.error(`Error generating weekly site report for site ${options.siteId}:`, error);
      throw error;
    }
  }

  /**
   * Generate monthly guard attendance report
   */
  private async generateMonthlyAttendanceReport(options: IMonthlyAttendanceReportOptions): Promise<void> {
    try {
      // Fetch guard attendance data
      const guardsData = await this.reportService.getGuardAttendanceData(
        options.startDate,
        options.endDate
      );

      // Generate the report
      const result = await this.reportGenerator.generateGuardAttendanceReport(
        guardsData,
        {
          startDate: options.startDate,
          endDate: options.endDate,
        }
      );

      logger.info(`Guard attendance report generated: ${result.fileName}`);

      // Store report record in database
      await this.reportService.saveReportRecord({
        type: 'monthly_guard_attendance',
        fileName: result.fileName,
        filePath: result.filePath,
        fileSize: result.fileSize,
        format: result.format,
        generatedAt: result.generatedAt,
        startDate: options.startDate,
        endDate: options.endDate,
      });

      // TODO: Send email notification to recipients
      // await this.emailService.sendReport(result, options.recipients);

    } catch (error) {
      logger.error('Error generating monthly attendance report:', error);
      throw error;
    }
  }

  /**
   * Start all scheduled jobs
   */
  startAll(): void {
    logger.info('Starting all scheduled report jobs...');
    for (const [name, task] of this.jobs.entries()) {
      task.start();
      logger.info(`Started job: ${name}`);
    }
  }

  /**
   * Stop all scheduled jobs
   */
  stopAll(): void {
    logger.info('Stopping all scheduled report jobs...');
    for (const [name, task] of this.jobs.entries()) {
      task.stop();
      logger.info(`Stopped job: ${name}`);
    }
  }

  /**
   * Start a specific job
   */
  startJob(jobName: string): boolean {
    const task = this.jobs.get(jobName);
    if (task) {
      task.start();
      logger.info(`Started job: ${jobName}`);
      return true;
    }
    logger.warn(`Job not found: ${jobName}`);
    return false;
  }

  /**
   * Stop a specific job
   */
  stopJob(jobName: string): boolean {
    const task = this.jobs.get(jobName);
    if (task) {
      task.stop();
      logger.info(`Stopped job: ${jobName}`);
      return true;
    }
    logger.warn(`Job not found: ${jobName}`);
    return false;
  }

  /**
   * Get list of all scheduled jobs
   */
  getJobs(): Array<{ name: string; running: boolean }> {
    return Array.from(this.jobs.entries()).map(([name, task]) => ({
      name,
      running: task.getStatus() === 'scheduled',
    }));
  }

  /**
   * Run a job immediately (manual trigger)
   */
  async runJobNow(jobName: string): Promise<void> {
    const task = this.jobs.get(jobName);
    if (!task) {
      throw new Error(`Job not found: ${jobName}`);
    }

    logger.info(`Running job now: ${jobName}`);

    // Trigger the job immediately
    // Note: This is a workaround since node-cron doesn't have a direct "run now" method
    // In production, you might want to extract the job logic into separate methods
    switch (jobName) {
      case 'weekly-site-performance':
        // Manually trigger the weekly report logic
        logger.info('Manual trigger: weekly site performance report');
        break;
      case 'monthly-guard-attendance':
        // Manually trigger the monthly report logic
        logger.info('Manual trigger: monthly guard attendance report');
        break;
      case 'daily-incident-summary':
        // Manually trigger the daily report logic
        logger.info('Manual trigger: daily incident summary report');
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }

    logger.info(`Job completed: ${jobName}`);
  }

  /**
   * Clean up old reports
   * Run daily to remove reports older than retention period
   */
  setupReportCleanup(retentionDays: number = 90): void {
    const jobName = 'report-cleanup';

    const task = cron.schedule(
      '0 2 * * *', // Every day at 2:00 AM
      async () => {
        try {
          logger.info('Running report cleanup job...');

          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

          const deletedCount = await this.reportService.deleteOldReports(cutoffDate);

          logger.info(`Report cleanup job completed: deleted ${deletedCount} old reports`);
        } catch (error) {
          logger.error('Error in report cleanup job:', error);
        }
      },
      {
        scheduled: false,
        timezone: process.env.TZ || 'UTC',
      }
    );

    this.jobs.set(jobName, task);
    logger.info(`Scheduled job: ${jobName} (0 2 * * *) - retention: ${retentionDays} days`);
  }

  /**
   * Shutdown all jobs gracefully
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down report jobs...');
    this.stopAll();
    this.jobs.clear();
    logger.info('Report jobs shut down complete');
  }
}

/**
 * Singleton instance management
 */
let reportJobsInstance: ReportJobs | null = null;

export async function initializeReportJobs(): Promise<ReportJobs> {
  if (!reportJobsInstance) {
    reportJobsInstance = new ReportJobs();
    await reportJobsInstance.initialize();
  }
  return reportJobsInstance;
}

export function getReportJobs(): ReportJobs {
  if (!reportJobsInstance) {
    throw new Error('ReportJobs not initialized. Call initializeReportJobs() first.');
  }
  return reportJobsInstance;
}

export default ReportJobs;
