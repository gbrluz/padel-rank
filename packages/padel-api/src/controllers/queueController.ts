import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

export async function getQueueStatus(req: AuthRequest, res: Response) {
  const userId = req.userId!;

  const { data: queueEntry, error } = await supabase
    .from('queue')
    .select('*')
    .eq('player_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('Error fetching queue status:', error);
    throw new AppError(500, 'Failed to fetch queue status');
  }

  res.json({ queueEntry });
}

export async function joinQueue(req: AuthRequest, res: Response) {
  const userId = req.userId!;
  const { partnerId, gender, preferredSide } = req.body;

  const { data: existing } = await supabase
    .from('queue')
    .select('id')
    .eq('player_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (existing) {
    throw new AppError(400, 'Already in queue');
  }

  const { data: queueEntry, error } = await supabase
    .from('queue')
    .insert({
      player_id: userId,
      partner_id: partnerId || null,
      gender,
      preferred_side: preferredSide || null,
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    console.error('Error joining queue:', error);
    throw new AppError(500, 'Failed to join queue');
  }

  res.json({ queueEntry });
}

export async function leaveQueue(req: AuthRequest, res: Response) {
  const userId = req.userId!;

  const { error } = await supabase
    .from('queue')
    .update({ status: 'cancelled' })
    .eq('player_id', userId)
    .eq('status', 'active');

  if (error) {
    console.error('Error leaving queue:', error);
    throw new AppError(500, 'Failed to leave queue');
  }

  res.json({ success: true });
}
