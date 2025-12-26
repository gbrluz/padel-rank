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

    // Check if user is admin
    const { data: player } = await supabase
      .from('players')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!player?.is_admin) {
      throw new Error('Admin access required');
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    // GET /admin/players - List all players with email
    if (method === 'GET' && pathParts.includes('players')) {
      const search = url.searchParams.get('search');
      
      const { data: players, error } = await supabase.rpc('get_players_with_email', {
        search_term: search || null
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ players }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /admin/stats - Get system stats
    if (method === 'GET' && pathParts.includes('stats')) {
      const { data: players } = await supabase
        .from('players')
        .select('*', { count: 'exact' });

      const { data: matches } = await supabase
        .from('matches')
        .select('*', { count: 'exact' });

      const { data: leagues } = await supabase
        .from('leagues')
        .select('*', { count: 'exact' });

      const { data: activeQueue } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact' })
        .eq('status', 'active');

      return new Response(
        JSON.stringify({
          stats: {
            totalPlayers: players?.length || 0,
            totalMatches: matches?.length || 0,
            totalLeagues: leagues?.length || 0,
            activeQueueEntries: activeQueue?.length || 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /admin/players/:id - Update any player
    if (method === 'PUT' && pathParts.includes('players')) {
      const playerId = pathParts[2];
      const updates = await req.json();
      
      const { data: updatedPlayer, error } = await supabase
        .from('players')
        .update(updates)
        .eq('id', playerId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ player: updatedPlayer }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});