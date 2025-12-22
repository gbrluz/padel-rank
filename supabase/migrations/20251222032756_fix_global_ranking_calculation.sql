/*
  # Fix Global Ranking Calculation

  ## Problem
  The global_ranking_points field was added to profiles, but existing players never had their
  global ranking calculated. The trigger only runs on UPDATE of ranking_points, not on existing data.

  ## Solution
  1. Recalculate global_ranking_points for all existing players using the calculate_global_ranking function
  2. This applies the formula: regional_points * region_strength_factor

  ## Changes
  - Update all profiles to set their global_ranking_points based on their current regional points and region strength
*/

-- Recalculate global ranking for all existing players
UPDATE profiles
SET global_ranking_points = calculate_global_ranking(id)
WHERE id IS NOT NULL;