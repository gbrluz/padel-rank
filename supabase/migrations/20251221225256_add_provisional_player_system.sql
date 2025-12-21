/*
  # Provisional Player System

  ## Description
  Implements a provisional ranking system for new players to prevent intentional 
  ranking manipulation. New players start with points at the midpoint of their 
  chosen category and play 5 provisional games with enhanced point adjustments.

  ## Changes Made

  ### 1. New Columns in profiles table
  - `is_provisional` (boolean, default true) - Indicates if player is in provisional period
  - `provisional_games_played` (integer, default 0) - Counts games played in provisional period
  - `can_join_leagues` (boolean, default false) - Prevents provisional players from joining leagues

  ### 2. Helper Function: get_initial_points_for_category
  Returns the starting points for a given category (midpoint of category range):
  - iniciante: 100 points (midpoint of 0-199)
  - 7a: 300 points (midpoint of 200-399)
  - 6a: 500 points (midpoint of 400-599)
  - 5a: 700 points (midpoint of 600-799)
  - 4a: 900 points (midpoint of 800-999)
  - 3a: 1100 points (midpoint of 1000-1199)
  - 2a: 1300 points (midpoint of 1200-1399)
  - 1a: 1500 points (midpoint of 1400-1599)
  - avancado: 1700 points (midpoint of 1600+)

  ## Security
  - All functions are accessible to authenticated users
  - RLS policies remain unchanged
*/

-- Add new columns to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_provisional'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_provisional boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'provisional_games_played'
  ) THEN
    ALTER TABLE profiles ADD COLUMN provisional_games_played integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'can_join_leagues'
  ) THEN
    ALTER TABLE profiles ADD COLUMN can_join_leagues boolean DEFAULT false;
  END IF;
END $$;

-- Create function to get initial points based on category
CREATE OR REPLACE FUNCTION get_initial_points_for_category(category_name text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE category_name
    WHEN 'iniciante' THEN 100
    WHEN '7a' THEN 300
    WHEN '6a' THEN 500
    WHEN '5a' THEN 700
    WHEN '4a' THEN 900
    WHEN '3a' THEN 1100
    WHEN '2a' THEN 1300
    WHEN '1a' THEN 1500
    WHEN 'avancado' THEN 1700
    ELSE 100 -- Default to iniciante if unknown category
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION get_initial_points_for_category(text) TO authenticated;
GRANT EXECUTE ON FUNCTION get_initial_points_for_category(text) TO anon;

-- Update existing players to be non-provisional if they have any matches
UPDATE profiles
SET is_provisional = false, 
    provisional_games_played = 5,
    can_join_leagues = true
WHERE id IN (
  SELECT DISTINCT unnest(ARRAY[team_a_player1_id, team_a_player2_id, team_b_player1_id, team_b_player2_id])
  FROM matches
  WHERE status = 'completed'
);
