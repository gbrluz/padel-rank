import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

function assignSides(player1: any, player2: any): { player1Side: string, player2Side: string } {
  const p1Pref = player1.preferred_side;
  const p2Pref = player2.preferred_side;

  if (p1Pref === 'left' && p2Pref === 'right') {
    return { player1Side: 'left', player2Side: 'right' };
  }
  if (p1Pref === 'right' && p2Pref === 'left') {
    return { player1Side: 'right', player2Side: 'left' };
  }
  if (p1Pref === 'left' && (p2Pref === 'left' || p2Pref === 'both')) {
    return { player1Side: 'left', player2Side: 'right' };
  }
  if (p1Pref === 'right' && (p2Pref === 'right' || p2Pref === 'both')) {
    return { player1Side: 'right', player2Side: 'left' };
  }
  if (p1Pref === 'both' && p2Pref === 'left') {
    return { player1Side: 'right', player2Side: 'left' };
  }
  if (p1Pref === 'both' && p2Pref === 'right') {
    return { player1Side: 'left', player2Side: 'right' };
  }
  return { player1Side: 'left', player2Side: 'right' };
}

function calculateCommonAvailability(players: any[]): Record<string, string[]> {
  if (players.length === 0) return {};

  const commonAvailability: Record<string, string[]> = {};
  const days = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];
  const periods = ['morning', 'afternoon', 'evening'];

  for (const day of days) {
    const commonPeriods: string[] = [];

    for (const period of periods) {
      const allHavePeriod = players.every(player => {
        const availability = player.availability || {};
        const dayAvailability = availability[day] || [];
        return dayAvailability.includes(period);
      });

      if (allHavePeriod) {
        commonPeriods.push(period);
      }
    }

    if (commonPeriods.length > 0) {
      commonAvailability[day] = commonPeriods;
    }
  }

  return commonAvailability;
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

    const { data: activeQueue, error: queueError } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('status', 'active')
      .order('created_at');

    if (queueError || !activeQueue || activeQueue.length < 2) {
      return new Response(
        JSON.stringify({ message: 'Not enough players in queue', found: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allPlayerIds = new Set<string>();
    activeQueue.forEach(entry => {
      allPlayerIds.add(entry.player_id);
      if (entry.partner_id) {
        allPlayerIds.add(entry.partner_id);
      }
    });

    const { data: playerProfiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', Array.from(allPlayerIds));

    if (!playerProfiles) {
      return new Response(
        JSON.stringify({ message: 'Could not fetch player profiles', found: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profileMap = new Map(playerProfiles.map(p => [p.id, p]));

    const matchesFound = [];
    const processedPlayers = new Set();

    const regionMap = new Map<string, any[]>();
    for (const entry of activeQueue) {
      const profile = profileMap.get(entry.player_id);
      if (profile && !processedPlayers.has(entry.player_id)) {
        const regionKey = `${profile.state}-${profile.city}-${entry.gender}`;
        if (!regionMap.has(regionKey)) {
          regionMap.set(regionKey, []);
        }
        regionMap.get(regionKey)!.push({ ...entry, ...profile });
      }
    }

    for (const [regionKey, regionQueue] of regionMap) {
      if (regionQueue.length < 2) continue;

      const gender = regionKey.split('-')[2];

      const duos: any[] = [];
      const solos: any[] = [];

      for (const player of regionQueue) {
        if (player.partner_id && !processedPlayers.has(player.player_id)) {
          const partnerPlayer = regionQueue.find(p =>
            p.player_id === player.partner_id && p.partner_id === player.player_id
          );

          if (partnerPlayer && !processedPlayers.has(partnerPlayer.player_id)) {
            duos.push([player, partnerPlayer]);
            processedPlayers.add(player.player_id);
            processedPlayers.add(partnerPlayer.player_id);
          }
        } else if (!player.partner_id && !processedPlayers.has(player.player_id)) {
          solos.push(player);
        }
      }

      while (duos.length >= 2) {
        const duo1 = duos.shift()!;
        const duo2 = duos.shift()!;

        const avgRanking1 = duo1[0].average_ranking;
        const avgRanking2 = duo2[0].average_ranking;
        const rankingDiff = Math.abs(avgRanking1 - avgRanking2);

        if (rankingDiff <= 300) {
          matchesFound.push({
            gender,
            team_a: duo1,
            team_b: duo2,
            team_a_was_duo: true,
            team_b_was_duo: true
          });

          duo1.forEach((p: any) => processedPlayers.add(p.player_id));
          duo2.forEach((p: any) => processedPlayers.add(p.player_id));
        } else {
          duos.unshift(duo2);
          duos.unshift(duo1);
          break;
        }
      }

      while (solos.length >= 4) {
        solos.sort((a, b) => a.average_ranking - b.average_ranking);

        const players = solos.slice(0, 4);
        const rankings = players.map(p => p.average_ranking);
        const minRanking = Math.min(...rankings);
        const maxRanking = Math.max(...rankings);
        const rankingSpread = maxRanking - minRanking;

        if (rankingSpread <= 300) {
          const leftOnlyPlayers = players.filter(p => p.preferred_side === 'left');
          const rightOnlyPlayers = players.filter(p => p.preferred_side === 'right');
          const bothPlayers = players.filter(p => p.preferred_side === 'both');

          let team1, team2;

          if (leftOnlyPlayers.length >= 2 && rightOnlyPlayers.length >= 2) {
            team1 = [leftOnlyPlayers[0], rightOnlyPlayers[0]];
            team2 = [leftOnlyPlayers[1], rightOnlyPlayers[1]];
          } else if (leftOnlyPlayers.length >= 1 && rightOnlyPlayers.length >= 1 && bothPlayers.length >= 2) {
            team1 = [leftOnlyPlayers[0], rightOnlyPlayers[0]];
            team2 = [bothPlayers[0], bothPlayers[1]];
          } else if (leftOnlyPlayers.length >= 1 && bothPlayers.length >= 3) {
            team1 = [leftOnlyPlayers[0], bothPlayers[0]];
            team2 = [bothPlayers[1], bothPlayers[2]];
          } else if (rightOnlyPlayers.length >= 1 && bothPlayers.length >= 3) {
            team1 = [rightOnlyPlayers[0], bothPlayers[0]];
            team2 = [bothPlayers[1], bothPlayers[2]];
          } else {
            team1 = [players[0], players[1]];
            team2 = [players[2], players[3]];
          }

          const team1Avg = (team1[0].average_ranking + team1[1].average_ranking) / 2;
          const team2Avg = (team2[0].average_ranking + team2[1].average_ranking) / 2;

          if (Math.abs(team1Avg - team2Avg) <= 200) {
            matchesFound.push({
              gender,
              team_a: team1,
              team_b: team2,
              team_a_was_duo: false,
              team_b_was_duo: false
            });

            players.forEach(p => {
              processedPlayers.add(p.player_id);
              const index = solos.findIndex(s => s.player_id === p.player_id);
              if (index !== -1) solos.splice(index, 1);
            });
          } else {
            break;
          }
        } else {
          break;
        }
      }

      if (duos.length >= 1 && solos.length >= 2) {
        const duo = duos.shift()!;
        solos.sort((a, b) => a.average_ranking - b.average_ranking);
        const dualAvg = duo[0].average_ranking;

        let bestMatch = null;
        let bestDiff = Infinity;
        let bestIndex = -1;

        for (let i = 0; i < solos.length - 1; i++) {
          const player1 = solos[i];
          const player2 = solos[i + 1];
          const soloAvg = (player1.average_ranking + player2.average_ranking) / 2;
          const diff = Math.abs(dualAvg - soloAvg);

          if (diff < bestDiff && diff <= 250) {
            bestDiff = diff;
            bestMatch = [player1, player2];
            bestIndex = i;
          }
        }

        if (bestMatch) {
          matchesFound.push({
            gender,
            team_a: duo,
            team_b: bestMatch,
            team_a_was_duo: true,
            team_b_was_duo: false
          });

          duo.forEach((p: any) => processedPlayers.add(p.player_id));
          bestMatch.forEach((p: any) => processedPlayers.add(p.player_id));
          solos.splice(bestIndex, 2);
        }
      }
    }

    for (const match of matchesFound) {
      const teamASides = assignSides(match.team_a[0], match.team_a[1]);
      const teamBSides = assignSides(match.team_b[0], match.team_b[1]);

      const allPlayerIds = [
        match.team_a[0].player_id,
        match.team_a[1].player_id,
        match.team_b[0].player_id,
        match.team_b[1].player_id
      ];

      const { data: matchPlayerProfiles } = await supabase
        .from('profiles')
        .select('id, availability')
        .in('id', allPlayerIds);

      const commonAvailability = calculateCommonAvailability(matchPlayerProfiles || []);

      const { data: newMatch, error: insertError } = await supabase
        .from('matches')
        .insert([{
          gender: match.gender,
          status: 'pending_approval',
          team_a_player1_id: match.team_a[0].player_id,
          team_a_player2_id: match.team_a[1].player_id,
          team_b_player1_id: match.team_b[0].player_id,
          team_b_player2_id: match.team_b[1].player_id,
          team_a_player1_side: teamASides.player1Side,
          team_a_player2_side: teamASides.player2Side,
          team_b_player1_side: teamBSides.player1Side,
          team_b_player2_side: teamBSides.player2Side,
          team_a_was_duo: match.team_a_was_duo,
          team_b_was_duo: match.team_b_was_duo,
          common_availability: commonAvailability
        }])
        .select()
        .single();

      if (!insertError && newMatch) {
        const allPlayers = [
          match.team_a[0].player_id,
          match.team_a[1].player_id,
          match.team_b[0].player_id,
          match.team_b[1].player_id
        ];

        await supabase
          .from('match_approvals')
          .insert(
            allPlayers.map(playerId => ({
              match_id: newMatch.id,
              player_id: playerId,
              approved: null
            }))
          );

        await supabase
          .from('queue_entries')
          .update({ status: 'matched' })
          .in('player_id', allPlayers)
          .eq('status', 'active');
      }
    }

    return new Response(
      JSON.stringify({
        message: `Found ${matchesFound.length} matches`,
        found: matchesFound.length,
        details: matchesFound.map(m => ({
          gender: m.gender,
          team_a: [m.team_a[0].player_id, m.team_a[1].player_id],
          team_b: [m.team_b[0].player_id, m.team_b[1].player_id]
        }))
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message, stack: error.stack }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});