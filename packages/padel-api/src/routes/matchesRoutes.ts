import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  listMatches,
  scheduleMatch,
  updateAvailability,
  completeMatch,
  approveMatch
} from '../controllers/matchesController';

const router = Router();

router.get('/', authMiddleware, listMatches);
router.put('/:id/schedule', authMiddleware, scheduleMatch);
router.put('/:id/availability', authMiddleware, updateAvailability);
router.post('/complete', authMiddleware, completeMatch);
router.post('/approve', authMiddleware, approveMatch);

export default router;
