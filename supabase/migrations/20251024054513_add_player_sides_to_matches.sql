/*
  # Add Player Sides to Matches

  1. Changes
    - Add columns to store the side (left/right) for each player in a match
    - Team A Player 1: left side
    - Team A Player 2: right side  
    - Team B Player 1: left side
    - Team B Player 2: right side

  2. New Columns
    - `team_a_player1_side` - Side preference for team A player 1 (left/right)
    - `team_a_player2_side` - Side preference for team A player 2 (left/right)
    - `team_b_player1_side` - Side preference for team B player 1 (left/right)
    - `team_b_player2_side` - Side preference for team B player 2 (left/right)

  3. Notes
    - Default sides: player1 = left, player2 = right
    - These sides are determined during matchmaking based on player preferences
*/

-- Add side columns to matches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_a_player1_side'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_a_player1_side text DEFAULT 'left' CHECK (team_a_player1_side IN ('left', 'right'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_a_player2_side'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_a_player2_side text DEFAULT 'right' CHECK (team_a_player2_side IN ('left', 'right'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_b_player1_side'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_b_player1_side text DEFAULT 'left' CHECK (team_b_player1_side IN ('left', 'right'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'team_b_player2_side'
  ) THEN
    ALTER TABLE matches ADD COLUMN team_b_player2_side text DEFAULT 'right' CHECK (team_b_player2_side IN ('left', 'right'));
  END IF;
END $$;