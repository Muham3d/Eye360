/**
 * Security Middleware
 *
 * Configures security-related middleware: Helmet, CORS, Rate Limiting.
 *
 * @module interfaces/http/middleware
 */

import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from '@infrastructure/config/env.js';
import { RateLimitError } from '@core/domain/errors/index.js';

/**
 * Configure Helmet security headers
 */
export const helmetMiddleware = helmet({
  // Content Security Policy - configure for your needs
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  // HSTS - only enable in production with valid HTTPS
  hsts: config.server.isProduction
    ? {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      }
    : false,
  // X-Frame-Options
  frameguard: {
    action: 'deny',
  },
  // X-Content-Type-Options
  noSniff: true,
  // X-XSS-Protection
  xssFilter: true,
  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin',
  },
  // Remove X-Powered-By header
  hidePoweredBy: true,
});

/**
 * Configure CORS
 */
export const corsMiddleware = cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Request-ID',
    'Accept',
    'Origin',
  ],
  exposedHeaders: config.cors.exposedHeaders,
  maxAge: 86400, // 24 hours
});

/**
 * Rate limiting configuration
 */
export const rateLimitMiddleware = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: config.rateLimit.standardHeaders,
  legacyHeaders: config.rateLimit.legacyHeaders,
  message: 'Too many requests from this IP, please try again later.',
  // Custom handler to use our RateLimitError
  handler: (req: Request, res: Response, next: NextFunction, options: any) => {
    const retryAfter = Math.ceil(options.windowMs / 1000);
    const error = RateLimitError.retryAfter(retryAfter, options.max);
    next(error);
  },
  // Use store for distributed rate limiting (Redis) - placeholder for future
  store: undefined,
  // Skip rate limiting for successful requests
  skipSuccessfulRequests: false,
  // Skip rate limiting for failed requests
  skipFailedRequests: false,
});

/**
 * Stricter rate limiting for authentication endpoints
 */
export const authRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many authentication attempts, please try again later.',
  handler: (req: Request, res: Response, next: NextFunction) => {
    const retryAfter = 15 * 60; // 15 minutes in seconds
    const error = RateLimitError.retryAfter(retryAfter, 5);
    next(error);
  },
});

/**
 * Rate limiting for API routes (more lenient)
 */
export const apiRateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate limiting for GPS tracking endpoints (high frequency allowed)
 */
export const gpsRateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 1 request per second
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Request timing middleware
 */
export function requestTimingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startTime = Date.now();
  (req as any).startTime = startTime;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    // Only set header if response hasn't been sent yet
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
  });

  next();
}

/**
 * Request size limiter
 */
export function requestSizeLimit(maxSize: string = '10mb') {
  return function (
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    const contentLength = req.get('content-length');
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      const maxSizeInBytes = parseSize(maxSize);
      if (size > maxSizeInBytes) {
        return res.status(413).json({
          success: false,
          error: {
            name: 'PayloadTooLarge',
            type: 'PAYLOAD_TOO_LARGE',
            message: `Request body too large. Maximum size is ${maxSize}.`,
            statusCode: 413,
          },
        });
      }
    }
    next();
  };
}

/**
 * Parse size string (e.g., '10mb', '1gb') to bytes
 */
function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+)([a-z]+)$/);
  if (!match) {
    return 10 * 1024 * 1024; // Default 10MB
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  return value * (units[unit] || 1);
}

/**
 * IP-based rate limiting key generator
 */
export function getClientIdentifier(req: Request): string {
  // Check for custom header from reverse proxy
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    return (forwardedFor as string).split(',')[0].trim();
  }

  // Check for CF connecting IP
  const cfIp = req.headers['cf-connecting-ip'];
  if (cfIp) {
    return cfIp as string;
  }

  // Fall back to remote address
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Health check endpoint - bypass rate limiting
 */
export const healthCheckRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // High limit for health checks
  skip: (req) => req.path === '/health',
});

/**
 * TODO: Implement Redis-based distributed rate limiting
 * TODO: Add API key-based rate limiting for integrations
 * TODO: Implement IP whitelist/blacklist support
 */
