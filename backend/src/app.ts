/**
 * Express App Configuration
 *
 * Main application configuration file that sets up middleware,
 * routes, and error handling.
 *
 * @module app
 */

import express, { type Application, type Request, type Response } from 'express';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './infrastructure/config/env.js';
import logger, { requestIdMiddleware } from './infrastructure/config/logger.js';
import {
  helmetMiddleware,
  corsMiddleware,
  rateLimitMiddleware,
  requestTimingMiddleware,
} from './interfaces/http/middleware/securityMiddleware.js';
import { errorHandler, notFoundHandler } from './interfaces/http/middleware/errorHandler.js';
import { configureEJS } from './interfaces/web/config/ejs.js';
import { registerSwagger, addDocsLink } from './interfaces/http/swagger.js';
import { getSessionMiddleware } from './infrastructure/config/session.js';
import webRoutes from './interfaces/web/routes/index.js';
import { registerRoutes as registerApiRoutes } from './interfaces/http/routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create and configure Express application
 */
export function createApp(): Application {
  const app = express();

  // Trust proxy - needed for correct IP detection behind reverse proxy
  app.set('trust proxy', 1);

  // Security middleware
  app.use(helmetMiddleware);

  // CORS middleware
  app.use(corsMiddleware);

  // Request timing
  app.use(requestTimingMiddleware);

  // Request ID middleware for tracing
  app.use(requestIdMiddleware());

  // Request logging
  if (config.server.isDevelopment) {
    app.use((req, res, next) => {
      (req as any).startTime = Date.now();
      next();
    });
  }

  // Compression middleware
  app.use(compression());

  // Session middleware (must be before body parsing for passport to work)
  app.use(getSessionMiddleware());

  // Rate limiting
  if (config.server.isProduction || config.server.env === 'development') {
    app.use(rateLimitMiddleware);
  }

  // Body parsing middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Configure EJS view engine
  configureEJS(app, {
    env: config.server.env,
    rootDir: path.resolve(__dirname, '..'),
  });

  // Serve static assets
  app.use('/assets', express.static(path.join(__dirname, '../interfaces/web/public/assets')));

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.server.env,
      version: process.env.npm_package_version || '1.0.0',
    };
    res.status(200).json(health);
  });

  // Register Swagger UI for API documentation
  registerSwagger(app);

  // Add API documentation link header
  app.use(addDocsLink);

  // API Routes
  const apiRouter = express.Router();
  registerApiRoutes(apiRouter);
  app.use('/api/v1', apiRouter);

  // Web Routes
  app.use('/', webRoutes);

  // 404 handler - must be after all routes
  app.use(notFoundHandler);

  // Global error handler - must be last
  app.use(errorHandler);

  return app;
}

export default createApp;
