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

    // GET /queue - Get current queue status
    if (method === 'GET') {
      const { data: queueEntry, error } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('player_id', user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (error) throw error;

      return new Response(
        JSON.stringify({ queueEntry }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /queue - Join queue
    if (method === 'POST') {
      const { partnerId, gender, preferredSide } = await req.json();

      // Check if already in queue
      const { data: existing } = await supabase
        .from('queue_entries')
        .select('*')
        .or(`player_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq('status', 'active')
        .maybeSingle();

      if (existing) {
        throw new Error('Already in queue');
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('players')
        .select('*')
        .eq('id', user.id)
        .single();

      let averageRanking = profile.ranking_points;

      if (partnerId) {
        const { data: partner } = await supabase
          .from('players')
          .select('*')
          .eq('id', partnerId)
          .single();

        averageRanking = (profile.ranking_points + partner.ranking_points) / 2;
      }

      const { data: queueEntry, error } = await supabase
        .from('queue_entries')
        .insert({
          player_id: user.id,
          partner_id: partnerId || null,
          gender,
          status: 'active',
          average_ranking: averageRanking,
          preferred_side: preferredSide || null
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ queueEntry }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /queue - Leave queue
    if (method === 'DELETE') {
      const { error } = await supabase
        .from('queue_entries')
        .update({ status: 'cancelled' })
        .or(`player_id.eq.${user.id},partner_id.eq.${user.id}`)
        .eq('status', 'active');

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