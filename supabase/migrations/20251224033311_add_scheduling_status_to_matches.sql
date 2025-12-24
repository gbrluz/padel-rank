/*
  # Add 'scheduling' status to matches table

  1. Changes
    - Drop existing status check constraint
    - Add new status check constraint including 'scheduling' status
  
  2. Notes
    - The 'scheduling' status is used when all players approve a match and a captain is assigned
    - Captain then schedules the match based on player availability
*/

-- Drop existing constraint
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_status_check;

-- Add new constraint with 'scheduling' status
ALTER TABLE matches ADD CONSTRAINT matches_status_check 
  CHECK (status = ANY (ARRAY['pending_approval'::text, 'scheduling'::text, 'scheduled'::text, 'cancelled'::text, 'completed'::text]));