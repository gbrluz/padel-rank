import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

async function checkAdmin(userId: string) {
  const { data: player } = await supabase
    .from('players')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (!player?.is_admin) {
    throw new AppError(403, 'Admin access required');
  }
}

export async function getPlayers(req: AuthRequest, res: Response) {
  await checkAdmin(req.userId!);

  const { search } = req.query;

  let query = supabase.from('players').select('*').order('created_at', { ascending: false });

  if (search) {
    query = query.ilike('full_name', `%${search}%`);
  }

  const { data: players, error } = await query;

  if (error) {
    console.error('Error fetching players:', error);
    throw new AppError(500, 'Failed to fetch players');
  }

  res.json({ players });
}

export async function updatePlayer(req: AuthRequest, res: Response) {
  await checkAdmin(req.userId!);

  const { id } = req.params;

  const { data: player, error } = await supabase
    .from('players')
    .update(req.body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating player:', error);
    throw new AppError(500, 'Failed to update player');
  }

  res.json({ player });
}

export async function getStats(req: AuthRequest, res: Response) {
  await checkAdmin(req.userId!);

  const [playersResult, matchesResult, leaguesResult, queueResult] = await Promise.all([
    supabase.from('players').select('id', { count: 'exact', head: true }),
    supabase.from('matches').select('id', { count: 'exact', head: true }),
    supabase.from('leagues').select('id', { count: 'exact', head: true }),
    supabase.from('queue').select('id', { count: 'exact', head: true }).eq('status', 'active')
  ]);

  const stats = {
    totalPlayers: playersResult.count || 0,
    totalMatches: matchesResult.count || 0,
    totalLeagues: leaguesResult.count || 0,
    activeQueueEntries: queueResult.count || 0
  };

  res.json({ stats });
}
