/**
 * Routes Index
 *
 * Centralizes all route registration.
 *
 * @module interfaces/http/routes
 */

import { Router } from 'express';

import authRoutes from './authRoutes';
import userRoutes from './userRoutes';
import roleRoutes from './roleRoutes';
import patrolRoutes from './patrolRoutes';
import incidentRoutes from './incidentRoutes';
import dashboardRoutes from './dashboardRoutes';
import shiftRoutes from './shiftRoutes';
import reportRoutes from './reportRoutes';
import siteRoutes from './siteRoutes';

/**
 * Register all API routes
 * @param router - Express Router instance
 */
export function registerRoutes(router: Router): void {
  // Authentication routes
  router.use('/auth', authRoutes);

  // User management routes
  router.use('/users', userRoutes);

  // Role and permission routes
  router.use('/roles', roleRoutes);

  // Site and checkpoint management routes
  router.use('/sites', siteRoutes);

  // Patrol execution routes
  router.use('/patrols', patrolRoutes);

  // Incident reporting routes
  router.use('/incidents', incidentRoutes);

  // Dashboard/Real-time routes
  router.use('/dashboard', dashboardRoutes);

  // Shift management routes
  router.use('/shifts', shiftRoutes);

  // Reporting and analytics routes
  router.use('/reports', reportRoutes);
}

export { authRoutes, userRoutes, roleRoutes, patrolRoutes, incidentRoutes, dashboardRoutes, shiftRoutes, reportRoutes, siteRoutes };
