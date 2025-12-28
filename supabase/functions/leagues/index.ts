import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Unauthorized", 401);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("Unauthorized", 401);
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const method = req.method;

    if (method === "GET" && pathParts.length === 1) {
      const status = url.searchParams.get("status");
      const gender = url.searchParams.get("gender");
      const myLeagues = url.searchParams.get("my_leagues");

      let query = supabase.from("leagues").select("*");

      if (status) query = query.eq("status", status);
      if (gender) query = query.eq("gender", gender);

      if (myLeagues === "true") {
        const { data: memberships } = await supabase
          .from("league_memberships")
          .select("league_id")
          .eq("player_id", user.id);
        const leagueIds = memberships?.map((m: any) => m.league_id) || [];
        if (leagueIds.length > 0) {
          query = query.in("id", leagueIds);
        } else {
          return jsonResponse({ leagues: [] });
        }
      }

      query = query.order("created_at", { ascending: false });
      const { data: leagues, error } = await query;

      if (error) throw error;
      return jsonResponse({ leagues });
    }

    if (method === "GET" && pathParts.length === 2 &&
        !pathParts.includes("ranking") && !pathParts.includes("members") &&
        !pathParts.includes("requests") && !pathParts.includes("events") &&
        !pathParts.includes("participants")) {
      const leagueId = pathParts[1];

      const { data: league, error } = await supabase
        .from("leagues")
        .select("*")
        .eq("id", leagueId)
        .maybeSingle();

      if (error) throw error;
      return jsonResponse({ league });
    }

    if (method === "GET" && (pathParts.includes("members") || pathParts.includes("participants"))) {
      const leagueId = pathParts[1];

      const { data: members, error } = await supabase
        .from("league_memberships")
        .select(`
          *,
          player:players(id, full_name, nickname, avatar_url, ranking_points, category)
        `)
        .eq("league_id", leagueId);

      if (error) throw error;
      return jsonResponse({ members, participants: members });
    }

    if (method === "GET" && pathParts.includes("ranking")) {
      const leagueId = pathParts[1];

      const { data: ranking, error } = await supabase
        .from("league_rankings")
        .select(`
          *,
          player:players(id, full_name, nickname, avatar_url)
        `)
        .eq("league_id", leagueId)
        .order("points", { ascending: false });

      if (error) throw error;
      return jsonResponse({ ranking });
    }

    if (method === "GET" && pathParts.includes("requests")) {
      const leagueId = pathParts[1];

      const { data: profile } = await supabase
        .from("players")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      const { data: league } = await supabase
        .from("leagues")
        .select("created_by")
        .eq("id", leagueId)
        .maybeSingle();

      if (!profile?.is_admin && league?.created_by !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      const status = url.searchParams.get("status") || "pending";

      const { data: requests, error } = await supabase
        .from("league_join_requests")
        .select(`
          *,
          player:players(id, full_name, nickname, avatar_url, ranking_points, category)
        `)
        .eq("league_id", leagueId)
        .eq("status", status)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return jsonResponse({ requests });
    }

    if (method === "GET" && pathParts.includes("events")) {
      const leagueId = pathParts[1];

      const { data: events, error } = await supabase
        .from("weekly_events")
        .select("*")
        .eq("league_id", leagueId)
        .order("event_date", { ascending: false });

      if (error) throw error;
      return jsonResponse({ events });
    }

    if (method === "POST" && pathParts.length === 1) {
      const { data: profile } = await supabase
        .from("players")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.is_admin) {
        return errorResponse("Apenas administradores podem criar ligas", 403);
      }

      const leagueData = await req.json();

      const { data: league, error } = await supabase
        .from("leagues")
        .insert({ ...leagueData, created_by: user.id })
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ league });
    }

    if (method === "POST" && pathParts.includes("join")) {
      const leagueId = pathParts[1];

      const { data: league } = await supabase
        .from("leagues")
        .select("type, requires_approval")
        .eq("id", leagueId)
        .maybeSingle();

      if (!league) {
        return errorResponse("Liga nao encontrada", 404);
      }

      const { data: profile } = await supabase
        .from("players")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (league.type === "official" && !profile?.can_join_leagues) {
        return errorResponse("Complete 5 partidas provisionais antes de entrar em ligas oficiais");
      }

      const { data: existing } = await supabase
        .from("league_memberships")
        .select("*")
        .eq("league_id", leagueId)
        .eq("player_id", user.id)
        .maybeSingle();

      if (existing) {
        return errorResponse("Voce ja e membro desta liga");
      }

      if (league?.requires_approval) {
        const { data: pendingRequest } = await supabase
          .from("league_join_requests")
          .select("*")
          .eq("league_id", leagueId)
          .eq("player_id", user.id)
          .eq("status", "pending")
          .maybeSingle();

        if (pendingRequest) {
          return errorResponse("Voce ja tem uma solicitacao pendente para esta liga");
        }

        let requestData: any = {};
        try {
          requestData = await req.json().catch(() => ({}));
        } catch {}

        const { data: request, error } = await supabase
          .from("league_join_requests")
          .insert({
            league_id: leagueId,
            player_id: user.id,
            message: requestData.message || null,
          })
          .select()
          .single();

        if (error) throw error;
        return jsonResponse({ request, pending_approval: true });
      }

      const { error: memberError } = await supabase
        .from("league_memberships")
        .insert({ league_id: leagueId, player_id: user.id });

      if (memberError) throw memberError;

      await supabase
        .from("league_rankings")
        .insert({
          league_id: leagueId,
          player_id: user.id,
          points: 0,
          matches_played: 0,
          wins: 0,
          losses: 0,
        });

      return jsonResponse({ success: true, pending_approval: false });
    }

    if (method === "POST" && pathParts.includes("requests") && pathParts.includes("approve")) {
      const leagueId = pathParts[1];
      const requestId = pathParts[pathParts.indexOf("requests") + 1];

      const { data: profile } = await supabase
        .from("players")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      const { data: league } = await supabase
        .from("leagues")
        .select("created_by")
        .eq("id", leagueId)
        .maybeSingle();

      if (!profile?.is_admin && league?.created_by !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      const { error } = await supabase.rpc("process_league_join_request", {
        p_request_id: requestId,
        p_approved: true,
        p_reviewer_id: user.id,
      });

      if (error) throw error;
      return jsonResponse({ success: true, approved: true });
    }

    if (method === "POST" && pathParts.includes("requests") && pathParts.includes("reject")) {
      const leagueId = pathParts[1];
      const requestId = pathParts[pathParts.indexOf("requests") + 1];

      const { data: profile } = await supabase
        .from("players")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      const { data: league } = await supabase
        .from("leagues")
        .select("created_by")
        .eq("id", leagueId)
        .maybeSingle();

      if (!profile?.is_admin && league?.created_by !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      const { error } = await supabase.rpc("process_league_join_request", {
        p_request_id: requestId,
        p_approved: false,
        p_reviewer_id: user.id,
      });

      if (error) throw error;
      return jsonResponse({ success: true, approved: false });
    }

    if (method === "POST" && pathParts.includes("events")) {
      const leagueId = pathParts[1];

      const { data: profile } = await supabase
        .from("players")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      const { data: league } = await supabase
        .from("leagues")
        .select("created_by")
        .eq("id", leagueId)
        .maybeSingle();

      if (!profile?.is_admin && league?.created_by !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      const eventData = await req.json();

      const { data: event, error } = await supabase
        .from("weekly_events")
        .insert({
          league_id: leagueId,
          event_date: eventData.event_date,
          duo_sorting_config: eventData.duo_sorting_config || { type: "all_together" },
        })
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ event });
    }

    if (method === "PUT" && pathParts.length === 2) {
      const leagueId = pathParts[1];

      const { data: profile } = await supabase
        .from("players")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      const { data: leagueCheck } = await supabase
        .from("leagues")
        .select("created_by")
        .eq("id", leagueId)
        .maybeSingle();

      if (!profile?.is_admin && leagueCheck?.created_by !== user.id) {
        return errorResponse("Forbidden", 403);
      }

      const updates = await req.json();

      const { data: league, error } = await supabase
        .from("leagues")
        .update(updates)
        .eq("id", leagueId)
        .select()
        .single();

      if (error) throw error;
      return jsonResponse({ league });
    }

    if (method === "DELETE" && pathParts.includes("leave")) {
      const leagueId = pathParts[1];

      const { error } = await supabase
        .from("league_memberships")
        .delete()
        .eq("league_id", leagueId)
        .eq("player_id", user.id);

      if (error) throw error;
      return jsonResponse({ success: true });
    }

    return errorResponse("Metodo nao permitido", 405);
  } catch (error: any) {
    return errorResponse(error.message);
  }
});
