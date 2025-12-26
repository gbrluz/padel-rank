/*
  # Fix Function References After profiles -> players Rename

  This migration updates database functions that still reference the old
  'profiles' table name to use the new 'players' table name.

  ## Functions Updated
  1. `is_admin()` - Check if current user is admin
  2. `set_first_admin()` (trigger version) - Set first user as admin on insert
  3. `set_first_admin(uuid)` (void version) - Set specific user as admin
  4. `calculate_global_ranking(uuid)` - Calculate global ranking for a player
  5. `get_players_with_email(text)` - Get players with email for admin panel

  ## Security
  - All functions maintain SECURITY DEFINER with proper search_path
*/

-- Update is_admin function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM players
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$;

-- Update the trigger version of set_first_admin
CREATE OR REPLACE FUNCTION set_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM players WHERE is_admin = true) THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Update the void version of set_first_admin (with user_id parameter)
CREATE OR REPLACE FUNCTION set_first_admin(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_count integer;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM players
  WHERE is_admin = true;

  IF admin_count = 0 THEN
    UPDATE players
    SET is_admin = true
    WHERE id = user_id;
  ELSE
    RAISE EXCEPTION 'An admin already exists. Only admins can create other admins.';
  END IF;
END;
$$;

-- Update calculate_global_ranking function (single player version)
CREATE OR REPLACE FUNCTION calculate_global_ranking(p_player_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_regional_points integer;
  v_state text;
  v_city text;
  v_strength_factor numeric;
  v_global_points numeric;
BEGIN
  SELECT ranking_points, state, city
  INTO v_regional_points, v_state, v_city
  FROM players
  WHERE id = p_player_id;

  IF v_state IS NULL OR v_city IS NULL THEN
    RETURN v_regional_points::numeric;
  END IF;

  SELECT strength_factor
  INTO v_strength_factor
  FROM regions
  WHERE state = v_state AND city = v_city;

  IF v_strength_factor IS NULL THEN
    v_strength_factor := 1.0;

    INSERT INTO regions (state, city, strength_factor, total_players, total_matches)
    VALUES (v_state, v_city, 1.0, 0, 0)
    ON CONFLICT (state, city) DO NOTHING;
  END IF;

  v_global_points := v_regional_points * v_strength_factor;

  RETURN v_global_points;
END;
$$;

-- Create a new function for gender-based global ranking table result
CREATE OR REPLACE FUNCTION get_global_ranking_by_gender(p_gender text)
RETURNS TABLE (
  player_id uuid,
  full_name text,
  nickname text,
  state text,
  city text,
  category text,
  ranking_points integer,
  global_rank bigint,
  region_strength_factor numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH player_regions AS (
    SELECT 
      p.id,
      p.full_name,
      p.nickname,
      p.state,
      p.city,
      p.category,
      p.ranking_points,
      COALESCE(r.strength_factor, 1.0) as strength_factor
    FROM players p
    LEFT JOIN regions r ON r.state = p.state AND r.city = p.city
    WHERE p.gender = p_gender
  )
  SELECT 
    pr.id as player_id,
    pr.full_name,
    pr.nickname,
    pr.state,
    pr.city,
    pr.category,
    pr.ranking_points,
    ROW_NUMBER() OVER (
      ORDER BY (pr.ranking_points * pr.strength_factor) DESC, pr.ranking_points DESC
    ) as global_rank,
    pr.strength_factor as region_strength_factor
  FROM player_regions pr
  ORDER BY global_rank;
END;
$$;

-- Drop and recreate get_players_with_email with consistent return type
DROP FUNCTION IF EXISTS get_players_with_email(text);

CREATE FUNCTION get_players_with_email(search_term text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  full_name text,
  nickname text,
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
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.nickname,
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
    p.created_at
  FROM players p
  JOIN auth.users au ON au.id = p.id
  WHERE 
    search_term IS NULL 
    OR p.full_name ILIKE '%' || search_term || '%'
    OR p.nickname ILIKE '%' || search_term || '%'
    OR au.email ILIKE '%' || search_term || '%'
  ORDER BY p.created_at DESC;
END;
$$;
