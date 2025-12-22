/*
  # Match History Tracking System

  ## Overview
  This migration adds a system to track match history to prevent:
  1. Repeated matches with the same 4 players
  2. Consecutive matches with the same 4 players

  ## New Tables

  ### `match_history`
  Tracks all created matches with the 4 players involved
  - `id` (uuid, primary key)
  - `match_id` (uuid) - Reference to matches table
  - `player_ids` (text[]) - Array of 4 player IDs (sorted for consistency)
  - `gender` (text) - Gender of the match
  - `created_at` (timestamptz) - When the match was created
  - `sequence_number` (integer) - Sequential number for ordering matches

  ## Functions

  ### `check_match_repetition(player_ids text[], gender text)`
  Checks if a match with these 4 players already exists recently (within last 10 matches of this gender)
  Returns true if match can be created, false if it would be a repetition

  ### `check_consecutive_match(player_ids text[], gender text)`
  Checks if the last match created for this gender has the exact same 4 players
  Returns true if match can be created, false if it would be consecutive

  ## Security
  - RLS enabled on match_history table
  - Users can view all match history
  - Only the system can insert match history records

  ## Notes
  1. Player IDs are always sorted alphabetically before storage for consistency
  2. This prevents exact duplicates and consecutive matches
  3. The system looks at the last 10 matches to check for repetitions
*/

-- Create match_history table
CREATE TABLE IF NOT EXISTS match_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  player_ids text[] NOT NULL,
  gender text NOT NULL,
  created_at timestamptz DEFAULT now(),
  sequence_number serial
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_history_gender ON match_history(gender);
CREATE INDEX IF NOT EXISTS idx_match_history_player_ids ON match_history USING gin(player_ids);
CREATE INDEX IF NOT EXISTS idx_match_history_sequence ON match_history(sequence_number DESC);
CREATE INDEX IF NOT EXISTS idx_match_history_created_at ON match_history(created_at DESC);

-- Function to check if match would be a recent repetition
CREATE OR REPLACE FUNCTION check_match_repetition(p_player_ids text[], p_gender text)
RETURNS boolean AS $$
DECLARE
  v_sorted_ids text[];
  v_recent_count integer;
BEGIN
  -- Sort player IDs for consistent comparison
  v_sorted_ids := ARRAY(SELECT unnest(p_player_ids) ORDER BY 1);
  
  -- Check if this exact combination exists in the last 10 matches of this gender
  SELECT COUNT(*)
  INTO v_recent_count
  FROM (
    SELECT player_ids
    FROM match_history
    WHERE gender = p_gender
    ORDER BY sequence_number DESC
    LIMIT 10
  ) recent_matches
  WHERE player_ids = v_sorted_ids;
  
  -- Return true if no repetition found (count is 0), false if repetition found
  RETURN v_recent_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if match would be consecutive (same as last match)
CREATE OR REPLACE FUNCTION check_consecutive_match(p_player_ids text[], p_gender text)
RETURNS boolean AS $$
DECLARE
  v_sorted_ids text[];
  v_last_match_ids text[];
BEGIN
  -- Sort player IDs for consistent comparison
  v_sorted_ids := ARRAY(SELECT unnest(p_player_ids) ORDER BY 1);
  
  -- Get the player IDs from the last match created for this gender
  SELECT player_ids
  INTO v_last_match_ids
  FROM match_history
  WHERE gender = p_gender
  ORDER BY sequence_number DESC
  LIMIT 1;
  
  -- If no previous match exists, allow this match
  IF v_last_match_ids IS NULL THEN
    RETURN true;
  END IF;
  
  -- Return true if different from last match, false if same
  RETURN v_last_match_ids != v_sorted_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add match to history
CREATE OR REPLACE FUNCTION add_match_to_history(
  p_match_id uuid,
  p_player_ids text[],
  p_gender text
)
RETURNS void AS $$
DECLARE
  v_sorted_ids text[];
BEGIN
  -- Sort player IDs for consistent storage
  v_sorted_ids := ARRAY(SELECT unnest(p_player_ids) ORDER BY 1);
  
  -- Insert into match history
  INSERT INTO match_history (match_id, player_ids, gender)
  VALUES (p_match_id, v_sorted_ids, p_gender);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Populate match_history with existing matches
INSERT INTO match_history (match_id, player_ids, gender, created_at)
SELECT 
  id,
  ARRAY[
    team_a_player1_id,
    team_a_player2_id,
    team_b_player1_id,
    team_b_player2_id
  ]::text[],
  gender,
  created_at
FROM matches
WHERE id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Match history is viewable by everyone"
  ON match_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only system can insert match history"
  ON match_history FOR INSERT
  TO authenticated
  WITH CHECK (false);

CREATE POLICY "Admins can manage match history"
  ON match_history FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );
