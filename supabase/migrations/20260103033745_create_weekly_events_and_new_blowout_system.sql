/*
  # Create Weekly Events System and New Blowout Tracking

  1. New Tables
    
    ## `league_organizers`
    - `id` (uuid, primary key)
    - `league_id` (uuid, FK to leagues)
    - `player_id` (uuid, FK to players)
    - `created_at` (timestamptz)
    - Unique constraint on (league_id, player_id)
    
    ## `weekly_events`
    - `id` (uuid, primary key)
    - `league_id` (uuid, FK to leagues)
    - `event_date` (date) - Date of the weekly event
    - `created_at` (timestamptz)
    - Unique constraint on (league_id, event_date)
    
    ## `weekly_event_attendance`
    - `id` (uuid, primary key)
    - `event_id` (uuid, FK to weekly_events)
    - `player_id` (uuid, FK to players)
    - `status` (text) - confirmed, declined, no_response, bbq_only, play_and_bbq
    - `confirmed` (boolean) - Whether player confirmed attendance
    - `confirmed_at` (timestamptz)
    - `victories` (integer) - Number of victories
    - `defeats` (integer) - Number of defeats
    - `bbq_participated` (boolean) - Whether player participated in BBQ
    - `blowouts_received` (integer) - Number of blowouts received (-3 points each)
    - `blowouts_applied` (integer) - Number of blowouts applied (+3 points each)
    - `total_points` (numeric) - Total points earned
    - `points_submitted` (boolean) - Whether player submitted their score
    - `points_submitted_at` (timestamptz)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - Unique constraint on (event_id, player_id)
    
    ## `weekly_event_blowouts`
    - `id` (uuid, primary key)
    - `event_id` (uuid, FK to weekly_events)
    - `applier_player_id` (uuid, FK to players) - Player who applied the blowout
    - `victim_player_id` (uuid, FK to players) - Player who received the blowout
    - `created_at` (timestamptz)
    - Unique constraint on (event_id, applier_player_id, victim_player_id) to prevent duplicates
    - Check constraint to ensure applier and victim are different players

  2. Point System
    - Base attendance: +2.5 points
    - BBQ participation: +2.5 points
    - Victory: +2 points each
    - Blowout received: -3 points each (changed from -2)
    - Blowout applied: +3 points each (new)
    
  3. Security
    - Enable RLS on all tables
    - League members can view and manage their own attendance
    - Organizers can manage all attendance and blowouts
*/

-- Create league_organizers table if not exists
CREATE TABLE IF NOT EXISTS league_organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(league_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_league_organizers_league ON league_organizers(league_id);
CREATE INDEX IF NOT EXISTS idx_league_organizers_player ON league_organizers(player_id);

ALTER TABLE league_organizers ENABLE ROW LEVEL SECURITY;

-- Create weekly_events table
CREATE TABLE IF NOT EXISTS weekly_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(league_id, event_date)
);

-- Create weekly_event_attendance table
CREATE TABLE IF NOT EXISTS weekly_event_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES weekly_events(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'no_response' CHECK (status IN ('confirmed', 'declined', 'no_response', 'bbq_only', 'play_and_bbq')),
  confirmed boolean DEFAULT false,
  confirmed_at timestamptz,
  victories integer DEFAULT 0,
  defeats integer DEFAULT 0,
  bbq_participated boolean DEFAULT false,
  blowouts_received integer DEFAULT 0,
  blowouts_applied integer DEFAULT 0,
  total_points numeric DEFAULT 0,
  points_submitted boolean DEFAULT false,
  points_submitted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(event_id, player_id)
);

-- Create blowouts tracking table
CREATE TABLE IF NOT EXISTS weekly_event_blowouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES weekly_events(id) ON DELETE CASCADE,
  applier_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  victim_player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT unique_event_applier_victim UNIQUE (event_id, applier_player_id, victim_player_id),
  CONSTRAINT different_players CHECK (applier_player_id != victim_player_id)
);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_weekly_events_league_date ON weekly_events(league_id, event_date);
CREATE INDEX IF NOT EXISTS idx_weekly_attendance_event ON weekly_event_attendance(event_id);
CREATE INDEX IF NOT EXISTS idx_weekly_attendance_player ON weekly_event_attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_weekly_blowouts_event ON weekly_event_blowouts(event_id);
CREATE INDEX IF NOT EXISTS idx_weekly_blowouts_applier ON weekly_event_blowouts(applier_player_id);
CREATE INDEX IF NOT EXISTS idx_weekly_blowouts_victim ON weekly_event_blowouts(victim_player_id);

-- Enable RLS on all tables
ALTER TABLE weekly_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_event_blowouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for league_organizers
CREATE POLICY "Users can view league organizers"
  ON league_organizers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "League creators are auto-organizers"
  ON league_organizers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = league_organizers.league_id
      AND leagues.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.is_admin = true
    )
  );

-- RLS Policies for weekly_events

-- League members can view events for their leagues
CREATE POLICY "League members can view events"
  ON weekly_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_memberships.league_id = weekly_events.league_id
      AND league_memberships.player_id = auth.uid()
      AND league_memberships.status = 'active'
    )
  );

-- League members can insert events for their leagues
CREATE POLICY "Members can insert events for their leagues"
  ON weekly_events FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = weekly_events.league_id
      AND lm.player_id = auth.uid()
      AND lm.status = 'active'
    )
  );

-- RLS Policies for weekly_event_attendance

-- Players can view attendance for events in their leagues
CREATE POLICY "Players can view league event attendance"
  ON weekly_event_attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_events we
      JOIN league_memberships lm ON lm.league_id = we.league_id
      WHERE we.id = weekly_event_attendance.event_id
      AND lm.player_id = auth.uid()
      AND lm.status = 'active'
    )
  );

-- Players can insert their own attendance
CREATE POLICY "Players can insert own attendance"
  ON weekly_event_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM weekly_events we
      JOIN league_memberships lm ON lm.league_id = we.league_id
      WHERE we.id = event_id
      AND lm.player_id = auth.uid()
      AND lm.status = 'active'
    )
  );

-- Players can update their own attendance
CREATE POLICY "Players can update own attendance"
  ON weekly_event_attendance FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- Organizers can update any attendance in their leagues
CREATE POLICY "Organizers can update attendance"
  ON weekly_event_attendance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_events we
      JOIN league_organizers lo ON lo.league_id = we.league_id
      WHERE we.id = weekly_event_attendance.event_id
      AND lo.player_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_events we
      JOIN league_organizers lo ON lo.league_id = we.league_id
      WHERE we.id = event_id
      AND lo.player_id = auth.uid()
    )
  );

-- RLS Policies for weekly_event_blowouts

-- League members can view blowouts in their league events
CREATE POLICY "League members can view event blowouts"
  ON weekly_event_blowouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_events we
      JOIN league_memberships lm ON lm.league_id = we.league_id
      WHERE we.id = weekly_event_blowouts.event_id
      AND lm.player_id = auth.uid()
      AND lm.status = 'active'
    )
  );

-- Players can insert blowout records they applied
CREATE POLICY "Players can record blowouts they applied"
  ON weekly_event_blowouts FOR INSERT
  TO authenticated
  WITH CHECK (
    applier_player_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM weekly_events we
      JOIN league_memberships lm ON lm.league_id = we.league_id
      WHERE we.id = event_id
      AND lm.player_id = auth.uid()
      AND lm.status = 'active'
    )
    AND EXISTS (
      SELECT 1 FROM weekly_event_attendance
      WHERE event_id = weekly_event_blowouts.event_id
      AND player_id = victim_player_id
    )
  );

-- Players can delete their own blowout records
CREATE POLICY "Players can delete own blowout records"
  ON weekly_event_blowouts FOR DELETE
  TO authenticated
  USING (applier_player_id = auth.uid());

-- Organizers can manage all blowouts in their leagues
CREATE POLICY "Organizers can manage blowouts"
  ON weekly_event_blowouts FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_events we
      JOIN league_organizers lo ON lo.league_id = we.league_id
      WHERE we.id = weekly_event_blowouts.event_id
      AND lo.player_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_events we
      JOIN league_organizers lo ON lo.league_id = we.league_id
      WHERE we.id = event_id
      AND lo.player_id = auth.uid()
    )
  );
