/**
 * File Storage Service
 *
 * Handles file uploads for incident evidence.
 * Supports local storage and can be extended for S3/cloud storage.
 *
 * @module core/services
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { AppError, ValidationError } from '../domain/errors/index.js';
import logger from '../../infrastructure/config/logger.js';

/**
 * File upload result
 */
export interface IFileUploadResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url?: string;
}

/**
 * File upload options
 */
export interface IFileUploadOptions {
  maxSize?: number; // bytes
  allowedTypes?: string[];
  directory?: string;
}

/**
 * Supported file types for evidence
 */
export const EVIDENCE_FILE_TYPES = {
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
  AUDIO: ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg'],
} as const;

/**
 * Default upload configuration
 */
const DEFAULT_CONFIG = {
  maxSize: 10 * 1024 * 1024, // 10MB
  allowedTypes: [...EVIDENCE_FILE_TYPES.IMAGE, ...EVIDENCE_FILE_TYPES.VIDEO, ...EVIDENCE_FILE_TYPES.AUDIO],
  directory: 'uploads/evidence',
} satisfies IFileUploadOptions;

/**
 * File Validation Result
 */
interface IFileValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * File Storage Service Class
 */
export class FileStorageService {
  private readonly uploadDir: string;
  private readonly config: IFileUploadOptions;

  constructor(config: Partial<IFileUploadOptions> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.uploadDir = path.resolve(process.cwd(), this.config.directory || DEFAULT_CONFIG.directory);
  }

  /**
   * Initialize the upload directory
   */
  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
      logger.info(`File upload directory initialized: ${this.uploadDir}`);
    } catch (error) {
      logger.error('Failed to initialize upload directory:', error);
      throw new AppError('Failed to initialize file storage', 500, 'STORAGE_INIT_FAILED');
    }
  }

  /**
   * Handle file upload from base64 data
   */
  async uploadFromBase64(
    base64Data: string,
    originalFileName: string,
    mimeType: string
  ): Promise<IFileUploadResult> {
    // Validate file
    const validation = this.validateFile(base64Data.length, mimeType);
    if (!validation.isValid) {
      throw new ValidationError(validation.error || 'File validation failed');
    }

    // Generate unique filename
    const extension = this.getExtension(mimeType);
    const uniqueFileName = `${uuidv4()}${extension}`;
    const filePath = path.join(this.uploadDir, uniqueFileName);

    // Convert base64 to buffer and save
    const buffer = Buffer.from(base64Data, 'base64');
    await fs.writeFile(filePath, buffer);

    logger.info(`File uploaded: ${uniqueFileName} (${buffer.length} bytes)`);

    return {
      filePath,
      fileName: uniqueFileName,
      fileSize: buffer.length,
      mimeType,
      url: `/uploads/evidence/${uniqueFileName}`,
    };
  }

  /**
   * Handle file upload from buffer (for multipart/form-data)
   */
  async uploadFromBuffer(
    buffer: Buffer,
    originalFileName: string,
    mimeType: string
  ): Promise<IFileUploadResult> {
    // Validate file
    const validation = this.validateFile(buffer.length, mimeType);
    if (!validation.isValid) {
      throw new ValidationError(validation.error || 'File validation failed');
    }

    // Generate unique filename
    const extension = this.getExtension(mimeType);
    const uniqueFileName = `${uuidv4()}${extension}`;
    const filePath = path.join(this.uploadDir, uniqueFileName);

    // Save file
    await fs.writeFile(filePath, buffer);

    logger.info(`File uploaded: ${uniqueFileName} (${buffer.length} bytes)`);

    return {
      filePath,
      fileName: uniqueFileName,
      fileSize: buffer.length,
      mimeType,
      url: `/uploads/evidence/${uniqueFileName}`,
    };
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.info(`File deleted: ${filePath}`);
    } catch (error) {
      logger.warn(`Failed to delete file ${filePath}:`, error);
      // Don't throw - file may not exist
    }
  }

  /**
   * Get file as base64 (for API responses)
   */
  async getFileAsBase64(filePath: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);
      return buffer.toString('base64');
    } catch (error) {
      logger.error(`Failed to read file ${filePath}:`, error);
      throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
    }
  }

  /**
   * Get file info
   */
  async getFileInfo(filePath: string): Promise<{ exists: boolean; size?: number; mimeType?: string }> {
    try {
      const stats = await fs.stat(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = this.getMimeTypeFromExtension(ext);

      return {
        exists: true,
        size: stats.size,
        mimeType,
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Validate file before upload
   */
  private validateFile(size: number, mimeType: string): IFileValidationResult {
    // Check file size
    const maxSize = this.config.maxSize || DEFAULT_CONFIG.maxSize;
    if (size > maxSize) {
      return {
        isValid: false,
        error: `File size exceeds maximum of ${maxSize} bytes`,
      };
    }

    // Check file type
    const allowedTypes = this.config.allowedTypes || DEFAULT_CONFIG.allowedTypes;
    if (!allowedTypes.includes(mimeType)) {
      return {
        isValid: false,
        error: `File type ${mimeType} is not allowed`,
      };
    }

    return { isValid: true };
  }

  /**
   * Get file extension from MIME type
   */
  private getExtension(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'video/mp4': '.mp4',
      'video/webm': '.webm',
      'video/quicktime': '.mov',
      'audio/mpeg': '.mp3',
      'audio/mp3': '.mp3',
      'audio/wav': '.wav',
      'audio/webm': '.webm',
      'audio/ogg': '.ogg',
    };

    return mimeToExt[mimeType] || '.bin';
  }

  /**
   * Get MIME type from file extension
   */
  private getMimeTypeFromExtension(extension: string): string | undefined {
    const extToMime: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.ogg': 'audio/ogg',
    };

    return extToMime[extension.toLowerCase()];
  }

  /**
   * Clean up old files (can be run as a scheduled task)
   */
  async cleanupOldFiles(daysToKeep: number): Promise<number> {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    let deletedCount = 0;

    try {
      const files = await fs.readdir(this.uploadDir);

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime < cutoffDate) {
          await this.deleteFile(filePath);
          deletedCount++;
        }
      }

      logger.info(`Cleaned up ${deletedCount} old files`);
    } catch (error) {
      logger.error('Failed to cleanup old files:', error);
    }

    return deletedCount;
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{ totalFiles: number; totalSize: number; oldestFile?: Date; newestFile?: Date }> {
    let totalFiles = 0;
    let totalSize = 0;
    let oldestFile: Date | undefined;
    let newestFile: Date | undefined;

    try {
      const files = await fs.readdir(this.uploadDir);

      for (const file of files) {
        const filePath = path.join(this.uploadDir, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          totalFiles++;
          totalSize += stats.size;

          if (!oldestFile || stats.mtime < oldestFile) {
            oldestFile = stats.mtime;
          }
          if (!newestFile || stats.mtime > newestFile) {
            newestFile = stats.mtime;
          }
        }
      }
    } catch (error) {
      logger.error('Failed to get storage stats:', error);
    }

    return { totalFiles, totalSize, oldestFile, newestFile };
  }
}

/**
 * Singleton instance management
 */
let fileStorageServiceInstance: FileStorageService | null = null;

export function initializeFileStorageService(config?: Partial<IFileUploadOptions>): FileStorageService {
  fileStorageServiceInstance = new FileStorageService(config);
  return fileStorageServiceInstance;
}

export function getFileStorageService(): FileStorageService {
  if (!fileStorageServiceInstance) {
    throw new Error('FileStorageService not initialized');
  }
  return fileStorageServiceInstance;
}

export default FileStorageService;
