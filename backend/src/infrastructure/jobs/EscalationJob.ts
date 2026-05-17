import cron from 'node-cron';
import { getIncidentService } from '../../core/services/IncidentService.js';
import { getShiftService } from '../../core/services/ShiftService.js';
import logger from '../config/logger.js';

let escalationJob: cron.ScheduledTask | null = null;
let missedShiftJob: cron.ScheduledTask | null = null;

export function startBackgroundJobs(): void {
  // Run incident escalation check every 5 minutes
  escalationJob = cron.schedule('*/5 * * * *', async () => {
    try {
      const incidentService = getIncidentService();
      const count = await incidentService.runEscalationCheck();
      if (count > 0) {
        logger.info(`Escalation job: escalated ${count} incidents`);
      }
    } catch (error) {
      logger.error('Escalation job failed:', error);
    }
  });

  // Run missed shift check every 15 minutes
  missedShiftJob = cron.schedule('*/15 * * * *', async () => {
    try {
      const shiftService = getShiftService();
      const count = await shiftService.markMissedShifts(new Date());
      if (count > 0) {
        logger.info(`Missed shift job: marked ${count} shifts as missed`);
      }
    } catch (error) {
      logger.error('Missed shift job failed:', error);
    }
  });

  logger.info('Background jobs started (escalation every 5min, missed shifts every 15min)');
}

export function stopBackgroundJobs(): void {
  escalationJob?.stop();
  missedShiftJob?.stop();
  logger.info('Background jobs stopped');
}
