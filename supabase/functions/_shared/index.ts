export { corsHeaders, handleCors } from "./cors.ts";
export { jsonResponse, errorResponse, Errors, type ApiError } from "./response.ts";
export {
  authenticateRequest,
  authenticateAdmin,
  getPlayerProfile,
  type AuthResult,
  type AdminAuthResult,
} from "./auth.ts";
export {
  validateRequired,
  validateEnum,
  validateUUID,
  validateNumber,
  validateArray,
  whitelistFields,
  ALLOWED_GENDERS,
  ALLOWED_MATCH_STATUSES,
  ALLOWED_PREFERRED_SIDES,
  ALLOWED_LEAGUE_TYPES,
  ALLOWED_LEAGUE_FORMATS,
  type Gender,
  type MatchStatus,
  type PreferredSide,
  type LeagueType,
  type LeagueFormat,
  type ValidationResult,
} from "./validation.ts";
