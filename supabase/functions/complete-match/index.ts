import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function calculatePointsChange(
  winnerAvgRanking: number,
  loserAvgRanking: number,
  isDuo: boolean
): number {
  const rankingDiff = loserAvgRanking - winnerAvgRanking;
  const basePoints = 50;
  const diffMultiplier = 0.1;
  
  let points = basePoints + (rankingDiff * diffMultiplier);
  
  points = Math.max(10, Math.min(100, points));
  
  if (isDuo) {
    points = points * 0.8;
  }
  
  return Math.round(points);
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const {
      matchId,
      teamAScore,
      teamBScore,
      winnerTeam,
      location,
      matchDate,
      matchTime,
      sets,
      hasTiebreak,
      tiebreakScore
    } = await req.json();

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      throw new Error('Match not found');
    }

    const playerIds = [
      match.team_a_player1_id,
      match.team_a_player2_id,
      match.team_b_player1_id,
      match.team_b_player2_id
    ];

    if (!playerIds.includes(user.id)) {
      throw new Error('Not a participant in this match');
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', playerIds);

    if (!profiles || profiles.length !== 4) {
      throw new Error('Could not load all player profiles');
    }

    const teamAPlayer1 = profiles.find(p => p.id === match.team_a_player1_id)!;
    const teamAPlayer2 = profiles.find(p => p.id === match.team_a_player2_id)!;
    const teamBPlayer1 = profiles.find(p => p.id === match.team_b_player1_id)!;
    const teamBPlayer2 = profiles.find(p => p.id === match.team_b_player2_id)!;

    const teamAAvgRanking = (teamAPlayer1.ranking_points + teamAPlayer2.ranking_points) / 2;
    const teamBAvgRanking = (teamBPlayer1.ranking_points + teamBPlayer2.ranking_points) / 2;

    let teamAPointsChange, teamBPointsChange;

    if (winnerTeam === 'team_a') {
      teamAPointsChange = calculatePointsChange(teamAAvgRanking, teamBAvgRanking, match.team_a_was_duo);
      teamBPointsChange = -Math.round(teamAPointsChange * 0.5);
    } else {
      teamBPointsChange = calculatePointsChange(teamBAvgRanking, teamAAvgRanking, match.team_b_was_duo);
      teamAPointsChange = -Math.round(teamBPointsChange * 0.5);
    }

    const teamAWon = winnerTeam === 'team_a';

    await supabase
      .from('profiles')
      .update({
        ranking_points: teamAPlayer1.ranking_points + teamAPointsChange,
        total_matches: teamAPlayer1.total_matches + 1,
        total_wins: teamAPlayer1.total_wins + (teamAWon ? 1 : 0)
      })
      .eq('id', match.team_a_player1_id);

    await supabase
      .from('profiles')
      .update({
        ranking_points: teamAPlayer2.ranking_points + teamAPointsChange,
        total_matches: teamAPlayer2.total_matches + 1,
        total_wins: teamAPlayer2.total_wins + (teamAWon ? 1 : 0)
      })
      .eq('id', match.team_a_player2_id);

    await supabase
      .from('profiles')
      .update({
        ranking_points: teamBPlayer1.ranking_points + teamBPointsChange,
        total_matches: teamBPlayer1.total_matches + 1,
        total_wins: teamBPlayer1.total_wins + (!teamAWon ? 1 : 0)
      })
      .eq('id', match.team_b_player1_id);

    await supabase
      .from('profiles')
      .update({
        ranking_points: teamBPlayer2.ranking_points + teamBPointsChange,
        total_matches: teamBPlayer2.total_matches + 1,
        total_wins: teamBPlayer2.total_wins + (!teamAWon ? 1 : 0)
      })
      .eq('id', match.team_b_player2_id);

    await supabase
      .from('ranking_history')
      .insert([
        {
          player_id: match.team_a_player1_id,
          match_id: matchId,
          points_before: teamAPlayer1.ranking_points,
          points_after: teamAPlayer1.ranking_points + teamAPointsChange,
          points_change: teamAPointsChange
        },
        {
          player_id: match.team_a_player2_id,
          match_id: matchId,
          points_before: teamAPlayer2.ranking_points,
          points_after: teamAPlayer2.ranking_points + teamAPointsChange,
          points_change: teamAPointsChange
        },
        {
          player_id: match.team_b_player1_id,
          match_id: matchId,
          points_before: teamBPlayer1.ranking_points,
          points_after: teamBPlayer1.ranking_points + teamBPointsChange,
          points_change: teamBPointsChange
        },
        {
          player_id: match.team_b_player2_id,
          match_id: matchId,
          points_before: teamBPlayer2.ranking_points,
          points_after: teamBPlayer2.ranking_points + teamBPointsChange,
          points_change: teamBPointsChange
        }
      ]);

    await supabase
      .from('matches')
      .update({
        status: 'completed',
        team_a_score: teamAScore,
        team_b_score: teamBScore,
        winner_team: winnerTeam,
        completed_at: new Date().toISOString(),
        location: location,
        match_date: matchDate,
        match_time: matchTime,
        sets: sets,
        has_tiebreak: hasTiebreak,
        tiebreak_score: tiebreakScore
      })
      .eq('id', matchId);

    return new Response(
      JSON.stringify({ 
        message: 'Match completed successfully',
        pointsChanges: {
          teamA: teamAPointsChange,
          teamB: teamBPointsChange
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});