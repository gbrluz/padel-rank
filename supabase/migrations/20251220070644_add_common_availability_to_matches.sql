/*
  # Add Common Availability to Matches

  ## Overview
  This migration adds a column to store the common availability (intersecting time slots) 
  of all 4 players in a match, making it easier to schedule games.

  ## Changes
  1. Add `common_availability` column to `matches` table
     - Stores JSON object with day/period combinations available for all players
     - Example: {"segunda": ["morning", "evening"], "quinta": ["afternoon"]}

  ## Notes
  - The common availability is calculated when the match is created
  - It represents the time slots where all 4 players are available
  - This helps players quickly identify when they can schedule the match
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'common_availability'
  ) THEN
    ALTER TABLE matches ADD COLUMN common_availability jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;