/*
  # Fix Function Search Paths

  1. Security Improvements
    - Set immutable search_path for all functions
    - Prevents security vulnerabilities from path manipulation
  
  2. Functions Updated
    - set_first_admin (both overloads)
    - handle_duo_invitation_acceptance
    - update_league_ranking
    - update_global_ranking_trigger
    - calculate_global_ranking
    - get_initial_points_for_category
    - check_match_repetition
    - check_consecutive_match
    - add_match_to_history
    - get_category_from_points
    - update_region_strength
*/

-- Fix search paths for all functions
ALTER FUNCTION public.set_first_admin() SET search_path = public, auth;
ALTER FUNCTION public.set_first_admin(uuid) SET search_path = public, auth;
ALTER FUNCTION public.handle_duo_invitation_acceptance() SET search_path = public;
ALTER FUNCTION public.update_league_ranking(uuid, uuid, integer, boolean) SET search_path = public;
ALTER FUNCTION public.update_global_ranking_trigger() SET search_path = public;
ALTER FUNCTION public.calculate_global_ranking(uuid) SET search_path = public;
ALTER FUNCTION public.get_initial_points_for_category(text) SET search_path = public;
ALTER FUNCTION public.check_match_repetition(text[], text) SET search_path = public;
ALTER FUNCTION public.check_consecutive_match(text[], text) SET search_path = public;
ALTER FUNCTION public.add_match_to_history(uuid, text[], text) SET search_path = public;
ALTER FUNCTION public.get_category_from_points(integer) SET search_path = public;
ALTER FUNCTION public.update_region_strength(text, text, text, text) SET search_path = public;