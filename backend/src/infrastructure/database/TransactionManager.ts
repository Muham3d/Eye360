/**
 * Transaction Manager
 *
 * Manages Sequelize database transactions with support for nested transactions,
 * commit/rollback handling, and automatic cleanup.
 *
 * @module infrastructure/database
 */

import { Transaction, Sequelize } from 'sequelize';
import { RepositoryError, RepositoryErrorCode } from './repositories/BaseRepository.js';

/**
 * Transaction isolation levels
 */
export enum IsolationLevel {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE',
}

/**
 * Transaction options
 */
export interface TransactionOptions {
  isolationLevel?: IsolationLevel;
  autocommit?: boolean;
  deferrable?: string;
}

/**
 * Transaction context
 * Contains the transaction and metadata
 */
export interface TransactionContext {
  transaction: Transaction;
  level: number; // Nesting level
  committed: boolean;
  rolledBack: boolean;
}

/**
 * Transaction Manager
 *
 * Provides a clean API for managing database transactions.
 * Supports nested transactions using SAVEPOINTs.
 */
export class TransactionManager {
  private static instance: TransactionManager;
  private sequelize: Sequelize;
  private readonly transactionContext = new Map<string, TransactionContext>();
  private readonly contextStore = new WeakMap<object, string>();

  private constructor() {
    // Import sequelize instance from models
    // This will be initialized in the getInstance method
    this.sequelize = null as any;
  }

  /**
   * Get the singleton instance of TransactionManager
   */
  static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  /**
   * Initialize the transaction manager with Sequelize instance
   */
  initialize(sequelize: Sequelize): void {
    this.sequelize = sequelize;
  }

  /**
   * Start a new transaction
   *
   * @param options - Transaction options
   * @param contextKey - Optional key to store transaction context (for async operations)
   * @returns The transaction
   */
  async startTransaction(
    options?: TransactionOptions,
    contextKey?: string
  ): Promise<Transaction> {
    if (!this.sequelize) {
      throw new RepositoryError(
        RepositoryErrorCode.TRANSACTION_ERROR,
        'TransactionManager not initialized. Call initialize(sequelize) first.'
      );
    }

    try {
      const transaction = await this.sequelize.transaction({
        isolationLevel: options?.isolationLevel as any,
        autocommit: options?.autocommit,
        deferrable: options?.deferrable as any,
      });

      const key = contextKey || this.generateContextKey();

      this.transactionContext.set(key, {
        transaction,
        level: 0,
        committed: false,
        rolledBack: false,
      });

      return transaction;
    } catch (error) {
      throw new RepositoryError(
        RepositoryErrorCode.TRANSACTION_ERROR,
        'Failed to start transaction',
        error
      );
    }
  }

  /**
   * Start a nested transaction (SAVEPOINT)
   *
   * @param parentTransaction - Parent transaction
   * @param name - Savepoint name
   * @returns The nested transaction
   */
  async startNestedTransaction(
    parentTransaction: Transaction,
    name?: string
  ): Promise<Transaction> {
    try {
      // Sequelize supports nested transactions through savepoints
      const nested = await parentTransaction.savepoint(name || `sp_${Date.now()}`);
      return nested as unknown as Transaction;
    } catch (error) {
      throw new RepositoryError(
        RepositoryErrorCode.TRANSACTION_ERROR,
        'Failed to start nested transaction',
        error
      );
    }
  }

  /**
   * Commit a transaction
   *
   * @param transaction - Transaction to commit
   * @param contextKey - Optional context key
   */
  async commitTransaction(transaction: Transaction, contextKey?: string): Promise<void> {
    const key = contextKey || this.findContextKey(transaction);

    if (!key) {
      throw new RepositoryError(
        RepositoryErrorCode.TRANSACTION_ERROR,
        'Transaction context not found'
      );
    }

    const context = this.transactionContext.get(key);

    if (!context) {
      throw new RepositoryError(
        RepositoryErrorCode.TRANSACTION_ERROR,
        'Transaction context not found'
      );
    }

    if (context.committed || context.rolledBack) {
      throw new RepositoryError(
        RepositoryErrorCode.TRANSACTION_ERROR,
        'Transaction already finalized'
      );
    }

    try {
      await transaction.commit();
      context.committed = true;
      this.transactionContext.delete(key);
    } catch (error) {
      this.transactionContext.delete(key);
      throw new RepositoryError(
        RepositoryErrorCode.TRANSACTION_ERROR,
        'Failed to commit transaction',
        error
      );
    }
  }

  /**
   * Rollback a transaction
   *
   * @param transaction - Transaction to rollback
   * @param contextKey - Optional context key
   */
  async rollbackTransaction(transaction: Transaction, contextKey?: string): Promise<void> {
    const key = contextKey || this.findContextKey(transaction);

    if (!key) {
      // Transaction may not be tracked, try to rollback anyway
      try {
        await transaction.rollback();
        return;
      } catch (error) {
        throw new RepositoryError(
          RepositoryErrorCode.TRANSACTION_ERROR,
          'Failed to rollback transaction',
          error
        );
      }
    }

    const context = this.transactionContext.get(key);

    if (!context) {
      throw new RepositoryError(
        RepositoryErrorCode.TRANSACTION_ERROR,
        'Transaction context not found'
      );
    }

    if (context.committed || context.rolledBack) {
      throw new RepositoryError(
        RepositoryErrorCode.TRANSACTION_ERROR,
        'Transaction already finalized'
      );
    }

    try {
      await transaction.rollback();
      context.rolledBack = true;
      this.transactionContext.delete(key);
    } catch (error) {
      this.transactionContext.delete(key);
      throw new RepositoryError(
        RepositoryErrorCode.TRANSACTION_ERROR,
        'Failed to rollback transaction',
        error
      );
    }
  }

  /**
   * Execute a callback within a transaction
   * Automatically commits on success or rolls back on error
   *
   * @param callback - Function to execute within transaction
   * @param options - Transaction options
   * @returns Result of the callback
   */
  async runInTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>,
    options?: TransactionOptions
  ): Promise<T> {
    const transaction = await this.startTransaction(options);

    try {
      const result = await callback(transaction);
      await this.commitTransaction(transaction);
      return result;
    } catch (error) {
      await this.rollbackTransaction(transaction);
      throw error;
    }
  }

  /**
   * Execute a callback within a nested transaction
   *
   * @param callback - Function to execute within transaction
   * @param parentTransaction - Parent transaction
   * @param name - Savepoint name
   * @returns Result of the callback
   */
  async runInNestedTransaction<T>(
    callback: (transaction: Transaction) => Promise<T>,
    parentTransaction: Transaction,
    name?: string
  ): Promise<T> {
    const nested = await this.startNestedTransaction(parentTransaction, name);

    try {
      const result = await callback(nested);
      // Nested transactions (savepoints) are auto-committed with parent
      return result;
    } catch (error) {
      // Rollback to savepoint
      try {
        await (parentTransaction as any).rollbackSavepoint(name || `sp_${Date.now()}`);
      } catch (rollbackError) {
        // Ignore rollback errors
      }
      throw error;
    }
  }

  /**
   * Get the current transaction for a context
   *
   * @param contextKey - Context key
   * @returns Transaction or null
   */
  getTransaction(contextKey: string): Transaction | null {
    const context = this.transactionContext.get(contextKey);
    return context?.transaction || null;
  }

  /**
   * Check if a transaction is active
   *
   * @param contextKey - Context key
   * @returns True if transaction is active
   */
  isTransactionActive(contextKey: string): boolean {
    const context = this.transactionContext.get(contextKey);
    return context !== undefined && !context.committed && !context.rolledBack;
  }

  /**
   * Clean up all active transactions
   * Useful for application shutdown
   */
  async cleanup(): Promise<void> {
    const promises = Array.from(this.transactionContext.entries()).map(
      async ([key, context]) => {
        if (!context.committed && !context.rolledBack) {
          try {
            await context.transaction.rollback();
          } catch (error) {
            // Ignore cleanup errors
          }
        }
        this.transactionContext.delete(key);
      }
    );

    await Promise.all(promises);
  }

  /**
   * Generate a unique context key
   */
  private generateContextKey(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Find the context key for a transaction
   */
  private findContextKey(transaction: Transaction): string | null {
    for (const [key, context] of this.transactionContext.entries()) {
      if (context.transaction === transaction) {
        return key;
      }
    }
    return null;
  }

  /**
   * Store transaction context with an object (useful for async operations)
   *
   * @param obj - Object to store context with
   * @param contextKey - Context key
   */
  associateContext(obj: object, contextKey: string): void {
    this.contextStore.set(obj, contextKey);
  }

  /**
   * Get transaction context for an object
   *
   * @param obj - Object to get context for
   * @returns Context key or null
   */
  getContextForObject(obj: object): string | null {
    return this.contextStore.get(obj) || null;
  }

  /**
   * Remove context association
   *
   * @param obj - Object to remove context from
   */
  removeContext(obj: object): void {
    this.contextStore.delete(obj);
  }
}

/**
 * Decorator for running class methods in transactions
 *
 * @param options - Transaction options
 */
export function Transactional(options?: TransactionOptions) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const manager = TransactionManager.getInstance();

      // Check if already in a transaction
      const contextKey = manager.getContextForObject(this);

      if (contextKey && manager.isTransactionActive(contextKey)) {
        // Already in a transaction, use nested transaction
        const transaction = manager.getTransaction(contextKey)!;
        return await manager.runInNestedTransaction(
          async (nested) => originalMethod.apply(this, [...args, nested]),
          transaction,
          `${propertyKey}_${Date.now()}`
        );
      }

      // Start new transaction
      return await manager.runInTransaction(async (transaction) => {
        return await originalMethod.apply(this, [...args, transaction]);
      }, options);
    };

    return descriptor;
  };
}

/**
 * Transaction scope helper
 * Provides a cleaner syntax for running operations in transactions
 */
export class TransactionScope {
  private manager: TransactionManager;
  private transaction?: Transaction;
  private contextKey?: string;

  constructor() {
    this.manager = TransactionManager.getInstance();
  }

  /**
   * Start a new transaction scope
   */
  async begin(options?: TransactionOptions): Promise<void> {
    this.transaction = await this.manager.startTransaction(options);
    this.contextKey = this.manager.getContextForObject(this) || undefined;
  }

  /**
   * Commit the transaction
   */
  async commit(): Promise<void> {
    if (this.transaction) {
      await this.manager.commitTransaction(this.transaction, this.contextKey);
      this.transaction = undefined;
    }
  }

  /**
   * Rollback the transaction
   */
  async rollback(): Promise<void> {
    if (this.transaction) {
      await this.manager.rollbackTransaction(this.transaction, this.contextKey);
      this.transaction = undefined;
    }
  }

  /**
   * Get the current transaction
   */
  getTransaction(): Transaction | undefined {
    return this.transaction;
  }

  /**
   * Execute callback in this transaction scope
   */
  async run<T>(callback: (tx: Transaction) => Promise<T>): Promise<T> {
    if (!this.transaction) {
      throw new RepositoryError(
        RepositoryErrorCode.TRANSACTION_ERROR,
        'Transaction not started. Call begin() first.'
      );
    }

    return await callback(this.transaction);
  }

  /**
   * Clean up the scope
   */
  async dispose(): Promise<void> {
    if (this.transaction) {
      try {
        await this.rollback();
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  }
}

// Export singleton instance
export default TransactionManager.getInstance();
