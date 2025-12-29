/*
  # Fix Global Ranking Trigger for Players Table

  ## Problem
  After renaming the 'profiles' table to 'players', the global ranking trigger was lost.
  Additionally, the trigger only ran on UPDATE, not INSERT, causing new players to have
  NULL or 0 global_ranking_points.

  ## Solution
  1. Recreate the trigger on the 'players' table
  2. Add trigger for both INSERT and UPDATE operations
  3. Recalculate global_ranking_points for all existing players

  ## Changes
  - Drop existing trigger on players if it exists
  - Create trigger on players table for INSERT and UPDATE
  - Recalculate all existing players' global ranking points
*/

-- Drop trigger on players if it exists
DROP TRIGGER IF EXISTS trigger_update_global_ranking ON players;

-- Create trigger on players table for both INSERT and UPDATE
CREATE TRIGGER trigger_update_global_ranking
BEFORE INSERT OR UPDATE OF ranking_points, state, city ON players
FOR EACH ROW
EXECUTE FUNCTION update_global_ranking_trigger();

-- Recalculate global ranking for all existing players with regions
UPDATE players p
SET global_ranking_points = p.ranking_points * COALESCE(r.strength_factor, 1.0)
FROM regions r
WHERE r.state = p.state AND r.city = p.city;

-- Update players without matching region or NULL location
UPDATE players
SET global_ranking_points = ranking_points
WHERE global_ranking_points IS NULL
   OR state IS NULL 
   OR city IS NULL
   OR NOT EXISTS (
     SELECT 1 FROM regions r WHERE r.state = players.state AND r.city = players.city
   );
