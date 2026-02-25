/**
 * Repository Implementations Index
 *
 * Exports all Sequelize-based repository implementations and sets up dependency injection.
 *
 * @module infrastructure/database/repositories
 */

import { Sequelize } from 'sequelize';
import { SequelizeUserRepository } from './SequelizeUserRepository.js';
import { SequelizeSiteRepository } from './SequelizeSiteRepository.js';
import { SequelizeCheckpointRepository } from './SequelizeCheckpointRepository.js';
import { SequelizePatrolTemplateRepository } from './SequelizePatrolTemplateRepository.js';
import { SequelizePatrolCheckpointRepository } from './SequelizePatrolCheckpointRepository.js';
import { SequelizePatrolRunRepository } from './SequelizePatrolRunRepository.js';
import { SequelizePatrolCheckpointLogRepository } from './SequelizePatrolCheckpointLogRepository.js';
import { SequelizeIncidentRepository } from './SequelizeIncidentRepository.js';
import { SequelizeShiftRepository } from './SequelizeShiftRepository.js';
import { SequelizeSOSAlertRepository } from './SequelizeSOSAlertRepository.js';
import { SequelizeLocationHistoryRepository } from './SequelizeLocationHistoryRepository.js';
import { TransactionManager, Transactional } from '../TransactionManager.js';
import models from '../models/index.js';

// Initialize TransactionManager with Sequelize instance
const transactionManager = TransactionManager.getInstance();
transactionManager.initialize(models.sequelize);

// Export repositories
export { default as userRepository } from './SequelizeUserRepository.js';
export { default as siteRepository } from './SequelizeSiteRepository.js';
export { default as checkpointRepository } from './SequelizeCheckpointRepository.js';
export { default as patrolTemplateRepository } from './SequelizePatrolTemplateRepository.js';
export { default as patrolCheckpointRepository } from './SequelizePatrolCheckpointRepository.js';
export { default as patrolRunRepository } from './SequelizePatrolRunRepository.js';
export { default as patrolCheckpointLogRepository } from './SequelizePatrolCheckpointLogRepository.js';
export { default as incidentRepository } from './SequelizeIncidentRepository.js';
export { default as shiftRepository } from './SequelizeShiftRepository.js';
export { default as sosAlertRepository } from './SequelizeSOSAlertRepository.js';
export { default as locationHistoryRepository } from './SequelizeLocationHistoryRepository.js';

// Export Base Repository for extending (interfaces are type-only exports)
export { BaseRepository, RepositoryError, RepositoryErrorCode } from './BaseRepository.js';
export type { PaginatedResult, PaginationOptions, QueryOptions } from './BaseRepository.js';

// Export Repository implementation classes
export { SequelizeUserRepository } from './SequelizeUserRepository.js';
export { SequelizeSiteRepository } from './SequelizeSiteRepository.js';
export { SequelizeCheckpointRepository } from './SequelizeCheckpointRepository.js';
export { SequelizePatrolTemplateRepository } from './SequelizePatrolTemplateRepository.js';
export { SequelizePatrolCheckpointRepository } from './SequelizePatrolCheckpointRepository.js';
export { SequelizePatrolRunRepository } from './SequelizePatrolRunRepository.js';
export { SequelizePatrolCheckpointLogRepository } from './SequelizePatrolCheckpointLogRepository.js';
export { SequelizeIncidentRepository } from './SequelizeIncidentRepository.js';
export { SequelizeShiftRepository } from './SequelizeShiftRepository.js';
export { SequelizeSOSAlertRepository } from './SequelizeSOSAlertRepository.js';
export { SequelizeLocationHistoryRepository } from './SequelizeLocationHistoryRepository.js';

// Export Transaction Manager
export { TransactionManager, Transactional, TransactionScope, IsolationLevel } from '../TransactionManager.js';

// Export singleton instance
export default transactionManager;

/**
 * Repository Factory
 *
 * Factory function for creating repository instances with optional transaction support.
 * This enables dependency injection and testing.
 */
export class RepositoryFactory {
  private transaction?: Sequelize.Transaction;

  /**
   * Create a new repository factory with transaction context
   *
   * @param transaction - Optional transaction for all repository operations
   */
  constructor(transaction?: Sequelize.Transaction) {
    this.transaction = transaction;
  }

  /**
   * Get User Repository
   */
  getUserRepository(): SequelizeUserRepository {
    return new SequelizeUserRepository();
  }

  /**
   * Get Site Repository
   */
  getSiteRepository(): SequelizeSiteRepository {
    return new SequelizeSiteRepository();
  }

  /**
   * Get Checkpoint Repository
   */
  getCheckpointRepository(): SequelizeCheckpointRepository {
    return new SequelizeCheckpointRepository();
  }

  /**
   * Get Patrol Template Repository
   */
  getPatrolTemplateRepository(): SequelizePatrolTemplateRepository {
    return new SequelizePatrolTemplateRepository();
  }

  /**
   * Get Patrol Checkpoint Repository
   */
  getPatrolCheckpointRepository(): SequelizePatrolCheckpointRepository {
    return new SequelizePatrolCheckpointRepository();
  }

  /**
   * Get Patrol Run Repository
   */
  getPatrolRunRepository(): SequelizePatrolRunRepository {
    return new SequelizePatrolRunRepository();
  }

  /**
   * Get Patrol Checkpoint Log Repository
   */
  getPatrolCheckpointLogRepository(): SequelizePatrolCheckpointLogRepository {
    return new SequelizePatrolCheckpointLogRepository();
  }

  /**
   * Get Incident Repository
   */
  getIncidentRepository(): SequelizeIncidentRepository {
    return new SequelizeIncidentRepository();
  }

  /**
   * Get Shift Repository
   */
  getShiftRepository(): SequelizeShiftRepository {
    return new SequelizeShiftRepository();
  }

  /**
   * Get SOS Alert Repository (Phase 3)
   */
  getSOSAlertRepository(): SequelizeSOSAlertRepository {
    return new SequelizeSOSAlertRepository();
  }

  /**
   * Get Location History Repository (Phase 3)
   */
  getLocationHistoryRepository(): SequelizeLocationHistoryRepository {
    return new SequelizeLocationHistoryRepository();
  }

  /**
   * Create a new repository factory bound to a transaction
   */
  static withTransaction(transaction: Sequelize.Transaction): RepositoryFactory {
    return new RepositoryFactory(transaction);
  }

  /**
   * Get the current transaction
   */
  getTransaction(): Sequelize.Transaction | undefined {
    return this.transaction;
  }

  /**
   * Execute a callback within a repository factory with transaction
   */
  static async runInTransaction<T>(
    callback: (factory: RepositoryFactory) => Promise<T>
  ): Promise<T> {
    const transactionManager = TransactionManager.getInstance();

    return await transactionManager.runInTransaction(async (transaction) => {
      const factory = new RepositoryFactory(transaction);
      return await callback(factory);
    });
  }
}

/**
 * Dependency Injection Container
 */
export class DIContainer {
  private static instance: DIContainer;
  private repositories: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  register(name: string, repository: any | (() => any)): void {
    this.repositories.set(name, repository);
  }

  get<T>(name: string): T {
    const repository = this.repositories.get(name);

    if (!repository) {
      throw new Error(`Repository '${name}' not registered in DI container`);
    }

    if (typeof repository === 'function') {
      return repository();
    }

    return repository as T;
  }

  has(name: string): boolean {
    return this.repositories.has(name);
  }

  clear(): void {
    this.repositories.clear();
  }
}

// Initialize default repositories in DI container
const container = DIContainer.getInstance();

// Register repositories
container.register('userRepository', () => new SequelizeUserRepository());
container.register('siteRepository', () => new SequelizeSiteRepository());
container.register('checkpointRepository', () => new SequelizeCheckpointRepository());
container.register('patrolTemplateRepository', () => new SequelizePatrolTemplateRepository());
container.register('patrolCheckpointRepository', () => new SequelizePatrolCheckpointRepository());
container.register('patrolRunRepository', () => new SequelizePatrolRunRepository());
container.register('patrolCheckpointLogRepository', () => new SequelizePatrolCheckpointLogRepository());
container.register('incidentRepository', () => new SequelizeIncidentRepository());
container.register('shiftRepository', () => new SequelizeShiftRepository());
container.register('sosAlertRepository', () => new SequelizeSOSAlertRepository());
container.register('locationHistoryRepository', () => new SequelizeLocationHistoryRepository());

// Export the DI container
export { container as diContainer };

/**
 * Repository initialization function
 */
export async function initializeRepositories(): Promise<void> {
  const isConnected = await models.testConnection();
  if (!isConnected) {
    throw new Error('Failed to connect to database');
  }
}

/**
 * Repository health check
 */
export async function repositoryHealthCheck(): Promise<boolean> {
  try {
    await models.sequelize.authenticate();
    return true;
  } catch (error) {
    console.error('Repository health check failed:', error);
    return false;
  }
}

/**
 * Clean up repository resources
 */
export async function cleanupRepositories(): Promise<void> {
  try {
    await transactionManager.cleanup();
    await models.sequelize.close();
  } catch (error) {
    console.error('Error during repository cleanup:', error);
  }
}
