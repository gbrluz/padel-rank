/*
  # Add League Organizers System

  1. New Tables
    - `league_organizers`
      - `id` (uuid, primary key)
      - `league_id` (uuid) - Reference to the league
      - `player_id` (uuid) - Reference to the organizer player
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `league_organizers` table
    - Admins can manage organizers
    - Organizers can view their assignments

  3. Notes
    - Organizers can add/remove members
    - Organizers can manage weekly scores for league members
    - Multiple organizers can be assigned to a single league
*/

-- Create league_organizers table
CREATE TABLE IF NOT EXISTS league_organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(league_id, player_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_league_organizers_league ON league_organizers(league_id);
CREATE INDEX IF NOT EXISTS idx_league_organizers_player ON league_organizers(player_id);

-- Enable Row Level Security
ALTER TABLE league_organizers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for league_organizers
CREATE POLICY "Users can view league organizers"
  ON league_organizers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert league organizers"
  ON league_organizers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.is_admin = true
    )
  );

CREATE POLICY "Admins can delete league organizers"
  ON league_organizers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.is_admin = true
    )
  );

-- Add policy for organizers to manage league_memberships
CREATE POLICY "Organizers can insert league memberships"
  ON league_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_organizers
      WHERE league_organizers.league_id = league_memberships.league_id
      AND league_organizers.player_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.is_admin = true
    )
  );

CREATE POLICY "Organizers can delete league memberships"
  ON league_memberships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_organizers
      WHERE league_organizers.league_id = league_memberships.league_id
      AND league_organizers.player_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.is_admin = true
    )
  );

-- Add policy for organizers to manage league_rankings
CREATE POLICY "Organizers can update league rankings"
  ON league_rankings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_organizers
      WHERE league_organizers.league_id = league_rankings.league_id
      AND league_organizers.player_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_organizers
      WHERE league_organizers.league_id = league_rankings.league_id
      AND league_organizers.player_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.is_admin = true
    )
  );

CREATE POLICY "Organizers can insert league rankings"
  ON league_rankings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_organizers
      WHERE league_organizers.league_id = league_rankings.league_id
      AND league_organizers.player_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.is_admin = true
    )
  );

-- Add policy for organizers to manage league_join_requests
CREATE POLICY "Organizers can update join requests"
  ON league_join_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_organizers
      WHERE league_organizers.league_id = league_join_requests.league_id
      AND league_organizers.player_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_organizers
      WHERE league_organizers.league_id = league_join_requests.league_id
      AND league_organizers.player_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.is_admin = true
    )
  );
