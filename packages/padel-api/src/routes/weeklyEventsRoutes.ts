import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getWeeklyEvent,
  getAttendance,
  confirmAttendance,
  cancelAttendance,
  generateDuos,
  submitScore,
  updateStatus
} from '../controllers/weeklyEventsController';

const router = Router();

router.get('/:id', authMiddleware, getWeeklyEvent);
router.get('/:id/attendance', authMiddleware, getAttendance);
router.post('/:id/confirm', authMiddleware, confirmAttendance);
router.post('/:id/cancel', authMiddleware, cancelAttendance);
router.post('/:id/generate-duos', authMiddleware, generateDuos);
router.post('/:id/score', authMiddleware, submitScore);
router.put('/:id/status', authMiddleware, updateStatus);

export default router;
