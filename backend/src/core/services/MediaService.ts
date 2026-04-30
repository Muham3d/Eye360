/**
 * Media Service
 *
 * Handles image processing including EXIF metadata stripping, resizing, and optimization.
 * Uses sharp library for efficient image processing.
 *
 * @module core/services
 */

import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { AppError, ValidationError } from '../domain/errors/index.js';
import logger from '../../infrastructure/config/logger.js';

/**
 * Media processing result
 */
export interface IMediaProcessResult {
  filePath: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  format: string;
  mimeType: string;
  url: string;
  exifStripped: boolean;
}

/**
 * Media processing options
 */
export interface IMediaProcessOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 1-100 for JPEG/WebP
  stripExif?: boolean; // Default: true
  convertFormat?: 'jpeg' | 'png' | 'webp';
}

/**
 * Image metadata
 */
export interface IImageMetadata {
  width: number;
  height: number;
  format: string;
  hasExif: boolean;
  exifData?: Record<string, any>;
  fileSize: number;
}

/**
 * Default processing configuration
 */
const DEFAULT_CONFIG = {
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85,
  stripExif: true,
} satisfies IMediaProcessOptions;

/**
 * Media Service Class
 *
 * Handles image processing operations including:
 * - EXIF metadata stripping for privacy
 * - Image resizing and optimization
 * - Format conversion
 */
export class MediaService {
  private readonly uploadDir: string;
  private readonly config: IMediaProcessOptions;

  constructor(uploadDir: string, options: Partial<IMediaProcessOptions> = {}) {
    this.uploadDir = uploadDir;
    this.config = { ...DEFAULT_CONFIG, ...options };
  }

  /**
   * Process uploaded image buffer
   * Strips EXIF, resizes if needed, and saves to disk
   */
  async processImage(
    buffer: Buffer,
    originalFileName: string,
    options: Partial<IMediaProcessOptions> = {}
  ): Promise<IMediaProcessResult> {
    const mergedOptions = { ...this.config, ...options };
    const uniqueFileName = `${uuidv4()}.jpg`;
    const outputPath = path.join(this.uploadDir, uniqueFileName);

    try {
      // Get image metadata before processing
      const metadata = await this.getImageMetadata(buffer);
      logger.info(`Processing image: ${originalFileName} (${metadata.width}x${metadata.height}, has EXIF: ${metadata.hasExif})`);

      // Build sharp pipeline
      let pipeline = sharp(buffer);

      // Rotate image based on EXIF orientation (before stripping!)
      pipeline = pipeline.rotate();

      // Resize if dimensions exceed max
      const needsResize =
        metadata.width > (mergedOptions.maxWidth || DEFAULT_CONFIG.maxWidth) ||
        metadata.height > (mergedOptions.maxHeight || DEFAULT_CONFIG.maxHeight);

      if (needsResize) {
        pipeline = pipeline.resize(
          mergedOptions.maxWidth,
          mergedOptions.maxHeight,
          {
            fit: 'inside',
            withoutEnlargement: true
          }
        );
      }

      // Strip EXIF metadata (privacy requirement)
      // This also removes all other metadata like camera model, GPS location, etc.
      if (mergedOptions.stripExif !== false) {
        pipeline = pipeline.withoutMetadata(); // Strip all metadata
      }

      // Convert to JPEG with specified quality
      pipeline = pipeline.toFormat('jpeg', {
        quality: mergedOptions.quality || DEFAULT_CONFIG.quality,
        progressive: true, // Progressive JPEG for faster loading
        mozjpeg: true, // Use mozjpeg encoder if available
      });

      // Save processed image
      const info = await pipeline.toFile(outputPath);

      logger.info(`Image processed: ${uniqueFileName} (${info.width}x${info.height}, ${info.size} bytes, EXIF stripped: ${mergedOptions.stripExif !== false})`);

      return {
        filePath: outputPath,
        fileName: uniqueFileName,
        fileSize: info.size,
        width: info.width,
        height: info.height,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        url: `/uploads/evidence/${uniqueFileName}`,
        exifStripped: mergedOptions.stripExif !== false,
      };
    } catch (error) {
      logger.error('Failed to process image:', error);
      throw new AppError('Image processing failed', 500, 'IMAGE_PROCESS_FAILED');
    }
  }

  /**
   * Process base64 image data
   * Useful for mobile uploads where images are sent as base64 strings
   */
  async processBase64Image(
    base64Data: string,
    originalFileName: string,
    options: Partial<IMediaProcessOptions> = {}
  ): Promise<IMediaProcessResult> {
    // Strip data URI prefix if present
    const base64String = base64Data.replace(/^data:image\/[a-z]+;base64,/i, '');
    const buffer = Buffer.from(base64String, 'base64');

    return await this.processImage(buffer, originalFileName, options);
  }

  /**
   * Get image metadata without modifying the image
   */
  async getImageMetadata(buffer: Buffer): Promise<IImageMetadata> {
    try {
      const metadata = await sharp(buffer).metadata();

      // Check if EXIF data exists
      const hasExif = !!metadata.exif;

      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        hasExif,
        exifData: metadata.exif || undefined,
        fileSize: buffer.length,
      };
    } catch (error) {
      logger.error('Failed to read image metadata:', error);
      throw new ValidationError('Invalid image file');
    }
  }

  /**
   * Extract EXIF GPS data if present (for validation/logging only)
   * This is for security auditing to verify EXIF was stripped
   */
  async extractGPSFromImage(buffer: Buffer): Promise<{ latitude?: number; longitude?: number } | null> {
    try {
      const metadata = await sharp(buffer).metadata();
      const exif = metadata.exif;

      if (!exif) return null;

      // Extract GPS coordinates if present
      // EXIF GPS format is complex; this is a simplified check
      const hasGPS = exif.GPSLatitude !== undefined && exif.GPSLongitude !== undefined;

      if (hasGPS) {
        return {
          latitude: exif.GPSLatitude as number,
          longitude: exif.GPSLongitude as number,
        };
      }

      return null;
    } catch (error) {
      logger.warn('Failed to extract GPS data:', error);
      return null;
    }
  }

  /**
   * Create thumbnail of an image
   */
  async createThumbnail(
    inputPath: string,
    size: number = 200
  ): Promise<IMediaProcessResult> {
    const uniqueFileName = `thumb_${uuidv4()}.jpg`;
    const outputPath = path.join(this.uploadDir, uniqueFileName);

    try {
      const info = await sharp(inputPath)
        .resize(size, size, {
          fit: 'cover',
          position: 'center'
        })
        .withoutMetadata()
        .toFormat('jpeg', { quality: 75 })
        .toFile(outputPath);

      return {
        filePath: outputPath,
        fileName: uniqueFileName,
        fileSize: info.size,
        width: info.width,
        height: info.height,
        format: 'jpeg',
        mimeType: 'image/jpeg',
        url: `/uploads/evidence/${uniqueFileName}`,
        exifStripped: true,
      };
    } catch (error) {
      logger.error('Failed to create thumbnail:', error);
      throw new AppError('Thumbnail creation failed', 500, 'THUMBNAIL_FAILED');
    }
  }

  /**
   * Validate image buffer before processing
   */
  validateImage(buffer: Buffer): { isValid: boolean; error?: string } {
    // Check minimum file size (1KB)
    if (buffer.length < 1024) {
      return { isValid: false, error: 'File too small (min 1KB)' };
    }

    // Check maximum file size (20MB)
    if (buffer.length > 20 * 1024 * 1024) {
      return { isValid: false, error: 'File too large (max 20MB)' };
    }

    // Validate it's a valid image
    return sharp(buffer)
      .metadata()
      .then(() => ({ isValid: true }))
      .catch(() => ({ isValid: false, error: 'Invalid image file' }));
  }

  /**
   * Delete a media file
   */
  async deleteMedia(filePath: string): Promise<void> {
    const fs = await import('fs/promises');
    try {
      await fs.unlink(filePath);
      logger.info(`Media file deleted: ${filePath}`);
    } catch (error) {
      logger.warn(`Failed to delete media file ${filePath}:`, error);
    }
  }
}

/**
 * Singleton instance management
 */
let mediaServiceInstance: MediaService | null = null;

export function initializeMediaService(uploadDir: string, options?: Partial<IMediaProcessOptions>): MediaService {
  mediaServiceInstance = new MediaService(uploadDir, options);
  return mediaServiceInstance;
}

export function getMediaService(): MediaService {
  if (!mediaServiceInstance) {
    throw new Error('MediaService not initialized');
  }
  return mediaServiceInstance;
}

export default MediaService;
