import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getRegionalRanking,
  getGlobalRanking,
  getRankingHistory
} from '../controllers/rankingsController';

const router = Router();

router.get('/regional', authMiddleware, getRegionalRanking);
router.get('/global', authMiddleware, getGlobalRanking);
router.get('/history', authMiddleware, getRankingHistory);
router.get('/history/:playerId', authMiddleware, getRankingHistory);

export default router;
