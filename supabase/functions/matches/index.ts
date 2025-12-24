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

    const url = new URL(req.url);
    const method = req.method;

    // GET /matches - List user's matches
    if (method === 'GET') {
      const status = url.searchParams.get('status');
      const leagueId = url.searchParams.get('league_id');
      
      let query = supabase
        .from('matches')
        .select('*')
        .or(`team_a_player1_id.eq.${user.id},team_a_player2_id.eq.${user.id},team_b_player1_id.eq.${user.id},team_b_player2_id.eq.${user.id}`);

      if (status) {
        query = query.eq('status', status);
      }

      if (leagueId) {
        query = query.eq('league_id', leagueId);
      }

      query = query.order('created_at', { ascending: false });

      const { data: matches, error } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({ matches }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /matches/:id/schedule - Schedule a match
    if (method === 'PUT' && url.pathname.includes('/schedule')) {
      const pathParts = url.pathname.split('/').filter(Boolean);
      const matchId = pathParts[1];
      
      const { scheduled_date, scheduled_time, location } = await req.json();

      const { data: match, error } = await supabase
        .from('matches')
        .update({
          scheduled_date,
          scheduled_time,
          location,
          status: 'scheduled',
          scheduling_status: 'scheduled'
        })
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ match }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /matches/:id/availability - Update player availability
    if (method === 'PUT' && url.pathname.includes('/availability')) {
      const pathParts = url.pathname.split('/').filter(Boolean);
      const matchId = pathParts[1];
      
      const { availability } = await req.json();

      // Get current match to update the correct field
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;

      // Determine which field to update based on user role
      let updateField = '';
      if (match.team_a_player1_id === user.id) updateField = 'team_a_player1_availability';
      else if (match.team_a_player2_id === user.id) updateField = 'team_a_player2_availability';
      else if (match.team_b_player1_id === user.id) updateField = 'team_b_player1_availability';
      else if (match.team_b_player2_id === user.id) updateField = 'team_b_player2_availability';
      else throw new Error('Not a participant in this match');

      const { data: updatedMatch, error } = await supabase
        .from('matches')
        .update({ [updateField]: availability })
        .eq('id', matchId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ match: updatedMatch }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});