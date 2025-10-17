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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { matchId, approved } = await req.json();

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

    const { error: approvalError } = await supabase
      .from('match_approvals')
      .upsert({
        match_id: matchId,
        player_id: user.id,
        approved: approved,
        approved_at: new Date().toISOString()
      });

    if (approvalError) throw approvalError;

    const { data: approvals } = await supabase
      .from('match_approvals')
      .select('*')
      .eq('match_id', matchId);

    if (!approvals || approvals.length < 4) {
      return new Response(
        JSON.stringify({ message: 'Approval recorded, waiting for other players' }),
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
        .in('player_id', playerIds);

      return new Response(
        JSON.stringify({ message: 'Match cancelled', status: 'cancelled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (allApproved) {
      await supabase
        .from('matches')
        .update({ 
          status: 'scheduled',
          scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
        .eq('id', matchId);

      await supabase
        .from('queue_entries')
        .update({ status: 'matched' })
        .in('player_id', playerIds);

      return new Response(
        JSON.stringify({ message: 'Match scheduled', status: 'scheduled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ message: 'Approval recorded' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});