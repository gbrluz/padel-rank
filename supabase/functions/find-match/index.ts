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

    if (queueError || !activeQueue || activeQueue.length < 4) {
      return new Response(
        JSON.stringify({ message: 'Not enough players in queue', found: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const matchesFound = [];
    const processedPlayers = new Set();

    for (const gender of ['male', 'female']) {
      const genderQueue = activeQueue.filter(q => 
        q.gender === gender && !processedPlayers.has(q.player_id)
      );
      
      if (genderQueue.length < 4) continue;

      const duos: any[] = [];
      const solos: any[] = [];

      genderQueue.forEach(entry => {
        if (entry.partner_id) {
          const partnerEntry = genderQueue.find(e => 
            e.player_id === entry.partner_id && e.partner_id === entry.player_id
          );
          if (partnerEntry && !duos.some(d => 
            d.some((e: any) => e.player_id === entry.player_id || e.player_id === partnerEntry.player_id)
          )) {
            duos.push([entry, partnerEntry]);
          }
        } else {
          solos.push(entry);
        }
      });

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
          const leftPlayers = players.filter(p => 
            p.preferred_side === 'left' || p.preferred_side === 'both'
          );
          const rightPlayers = players.filter(p => 
            p.preferred_side === 'right' || p.preferred_side === 'both'
          );

          let team1, team2;
          
          if (leftPlayers.length >= 2 && rightPlayers.length >= 2) {
            team1 = [leftPlayers[0], rightPlayers[0]];
            team2 = [leftPlayers[1], rightPlayers[1]];
          } else if (leftPlayers.length >= 1 && rightPlayers.length >= 1) {
            const bothPlayers = players.filter(p => p.preferred_side === 'both');
            if (bothPlayers.length >= 2) {
              team1 = [leftPlayers[0] || bothPlayers[0], rightPlayers[0] || bothPlayers[1]];
              const remaining = players.filter(p => 
                p.player_id !== team1[0].player_id && p.player_id !== team1[1].player_id
              );
              team2 = remaining.slice(0, 2);
            } else {
              team1 = [players[0], players[1]];
              team2 = [players[2], players[3]];
            }
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
          team_b_was_duo: match.team_b_was_duo
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