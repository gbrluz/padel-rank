import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getPlayers,
  updatePlayer,
  getStats
} from '../controllers/adminController';

const router = Router();

router.get('/players', authMiddleware, getPlayers);
router.put('/players/:id', authMiddleware, updatePlayer);
router.get('/stats', authMiddleware, getStats);

export default router;
