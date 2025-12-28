import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

export async function getWeeklyEvent(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const { data: event, error } = await supabase
    .from('weekly_events')
    .select('*, league:leagues(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching event:', error);
    throw new AppError(500, 'Failed to fetch event');
  }

  if (!event) {
    throw new AppError(404, 'Event not found');
  }

  res.json({ event });
}

export async function getAttendance(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const { data: attendance, error } = await supabase
    .from('weekly_event_attendance')
    .select('*, player:players(id, full_name, nickname, avatar_url, ranking_points, category), duo_partner:players!weekly_event_attendance_duo_partner_id_fkey(id, full_name, nickname)')
    .eq('event_id', id);

  if (error) {
    console.error('Error fetching attendance:', error);
    throw new AppError(500, 'Failed to fetch attendance');
  }

  res.json({ attendance });
}

export async function confirmAttendance(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userId = req.userId!;
  const { duo_partner_id } = req.body;

  const { error } = await supabase
    .from('weekly_event_attendance')
    .upsert({
      event_id: id,
      player_id: userId,
      confirmed: true,
      confirmed_at: new Date().toISOString(),
      duo_partner_id: duo_partner_id || null,
      duo_formed: !!duo_partner_id
    });

  if (error) {
    console.error('Error confirming attendance:', error);
    throw new AppError(500, 'Failed to confirm attendance');
  }

  res.json({ success: true });
}

export async function cancelAttendance(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userId = req.userId!;

  const { error } = await supabase
    .from('weekly_event_attendance')
    .delete()
    .eq('event_id', id)
    .eq('player_id', userId);

  if (error) {
    console.error('Error canceling attendance:', error);
    throw new AppError(500, 'Failed to cancel attendance');
  }

  res.json({ success: true });
}

export async function generateDuos(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { sorting_config } = req.body;

  res.json({
    success: true,
    duos_count: 0,
    duos: [],
    message: 'Duo generation not yet implemented in API'
  });
}

export async function submitScore(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userId = req.userId!;
  const { player_id, victories, defeats, bbq_participated } = req.body;

  const targetPlayerId = player_id || userId;

  const { data: event } = await supabase
    .from('weekly_events')
    .select('league:leagues(scoring_config)')
    .eq('id', id)
    .maybeSingle();

  if (!event) {
    throw new AppError(404, 'Event not found');
  }

  const scoringConfig = (event.league as any)?.scoring_config || {
    attendance_points: 10,
    bbq_points: 5,
    victory_points: 50,
    defeat_points: 10
  };

  const totalPoints =
    scoringConfig.attendance_points +
    (bbq_participated ? scoringConfig.bbq_points : 0) +
    victories * scoringConfig.victory_points +
    defeats * scoringConfig.defeat_points;

  const { error } = await supabase
    .from('weekly_event_attendance')
    .update({
      victories,
      defeats,
      bbq_participated,
      total_points: totalPoints,
      points_submitted: true
    })
    .eq('event_id', id)
    .eq('player_id', targetPlayerId);

  if (error) {
    console.error('Error submitting score:', error);
    throw new AppError(500, 'Failed to submit score');
  }

  res.json({
    success: true,
    total_points: totalPoints,
    breakdown: {
      attendance: scoringConfig.attendance_points,
      bbq: bbq_participated ? scoringConfig.bbq_points : 0,
      victories: victories * scoringConfig.victory_points,
      defeats: defeats * scoringConfig.defeat_points
    }
  });
}

export async function updateStatus(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { status } = req.body;

  const { error } = await supabase
    .from('weekly_events')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating status:', error);
    throw new AppError(500, 'Failed to update status');
  }

  res.json({ success: true });
}
