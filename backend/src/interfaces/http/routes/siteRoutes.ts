/**
 * Site Routes
 *
 * Defines API routes for site and checkpoint management.
 *
 * @module interfaces/http/routes
 */

import { Router } from 'express';
import SiteController from '../controllers/SiteController.js';
import CheckpointController from '../controllers/CheckpointController.js';
import { authMiddleware, requireRole } from '../middleware/authMiddleware.js';

const router = Router();

// All site routes require authentication and manager/admin role
router.use(authMiddleware);
router.use(requireRole('admin', 'manager'));

/**
 * Site CRUD Routes
 */
router.get('/', SiteController.listSites);
router.post('/', SiteController.createSite);
router.get('/:id', SiteController.getSiteDetails);
router.get('/:id/statistics', SiteController.getSiteStatistics);
router.patch('/:id', SiteController.updateSite);
router.delete('/:id', SiteController.deleteSite);

/**
 * Nested Checkpoint Routes
 */
router.get('/:siteId/checkpoints', CheckpointController.listCheckpoints);
router.post('/:siteId/checkpoints', CheckpointController.createCheckpoint);
router.get('/:siteId/checkpoints/:id', CheckpointController.getCheckpointDetails);
router.patch('/:siteId/checkpoints/:id', CheckpointController.updateCheckpoint);
router.delete('/:siteId/checkpoints/:id', CheckpointController.deleteCheckpoint);
router.post('/:siteId/checkpoints/reorder', CheckpointController.reorderCheckpoints);

export default router;
