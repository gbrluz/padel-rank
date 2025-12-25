/*
  # Add League Formats (Free, Weekly, Monthly)

  ## Changes to Tables

  ### `leagues` table modifications
    - `format` (text) - Type of league format:
      - 'free': Automatic pairing via queue (like ranking)
      - 'weekly': Fixed day/time each week with attendance confirmation
      - 'monthly': Players must complete X matches per month
    
    - Weekly format fields:
      - `weekly_day` (integer 0-6) - Day of week (0=Sunday, 6=Saturday)
      - `weekly_time` (time) - Time of day for weekly matches
      - `attendance_deadline_hours` (integer) - Hours before event to confirm (default 3)
    
    - Monthly format fields:
      - `monthly_min_matches` (integer) - Minimum matches required per month

  ### New table: `league_attendance`
    - Tracks player attendance confirmations for weekly leagues
    - `id` (uuid, primary key)
    - `league_id` (uuid, foreign key to leagues)
    - `player_id` (uuid, foreign key to profiles)
    - `week_date` (date) - Date of the weekly event
    - `status` (text) - 'confirmed', 'declined', 'no_response'
    - `confirmed_at` (timestamptz)
    - `created_at` (timestamptz)

  ## Security
    - Enable RLS on league_attendance table
    - Players can view/confirm their own attendance
    - Admins can view all attendance records
*/

-- Add format field to leagues table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'format'
  ) THEN
    ALTER TABLE leagues ADD COLUMN format text DEFAULT 'free'
      CHECK (format IN ('free', 'weekly', 'monthly'));
  END IF;
END $$;

-- Add weekly format fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'weekly_day'
  ) THEN
    ALTER TABLE leagues ADD COLUMN weekly_day integer 
      CHECK (weekly_day >= 0 AND weekly_day <= 6);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'weekly_time'
  ) THEN
    ALTER TABLE leagues ADD COLUMN weekly_time time;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'attendance_deadline_hours'
  ) THEN
    ALTER TABLE leagues ADD COLUMN attendance_deadline_hours integer DEFAULT 3
      CHECK (attendance_deadline_hours > 0);
  END IF;
END $$;

-- Add monthly format field
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leagues' AND column_name = 'monthly_min_matches'
  ) THEN
    ALTER TABLE leagues ADD COLUMN monthly_min_matches integer
      CHECK (monthly_min_matches > 0);
  END IF;
END $$;

-- Create league_attendance table for weekly leagues
CREATE TABLE IF NOT EXISTS league_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_date date NOT NULL,
  status text NOT NULL DEFAULT 'no_response' 
    CHECK (status IN ('confirmed', 'declined', 'no_response')),
  confirmed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(league_id, player_id, week_date)
);

-- Enable RLS on league_attendance
ALTER TABLE league_attendance ENABLE ROW LEVEL SECURITY;

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_league_attendance_league ON league_attendance(league_id, week_date);
CREATE INDEX IF NOT EXISTS idx_league_attendance_player ON league_attendance(player_id, week_date);
CREATE INDEX IF NOT EXISTS idx_league_attendance_status ON league_attendance(league_id, week_date, status);

-- Index for league format queries
CREATE INDEX IF NOT EXISTS idx_leagues_format ON leagues(format);

-- RLS Policies for league_attendance

-- Players can view their own attendance records in leagues they're part of
CREATE POLICY "Players can view own attendance"
  ON league_attendance FOR SELECT
  TO authenticated
  USING (
    player_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Players can confirm/decline their own attendance
CREATE POLICY "Players can update own attendance"
  ON league_attendance FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- System creates attendance records (through edge functions)
CREATE POLICY "Admins can insert attendance records"
  ON league_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Admins can delete attendance records
CREATE POLICY "Admins can delete attendance records"
  ON league_attendance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- Add validation constraint: weekly leagues must have weekly fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leagues_weekly_format_check'
  ) THEN
    ALTER TABLE leagues ADD CONSTRAINT leagues_weekly_format_check
      CHECK (
        format != 'weekly' OR (
          weekly_day IS NOT NULL AND 
          weekly_time IS NOT NULL
        )
      );
  END IF;
END $$;

-- Add validation constraint: monthly leagues must have min matches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leagues_monthly_format_check'
  ) THEN
    ALTER TABLE leagues ADD CONSTRAINT leagues_monthly_format_check
      CHECK (
        format != 'monthly' OR monthly_min_matches IS NOT NULL
      );
  END IF;
END $$;