import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { AppError } from '../middleware/errorHandler';

export async function listLeagues(req: AuthRequest, res: Response) {
  const { status, gender, my_leagues } = req.query;
  const userId = req.userId!;

  let query = supabase.from('leagues').select('*');

  if (status) query = query.eq('status', status);
  if (gender) query = query.eq('gender', gender);

  if (my_leagues === 'true') {
    const { data: memberships } = await supabase
      .from('league_memberships')
      .select('league_id')
      .eq('player_id', userId);

    const leagueIds = memberships?.map((m: any) => m.league_id) || [];
    if (leagueIds.length > 0) {
      query = query.in('id', leagueIds);
    } else {
      return res.json({ leagues: [] });
    }
  }

  query = query.order('created_at', { ascending: false });
  const { data: leagues, error } = await query;

  if (error) {
    console.error('Error fetching leagues:', error);
    throw new AppError(500, 'Failed to fetch leagues');
  }

  res.json({ leagues });
}

export async function getLeague(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const { data: league, error } = await supabase
    .from('leagues')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching league:', error);
    throw new AppError(500, 'Failed to fetch league');
  }

  if (!league) {
    throw new AppError(404, 'League not found');
  }

  res.json({ league });
}

export async function createLeague(req: AuthRequest, res: Response) {
  const userId = req.userId!;

  const { data: player } = await supabase
    .from('players')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (!player?.is_admin) {
    throw new AppError(403, 'Only admins can create leagues');
  }

  const leagueData = {
    ...req.body,
    created_by: userId
  };

  const { data: league, error } = await supabase
    .from('leagues')
    .insert(leagueData)
    .select()
    .single();

  if (error) {
    console.error('Error creating league:', error);
    throw new AppError(500, 'Failed to create league');
  }

  res.json({ league });
}

export async function updateLeague(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userId = req.userId!;

  const { data: player } = await supabase
    .from('players')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (!player?.is_admin) {
    throw new AppError(403, 'Only admins can update leagues');
  }

  const { data: league, error } = await supabase
    .from('leagues')
    .update(req.body)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating league:', error);
    throw new AppError(500, 'Failed to update league');
  }

  res.json({ league });
}

export async function joinLeague(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userId = req.userId!;
  const { message } = req.body;

  const { data: league } = await supabase
    .from('leagues')
    .select('requires_approval')
    .eq('id', id)
    .maybeSingle();

  if (!league) {
    throw new AppError(404, 'League not found');
  }

  if (league.requires_approval) {
    const { error } = await supabase
      .from('league_join_requests')
      .insert({
        league_id: id,
        player_id: userId,
        message,
        status: 'pending'
      });

    if (error) {
      console.error('Error creating join request:', error);
      throw new AppError(500, 'Failed to create join request');
    }

    return res.json({ pending_approval: true });
  }

  const { error } = await supabase
    .from('league_memberships')
    .insert({
      league_id: id,
      player_id: userId
    });

  if (error) {
    console.error('Error joining league:', error);
    throw new AppError(500, 'Failed to join league');
  }

  res.json({ pending_approval: false });
}

export async function leaveLeague(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const userId = req.userId!;

  const { error } = await supabase
    .from('league_memberships')
    .delete()
    .eq('league_id', id)
    .eq('player_id', userId);

  if (error) {
    console.error('Error leaving league:', error);
    throw new AppError(500, 'Failed to leave league');
  }

  res.json({ success: true });
}

export async function getLeagueMembers(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const { data: members, error } = await supabase
    .from('league_memberships')
    .select('*, player:players(id, full_name, nickname, avatar_url, ranking_points, category)')
    .eq('league_id', id);

  if (error) {
    console.error('Error fetching members:', error);
    throw new AppError(500, 'Failed to fetch members');
  }

  res.json({ members, participants: members });
}

export async function getLeagueRanking(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const { data: ranking, error } = await supabase
    .from('league_rankings')
    .select('*, player:players(id, full_name, nickname, avatar_url)')
    .eq('league_id', id)
    .order('points', { ascending: false });

  if (error) {
    console.error('Error fetching ranking:', error);
    throw new AppError(500, 'Failed to fetch ranking');
  }

  res.json({ ranking });
}

export async function getJoinRequests(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { status } = req.query;
  const userId = req.userId!;

  const { data: profile } = await supabase
    .from('players')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  const { data: league } = await supabase
    .from('leagues')
    .select('created_by')
    .eq('id', id)
    .maybeSingle();

  if (!profile?.is_admin && league?.created_by !== userId) {
    throw new AppError(403, 'Forbidden');
  }

  let query = supabase
    .from('league_join_requests')
    .select('*, player:players(id, full_name, nickname, avatar_url, ranking_points, category)')
    .eq('league_id', id);

  if (status) query = query.eq('status', status);

  const { data: requests, error } = await query;

  if (error) {
    console.error('Error fetching requests:', error);
    throw new AppError(500, 'Failed to fetch requests');
  }

  res.json({ requests });
}

export async function approveJoinRequest(req: AuthRequest, res: Response) {
  const { id, requestId } = req.params;
  const userId = req.userId!;

  const { data: request } = await supabase
    .from('league_join_requests')
    .select('player_id')
    .eq('id', requestId)
    .maybeSingle();

  if (!request) {
    throw new AppError(404, 'Request not found');
  }

  const { error: updateError } = await supabase
    .from('league_join_requests')
    .update({
      status: 'approved',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (updateError) {
    console.error('Error approving request:', updateError);
    throw new AppError(500, 'Failed to approve request');
  }

  const { error: insertError } = await supabase
    .from('league_memberships')
    .insert({
      league_id: id,
      player_id: request.player_id
    });

  if (insertError) {
    console.error('Error adding member:', insertError);
    throw new AppError(500, 'Failed to add member');
  }

  res.json({ success: true });
}

export async function rejectJoinRequest(req: AuthRequest, res: Response) {
  const { requestId } = req.params;
  const userId = req.userId!;

  const { error } = await supabase
    .from('league_join_requests')
    .update({
      status: 'rejected',
      reviewed_by: userId,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error rejecting request:', error);
    throw new AppError(500, 'Failed to reject request');
  }

  res.json({ success: true });
}

export async function getWeeklyEvents(req: AuthRequest, res: Response) {
  const { id } = req.params;

  const { data: events, error } = await supabase
    .from('weekly_events')
    .select('*')
    .eq('league_id', id)
    .order('event_date', { ascending: false });

  if (error) {
    console.error('Error fetching events:', error);
    throw new AppError(500, 'Failed to fetch events');
  }

  res.json({ events });
}

export async function createWeeklyEvent(req: AuthRequest, res: Response) {
  const { id } = req.params;
  const { event_date, duo_sorting_config } = req.body;

  const { data: event, error } = await supabase
    .from('weekly_events')
    .insert({
      league_id: id,
      event_date,
      duo_sorting_config,
      status: 'scheduled'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating event:', error);
    throw new AppError(500, 'Failed to create event');
  }

  res.json({ event });
}
