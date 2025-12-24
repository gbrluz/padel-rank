import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const MAX_POINT_DIFFERENCE = 350;
const MAX_TEAM_BALANCE_DIFF = 200;

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

function generateTimeProposals(commonAvailability: any): string[] {
  if (!commonAvailability || Object.keys(commonAvailability).length === 0) {
    const now = new Date();
    return [
      new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString()
    ];
  }

  const proposals: string[] = [];
  const dayMapping: Record<string, number> = {
    'domingo': 0,
    'segunda': 1,
    'terça': 2,
    'quarta': 3,
    'quinta': 4,
    'sexta': 5,
    'sábado': 6
  };

  const periodToHour: Record<string, number> = {
    'morning': 9,
    'afternoon': 14,
    'evening': 19
  };

  const availableDays = Object.keys(commonAvailability);
  const now = new Date();

  for (let daysAhead = 2; daysAhead <= 14 && proposals.length < 3; daysAhead++) {
    const targetDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const targetDayOfWeek = targetDate.getDay();

    for (const [dayName, dayNumber] of Object.entries(dayMapping)) {
      if (dayNumber === targetDayOfWeek && availableDays.includes(dayName)) {
        const periods = commonAvailability[dayName];
        if (periods && periods.length > 0) {
          const period = periods[0];
          const hour = periodToHour[period] || 19;

          const proposalDate = new Date(targetDate);
          proposalDate.setHours(hour, 0, 0, 0);

          if (proposalDate > now) {
            proposals.push(proposalDate.toISOString());
            if (proposals.length >= 3) break;
          }
        }
      }
    }
  }

  while (proposals.length < 3) {
    const daysAhead = 2 + proposals.length;
    const date = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    date.setHours(19, 0, 0, 0);
    proposals.push(date.toISOString());
  }

  return proposals;
}

async function checkMatchValidity(
  supabase: any,
  playerIds: string[],
  gender: string
): Promise<{ valid: boolean; reason?: string }> {
  const sortedIds = [...playerIds].sort();

  const { data: repetitionCheck, error: repError } = await supabase
    .rpc('check_match_repetition', {
      p_player_ids: sortedIds,
      p_gender: gender
    });

  if (repError) {
    console.error('Error checking repetition:', repError);
    return { valid: false, reason: 'Error checking repetition' };
  }

  if (!repetitionCheck) {
    return { valid: false, reason: 'Recent repetition found' };
  }

  const { data: consecutiveCheck, error: consError } = await supabase
    .rpc('check_consecutive_match', {
      p_player_ids: sortedIds,
      p_gender: gender
    });

  if (consError) {
    console.error('Error checking consecutive:', consError);
    return { valid: false, reason: 'Error checking consecutive' };
  }

  if (!consecutiveCheck) {
    return { valid: false, reason: 'Consecutive match detected' };
  }

  return { valid: true };
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
        JSON.stringify({ message: 'Not enough players in queue (need 4+)', found: 0 }),
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
      if (regionQueue.length < 4) continue;

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

        const allPlayers = [...duo1, ...duo2];
        const allRankings = allPlayers.map(p => p.ranking_points);
        const minRanking = Math.min(...allRankings);
        const maxRanking = Math.max(...allRankings);
        const rankingSpread = maxRanking - minRanking;

        if (rankingSpread > MAX_POINT_DIFFERENCE) {
          duos.unshift(duo2);
          duos.unshift(duo1);
          break;
        }

        const avgRanking1 = duo1[0].average_ranking;
        const avgRanking2 = duo2[0].average_ranking;
        const rankingDiff = Math.abs(avgRanking1 - avgRanking2);

        if (rankingDiff <= MAX_TEAM_BALANCE_DIFF) {
          const playerIds = allPlayers.map(p => p.player_id);
          const validityCheck = await checkMatchValidity(supabase, playerIds, gender);

          if (validityCheck.valid) {
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
            console.log(`Skipping duo vs duo match: ${validityCheck.reason}`);
            duos.unshift(duo2);
            duos.unshift(duo1);
            break;
          }
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

        if (rankingSpread > MAX_POINT_DIFFERENCE) {
          break;
        }

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

        if (Math.abs(team1Avg - team2Avg) <= MAX_TEAM_BALANCE_DIFF) {
          const playerIds = [...team1, ...team2].map(p => p.player_id);
          const validityCheck = await checkMatchValidity(supabase, playerIds, gender);

          if (validityCheck.valid) {
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
            console.log(`Skipping solo match: ${validityCheck.reason}`);
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

          const allPlayers = [...duo, player1, player2];
          const allRankings = allPlayers.map(p => p.ranking_points);
          const minRanking = Math.min(...allRankings);
          const maxRanking = Math.max(...allRankings);
          const rankingSpread = maxRanking - minRanking;

          if (rankingSpread > MAX_POINT_DIFFERENCE) {
            continue;
          }

          const soloAvg = (player1.average_ranking + player2.average_ranking) / 2;
          const diff = Math.abs(dualAvg - soloAvg);

          if (diff < bestDiff && diff <= MAX_TEAM_BALANCE_DIFF) {
            bestDiff = diff;
            bestMatch = [player1, player2];
            bestIndex = i;
          }
        }

        if (bestMatch) {
          const playerIds = [...duo, ...bestMatch].map(p => p.player_id);
          const validityCheck = await checkMatchValidity(supabase, playerIds, gender);

          if (validityCheck.valid) {
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
          } else {
            console.log(`Skipping mixed match: ${validityCheck.reason}`);
          }
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
      const timeProposals = generateTimeProposals(commonAvailability);

      const playerAvailabilities: Record<string, any> = {};
      if (matchPlayerProfiles) {
        for (const profile of matchPlayerProfiles) {
          playerAvailabilities[profile.id] = profile.availability || {};
        }
      }

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
          common_availability: commonAvailability,
          player_availabilities: playerAvailabilities,
          negotiation_deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
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

        if (timeProposals.length > 0) {
          const proposals = timeProposals.map((time, index) => ({
            match_id: newMatch.id,
            proposed_time: time,
            proposal_order: index + 1
          }));

          await supabase
            .from('match_time_proposals')
            .insert(proposals);
        }

        await supabase
          .from('queue_entries')
          .update({ status: 'matched' })
          .in('player_id', allPlayers)
          .eq('status', 'active');

        await supabase.rpc('add_match_to_history', {
          p_match_id: newMatch.id,
          p_player_ids: allPlayers,
          p_gender: match.gender
        });
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