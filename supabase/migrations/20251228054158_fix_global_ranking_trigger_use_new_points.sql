/*
  # Fix Global Ranking Trigger to Use NEW Points

  ## Problem
  The trigger runs BEFORE UPDATE, but calculate_global_ranking() queries the database
  which still has the OLD ranking_points value. This causes global_ranking_points
  to be calculated with stale data.

  ## Solution
  Update the trigger function to use NEW.ranking_points directly instead of
  querying the database for the points value.

  ## Changes
  - Modified update_global_ranking_trigger to calculate global points using NEW.ranking_points
  - Also recalculate all existing players to fix current incorrect values
*/

CREATE OR REPLACE FUNCTION update_global_ranking_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_strength_factor numeric;
BEGIN
  IF NEW.state IS NULL OR NEW.city IS NULL THEN
    NEW.global_ranking_points := NEW.ranking_points::numeric;
    RETURN NEW;
  END IF;

  SELECT strength_factor
  INTO v_strength_factor
  FROM regions
  WHERE state = NEW.state AND city = NEW.city;

  IF v_strength_factor IS NULL THEN
    v_strength_factor := 1.0;
    
    INSERT INTO regions (state, city, strength_factor, total_players, total_matches)
    VALUES (NEW.state, NEW.city, 1.0, 0, 0)
    ON CONFLICT (state, city) DO NOTHING;
  END IF;

  NEW.global_ranking_points := NEW.ranking_points * v_strength_factor;
  
  RETURN NEW;
END;
$$;

-- Recalculate global ranking for all existing players
UPDATE players p
SET global_ranking_points = p.ranking_points * COALESCE(r.strength_factor, 1.0)
FROM regions r
WHERE r.state = p.state AND r.city = p.city;

-- Also update players without matching region
UPDATE players
SET global_ranking_points = ranking_points
WHERE state IS NULL OR city IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM regions r WHERE r.state = players.state AND r.city = players.city
   );
