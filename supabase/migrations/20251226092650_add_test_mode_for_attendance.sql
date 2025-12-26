/*
  # Add Test Mode for Weekly Attendance

  1. Changes
    - Remove the strict CHECK constraint on attendance_deadline_hours
    - Allow decimal values for testing (0.01 hours = ~36 seconds)
    - This enables rapid testing of weekly attendance features

  2. Testing
    - Set attendance_deadline_hours to 0.01 for quick tests
    - Set to 3 or more for production use
*/

DO $$ 
BEGIN
  -- Drop the existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'leagues' 
    AND constraint_name LIKE '%attendance_deadline_hours%'
  ) THEN
    ALTER TABLE leagues DROP CONSTRAINT IF EXISTS leagues_attendance_deadline_hours_check;
  END IF;

  -- Add new constraint allowing smaller values for testing
  ALTER TABLE leagues ADD CONSTRAINT leagues_attendance_deadline_hours_check 
    CHECK (attendance_deadline_hours IS NULL OR attendance_deadline_hours >= 0.01);
END $$;

-- Update column type to support decimals
ALTER TABLE leagues 
  ALTER COLUMN attendance_deadline_hours TYPE numeric(10,2);