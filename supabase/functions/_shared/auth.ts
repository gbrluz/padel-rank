import { createClient, SupabaseClient, User } from "npm:@supabase/supabase-js@2";
import { Errors } from "./response.ts";

export type AuthResult =
  | { success: true; user: User; supabase: SupabaseClient }
  | { success: false; response: Response };

export type AdminAuthResult =
  | { success: true; user: User; supabase: SupabaseClient; isAdmin: true }
  | { success: false; response: Response };

function getSupabaseClient(authHeader: string): SupabaseClient {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
}

export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { success: false, response: Errors.unauthorized() };
  }

  try {
    const supabase = getSupabaseClient(authHeader);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return { success: false, response: Errors.unauthorized("Token invalido ou expirado") };
    }

    return { success: true, user, supabase };
  } catch {
    return { success: false, response: Errors.internal() };
  }
}

export async function authenticateAdmin(req: Request): Promise<AdminAuthResult> {
  const authResult = await authenticateRequest(req);

  if (!authResult.success) {
    return authResult;
  }

  const { user, supabase } = authResult;

  const { data: player, error } = await supabase
    .from("players")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { success: false, response: Errors.internal() };
  }

  if (!player?.is_admin) {
    return { success: false, response: Errors.forbidden("Acesso restrito a administradores") };
  }

  return { success: true, user, supabase, isAdmin: true };
}

export async function getPlayerProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<{ id: string; is_admin: boolean } | null> {
  const { data } = await supabase
    .from("players")
    .select("id, is_admin")
    .eq("id", userId)
    .maybeSingle();
  return data;
}
