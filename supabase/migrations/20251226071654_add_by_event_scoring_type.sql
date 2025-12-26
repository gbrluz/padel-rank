/*
  # Add 'by_event' scoring type for weekly leagues

  1. Changes
    - Updates the CHECK constraint on `scoring_type` column in `leagues` table
    - Adds 'by_event' as a valid scoring type option
    - This scoring type is used for weekly leagues with the following point system:
      - Attendance: 4 points
      - BBQ participation: 2 points
      - Victory: 3 points
      - Defeat: 1 point

  2. Notes
    - No data migration needed as this only adds a new valid option
*/

-- Drop the existing constraint and add a new one with 'by_event' included
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'leagues' AND column_name = 'scoring_type'
  ) THEN
    ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_scoring_type_check;
  END IF;

  -- Add new constraint with 'by_event' option
  ALTER TABLE leagues ADD CONSTRAINT leagues_scoring_type_check
    CHECK (scoring_type IN ('standard', 'games_won', 'games_balance', 'by_event'));
END $$;
