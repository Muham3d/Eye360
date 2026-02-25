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

  // Patrol execution routes
  router.use('/patrols', patrolRoutes);

  // Incident reporting routes
  router.use('/incidents', incidentRoutes);

  // Dashboard/Real-time routes (Phase 3)
  router.use('/dashboard', dashboardRoutes);

  // Shift management routes (Phase 5)
  router.use('/shifts', shiftRoutes);

  // Reporting and analytics routes (Phase 5)
  router.use('/reports', reportRoutes);

  // TODO: Register additional routes
  // router.use('/sites', siteRoutes);
  // router.use('/checkpoints', checkpointRoutes);
}

export { authRoutes, userRoutes, roleRoutes, patrolRoutes, incidentRoutes, dashboardRoutes, shiftRoutes, reportRoutes };
