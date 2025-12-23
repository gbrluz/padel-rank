import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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
  const proposalDates: Date[] = [];

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

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { matchId, approved } = body;

    if (!matchId || typeof approved !== 'boolean') {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle();

    if (matchError) {
      return new Response(
        JSON.stringify({ error: 'Database error: ' + matchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!match) {
      return new Response(
        JSON.stringify({ error: 'Match not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const playerIds = [
      match.team_a_player1_id,
      match.team_a_player2_id,
      match.team_b_player1_id,
      match.team_b_player2_id
    ];

    if (!playerIds.includes(user.id)) {
      return new Response(
        JSON.stringify({ error: 'Not a participant in this match' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: approvalError } = await supabase
      .from('match_approvals')
      .update({
        approved: approved,
        approved_at: new Date().toISOString()
      })
      .eq('match_id', matchId)
      .eq('player_id', user.id);

    if (approvalError) {
      return new Response(
        JSON.stringify({ error: 'Failed to update approval: ' + approvalError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: approvals } = await supabase
      .from('match_approvals')
      .select('*')
      .eq('match_id', matchId);

    if (!approvals || approvals.length < 4) {
      return new Response(
        JSON.stringify({ 
          message: 'Approval recorded, waiting for other players',
          status: 'pending_approval'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allApproved = approvals.every(a => a.approved === true);
    const anyRejected = approvals.some(a => a.approved === false);

    if (anyRejected) {
      await supabase
        .from('matches')
        .update({ status: 'cancelled' })
        .eq('id', matchId);

      await supabase
        .from('queue_entries')
        .update({ status: 'cancelled' })
        .in('player_id', playerIds)
        .eq('status', 'matched');

      return new Response(
        JSON.stringify({ message: 'Match cancelled', status: 'cancelled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (allApproved) {
      const { data: captainId } = await supabase
        .rpc('get_least_captain_player', { player_ids: playerIds });

      if (!captainId) {
        return new Response(
          JSON.stringify({ error: 'Failed to assign captain' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      await supabase.rpc('increment_captain_count', { player_id: captainId });

      const timeProposals = generateTimeProposals(match.common_availability);

      const negotiationDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);

      await supabase
        .from('matches')
        .update({
          status: 'scheduling',
          captain_id: captainId,
          negotiation_deadline: negotiationDeadline.toISOString()
        })
        .eq('id', matchId);

      if (timeProposals.length > 0) {
        const proposals = timeProposals.map((time, index) => ({
          match_id: matchId,
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
        .in('player_id', playerIds)
        .eq('status', 'matched');

      return new Response(
        JSON.stringify({
          message: 'Match approved - scheduling phase started',
          status: 'scheduling',
          captainId,
          timeProposals
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        message: 'Approval recorded',
        status: 'pending_approval'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in match-approval:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: error.stack 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});