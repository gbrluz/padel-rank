import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function getCategoryFromPoints(points: number): string {
  if (points < 200) return 'Iniciante';
  if (points < 400) return '7ª';
  if (points < 600) return '6ª';
  if (points < 800) return '5ª';
  if (points < 1000) return '4ª';
  if (points < 1200) return '3ª';
  if (points < 1400) return '2ª';
  return '1ª';
}

interface SetScore {
  teamA: number;
  teamB: number;
}

function calculateScoreMargin(sets: SetScore[], winnerTeam: 'team_a' | 'team_b'): number {
  let winnerGames = 0;
  let loserGames = 0;

  for (const set of sets) {
    if (winnerTeam === 'team_a') {
      winnerGames += set.teamA;
      loserGames += set.teamB;
    } else {
      winnerGames += set.teamB;
      loserGames += set.teamA;
    }
  }

  return winnerGames - loserGames;
}

function calculatePointsChange(
  winnerTeamPoints: number,
  loserTeamPoints: number,
  scoreMargin: number,
  isDuo: boolean
): { winnerPoints: number; loserPoints: number } {
  const BASE_POINTS = 25;

  const scoreMultiplier = 1 + (scoreMargin - 4) * 0.05;
  const clampedScoreMultiplier = Math.max(0.7, Math.min(1.5, scoreMultiplier));

  const rankingDiff = loserTeamPoints - winnerTeamPoints;
  const rankingMultiplier = 1 + (rankingDiff / 400) * 0.3;
  const clampedRankingMultiplier = Math.max(0.6, Math.min(1.6, rankingMultiplier));

  let winnerPoints = Math.round(BASE_POINTS * clampedScoreMultiplier * clampedRankingMultiplier);

  if (isDuo) {
    winnerPoints = Math.round(winnerPoints * 0.85);
  }

  winnerPoints = Math.max(10, Math.min(50, winnerPoints));

  const loserRankingMultiplier = 1 + (winnerTeamPoints - loserTeamPoints) / 400 * 0.3;
  const clampedLoserRankingMultiplier = Math.max(0.6, Math.min(1.6, loserRankingMultiplier));

  let loserPoints = Math.round(BASE_POINTS * 0.6 * clampedScoreMultiplier * clampedLoserRankingMultiplier);

  if (isDuo) {
    loserPoints = Math.round(loserPoints * 0.85);
  }

  loserPoints = Math.max(5, Math.min(35, loserPoints));

  return { winnerPoints, loserPoints: -loserPoints };
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

    const teamATotalPoints = teamAPlayer1.ranking_points + teamAPlayer2.ranking_points;
    const teamBTotalPoints = teamBPlayer1.ranking_points + teamBPlayer2.ranking_points;

    const isInterRegional =
      (teamAPlayer1.state !== teamBPlayer1.state || teamAPlayer1.city !== teamBPlayer1.city) ||
      (teamAPlayer1.state !== teamBPlayer2.state || teamAPlayer1.city !== teamBPlayer2.city);

    const scoreMargin = calculateScoreMargin(sets || [], winnerTeam);

    let teamAPointsChange: number;
    let teamBPointsChange: number;

    if (winnerTeam === 'team_a') {
      const { winnerPoints, loserPoints } = calculatePointsChange(
        teamATotalPoints,
        teamBTotalPoints,
        scoreMargin,
        match.team_a_was_duo
      );
      teamAPointsChange = winnerPoints;
      teamBPointsChange = loserPoints;
    } else {
      const { winnerPoints, loserPoints } = calculatePointsChange(
        teamBTotalPoints,
        teamATotalPoints,
        scoreMargin,
        match.team_b_was_duo
      );
      teamBPointsChange = winnerPoints;
      teamAPointsChange = loserPoints;
    }

    const teamAWon = winnerTeam === 'team_a';

    let shouldUpdateRegionalRanking = true;

    if (match.league_id) {
      const { data: league } = await supabase
        .from('leagues')
        .select('affects_regional_ranking')
        .eq('id', match.league_id)
        .single();

      if (league) {
        shouldUpdateRegionalRanking = league.affects_regional_ranking;

        await supabase.rpc('update_league_ranking', {
          p_league_id: match.league_id,
          p_player_id: match.team_a_player1_id,
          p_points_change: teamAPointsChange,
          p_won: teamAWon
        });

        await supabase.rpc('update_league_ranking', {
          p_league_id: match.league_id,
          p_player_id: match.team_a_player2_id,
          p_points_change: teamAPointsChange,
          p_won: teamAWon
        });

        await supabase.rpc('update_league_ranking', {
          p_league_id: match.league_id,
          p_player_id: match.team_b_player1_id,
          p_points_change: teamBPointsChange,
          p_won: !teamAWon
        });

        await supabase.rpc('update_league_ranking', {
          p_league_id: match.league_id,
          p_player_id: match.team_b_player2_id,
          p_points_change: teamBPointsChange,
          p_won: !teamAWon
        });
      }
    }

    const newTeamAPlayer1Points = shouldUpdateRegionalRanking
      ? Math.max(0, teamAPlayer1.ranking_points + teamAPointsChange)
      : teamAPlayer1.ranking_points;
    const newTeamAPlayer2Points = shouldUpdateRegionalRanking
      ? Math.max(0, teamAPlayer2.ranking_points + teamAPointsChange)
      : teamAPlayer2.ranking_points;
    const newTeamBPlayer1Points = shouldUpdateRegionalRanking
      ? Math.max(0, teamBPlayer1.ranking_points + teamBPointsChange)
      : teamBPlayer1.ranking_points;
    const newTeamBPlayer2Points = shouldUpdateRegionalRanking
      ? Math.max(0, teamBPlayer2.ranking_points + teamBPointsChange)
      : teamBPlayer2.ranking_points;

    if (shouldUpdateRegionalRanking) {
      await supabase
        .from('profiles')
        .update({
          ranking_points: newTeamAPlayer1Points,
          total_matches: teamAPlayer1.total_matches + 1,
          total_wins: teamAPlayer1.total_wins + (teamAWon ? 1 : 0),
          category: getCategoryFromPoints(newTeamAPlayer1Points)
        })
        .eq('id', match.team_a_player1_id);

      await supabase
        .from('profiles')
        .update({
          ranking_points: newTeamAPlayer2Points,
          total_matches: teamAPlayer2.total_matches + 1,
          total_wins: teamAPlayer2.total_wins + (teamAWon ? 1 : 0),
          category: getCategoryFromPoints(newTeamAPlayer2Points)
        })
        .eq('id', match.team_a_player2_id);

      await supabase
        .from('profiles')
        .update({
          ranking_points: newTeamBPlayer1Points,
          total_matches: teamBPlayer1.total_matches + 1,
          total_wins: teamBPlayer1.total_wins + (!teamAWon ? 1 : 0),
          category: getCategoryFromPoints(newTeamBPlayer1Points)
        })
        .eq('id', match.team_b_player1_id);

      await supabase
        .from('profiles')
        .update({
          ranking_points: newTeamBPlayer2Points,
          total_matches: teamBPlayer2.total_matches + 1,
          total_wins: teamBPlayer2.total_wins + (!teamAWon ? 1 : 0),
          category: getCategoryFromPoints(newTeamBPlayer2Points)
        })
        .eq('id', match.team_b_player2_id);
    }

    if (isInterRegional && shouldUpdateRegionalRanking) {
      const winnerState = teamAWon ? teamAPlayer1.state : teamBPlayer1.state;
      const winnerCity = teamAWon ? teamAPlayer1.city : teamBPlayer1.city;
      const loserState = teamAWon ? teamBPlayer1.state : teamAPlayer1.state;
      const loserCity = teamAWon ? teamBPlayer1.city : teamAPlayer1.city;

      await supabase.rpc('update_region_strength', {
        p_winner_state: winnerState,
        p_winner_city: winnerCity,
        p_loser_state: loserState,
        p_loser_city: loserCity
      });
    }

    if (shouldUpdateRegionalRanking) {
      await supabase
        .from('ranking_history')
        .insert([
          {
            player_id: match.team_a_player1_id,
            match_id: matchId,
            points_before: teamAPlayer1.ranking_points,
            points_after: newTeamAPlayer1Points,
            points_change: teamAPointsChange
          },
          {
            player_id: match.team_a_player2_id,
            match_id: matchId,
            points_before: teamAPlayer2.ranking_points,
            points_after: newTeamAPlayer2Points,
            points_change: teamAPointsChange
          },
          {
            player_id: match.team_b_player1_id,
            match_id: matchId,
            points_before: teamBPlayer1.ranking_points,
            points_after: newTeamBPlayer1Points,
            points_change: teamBPointsChange
          },
          {
            player_id: match.team_b_player2_id,
            match_id: matchId,
            points_before: teamBPlayer2.ranking_points,
            points_after: newTeamBPlayer2Points,
            points_change: teamBPointsChange
          }
        ]);
    }

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
        tiebreak_score: tiebreakScore,
        is_inter_regional: isInterRegional
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