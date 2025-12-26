import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  handleCors,
  jsonResponse,
  Errors,
  authenticateRequest,
  getPlayerProfile,
  whitelistFields,
} from "../_shared/index.ts";

const ALLOWED_UPDATE_FIELDS = [
  "full_name",
  "nickname",
  "state",
  "city",
  "preferred_side",
  "availability",
  "avatar_url",
] as const;

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authResult = await authenticateRequest(req);
    if (!authResult.success) {
      return authResult.response;
    }

    const { user, supabase } = authResult;
    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const method = req.method;

    if (method === "GET") {
      const playerId = pathParts[1] || user.id;

      const { data: player, error } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .maybeSingle();

      if (error) {
        return Errors.internal();
      }

      if (!player) {
        return Errors.notFound("Jogador");
      }

      return jsonResponse({ player });
    }

    if (method === "PUT") {
      const playerId = pathParts[1] || user.id;

      if (playerId !== user.id) {
        const requestingPlayer = await getPlayerProfile(supabase, user.id);

        if (!requestingPlayer?.is_admin) {
          return Errors.forbidden("Sem permissao para atualizar este jogador");
        }
      }

      let updates;
      try {
        updates = await req.json();
      } catch {
        return Errors.badRequest("Corpo da requisicao invalido");
      }

      const safeUpdates = whitelistFields(updates, [...ALLOWED_UPDATE_FIELDS]);

      if (Object.keys(safeUpdates).length === 0) {
        return Errors.badRequest("Nenhum campo valido para atualizar");
      }

      const { data: player, error } = await supabase
        .from("players")
        .update(safeUpdates)
        .eq("id", playerId)
        .select()
        .single();

      if (error) {
        return Errors.internal();
      }

      return jsonResponse({ player });
    }

    return Errors.badRequest("Metodo nao permitido");
  } catch {
    return Errors.internal();
  }
});
