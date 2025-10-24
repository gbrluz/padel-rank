/*
  # Add Match Location and Sets Details

  ## Changes
  Add fields to the matches table to track:
  1. Match location (venue name)
  2. Match date and time (separate from scheduled_date for better clarity)
  3. Detailed set scores (array of sets with games for each team)
  4. Tiebreak information if applicable

  ## New Fields
  - `location` (text) - Venue or court name where match takes place
  - `match_date` (date) - Date of the match
  - `match_time` (time) - Time of the match
  - `sets` (jsonb) - Array of sets with detailed scores
    Format: [{"team_a": 6, "team_b": 4}, {"team_a": 7, "team_b": 5}]
  - `has_tiebreak` (boolean) - Whether the match went to tiebreak
  - `tiebreak_score` (jsonb) - Tiebreak score if applicable
    Format: {"team_a": 7, "team_b": 5}

  ## Notes
  - Sets can go up to 9 games each
  - If 8-8, tiebreak is played until 7 points
  - Match can be best of 3 sets
*/

-- Add new columns to matches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'location'
  ) THEN
    ALTER TABLE matches ADD COLUMN location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'match_date'
  ) THEN
    ALTER TABLE matches ADD COLUMN match_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'match_time'
  ) THEN
    ALTER TABLE matches ADD COLUMN match_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'sets'
  ) THEN
    ALTER TABLE matches ADD COLUMN sets jsonb DEFAULT '[]';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'has_tiebreak'
  ) THEN
    ALTER TABLE matches ADD COLUMN has_tiebreak boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'tiebreak_score'
  ) THEN
    ALTER TABLE matches ADD COLUMN tiebreak_score jsonb;
  END IF;
END $$;
