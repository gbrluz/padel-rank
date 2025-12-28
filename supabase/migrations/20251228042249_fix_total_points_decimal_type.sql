/*
  # Fix total_points column type to support decimals

  1. Changes
    - Alters `total_points` column from integer to numeric(5,1)
    - This allows decimal values like 2.5, 5.0, 8.5, etc.

  2. Reason
    - Scoring system uses 2.5 points for attendance and BBQ
    - Integer type was causing errors when submitting decimal scores
*/

ALTER TABLE weekly_event_attendance
ALTER COLUMN total_points TYPE numeric(5,1) USING total_points::numeric(5,1);