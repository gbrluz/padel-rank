import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    for (const gender of ['male', 'female']) {
      const genderQueue = activeQueue.filter(q => q.gender === gender);
      
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
          const match = {
            gender,
            team_a: duo1,
            team_b: duo2,
            team_a_was_duo: true,
            team_b_was_duo: true
          };
          matchesFound.push(match);
        }
      }

      while (solos.length >= 4) {
        const sorted = solos.sort((a, b) => a.average_ranking - b.average_ranking);
        
        const players = sorted.slice(0, 4);
        const avgRanking = players.reduce((sum, p) => sum + p.average_ranking, 0) / 4;
        const maxDiff = Math.max(...players.map(p => Math.abs(p.average_ranking - avgRanking)));

        if (maxDiff <= 200) {
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
          } else {
            team1 = [players[0], players[1]];
            team2 = [players[2], players[3]];
          }

          const match = {
            gender,
            team_a: team1,
            team_b: team2,
            team_a_was_duo: false,
            team_b_was_duo: false
          };
          matchesFound.push(match);

          players.forEach(p => {
            const index = solos.findIndex(s => s.player_id === p.player_id);
            if (index !== -1) solos.splice(index, 1);
          });
        } else {
          break;
        }
      }

      if (duos.length >= 1 && solos.length >= 2) {
        const duo = duos.shift()!;
        const sorted = solos.sort((a, b) => a.average_ranking - b.average_ranking);
        const dualAvg = duo[0].average_ranking;

        for (let i = 0; i < sorted.length - 1; i++) {
          const player1 = sorted[i];
          const player2 = sorted[i + 1];
          const soloAvg = (player1.average_ranking + player2.average_ranking) / 2;

          if (Math.abs(dualAvg - soloAvg) <= 200) {
            const match = {
              gender,
              team_a: duo,
              team_b: [player1, player2],
              team_a_was_duo: true,
              team_b_was_duo: false
            };
            matchesFound.push(match);

            solos.splice(i, 2);
            break;
          }
        }
      }
    }

    for (const match of matchesFound) {
      const { data: newMatch, error: insertError } = await supabase
        .from('matches')
        .insert([{
          gender: match.gender,
          status: 'pending_approval',
          team_a_player1_id: match.team_a[0].player_id,
          team_a_player2_id: match.team_a[1].player_id,
          team_b_player1_id: match.team_b[0].player_id,
          team_b_player2_id: match.team_b[1].player_id,
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
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Found ${matchesFound.length} matches`,
        found: matchesFound.length
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