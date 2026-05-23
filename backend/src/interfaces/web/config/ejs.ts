/**
 * EJS Configuration Middleware
 *
 * Configures EJS as the view engine for the admin panel
 *
 * @module ejsConfig
 */

import { Application, Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EjsOptions {
  env?: string;
  rootDir?: string;
}

/**
 * Configure EJS view engine
 *
 * @param app - Express application instance
 * @param options - Configuration options
 */
export function configureEJS(app: Application, options: EjsOptions = {}): { viewsDir: string; viewEngine: string; viewCache: boolean } {
  const {
    env = process.env.NODE_ENV || 'development',
    rootDir = path.resolve(__dirname, '../../../..'),
  } = options;

  // Set views directory
  const viewsDir = path.join(rootDir, 'src/interfaces/web/views');
  app.set('views', viewsDir);

  // Set view engine to EJS
  app.set('view engine', 'ejs');

  // Configure view caching based on environment
  app.set('view cache', env === 'production');

  // EJS configuration options
  app.set('view options', {
    // Make functions available in all templates
    // This will be extended with helpers as needed
  });

  // Custom EJS locals (available in all templates)
  app.use((req: Request, res: Response, next: NextFunction) => {
    // Make current path available for navigation active states
    res.locals.currentPath = req.path;

    const session = req.session as any;

    // Make flash messages available
    res.locals.flash = {
      success: session?.flash?.success || null,
      error: session?.flash?.error || null,
      warning: session?.flash?.warning || null,
      info: session?.flash?.info || null,
    };

    // Clear flash messages after they're accessed
    if (session?.flash) {
      session.flash = {};
    }

    // Make current user available
    res.locals.currentUser = req.user || null;

    // Make environment available
    res.locals.env = env;

    // Site configuration
    res.locals.site = {
      name: 'PatrolManager',
      description: 'Security guard management system with real-time tracking',
      version: process.env.npm_package_version || '1.0.0',
    };

    next();
  });

  return {
    viewsDir,
    viewEngine: 'ejs',
    viewCache: env === 'production',
  };
}

/**
 * Set flash message for next request
 *
 * @param req - Express request
 * @param type - Message type (success, error, warning, info)
 * @param message - Message content
 */
export function setFlashMessage(req: Request, type: string, message: string): void {
  const session = req.session as any;

  // Only set flash message if session exists and is properly initialized
  // If session middleware is not configured, flash messages won't work
  if (!session || typeof session !== 'object') {
    // Silently fail if session is not available
    // This prevents crashes when session middleware is misconfigured
    return;
  }

  if (!session.flash) {
    session.flash = {};
  }

  // Initialize array if it doesn't exist
  if (!session.flash[type]) {
    session.flash[type] = [];
  }

  // Add message to array
  session.flash[type].push(message);
}

/**
 * Helper function for rendering views with consistent layout
 *
 * @param res - Express response
 * @param template - Template name (without .ejs extension)
 * @param options - View options
 */
export function renderView(res: Response, template: string, options: any = {}): void {
  const defaultOptions = {
    layout: 'layouts/base',
    title: options.title || 'PatrolManager - Admin Panel',
    description: options.description,
  };

  // Merge blocks with defaults
  const blocks = {
    head: options.blocks?.head || '',
    scripts: options.blocks?.scripts || '',
  };

  res.render(template, {
    ...defaultOptions,
    ...options,
    blocks,
  });
}

export default {
  configureEJS,
  setFlashMessage,
  renderView,
};
