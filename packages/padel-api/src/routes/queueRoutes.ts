import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getQueueStatus,
  joinQueue,
  leaveQueue
} from '../controllers/queueController';

const router = Router();

router.get('/', authMiddleware, getQueueStatus);
router.post('/', authMiddleware, joinQueue);
router.delete('/', authMiddleware, leaveQueue);

export default router;
