/**
 * Session Middleware Configuration
 *
 * Configures express-session with Sequelize store for persistent
 * session storage in PostgreSQL.
 *
 * @module infrastructure/config/session
 */

import session from 'express-session';
import { config } from './env.js';

let sessionMiddleware: any = null;
let sessionStore: any = null;

/**
 * Create and configure session store
 * Must be called after database is initialized
 */
export async function createSessionStore() {
  if (sessionStore) {
    return sessionStore;
  }

  // Dynamically import to avoid issues if not installed
  const { default: connectSessionSequelize } = await import('connect-session-sequelize');
  const { sequelize } = await import('../database/models/index.js');

  // Create Sequelize store for session persistence
  const Store = connectSessionSequelize(session.Store);
  sessionStore = new Store({
    db: sequelize,
    tableName: 'Sessions',
    extendDefaultFields: (defaults: any) => ({
      data: defaults.data,
      expires: defaults.expires,
    }),
    // Cleanup expired sessions
    checkExpirationInterval: 15 * 60 * 1000, // 15 minutes
    expiration: 24 * 60 * 60 * 1000, // 24 hours
  });

  // Sync the session table
  await sessionStore.sync();

  return sessionStore;
}

/**
 * Initialize session middleware
 * Must be called before server starts
 */
export async function initializeSessionMiddleware() {
  if (sessionMiddleware) {
    return sessionMiddleware;
  }

  // Ensure store is initialized
  const store = await createSessionStore();

  // Create the session middleware
  sessionMiddleware = session({
    name: 'patrolmanager.sid',
    secret: config.session.secret,
    store,
    resave: config.session.resave,
    saveUninitialized: config.session.saveUninitialized,
    rolling: config.session.rolling,
    cookie: {
      maxAge: config.session.cookieMaxAge,
      secure: config.session.cookieSecure,
      sameSite: config.session.cookieSameSite,
      httpOnly: true,
    },
    // Touch session on each request to keep it alive
    touchAfter: 5 * 1000, // 5 seconds
  });

  return sessionMiddleware;
}

/**
 * Get session middleware instance
 * Returns a simple middleware if not initialized (graceful degradation)
 */
export function getSessionMiddleware() {
  if (!sessionMiddleware) {
    // Return a no-op middleware if session not ready
    return (req: any, res: any, next: any) => {
      // Create a dummy session object to prevent crashes
      req.session = {} as any;
      next();
    };
  }
  return sessionMiddleware;
}

export default {
  createSessionStore,
  initializeSessionMiddleware,
  getSessionMiddleware,
};
