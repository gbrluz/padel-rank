/*
  # Add BBQ Only Attendance Status

  ## Changes
  - Add 'bbq_only' as a valid status for league_attendance
  - This allows players to indicate they will only attend the BBQ (getting 2.5 points)
    without participating in matches and therefore not needing to report scores

  ## Modified Tables
  - league_attendance: Updated status CHECK constraint to include 'bbq_only'
*/

-- Drop the existing constraint
ALTER TABLE league_attendance DROP CONSTRAINT IF EXISTS league_attendance_status_check;

-- Add the new constraint with 'bbq_only' included
ALTER TABLE league_attendance ADD CONSTRAINT league_attendance_status_check
  CHECK (status IN ('confirmed', 'declined', 'no_response', 'bbq_only'));