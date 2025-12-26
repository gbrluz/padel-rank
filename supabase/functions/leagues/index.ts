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
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    // GET /leagues - List all leagues
    if (method === 'GET' && pathParts.length === 1) {
      const status = url.searchParams.get('status');
      const gender = url.searchParams.get('gender');
      
      let query = supabase.from('leagues').select('*');

      if (status) {
        query = query.eq('status', status);
      }

      if (gender) {
        query = query.eq('gender', gender);
      }

      query = query.order('created_at', { ascending: false });

      const { data: leagues, error } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({ leagues }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /leagues/:id - Get league details
    if (method === 'GET' && pathParts.length === 2) {
      const leagueId = pathParts[1];
      
      const { data: league, error } = await supabase
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({ league }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /leagues/:id/participants - Get league participants
    if (method === 'GET' && pathParts.includes('participants')) {
      const leagueId = pathParts[1];
      
      const { data: participants, error } = await supabase
        .from('league_participants')
        .select('*')
        .eq('league_id', leagueId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ participants }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /leagues/:id/ranking - Get league ranking
    if (method === 'GET' && pathParts.includes('ranking')) {
      const leagueId = pathParts[1];
      
      const { data: ranking, error } = await supabase
        .from('league_rankings')
        .select('*')
        .eq('league_id', leagueId)
        .order('points', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ ranking }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /leagues - Create new league (admin only)
    if (method === 'POST') {
      const { data: profile } = await supabase
        .from('players')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        throw new Error('Only admins can create leagues');
      }

      const leagueData = await req.json();
      
      const { data: league, error } = await supabase
        .from('leagues')
        .insert({ ...leagueData, created_by: user.id })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ league }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /leagues/:id - Update league (admin only)
    if (method === 'PUT' && !pathParts.includes('join')) {
      const leagueId = pathParts[1];
      
      const { data: profile } = await supabase
        .from('players')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        throw new Error('Only admins can update leagues');
      }

      const updates = await req.json();
      
      const { data: league, error } = await supabase
        .from('leagues')
        .update(updates)
        .eq('id', leagueId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ league }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /leagues/:id/join - Join a league
    if (method === 'POST' && pathParts.includes('join')) {
      const leagueId = pathParts[1];
      
      // Check if user can join leagues
      const { data: profile } = await supabase
        .from('players')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile?.can_join_leagues) {
        throw new Error('You must complete 5 provisional matches before joining leagues');
      }

      // Check if already a participant
      const { data: existing } = await supabase
        .from('league_participants')
        .select('*')
        .eq('league_id', leagueId)
        .eq('player_id', user.id)
        .maybeSingle();

      if (existing) {
        throw new Error('Already a participant in this league');
      }

      const { data: participant, error } = await supabase
        .from('league_participants')
        .insert({ league_id: leagueId, player_id: user.id })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ participant }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /leagues/:id/leave - Leave a league
    if (method === 'DELETE' && pathParts.includes('leave')) {
      const leagueId = pathParts[1];
      
      const { error } = await supabase
        .from('league_participants')
        .delete()
        .eq('league_id', leagueId)
        .eq('player_id', user.id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
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