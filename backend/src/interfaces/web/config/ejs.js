/**
 * EJS Configuration Middleware
 *
 * Configures EJS as the view engine for the admin panel
 *
 * @module ejsConfig
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Configure EJS view engine
 *
 * @param {import('express').Application} app - Express application instance
 * @param {Object} options - Configuration options
 * @param {string} options.env - Environment (development, production, test)
 * @param {string} options.rootDir - Root directory of the project
 */
export function configureEJS(app, options = {}) {
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
  app.use((req, res, next) => {
    // Make current path available for navigation active states
    res.locals.currentPath = req.path;

    // Make flash messages available
    res.locals.flash = {
      success: req.session?.flash?.success || null,
      error: req.session?.flash?.error || null,
      warning: req.session?.flash?.warning || null,
      info: req.session?.flash?.info || null,
    };

    // Clear flash messages after they're accessed
    if (req.session?.flash) {
      req.session.flash = {};
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
 * @param {import('express').Request} req - Express request
 * @param {string} type - Message type (success, error, warning, info)
 * @param {string} message - Message content
 */
export function setFlashMessage(req, type, message) {
  // Only set flash message if session exists and is properly initialized
  // If session middleware is not configured, flash messages won't work
  if (!req.session || typeof req.session !== 'object') {
    // Silently fail if session is not available
    // This prevents crashes when session middleware is misconfigured
    return;
  }

  if (!req.session.flash) {
    req.session.flash = {};
  }

  // Initialize array if it doesn't exist
  if (!req.session.flash[type]) {
    req.session.flash[type] = [];
  }

  // Add message to array
  req.session.flash[type].push(message);
}

/**
 * Helper function for rendering views with consistent layout
 *
 * @param {import('express').Response} res - Express response
 * @param {string} template - Template name (without .ejs extension)
 * @param {Object} options - View options
 */
export function renderView(res, template, options = {}) {
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
