/*
  # Fix Global Ranking Calculation for Missing Regions

  ## Problem
  The global_ranking_points field is showing 0 for female players even though they have regional points.
  The issue is that when a region doesn't exist in the `regions` table, the `calculate_global_ranking` 
  function doesn't handle it correctly.

  ## Root Cause
  When there's no row in the `regions` table for a player's location, the SELECT query returns no rows,
  leaving `v_strength_factor` as NULL. While there's a fallback to 1.0, it seems the calculation isn't
  being applied properly.

  ## Solution
  1. Recreate the `calculate_global_ranking` function with better NULL handling
  2. Auto-create region entries for any location that doesn't have one
  3. Recalculate all global rankings

  ## Changes
  - Drop and recreate `calculate_global_ranking` function with improved logic
  - Insert missing regions with default strength_factor of 1.0
  - Update all profiles with recalculated global_ranking_points
*/

-- Drop and recreate the function with better handling
DROP FUNCTION IF EXISTS calculate_global_ranking(uuid);

CREATE OR REPLACE FUNCTION calculate_global_ranking(p_player_id uuid)
RETURNS numeric AS $$
DECLARE
  v_regional_points integer;
  v_state text;
  v_city text;
  v_strength_factor numeric;
  v_global_points numeric;
BEGIN
  -- Get player's regional points and location
  SELECT ranking_points, state, city
  INTO v_regional_points, v_state, v_city
  FROM profiles
  WHERE id = p_player_id;

  -- If player has no location, return regional points
  IF v_state IS NULL OR v_city IS NULL THEN
    RETURN v_regional_points::numeric;
  END IF;

  -- Try to get the strength factor, default to 1.0 if region doesn't exist
  SELECT strength_factor
  INTO v_strength_factor
  FROM regions
  WHERE state = v_state AND city = v_city;

  -- If no region found, create it and use 1.0 as strength factor
  IF v_strength_factor IS NULL THEN
    v_strength_factor := 1.0;
    
    -- Insert the region if it doesn't exist
    INSERT INTO regions (state, city, strength_factor, total_players, total_matches)
    VALUES (v_state, v_city, 1.0, 0, 0)
    ON CONFLICT (state, city) DO NOTHING;
  END IF;

  -- Calculate global points
  v_global_points := v_regional_points * v_strength_factor;

  RETURN v_global_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure all player locations have a region entry
INSERT INTO regions (state, city, strength_factor, total_players, total_matches)
SELECT DISTINCT state, city, 1.0, 0, 0
FROM profiles
WHERE state IS NOT NULL AND city IS NOT NULL
ON CONFLICT (state, city) DO NOTHING;

-- Update region player counts
UPDATE regions r
SET total_players = (
  SELECT COUNT(*)
  FROM profiles p
  WHERE p.state = r.state AND p.city = r.city
);

-- Recalculate global ranking for ALL players
UPDATE profiles
SET global_ranking_points = calculate_global_ranking(id)
WHERE id IS NOT NULL;
