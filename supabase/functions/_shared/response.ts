import { corsHeaders } from "./cors.ts";

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function errorResponse(
  code: string,
  message: string,
  status: number,
  details?: unknown
): Response {
  const error: ApiError = { code, message };
  if (details !== undefined) {
    error.details = details;
  }
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export const Errors = {
  unauthorized: (message = "Token de autenticacao ausente ou invalido") =>
    errorResponse("UNAUTHORIZED", message, 401),

  forbidden: (message = "Acesso negado") =>
    errorResponse("FORBIDDEN", message, 403),

  notFound: (resource = "Recurso") =>
    errorResponse("NOT_FOUND", `${resource} nao encontrado`, 404),

  badRequest: (message: string, details?: unknown) =>
    errorResponse("BAD_REQUEST", message, 400, details),

  conflict: (message: string) =>
    errorResponse("CONFLICT", message, 409),

  internal: (message = "Erro interno do servidor") =>
    errorResponse("INTERNAL_ERROR", message, 500),

  validationFailed: (fields: Record<string, string>) =>
    errorResponse("VALIDATION_FAILED", "Dados invalidos", 400, { fields }),
};
