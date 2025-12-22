/*
  # Add Advanced Options to Leagues

  ## Changes to Tables

  ### `leagues` table modifications
    - `duration_months` (integer) - Duration of the league in months (max 6)
    - `club_name` (text) - Name of the club (for club leagues)
    - `group_name` (text) - Name of the group (for friend leagues)
    - `max_members` (integer) - Maximum number of participants
    - `entry_criteria` (text) - Criteria visible to players wanting to join
    - `min_points` (integer) - Minimum ranking points required
    - `max_points` (integer) - Maximum ranking points allowed
    - `scoring_type` (text) - Type of scoring system:
      - 'standard': Standard points (starting from zero, can go negative)
      - 'games_won': Total games won
      - 'games_balance': Net games balance

  ## Notes
  - Duration is limited to 6 months maximum
  - Club name is only required for club-type leagues
  - Group name is only required for friends-type leagues
  - Entry criteria helps players understand join requirements
  - Points range allows filtering by skill level
  - Scoring type affects how league rankings are calculated
*/

-- Add new columns to leagues table
DO $$
BEGIN
  -- Add duration_months column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'duration_months'
  ) THEN
    ALTER TABLE leagues ADD COLUMN duration_months integer CHECK (duration_months > 0 AND duration_months <= 6);
  END IF;

  -- Add club_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'club_name'
  ) THEN
    ALTER TABLE leagues ADD COLUMN club_name text;
  END IF;

  -- Add group_name column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'group_name'
  ) THEN
    ALTER TABLE leagues ADD COLUMN group_name text;
  END IF;

  -- Add max_members column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'max_members'
  ) THEN
    ALTER TABLE leagues ADD COLUMN max_members integer CHECK (max_members > 0);
  END IF;

  -- Add entry_criteria column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'entry_criteria'
  ) THEN
    ALTER TABLE leagues ADD COLUMN entry_criteria text;
  END IF;

  -- Add min_points column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'min_points'
  ) THEN
    ALTER TABLE leagues ADD COLUMN min_points integer DEFAULT 0;
  END IF;

  -- Add max_points column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'max_points'
  ) THEN
    ALTER TABLE leagues ADD COLUMN max_points integer;
  END IF;

  -- Add scoring_type column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'scoring_type'
  ) THEN
    ALTER TABLE leagues ADD COLUMN scoring_type text DEFAULT 'standard'
      CHECK (scoring_type IN ('standard', 'games_won', 'games_balance'));
  END IF;
END $$;

-- Add check constraint to ensure max_points is greater than min_points
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leagues_points_range_check'
  ) THEN
    ALTER TABLE leagues ADD CONSTRAINT leagues_points_range_check
      CHECK (max_points IS NULL OR min_points IS NULL OR max_points > min_points);
  END IF;
END $$;

-- Create index for faster queries on points range
CREATE INDEX IF NOT EXISTS idx_leagues_points_range ON leagues(min_points, max_points);

-- Create index for league type
CREATE INDEX IF NOT EXISTS idx_leagues_type ON leagues(type);
