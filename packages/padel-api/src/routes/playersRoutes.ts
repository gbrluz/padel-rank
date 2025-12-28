import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { getPlayer, updatePlayer } from '../controllers/playersController';

const router = Router();

router.get('/', authMiddleware, getPlayer);
router.get('/:id', authMiddleware, getPlayer);
router.put('/:id', authMiddleware, updatePlayer);

export default router;
