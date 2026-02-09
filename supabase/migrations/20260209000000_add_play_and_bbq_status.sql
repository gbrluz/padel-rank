/*
  # Add play_and_bbq Status to league_attendance

  ## Changes
  - Add 'play_and_bbq' as a valid status for league_attendance
  - This allows players to indicate they will participate in matches AND attend the BBQ

  ## Modified Tables
  - league_attendance: Updated status CHECK constraint to include 'play_and_bbq'
*/

-- Drop the existing constraint
ALTER TABLE league_attendance DROP CONSTRAINT IF EXISTS league_attendance_status_check;

-- Add the new constraint with 'play_and_bbq' included
ALTER TABLE league_attendance ADD CONSTRAINT league_attendance_status_check
  CHECK (status IN ('confirmed', 'declined', 'no_response', 'bbq_only', 'play_and_bbq'));
