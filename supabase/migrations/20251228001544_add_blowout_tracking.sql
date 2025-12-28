/*
  # Add 6x0 (blowout) tracking to weekly attendance

  1. Changes
    - Adds `blowouts_received` column to track how many 6x0 losses a player had
    - This affects scoring: -2 points per 6x0 received

  2. Scoring System Update
    - 2.5 points for attendance
    - 2.5 points for BBQ participation
    - 2 points per victory
    - -2 points per 6x0 received
*/

ALTER TABLE weekly_event_attendance
ADD COLUMN IF NOT EXISTS blowouts_received integer DEFAULT 0;