/**
 * Scheduled Jobs Service
 *
 * Handles scheduled background tasks for the PatrolManager backend.
 * Uses native Node.js timers for scheduled job execution.
 *
 * @module infrastructure/scheduling
 */

import logger from '../config/logger.js';
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { getShiftService, getSessionService } from '../../core/services/index.js';
import { diContainer } from '../database/repositories/index.js';
import type { ILocationHistoryRepository } from '../../core/domain/repositories/ILocationHistoryRepository.js';
import type { IPatrolRunRepository } from '../../core/domain/repositories/IPatrolRunRepository.js';
=======
import { getShiftService } from '../../core/services/index.js';
>>>>>>> origin/db-logger-replacement-3863421860436406492
=======
import { getShiftService } from '../../core/services/index.js';
>>>>>>> dcffff9 (feat: implement session validation and fix CI failure)
=======
import { getShiftService, getSessionService } from '../../core/services/index.js';
import { diContainer } from '../database/repositories/index.js';
>>>>>>> 177b868 (feat: implement cleanup logic for scheduled and manual execution)

/**
 * Scheduled Job Configuration
 */
export interface IScheduledJobConfig {
  enabled: boolean;
  markMissedShiftsInterval: number; // minutes
  cleanupOldRecordsInterval: number; // hours
  reportGenerationInterval: number; // hours
}

/**
 * Default scheduled job configuration
 */
export const DEFAULT_SCHEDULED_JOB_CONFIG: IScheduledJobConfig = {
  enabled: true,
  markMissedShiftsInterval: 15, // Check every 15 minutes
  cleanupOldRecordsInterval: 24, // Run daily
  reportGenerationInterval: 6, // Generate reports every 6 hours
} as const;

/**
 * Scheduled Jobs Service
 *
 * Manages background scheduled tasks:
 * - Mark missed shifts automatically
 * - Clean up old records
 * - Generate periodic reports
 */
export class ScheduledJobsService {
  private config: IScheduledJobConfig;
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor(config: IScheduledJobConfig = DEFAULT_SCHEDULED_JOB_CONFIG) {
    this.config = config;
  }

  /**
   * Start all scheduled jobs
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduled jobs service is already running');
      return;
    }

    if (!this.config.enabled) {
      logger.info('Scheduled jobs service is disabled');
      return;
    }

    logger.info('Starting scheduled jobs service...');

    // Start mark missed shifts job
    this.startMarkMissedShiftsJob();

    // Start cleanup job
    this.startCleanupJob();

    // Start report generation job
    this.startReportGenerationJob();

    this.isRunning = true;
    logger.info('Scheduled jobs service started successfully');
  }

  /**
   * Stop all scheduled jobs
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping scheduled jobs service...');

    // Clear all timers
    for (const [name, timer] of this.timers) {
      clearInterval(timer);
      logger.debug(`Stopped scheduled job: ${name}`);
    }

    this.timers.clear();
    this.isRunning = false;

    logger.info('Scheduled jobs service stopped');
  }

  /**
   * Job: Mark missed shifts
   * Runs every 15 minutes to mark shifts as missed if not started
   */
  private startMarkMissedShiftsJob(): void {
    const intervalMs = this.config.markMissedShiftsInterval * 60 * 1000;

    const timer = setInterval(async () => {
      try {
        logger.debug('Running mark missed shifts job...');
        const shiftService = getShiftService();
        const date = new Date();
        const marked = await shiftService.markMissedShifts(date);

        if (marked > 0) {
          logger.info(`Marked ${marked} shifts as missed`, { date: date.toISOString() });
        }
      } catch (error) {
        logger.error('Error in mark missed shifts job', { error });
      }
    }, intervalMs);

    this.timers.set('markMissedShifts', timer);
    logger.info(`Scheduled mark missed shifts job (every ${this.config.markMissedShiftsInterval} minutes)`);
  }

  /**
   * Job: Cleanup old records
   * Runs daily to clean up old temporary records
   */
  private startCleanupJob(): void {
    const intervalMs = this.config.cleanupOldRecordsInterval * 60 * 60 * 1000;

    const timer = setInterval(async () => {
<<<<<<< HEAD
      try {
        logger.debug('Running cleanup job...');
<<<<<<< HEAD
<<<<<<< HEAD

        // 1. Delete old location history records (keep last 90 days as per recent requirements)
        const locationRepo = diContainer.get<ILocationHistoryRepository>('locationHistoryRepository');
        const deletedLocationCount = await locationRepo.deleteOldRecords(90);
        logger.info(`Deleted ${deletedLocationCount} old location history records`);

        // 2. Archive old completed patrols (keep last 90 days)
        const patrolRepo = diContainer.get<IPatrolRunRepository>('patrolRunRepository');
        const archivedPatrolCount = await patrolRepo.archiveOldCompleted(90);
        logger.info(`Archived ${archivedPatrolCount} old completed patrols`);

        // 3. Clean up expired sessions
        const sessionService = getSessionService();
        const cleanedSessionCount = await sessionService.cleanupExpiredSessions();
        logger.info(`Cleaned up ${cleanedSessionCount} expired sessions`);

=======
=======
>>>>>>> dcffff9 (feat: implement session validation and fix CI failure)
        // TODO: Implement cleanup logic for old records
        // - Delete old location history records (keep last 30 days)
        // - Archive old completed patrols
        // - Clean up expired sessions
<<<<<<< HEAD
>>>>>>> origin/db-logger-replacement-3863421860436406492
=======
>>>>>>> dcffff9 (feat: implement session validation and fix CI failure)
        logger.debug('Cleanup job completed');
      } catch (error) {
        logger.error('Error in cleanup job', { error });
      }
=======
      await this.executeCleanup();
>>>>>>> 177b868 (feat: implement cleanup logic for scheduled and manual execution)
    }, intervalMs);

    this.timers.set('cleanup', timer);
    logger.info(`Scheduled cleanup job (every ${this.config.cleanupOldRecordsInterval} hours)`);
  }

  /**
<<<<<<< HEAD
=======
   * Execute the cleanup logic
   * - Deletes old location history records
   * - Archives old completed patrols (TODO in future if needed)
   * - Cleans up expired sessions
   */
  private async executeCleanup(): Promise<void> {
    try {
      logger.debug('Running cleanup job...');

      // Clean up expired sessions using the SessionService
      try {
        const sessionService = getSessionService();
        const deletedSessions = await sessionService.cleanupExpiredSessions();
        logger.info(`Cleaned up ${deletedSessions} expired sessions`);
      } catch (error) {
        logger.error('Error cleaning up expired sessions', { error });
      }

      // Delete old location history records (keep last 30 days)
      try {
        const locationHistoryRepository = diContainer.get<import('../../core/domain/repositories/ILocationHistoryRepository.js').ILocationHistoryRepository>('locationHistoryRepository');
        const deletedLocations = await locationHistoryRepository.deleteOldRecords(30);
        logger.info(`Cleaned up ${deletedLocations} old location history records`);
      } catch (error) {
        logger.error('Error cleaning up old location history records', { error });
      }

      // Archive old completed patrols (keep last 90 days)
      try {
        const patrolRunRepository = diContainer.get<import('../../core/domain/repositories/IPatrolRunRepository.js').IPatrolRunRepository>('patrolRunRepository');
        const archivedPatrols = await patrolRunRepository.archiveOldRecords(90);
        logger.info(`Archived ${archivedPatrols} old completed patrols`);
      } catch (error) {
        logger.error('Error archiving old completed patrols', { error });
      }

      logger.debug('Cleanup job completed');
    } catch (error) {
      logger.error('Error in cleanup job', { error });
    }
  }

  /**
>>>>>>> 177b868 (feat: implement cleanup logic for scheduled and manual execution)
   * Job: Generate periodic reports
   * Runs every 6 hours to generate summary reports
   */
  private startReportGenerationJob(): void {
    const intervalMs = this.config.reportGenerationInterval * 60 * 60 * 1000;

    const timer = setInterval(async () => {
      try {
        logger.debug('Running report generation job...');
        // TODO: Implement automated report generation
        // - Daily summary reports for all sites
        // - Email reports to managers
        logger.debug('Report generation job completed');
      } catch (error) {
        logger.error('Error in report generation job', { error });
      }
    }, intervalMs);

    this.timers.set('reportGeneration', timer);
    logger.info(`Scheduled report generation job (every ${this.config.reportGenerationInterval} hours)`);
  }

  /**
   * Run a specific job manually (useful for testing)
   *
   * @param jobName - Name of the job to run
   */
  async runJob(jobName: 'markMissedShifts' | 'cleanup' | 'reportGeneration'): Promise<void> {
    logger.info(`Running job manually: ${jobName}`);

    switch (jobName) {
      case 'markMissedShifts':
        const shiftService = getShiftService();
        await shiftService.markMissedShifts(new Date());
        break;

      case 'cleanup':
<<<<<<< HEAD
        // TODO: Implement cleanup logic
=======
        await this.executeCleanup();
>>>>>>> 177b868 (feat: implement cleanup logic for scheduled and manual execution)
        break;

      case 'reportGeneration':
        // TODO: Implement report generation
        break;

      default:
        throw new Error(`Unknown job: ${jobName}`);
    }

    logger.info(`Job completed: ${jobName}`);
  }

  /**
   * Check if the service is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Update the configuration
   *
   * @param config - Partial configuration to update
   */
  updateConfig(config: Partial<IScheduledJobConfig>): void {
    const wasRunning = this.isRunning;

    if (wasRunning) {
      this.stop();
    }

    Object.assign(this.config, config);

    if (wasRunning && this.config.enabled) {
      this.start();
    }
  }

  /**
   * Get the current configuration
   */
  getConfig(): IScheduledJobConfig {
    return { ...this.config };
  }
}

/**
 * Service singleton instance
 */
let scheduledJobsServiceInstance: ScheduledJobsService | null = null;

/**
 * Initialize the ScheduledJobsService singleton
 *
 * @param config - Optional configuration
 * @returns ScheduledJobsService instance
 */
export function initializeScheduledJobs(config?: IScheduledJobConfig): ScheduledJobsService {
  if (!scheduledJobsServiceInstance) {
    scheduledJobsServiceInstance = new ScheduledJobsService(config);
  }
  return scheduledJobsServiceInstance;
}

/**
 * Get the ScheduledJobsService singleton instance
 *
 * @returns ScheduledJobsService instance or throws if not initialized
 */
export function getScheduledJobsService(): ScheduledJobsService {
  if (!scheduledJobsServiceInstance) {
    throw new Error('ScheduledJobsService not initialized. Call initializeScheduledJobs first.');
  }
  return scheduledJobsServiceInstance;
}

/**
 * Start the scheduled jobs service (convenience function)
 */
export function startScheduledJobs(): void {
  const service = getScheduledJobsService();
  service.start();
}

/**
 * Stop the scheduled jobs service (convenience function)
 */
export function stopScheduledJobs(): void {
  const service = getScheduledJobsService();
  service.stop();
}
