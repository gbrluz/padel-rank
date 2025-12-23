/*
  # Add Player Availability to Matches

  1. New Columns
    - `player_availabilities` (jsonb) - Stores each player's availability preferences
      Structure: { "player_id_1": {"segunda": ["morning"]}, "player_id_2": {...} }
  
  2. Purpose
    - Allow players to see each other's availability preferences when approving matches
    - Help coordinate scheduling by showing what times work for each player
    - Make it transparent which players are available when

  3. Notes
    - This is populated from players' profile availability when match is created
    - Shown in the match details page to help with scheduling
    - Does not replace common_availability, but complements it
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'player_availabilities'
  ) THEN
    ALTER TABLE matches ADD COLUMN player_availabilities jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;