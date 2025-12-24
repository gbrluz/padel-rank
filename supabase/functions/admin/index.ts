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
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.is_admin) {
      throw new Error('Admin access required');
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const method = req.method;

    // GET /admin/profiles - List all profiles with email
    if (method === 'GET' && pathParts.includes('profiles')) {
      const search = url.searchParams.get('search');
      
      const { data: profiles, error } = await supabase.rpc('get_profiles_with_email', {
        search_term: search || null
      });

      if (error) throw error;

      return new Response(
        JSON.stringify({ profiles }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /admin/stats - Get system stats
    if (method === 'GET' && pathParts.includes('stats')) {
      const { data: profiles } = await supabase
        .from('profiles')
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
            totalProfiles: profiles?.length || 0,
            totalMatches: matches?.length || 0,
            totalLeagues: leagues?.length || 0,
            activeQueueEntries: activeQueue?.length || 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /admin/profiles/:id - Update any profile
    if (method === 'PUT' && pathParts.includes('profiles')) {
      const profileId = pathParts[2];
      const updates = await req.json();
      
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profileId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ profile: updatedProfile }),
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