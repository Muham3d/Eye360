/**
 * Incident Routes
 */

import { Router } from 'express';
import IncidentController from '../controllers/IncidentController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);

router.post('/', IncidentController.reportIncident);
router.get('/:id', IncidentController.getIncident);
router.patch('/:id/status', IncidentController.updateStatus);
router.post('/:id/comments', IncidentController.addComment);
router.post('/:id/evidence', IncidentController.uploadEvidence);

export default router;
