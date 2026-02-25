/**
 * Base Repository
 *
 * Abstract base class for all Sequelize repositories.
 * Provides generic CRUD operations, transaction support, query building utilities,
 * pagination support, and soft delete handling.
 *
 * @module infrastructure/database/repositories
 */

import { Transaction, WhereOptions, Model, ModelCtor, FindOptions, CreateOptions, UpdateOptions, DestroyOptions, CountOptions } from 'sequelize';
import { ValidationError } from 'sequelize';

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

/**
 * Paginated result wrapper
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Query filter options
 */
export interface QueryOptions extends PaginationOptions {
  where?: WhereOptions;
  include?: any[];
  paranoid?: boolean;
  attributes?: string[];
  group?: string[];
  having?: any;
}

/**
 * Repository error codes
 */
export enum RepositoryErrorCode {
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  TRANSACTION_ERROR = 'TRANSACTION_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',
}

/**
 * Repository error class
 */
export class RepositoryError extends Error {
  public readonly code: RepositoryErrorCode;
  public readonly details?: unknown;

  constructor(code: RepositoryErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'RepositoryError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Abstract Base Repository
 *
 * Provides common CRUD operations for all entities.
 * Subclasses must provide the model class through the getModel() method.
 *
 * @template TModel - The Sequelize Model type
 * @template TAttributes - The entity attributes type
 * @template TCreationAttributes - The creation attributes type
 */
export abstract class BaseRepository<
  TModel extends Model<TAttributes, TCreationAttributes>,
  TAttributes = any,
  TCreationAttributes = any
> {
  /**
   * Get the Sequelize model for this repository
   * Subclasses must implement this method
   */
  protected abstract getModel(): ModelCtor<TModel>;

  /**
   * Get the primary key field name (default: 'id')
   */
  protected getPrimaryKeyField(): string {
    return 'id';
  }

  /**
   * Find a single record by ID
   *
   * @param id - The record ID
   * @param options - Query options
   * @param transaction - Optional transaction
   * @returns The record or null if not found
   */
  async findById(
    id: number | string,
    options?: Omit<QueryOptions, 'page' | 'limit' | 'sortBy' | 'sortOrder'>,
    transaction?: Transaction
  ): Promise<TModel | null> {
    try {
      const model = this.getModel();
      const primaryKeyField = this.getPrimaryKeyField();

      const findOptions: FindOptions = {
        where: {
          [primaryKeyField]: id,
          ...options?.where,
        },
        paranoid: options?.paranoid,
        attributes: options?.attributes,
        include: options?.include,
        transaction,
      };

      return await model.findOne(findOptions) as TModel | null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find a single record by conditions
   *
   * @param where - Where conditions
   * @param options - Query options
   * @param transaction - Optional transaction
   * @returns The record or null if not found
   */
  async findOne(
    where: WhereOptions,
    options?: Omit<QueryOptions, 'page' | 'limit' | 'sortBy' | 'sortOrder'>,
    transaction?: Transaction
  ): Promise<TModel | null> {
    try {
      const model = this.getModel();

      const findOptions: FindOptions = {
        where,
        paranoid: options?.paranoid,
        attributes: options?.attributes,
        include: options?.include,
        transaction,
      };

      return await model.findOne(findOptions) as TModel | null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find all records with filtering, pagination, and sorting
   *
   * @param options - Query options including filters, pagination, and sorting
   * @param transaction - Optional transaction
   * @returns Paginated result with data and metadata
   */
  async findAll(
    options?: QueryOptions,
    transaction?: Transaction
  ): Promise<PaginatedResult<TModel>> {
    try {
      const model = this.getModel();
      const page = options?.page || 1;
      const limit = options?.limit || 25;
      const offset = (page - 1) * limit;

      // Build find options
      const findOptions: FindOptions = {
        where: options?.where,
        include: options?.include,
        paranoid: options?.paranoid,
        attributes: options?.attributes,
        group: options?.group,
        having: options?.having,
        transaction,
        offset,
        limit,
        order: this.buildOrderBy(options),
      };

      // Execute count and find queries in parallel
      const [total, data] = await Promise.all([
        model.count({
          where: findOptions.where,
          include: findOptions.include,
          paranoid: findOptions.paranoid,
          transaction,
          distinct: true,
          col: this.getPrimaryKeyField(),
        }),
        model.findAll(findOptions) as Promise<TModel[]>,
      ]);

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Find all records without pagination
   *
   * @param where - Where conditions
   * @param options - Query options
   * @param transaction - Optional transaction
   * @returns Array of records
   */
  async findMany(
    where?: WhereOptions,
    options?: Omit<QueryOptions, 'page' | 'limit'>,
    transaction?: Transaction
  ): Promise<TModel[]> {
    try {
      const model = this.getModel();

      const findOptions: FindOptions = {
        where,
        include: options?.include,
        paranoid: options?.paranoid,
        attributes: options?.attributes,
        order: this.buildOrderBy(options),
        transaction,
      };

      return await model.findAll(findOptions) as TModel[];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create a new record
   *
   * @param data - Creation data
   * @param options - Creation options
   * @param transaction - Optional transaction
   * @returns Created record
   */
  async create(
    data: TCreationAttributes,
    options?: CreateOptions,
    transaction?: Transaction
  ): Promise<TModel> {
    try {
      const model = this.getModel();

      const createOptions: CreateOptions = {
        ...options,
        transaction,
      };

      return await model.create(data as any, createOptions) as TModel;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Create multiple records in bulk
   *
   * @param dataArray - Array of creation data
   * @param options - Creation options
   * @param transaction - Optional transaction
   * @returns Array of created records
   */
  async bulkCreate(
    dataArray: TCreationAttributes[],
    options?: CreateOptions,
    transaction?: Transaction
  ): Promise<TModel[]> {
    try {
      const model = this.getModel();

      const createOptions: CreateOptions = {
        ...options,
        transaction,
      };

      return await model.bulkCreate(dataArray as any[], createOptions) as TModel[];
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update a record by ID
   *
   * @param id - Record ID
   * @param data - Update data
   * @param options - Update options
   * @param transaction - Optional transaction
   * @returns Updated record or null if not found
   */
  async update(
    id: number | string,
    data: Partial<TAttributes>,
    options?: Omit<UpdateOptions, 'where'>,
    transaction?: Transaction
  ): Promise<TModel | null> {
    try {
      const model = this.getModel();
      const primaryKeyField = this.getPrimaryKeyField();

      const [, [updatedRecord]] = await model.update(
        data as any,
        {
          where: { [primaryKeyField]: id } as any,
          paranoid: options?.paranoid,
          returning: true,
          individualHooks: true,
          ...options,
          transaction,
        }
      );

      return updatedRecord as TModel | null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update multiple records by conditions
   *
   * @param where - Where conditions
   * @param data - Update data
   * @param options - Update options
   * @param transaction - Optional transaction
   * @returns Number of affected rows
   */
  async updateMany(
    where: WhereOptions,
    data: Partial<TAttributes>,
    options?: Omit<UpdateOptions, 'where'>,
    transaction?: Transaction
  ): Promise<number> {
    try {
      const model = this.getModel();

      const [affectedCount] = await model.update(data as any, {
        where,
        paranoid: options?.paranoid,
        individualHooks: true,
        ...options,
        transaction,
      });

      return affectedCount;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Soft delete a record by ID
   *
   * @param id - Record ID
   * @param options - Delete options
   * @param transaction - Optional transaction
   * @returns True if deleted, false if not found
   */
  async delete(
    id: number | string,
    options?: DestroyOptions,
    transaction?: Transaction
  ): Promise<boolean> {
    try {
      const model = this.getModel();
      const primaryKeyField = this.getPrimaryKeyField();

      const deletedCount = await model.destroy({
        where: { [primaryKeyField]: id } as any,
        individualHooks: true,
        ...options,
        transaction,
      });

      return deletedCount > 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Soft delete multiple records by conditions
   *
   * @param where - Where conditions
   * @param options - Delete options
   * @param transaction - Optional transaction
   * @returns Number of deleted records
   */
  async deleteMany(
    where: WhereOptions,
    options?: DestroyOptions,
    transaction?: Transaction
  ): Promise<number> {
    try {
      const model = this.getModel();

      return await model.destroy({
        where,
        individualHooks: true,
        ...options,
        transaction,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Permanently delete a record (hard delete)
   *
   * @param id - Record ID
   * @param options - Delete options
   * @param transaction - Optional transaction
   * @returns True if deleted, false if not found
   */
  async hardDelete(
    id: number | string,
    options?: DestroyOptions,
    transaction?: Transaction
  ): Promise<boolean> {
    try {
      const model = this.getModel();
      const primaryKeyField = this.getPrimaryKeyField();

      const deletedCount = await model.destroy({
        where: { [primaryKeyField]: id } as any,
        force: true,
        ...options,
        transaction,
      });

      return deletedCount > 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Restore a soft-deleted record
   *
   * @param id - Record ID
   * @param options - Restore options
   * @param transaction - Optional transaction
   * @returns Restored record or null if not found
   */
  async restore(
    id: number | string,
    options?: { transaction?: Transaction },
    transaction?: Transaction
  ): Promise<TModel | null> {
    try {
      const model = this.getModel();
      const primaryKeyField = this.getPrimaryKeyField();

      // Use restore method
      await model.restore({
        where: { [primaryKeyField]: id } as any,
        ...options,
        transaction: transaction || options?.transaction,
      });

      // Fetch and return the restored record
      return await this.findById(id, { paranoid: false }, transaction);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Count records by conditions
   *
   * @param where - Where conditions
   * @param options - Count options
   * @param transaction - Optional transaction
   * @returns Count of records
   */
  async count(
    where?: WhereOptions,
    options?: Omit<CountOptions, 'where'>,
    transaction?: Transaction
  ): Promise<number> {
    try {
      const model = this.getModel();

      return await model.count({
        where,
        paranoid: options?.paranoid,
        distinct: options?.distinct,
        transaction,
      });
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if a record exists
   *
   * @param where - Where conditions
   * @param options - Query options
   * @param transaction - Optional transaction
   * @returns True if record exists
   */
  async exists(
    where: WhereOptions,
    options?: Omit<QueryOptions, 'page' | 'limit' | 'sortBy' | 'sortOrder'>,
    transaction?: Transaction
  ): Promise<boolean> {
    try {
      const record = await this.findOne(where, options, transaction);
      return record !== null;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Build ORDER BY clause from query options
   *
   * @param options - Query options
   * @returns Sequelize order array
   */
  protected buildOrderBy(options?: QueryOptions): any {
    if (!options?.sortBy) {
      return undefined;
    }

    return [[options.sortBy, options.sortOrder || 'ASC']];
  }

  /**
   * Handle repository errors and convert to RepositoryError
   *
   * @param error - Original error
   * @returns RepositoryError
   */
  protected handleError(error: unknown): RepositoryError {
    if (error instanceof RepositoryError) {
      return error;
    }

    if (error instanceof ValidationError) {
      return new RepositoryError(
        RepositoryErrorCode.VALIDATION_ERROR,
        error.message,
        {
          errors: error.errors.map((e) => ({
            field: e.path,
            message: e.message,
            type: e.type,
          })),
        }
      );
    }

    // Check for unique constraint violation
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('duplicate entry') || message.includes('unique constraint')) {
        return new RepositoryError(
          RepositoryErrorCode.DUPLICATE_ENTRY,
          'A record with this data already exists',
          { originalMessage: error.message }
        );
      }

      if (message.includes('foreign key constraint')) {
        return new RepositoryError(
          RepositoryErrorCode.FOREIGN_KEY_CONSTRAINT,
          'Referenced record does not exist',
          { originalMessage: error.message }
        );
      }

      if (message.includes('transaction')) {
        return new RepositoryError(
          RepositoryErrorCode.TRANSACTION_ERROR,
          'Transaction error occurred',
          { originalMessage: error.message }
        );
      }
    }

    // Default database error
    return new RepositoryError(
      RepositoryErrorCode.DATABASE_ERROR,
      error instanceof Error ? error.message : 'Unknown database error',
      error
    );
  }
}

export default BaseRepository;
