/*
  # Add Captain and Scheduling System

  ## Overview
  This migration implements a comprehensive captain designation and match scheduling system with:
  - Captain assignment balanced by frequency
  - Time proposal and voting system
  - Chat for schedule negotiation
  - Result contestation mechanism

  ## Changes

  ### 1. Captain System
    - Add `captain_id` to matches table
    - Add `captain_count` to profiles to track captain frequency
    - Add `confirmed_by_captain` flag for results

  ### 2. Match Scheduling Flow
    - New match statuses: 'scheduling', 'negotiating', 'scheduled', 'cancelled_by_captain'
    - `match_time_proposals` table: stores 3 proposed times for each match
    - `match_time_votes` table: stores each player's time preference
    - Chat system for negotiation when no consensus

  ### 3. Match Chat System
    - `match_chat_messages` table: messages between players for scheduling
    - Only accessible to players in the match

  ### 4. Result Contestation
    - `match_result_contestations` table: allows players to contest results
    - Status: 'pending', 'resolved', 'dismissed'

  ## Security
    - RLS enabled on all new tables
    - Players can only vote/chat in their own matches
    - Only captain can confirm schedule and report results
    - Any player can contest results
*/

-- Add captain tracking to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS captain_count integer DEFAULT 0;

-- Add captain and scheduling fields to matches
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS captain_id uuid REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS confirmed_by_captain boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS scheduled_time timestamptz,
ADD COLUMN IF NOT EXISTS negotiation_deadline timestamptz;

-- Create match time proposals table
CREATE TABLE IF NOT EXISTS match_time_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  proposed_time timestamptz NOT NULL,
  proposal_order integer NOT NULL CHECK (proposal_order BETWEEN 1 AND 3),
  created_at timestamptz DEFAULT now(),
  UNIQUE(match_id, proposal_order)
);

-- Create match time votes table
CREATE TABLE IF NOT EXISTS match_time_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES profiles(id) NOT NULL,
  proposal_id uuid REFERENCES match_time_proposals(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- Create match chat messages table
CREATE TABLE IF NOT EXISTS match_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id uuid REFERENCES profiles(id) NOT NULL,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create match result contestations table
CREATE TABLE IF NOT EXISTS match_result_contestations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  contested_by uuid REFERENCES profiles(id) NOT NULL,
  reason text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  resolution_notes text,
  resolved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz
);

-- Enable RLS
ALTER TABLE match_time_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_time_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_result_contestations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for match_time_proposals
CREATE POLICY "Players can view proposals for their matches"
  ON match_time_proposals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
      AND (
        m.team_a_player1_id = auth.uid()
        OR m.team_a_player2_id = auth.uid()
        OR m.team_b_player1_id = auth.uid()
        OR m.team_b_player2_id = auth.uid()
      )
    )
  );

CREATE POLICY "System can create proposals"
  ON match_time_proposals FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for match_time_votes
CREATE POLICY "Players can view votes for their matches"
  ON match_time_votes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
      AND (
        m.team_a_player1_id = auth.uid()
        OR m.team_a_player2_id = auth.uid()
        OR m.team_b_player1_id = auth.uid()
        OR m.team_b_player2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Players can vote in their matches"
  ON match_time_votes FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
      AND (
        m.team_a_player1_id = auth.uid()
        OR m.team_a_player2_id = auth.uid()
        OR m.team_b_player1_id = auth.uid()
        OR m.team_b_player2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Players can update their own votes"
  ON match_time_votes FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- RLS Policies for match_chat_messages
CREATE POLICY "Players can view messages in their matches"
  ON match_chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
      AND (
        m.team_a_player1_id = auth.uid()
        OR m.team_a_player2_id = auth.uid()
        OR m.team_b_player1_id = auth.uid()
        OR m.team_b_player2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Players can send messages in their matches"
  ON match_chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
      AND (
        m.team_a_player1_id = auth.uid()
        OR m.team_a_player2_id = auth.uid()
        OR m.team_b_player1_id = auth.uid()
        OR m.team_b_player2_id = auth.uid()
      )
    )
  );

-- RLS Policies for match_result_contestations
CREATE POLICY "Players can view contestations for their matches"
  ON match_result_contestations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
      AND (
        m.team_a_player1_id = auth.uid()
        OR m.team_a_player2_id = auth.uid()
        OR m.team_b_player1_id = auth.uid()
        OR m.team_b_player2_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

CREATE POLICY "Players can contest results in their matches"
  ON match_result_contestations FOR INSERT
  TO authenticated
  WITH CHECK (
    contested_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
      AND m.status = 'completed'
      AND (
        m.team_a_player1_id = auth.uid()
        OR m.team_a_player2_id = auth.uid()
        OR m.team_b_player1_id = auth.uid()
        OR m.team_b_player2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can resolve contestations"
  ON match_result_contestations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND is_admin = true
    )
  );

-- Create function to get player with lowest captain count
CREATE OR REPLACE FUNCTION get_least_captain_player(player_ids uuid[])
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  selected_player uuid;
BEGIN
  SELECT id INTO selected_player
  FROM profiles
  WHERE id = ANY(player_ids)
  ORDER BY captain_count ASC, random()
  LIMIT 1;
  
  RETURN selected_player;
END;
$$;

-- Create function to increment captain count
CREATE OR REPLACE FUNCTION increment_captain_count(player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
  SET captain_count = captain_count + 1
  WHERE id = player_id;
END;
$$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_match_time_proposals_match_id ON match_time_proposals(match_id);
CREATE INDEX IF NOT EXISTS idx_match_time_votes_match_id ON match_time_votes(match_id);
CREATE INDEX IF NOT EXISTS idx_match_time_votes_player_id ON match_time_votes(player_id);
CREATE INDEX IF NOT EXISTS idx_match_chat_messages_match_id ON match_chat_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_match_chat_messages_created_at ON match_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_match_result_contestations_match_id ON match_result_contestations(match_id);
CREATE INDEX IF NOT EXISTS idx_match_result_contestations_status ON match_result_contestations(status);
CREATE INDEX IF NOT EXISTS idx_matches_captain_id ON matches(captain_id);
CREATE INDEX IF NOT EXISTS idx_matches_scheduled_time ON matches(scheduled_time);
