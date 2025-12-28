import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  listLeagues,
  getLeague,
  createLeague,
  updateLeague,
  joinLeague,
  leaveLeague,
  getLeagueMembers,
  getLeagueRanking,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  getWeeklyEvents,
  createWeeklyEvent
} from '../controllers/leaguesController';

const router = Router();

router.get('/', authMiddleware, listLeagues);
router.post('/', authMiddleware, createLeague);
router.get('/:id', authMiddleware, getLeague);
router.put('/:id', authMiddleware, updateLeague);
router.post('/:id/join', authMiddleware, joinLeague);
router.delete('/:id/leave', authMiddleware, leaveLeague);
router.get('/:id/members', authMiddleware, getLeagueMembers);
router.get('/:id/participants', authMiddleware, getLeagueMembers);
router.get('/:id/ranking', authMiddleware, getLeagueRanking);
router.get('/:id/requests', authMiddleware, getJoinRequests);
router.post('/:id/requests/:requestId/approve', authMiddleware, approveJoinRequest);
router.post('/:id/requests/:requestId/reject', authMiddleware, rejectJoinRequest);
router.get('/:id/events', authMiddleware, getWeeklyEvents);
router.post('/:id/events', authMiddleware, createWeeklyEvent);

export default router;
