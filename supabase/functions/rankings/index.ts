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

    if (method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /rankings/regional - Get regional ranking
    if (pathParts.includes('regional')) {
      const state = url.searchParams.get('state');
      const city = url.searchParams.get('city');
      const gender = url.searchParams.get('gender');
      const category = url.searchParams.get('category');
      
      let query = supabase
        .from('players')
        .select('*')
        .eq('is_provisional', false);

      if (state) {
        query = query.eq('state', state);
      }

      if (city) {
        query = query.eq('city', city);
      }

      if (gender) {
        query = query.eq('gender', gender);
      }

      if (category) {
        query = query.eq('category', category);
      }

      query = query.order('ranking_points', { ascending: false });

      const { data: ranking, error } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({ ranking }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /rankings/global - Get global ranking
    if (pathParts.includes('global')) {
      const gender = url.searchParams.get('gender');
      
      const { data: globalRanking, error } = await supabase.rpc('calculate_global_ranking', {
        p_gender: gender || null
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ ranking: globalRanking }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /rankings/history/:playerId - Get player ranking history
    if (pathParts.includes('history')) {
      const playerId = pathParts[2] || user.id;
      
      const { data: history, error } = await supabase
        .from('ranking_history')
        .select('*')
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ history }),
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