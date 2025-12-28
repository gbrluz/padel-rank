/*
  # Fix get_players_with_email function - Add preferred_side

  1. Changes
    - Add preferred_side column to the SELECT statement in get_players_with_email function
    - Update return type to include preferred_side
*/

DROP FUNCTION IF EXISTS get_players_with_email(text);

CREATE OR REPLACE FUNCTION get_players_with_email(search_term text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  state text,
  city text,
  gender text,
  category text,
  ranking_points integer,
  total_matches integer,
  total_wins integer,
  is_admin boolean,
  is_provisional boolean,
  can_join_leagues boolean,
  created_at timestamptz,
  phone text,
  preferred_side text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    au.email::text,
    p.state,
    p.city,
    p.gender,
    p.category,
    p.ranking_points,
    COALESCE(p.total_matches, 0)::integer as total_matches,
    COALESCE(p.total_wins, 0)::integer as total_wins,
    p.is_admin,
    p.is_provisional,
    COALESCE(p.can_join_leagues, true) as can_join_leagues,
    p.created_at,
    p.phone,
    p.preferred_side
  FROM players p
  JOIN auth.users au ON au.id = p.id
  WHERE 
    search_term IS NULL 
    OR p.full_name ILIKE '%' || search_term || '%'
    OR au.email ILIKE '%' || search_term || '%'
  ORDER BY p.created_at DESC;
END;
$$;
