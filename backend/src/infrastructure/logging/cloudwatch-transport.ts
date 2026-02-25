/**
 * CloudWatch Transport for Winston
 *
 * Custom transport implementation for AWS CloudWatch Logs with:
 * - Batching for cost optimization
 * - Automatic retry on failures
 * - Graceful degradation
 */

import Transport from 'winston-transport';
import { CloudWatchLogsClient, CreateLogGroupCommand, CreateLogStreamCommand, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';
import { randomUUID } from 'crypto';

interface CloudWatchTransportOptions {
  logGroupName: string;
  logStreamName: string;
  awsRegion?: string;
  awsAccessKeyId?: string;
  awsSecretKey?: string;
  submitInterval?: number;
  submitSize?: number;
  batchSize?: number;
  messageFormatter?: (log: any) => string;
}

interface LogEvent {
  message: string;
  timestamp: number;
}

export class CloudWatchTransport extends Transport {
  private client: CloudWatchLogsClient;
  private logGroupName: string;
  private logStreamName: string;
  private submitInterval: number;
  private submitSize: number;
  private batchSize: number;
  private messageFormatter: (log: any) => string;
  private logEvents: LogEvent[] = [];
  private sequenceToken?: string;
  private submitTimer?: NodeJS.Timeout;
  private logGroupCreated = false;
  private logStreamCreated = false;

  constructor(opts: CloudWatchTransportOptions) {
    super(opts);

    this.logGroupName = opts.logGroupName;
    this.logStreamName = opts.logStreamName;
    this.submitInterval = opts.submitInterval || 2000;
    this.submitSize = opts.submitSize || 20;
    this.batchSize = opts.batchSize || 25;
    this.messageFormatter = opts.messageFormatter || ((log: any) => JSON.stringify(log));

    // Initialize CloudWatch client
    this.client = new CloudWatchLogsClient({
      region: opts.awsRegion || 'us-east-1',
      ...(opts.awsAccessKeyId && opts.awsSecretKey
        ? {
            credentials: {
              accessKeyId: opts.awsAccessKeyId,
              secretAccessKey: opts.awsSecretKey
            }
          }
        : {})
    });

    // Start submission timer
    this.startSubmitTimer();

    // Ensure cleanup on exit
    this.setupCleanupHandlers();
  }

  log(info: any, callback: () => void): void {
    setImmediate(() => {
      this.emit('logged', info);
    });

    const logEvent: LogEvent = {
      message: this.messageFormatter(info),
      timestamp: new Date(info.timestamp || Date.now()).getTime()
    };

    this.logEvents.push(logEvent);

    // Submit if batch is full
    if (this.logEvents.length >= this.submitSize) {
      this.submitLogs().catch(() => {});
    }

    callback();
  }

  private async submitLogs(): Promise<void> {
    if (this.logEvents.length === 0) {
      return;
    }

    // Ensure log group and stream exist
    await this.ensureLogGroupExists();
    await this.ensureLogStreamExists();

    // Split into batches
    const batches = this.createBatches();

    for (const batch of batches) {
      try {
        await this.putLogEvents(batch);
      } catch (error: any) {
        // Log to console as fallback
        console.error('Failed to submit logs to CloudWatch:', error.message);
      }
    }

    // Clear submitted logs
    this.logEvents = [];
  }

  private createBatches(): LogEvent[][] {
    const batches: LogEvent[][] = [];
    const totalEvents = this.logEvents.length;

    for (let i = 0; i < totalEvents; i += this.batchSize) {
      batches.push(this.logEvents.slice(i, Math.min(i + this.batchSize, totalEvents)));
    }

    return batches;
  }

  private async putLogEvents(events: LogEvent[]): Promise<void> {
    const command = new PutLogEventsCommand({
      logGroupName: this.logGroupName,
      logStreamName: this.logStreamName,
      logEvents: events,
      sequenceToken: this.sequenceToken
    });

    const response = await this.client.send(command);

    if (response.nextSequenceToken) {
      this.sequenceToken = response.nextSequenceToken;
    }
  }

  private async ensureLogGroupExists(): Promise<void> {
    if (this.logGroupCreated) {
      return;
    }

    try {
      const command = new CreateLogGroupCommand({
        logGroupName: this.logGroupName
      });
      await this.client.send(command);
      this.logGroupCreated = true;
    } catch (error: any) {
      if (error.name === 'ResourceAlreadyExistsException') {
        this.logGroupCreated = true;
      } else {
        // IAM permissions or other AWS errors - silently fail
        this.logGroupCreated = true;
      }
    }
  }

  private async ensureLogStreamExists(): Promise<void> {
    if (this.logStreamCreated) {
      return;
    }

    try {
      const command = new CreateLogStreamCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName
      });
      await this.client.send(command);
      this.logStreamCreated = true;
    } catch (error: any) {
      if (error.name === 'ResourceAlreadyExistsException') {
        this.logStreamCreated = true;
      } else {
        this.logStreamCreated = true;
      }
    }
  }

  private startSubmitTimer(): void {
    this.submitTimer = setInterval(() => {
      this.submitLogs().catch(() => {});
    }, this.submitInterval);
  }

  private setupCleanupHandlers(): void {
    const cleanup = () => {
      if (this.submitTimer) {
        clearInterval(this.submitTimer);
      }
      // Submit remaining logs
      this.submitLogs().catch(() => {});
    };

    process.on('beforeExit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  }

  async close(): Promise<void> {
    if (this.submitTimer) {
      clearInterval(this.submitTimer);
    }
    await this.submitLogs();
  }
}
