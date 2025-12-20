/*
  # Add preferred_side column to queue_entries table

  1. Changes
    - Add `preferred_side` column to `queue_entries` table to store player side preferences
    - This column will be used by the match-finding algorithm to assign players to appropriate sides

  2. Details
    - Column type: text
    - Allowed values: 'left', 'right', 'both'
    - Default value: 'both' for flexibility
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'queue_entries' AND column_name = 'preferred_side'
  ) THEN
    ALTER TABLE queue_entries ADD COLUMN preferred_side text DEFAULT 'both';
  END IF;
END $$;