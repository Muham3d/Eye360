/**
 * BaseRepository Unit Tests
 *
 * Tests for the abstract base repository that provides
 * common CRUD operations for all entities.
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { Model, DataTypes } from 'sequelize';
import {
  BaseRepository,
  RepositoryError,
  RepositoryErrorCode,
  PaginatedResult,
} from '../../../src/infrastructure/database/repositories/BaseRepository.js';
import { ValidationError as SequelizeValidationError } from 'sequelize';

// Mock Sequelize Model
class MockModel extends Model {
  id: number;
  name: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;

  static associate() {}
}

describe('BaseRepository', () => {
  class TestRepository extends BaseRepository<MockModel, any, any> {
    protected getModel() {
      return MockModel as any;
    }
  }

  let repository: TestRepository;
  let mockModel: any;

  beforeEach(() => {
    jest.useFakeTimers();

    // Create mock model
    mockModel = {
      findOne: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
      restore: jest.fn(),
    };

    // Mock getModel to return our mock model
    repository = new TestRepository();
    (repository as any).getModel = () => mockModel;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should find a record by ID', async () => {
      const mockRecord = { id: 1, name: 'Test' };
      mockModel.findOne.mockResolvedValue(mockRecord);

      const result = await repository.findById(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
        })
      );
    });

    it('should return null when record not found', async () => {
      mockModel.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      expect(result).toBeNull();
    });

    it('should support custom query options', async () => {
      const mockRecord = { id: 1, name: 'Test' };
      mockModel.findOne.mockResolvedValue(mockRecord);

      await repository.findById(1, { attributes: ['id', 'name'] });

      expect(mockModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          attributes: ['id', 'name'],
        })
      );
    });

    it('should handle database errors', async () => {
      const error = new Error('Database connection failed');
      mockModel.findOne.mockRejectedValue(error);

      await expect(repository.findById(1)).rejects.toThrow(RepositoryError);
    });
  });

  describe('findOne', () => {
    it('should find a record by where conditions', async () => {
      const mockRecord = { id: 1, name: 'Test' };
      mockModel.findOne.mockResolvedValue(mockRecord);

      const result = await repository.findOne({ name: 'Test' });

      expect(result).toBeDefined();
      expect(mockModel.findOne).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: 'Test' },
        })
      );
    });

    it('should return null when no match found', async () => {
      mockModel.findOne.mockResolvedValue(null);

      const result = await repository.findOne({ name: 'NonExistent' });

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated results', async () => {
      const mockRecords = [
        { id: 1, name: 'Test1' },
        { id: 2, name: 'Test2' },
      ];
      mockModel.findAll.mockResolvedValue(mockRecords);
      mockModel.count.mockResolvedValue(2);

      const result = await repository.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
    });

    it('should calculate offset correctly', async () => {
      mockModel.findAll.mockResolvedValue([]);
      mockModel.count.mockResolvedValue(0);

      await repository.findAll({ page: 2, limit: 10 });

      expect(mockModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 10,
          limit: 10,
        })
      );
    });

    it('should handle sorting', async () => {
      mockModel.findAll.mockResolvedValue([]);
      mockModel.count.mockResolvedValue(0);

      await repository.findAll({ sortBy: 'name', sortOrder: 'DESC' });

      expect(mockModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          order: [['name', 'DESC']],
        })
      );
    });

    it('should handle hasNext and hasPrevious correctly', async () => {
      mockModel.findAll.mockResolvedValue([{ id: 1 }]);
      mockModel.count.mockResolvedValue(25);

      const result1 = await repository.findAll({ page: 1, limit: 10 });
      const result2 = await repository.findAll({ page: 2, limit: 10 });
      const result3 = await repository.findAll({ page: 3, limit: 10 });

      expect(result1.hasNext).toBe(true);
      expect(result1.hasPrevious).toBe(false);

      expect(result2.hasNext).toBe(true);
      expect(result2.hasPrevious).toBe(true);

      expect(result3.hasNext).toBe(false);
      expect(result3.hasPrevious).toBe(true);
    });
  });

  describe('findMany', () => {
    it('should return all matching records without pagination', async () => {
      const mockRecords = [
        { id: 1, name: 'Test1' },
        { id: 2, name: 'Test2' },
      ];
      mockModel.findAll.mockResolvedValue(mockRecords);

      const result = await repository.findMany({ status: 'active' });

      expect(result).toHaveLength(2);
    });

    it('should apply where conditions', async () => {
      mockModel.findAll.mockResolvedValue([]);

      await repository.findMany({ status: 'active' });

      expect(mockModel.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'active' },
        })
      );
    });
  });

  describe('create', () => {
    it('should create a new record', async () => {
      const mockRecord = { id: 1, name: 'New Record' };
      mockModel.create.mockResolvedValue(mockRecord);

      const result = await repository.create({ name: 'New Record' });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockModel.create).toHaveBeenCalledWith({ name: 'New Record' }, expect.any(Object));
    });

    it('should handle validation errors', async () => {
      const error = new SequelizeValidationError('Validation error', [
        { path: 'name', message: 'Name is required', type: 'validation error' },
      ]);
      mockModel.create.mockRejectedValue(error);

      await expect(repository.create({})).rejects.toThrow(RepositoryError);
      try {
        await repository.create({});
      } catch (e) {
        expect((e as RepositoryError).code).toBe(RepositoryErrorCode.VALIDATION_ERROR);
      }
    });
  });

  describe('update', () => {
    it('should update a record by ID', async () => {
      const mockRecord = { id: 1, name: 'Updated' };
      mockModel.update.mockResolvedValue([1, [mockRecord]]);

      const result = await repository.update(1, { name: 'Updated' });

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
      expect(mockModel.update).toHaveBeenCalledWith(
        { name: 'Updated' },
        expect.objectContaining({
          where: { id: 1 },
          returning: true,
        })
      );
    });

    it('should return null when record not found', async () => {
      mockModel.update.mockResolvedValue([0, null]);

      const result = await repository.update(999, { name: 'Updated' });

      expect(result).toBeNull();
    });
  });

  describe('delete (soft delete)', () => {
    it('should soft delete a record', async () => {
      mockModel.destroy.mockResolvedValue(1);

      const result = await repository.delete(1);

      expect(result).toBe(true);
      expect(mockModel.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          individualHooks: true,
        })
      );
    });

    it('should return false when record not found', async () => {
      mockModel.destroy.mockResolvedValue(0);

      const result = await repository.delete(999);

      expect(result).toBe(false);
    });
  });

  describe('hardDelete', () => {
    it('should permanently delete a record', async () => {
      mockModel.destroy.mockResolvedValue(1);

      const result = await repository.hardDelete(1);

      expect(result).toBe(true);
      expect(mockModel.destroy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          force: true,
        })
      );
    });
  });

  describe('restore', () => {
    it('should restore a soft-deleted record', async () => {
      const mockRecord = { id: 1, name: 'Restored', deletedAt: null };
      mockModel.restore.mockResolvedValue();
      mockModel.findOne.mockResolvedValue(mockRecord);

      const result = await repository.restore(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('should return null when record not found', async () => {
      mockModel.restore.mockResolvedValue();
      mockModel.findOne.mockResolvedValue(null);

      const result = await repository.restore(999);

      expect(result).toBeNull();
    });
  });

  describe('count', () => {
    it('should count records matching conditions', async () => {
      mockModel.count.mockResolvedValue(5);

      const result = await repository.count({ status: 'active' });

      expect(result).toBe(5);
      expect(mockModel.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'active' },
        })
      );
    });

    it('should count all records when no conditions provided', async () => {
      mockModel.count.mockResolvedValue(100);

      const result = await repository.count();

      expect(result).toBe(100);
    });
  });

  describe('exists', () => {
    it('should return true when record exists', async () => {
      mockModel.findOne.mockResolvedValue({ id: 1 });

      const result = await repository.exists({ id: 1 });

      expect(result).toBe(true);
    });

    it('should return false when record does not exist', async () => {
      mockModel.findOne.mockResolvedValue(null);

      const result = await repository.exists({ id: 999 });

      expect(result).toBe(false);
    });
  });

  describe('bulkCreate', () => {
    it('should create multiple records', async () => {
      const mockRecords = [
        { id: 1, name: 'Record1' },
        { id: 2, name: 'Record2' },
      ];
      mockModel.bulkCreate.mockResolvedValue(mockRecords);

      const result = await repository.bulkCreate([
        { name: 'Record1' },
        { name: 'Record2' },
      ]);

      expect(result).toHaveLength(2);
    });
  });

  describe('updateMany', () => {
    it('should update multiple records', async () => {
      mockModel.update.mockResolvedValue([5]);

      const count = await repository.updateMany(
        { status: 'inactive' },
        { status: 'active' }
      );

      expect(count).toBe(5);
      expect(mockModel.update).toHaveBeenCalledWith(
        { status: 'active' },
        expect.objectContaining({
          where: { status: 'inactive' },
        })
      );
    });
  });

  describe('deleteMany', () => {
    it('should soft delete multiple records', async () => {
      mockModel.destroy.mockResolvedValue(3);

      const count = await repository.deleteMany({ status: 'deleted' });

      expect(count).toBe(3);
    });
  });

  describe('error handling', () => {
    it('should handle duplicate entry errors', async () => {
      const error = new Error('Duplicate entry for key');
      mockModel.create.mockRejectedValue(error);

      try {
        await repository.create({ name: 'Duplicate' });
      } catch (e) {
        expect((e as RepositoryError).code).toBe(RepositoryErrorCode.DUPLICATE_ENTRY);
      }
    });

    it('should handle foreign key constraint errors', async () => {
      const error = new Error('Foreign key constraint fails');
      mockModel.create.mockRejectedValue(error);

      try {
        await repository.create({ name: 'Invalid' });
      } catch (e) {
        expect((e as RepositoryError).code).toBe(RepositoryErrorCode.FOREIGN_KEY_CONSTRAINT);
      }
    });

    it('should handle generic database errors', async () => {
      const error = new Error('Unknown database error');
      mockModel.findOne.mockRejectedValue(error);

      try {
        await repository.findById(1);
      } catch (e) {
        expect((e as RepositoryError).code).toBe(RepositoryErrorCode.DATABASE_ERROR);
      }
    });
  });

  describe('buildOrderBy', () => {
    it('should return undefined when no sortBy provided', () => {
      const order = (repository as any).buildOrderBy({});

      expect(order).toBeUndefined();
    });

    it('should build order clause with default ASC', () => {
      const order = (repository as any).buildOrderBy({ sortBy: 'name' });

      expect(order).toEqual([['name', 'ASC']]);
    });

    it('should build order clause with custom sortOrder', () => {
      const order = (repository as any).buildOrderBy({
        sortBy: 'createdAt',
        sortOrder: 'DESC',
      });

      expect(order).toEqual([['createdAt', 'DESC']]);
    });
  });
});
