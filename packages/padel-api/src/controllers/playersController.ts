import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

const ALLOWED_UPDATE_FIELDS = [
  'full_name',
  'phone',
  'state',
  'city',
  'preferred_side',
  'availability',
  'photo_url',
] as const;

function whitelistFields(data: any, allowedFields: readonly string[]) {
  const result: any = {};
  for (const field of allowedFields) {
    if (field in data) {
      result[field] = data[field];
    }
  }
  return result;
}

export async function getPlayer(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const playerId = id || req.userId;

  if (!playerId) {
    throw new AppError(400, 'Player ID is required');
  }

  const { data: player, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching player:', error);
    throw new AppError(500, 'Failed to fetch player');
  }

  if (!player) {
    throw new AppError(404, 'Player not found');
  }

  res.json({ player });
}

export async function updatePlayer(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const playerId = id || req.userId;

  if (!playerId) {
    throw new AppError(400, 'Player ID is required');
  }

  if (playerId !== req.userId) {
    const { data: requestingPlayer } = await supabase
      .from('players')
      .select('is_admin')
      .eq('id', req.userId)
      .maybeSingle();

    if (!requestingPlayer?.is_admin) {
      throw new AppError(403, 'No permission to update this player');
    }
  }

  const updates = req.body;
  const safeUpdates = whitelistFields(updates, ALLOWED_UPDATE_FIELDS);

  if (Object.keys(safeUpdates).length === 0) {
    throw new AppError(400, 'No valid fields to update');
  }

  const { data: player, error } = await supabase
    .from('players')
    .update(safeUpdates)
    .eq('id', playerId)
    .select()
    .single();

  if (error) {
    console.error('Error updating player:', error);
    throw new AppError(500, 'Failed to update player');
  }

  res.json({ player });
}
