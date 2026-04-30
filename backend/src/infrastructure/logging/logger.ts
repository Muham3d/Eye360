import winston from 'winston';
import 'winston-daily-rotate-file';
import config from '../config/config.js';

const { combine, timestamp, printf, colorize, json } = winston.format;

const logFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}] : ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

const logger = winston.createLogger({
    level: config.get('env') === 'development' ? 'debug' : 'info',
    format: combine(timestamp(), json()),
    transports: [
        new winston.transports.Console({
            format: combine(colorize(), timestamp(), logFormat),
        }),
        new winston.transports.DailyRotateFile({
            filename: 'logs/application-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d',
        }),
        new winston.transports.DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d',
        }),
    ],
});

// Dedicated context for Audit logging
export const auditLogger = {
    log: (action: string, userId: string, tenantId: string, metadata: any) => {
        logger.info(`AUDIT: ${action}`, {
            audit: true,
            action,
            userId,
            tenantId,
            ...metadata,
            timestamp: new Date().toISOString(),
        });
    },
};

export default logger;
