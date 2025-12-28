import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

export async function listMatches(req: AuthRequest, res: Response) {
  const { status, league_id } = req.query;
  const userId = req.userId!;

  let query = supabase
    .from('matches')
    .select('*')
    .or(`team_a_player1_id.eq.${userId},team_a_player2_id.eq.${userId},team_b_player1_id.eq.${userId},team_b_player2_id.eq.${userId}`);

  if (status) query = query.eq('status', status);
  if (league_id) query = query.eq('league_id', league_id);

  query = query.order('created_at', { ascending: false });

  const { data: matches, error } = await query;

  if (error) {
    console.error('Error fetching matches:', error);
    throw new AppError(500, 'Failed to fetch matches');
  }

  res.json({ matches });
}

export async function scheduleMatch(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { scheduled_date, scheduled_time, location } = req.body;

  const { data: match, error } = await supabase
    .from('matches')
    .update({
      scheduled_date,
      scheduled_time,
      location,
      status: 'scheduled',
      scheduling_status: 'scheduled'
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error scheduling match:', error);
    throw new AppError(500, 'Failed to schedule match');
  }

  res.json({ match });
}

export async function updateAvailability(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { availability } = req.body;
  const userId = req.userId!;

  const { data: match } = await supabase
    .from('matches')
    .select('player_availability')
    .eq('id', id)
    .maybeSingle();

  if (!match) {
    throw new AppError(404, 'Match not found');
  }

  const currentAvailability = match.player_availability || {};
  const updatedAvailability = {
    ...currentAvailability,
    [userId]: availability
  };

  const { data: updatedMatch, error } = await supabase
    .from('matches')
    .update({ player_availability: updatedAvailability })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating availability:', error);
    throw new AppError(500, 'Failed to update availability');
  }

  res.json({ match: updatedMatch });
}

export async function completeMatch(req: AuthRequest, res: Response) {
  const { matchId, team_a_score, team_b_score, winner_team, sets } = req.body;

  const { data: match, error } = await supabase
    .from('matches')
    .update({
      team_a_score,
      team_b_score,
      winner_team,
      sets,
      status: 'pending_approval',
      completed_at: new Date().toISOString()
    })
    .eq('id', matchId)
    .select()
    .single();

  if (error) {
    console.error('Error completing match:', error);
    throw new AppError(500, 'Failed to complete match');
  }

  res.json({ match });
}

export async function approveMatch(req: AuthRequest, res: Response) {
  const { matchId, approved } = req.body;

  const newStatus = approved ? 'completed' : 'scheduled';

  const { error } = await supabase
    .from('matches')
    .update({ status: newStatus })
    .eq('id', matchId);

  if (error) {
    console.error('Error approving match:', error);
    throw new AppError(500, 'Failed to approve match');
  }

  res.json({ success: true });
}
