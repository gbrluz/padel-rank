/*
  # Padel Management System - Complete Database Schema

  ## Overview
  This migration creates a comprehensive padel match management system with ranking functionality.
  The system separates rankings by gender and implements a Premier Padel-style point calculation system.

  ## New Tables

  ### 1. `profiles`
  Extends auth.users with padel-specific profile information
  - `id` (uuid, references auth.users)
  - `full_name` (text) - Player's complete name
  - `gender` (text) - 'male' or 'female'
  - `birth_date` (date) - Date of birth
  - `preferred_side` (text) - 'left', 'right', or 'both'
  - `category` (text) - Skill category
  - `state` (text) - Brazilian state
  - `city` (text) - City name
  - `availability` (jsonb) - Weekly availability by day and period
  - `photo_url` (text) - Profile photo URL
  - `ranking_points` (integer) - Current ranking points
  - `total_matches` (integer) - Total matches played
  - `total_wins` (integer) - Total matches won
  - `win_rate` (numeric) - Calculated win percentage
  - `is_admin` (boolean) - Admin access flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `matches`
  Stores all padel matches in the system
  - `id` (uuid, primary key)
  - `gender` (text) - Match gender category
  - `status` (text) - 'pending_approval', 'scheduled', 'cancelled', 'completed'
  - `team_a_player1_id` (uuid) - First player of team A
  - `team_a_player2_id` (uuid) - Second player of team A
  - `team_b_player1_id` (uuid) - First player of team B
  - `team_b_player2_id` (uuid) - Second player of team B
  - `team_a_score` (integer) - Team A final score
  - `team_b_score` (integer) - Team B final score
  - `winner_team` (text) - 'team_a' or 'team_b'
  - `team_a_was_duo` (boolean) - Team A entered queue as duo
  - `team_b_was_duo` (boolean) - Team B entered queue as duo
  - `scheduled_date` (timestamptz) - When match is scheduled
  - `completed_at` (timestamptz) - When match was completed
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `match_approvals`
  Tracks individual player approvals for matches
  - `id` (uuid, primary key)
  - `match_id` (uuid) - Reference to match
  - `player_id` (uuid) - Reference to player
  - `approved` (boolean) - Approval status
  - `approved_at` (timestamptz) - When approved/rejected
  - `created_at` (timestamptz)

  ### 4. `queue_entries`
  Manages the matchmaking queue
  - `id` (uuid, primary key)
  - `player_id` (uuid) - Main player entering queue
  - `partner_id` (uuid, nullable) - Optional duo partner
  - `gender` (text) - Player gender for matching
  - `status` (text) - 'active', 'matched', 'cancelled'
  - `average_ranking` (integer) - Average ranking for matchmaking
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `ranking_history`
  Tracks historical ranking changes
  - `id` (uuid, primary key)
  - `player_id` (uuid) - Reference to player
  - `match_id` (uuid) - Reference to match causing change
  - `points_before` (integer) - Points before match
  - `points_after` (integer) - Points after match
  - `points_change` (integer) - Net change in points
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Authenticated users can read most data
  - Users can only update their own profile
  - Match results can be reported by participants
  - Admin users have elevated permissions
  - Queue operations restricted to own entries

  ## Notes
  1. Gender separation ensures fair competition (male/female)
  2. Duo penalty: 20% less points when entering as pair
  3. Point calculation based on opponent ranking (Premier Padel style)
  4. Match approval requires all 4 players within 24 hours
  5. Availability stored as JSON: {"monday": ["morning", "evening"], ...}
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  birth_date date NOT NULL,
  preferred_side text NOT NULL CHECK (preferred_side IN ('left', 'right', 'both')),
  category text NOT NULL,
  state text NOT NULL,
  city text NOT NULL,
  availability jsonb NOT NULL DEFAULT '{}',
  photo_url text,
  ranking_points integer NOT NULL DEFAULT 1000,
  total_matches integer NOT NULL DEFAULT 0,
  total_wins integer NOT NULL DEFAULT 0,
  win_rate numeric(5,2) NOT NULL DEFAULT 0.00,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  status text NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'scheduled', 'cancelled', 'completed')),
  team_a_player1_id uuid NOT NULL REFERENCES profiles(id),
  team_a_player2_id uuid NOT NULL REFERENCES profiles(id),
  team_b_player1_id uuid NOT NULL REFERENCES profiles(id),
  team_b_player2_id uuid NOT NULL REFERENCES profiles(id),
  team_a_score integer,
  team_b_score integer,
  winner_team text CHECK (winner_team IN ('team_a', 'team_b')),
  team_a_was_duo boolean NOT NULL DEFAULT false,
  team_b_was_duo boolean NOT NULL DEFAULT false,
  scheduled_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT different_players CHECK (
    team_a_player1_id != team_a_player2_id AND
    team_a_player1_id != team_b_player1_id AND
    team_a_player1_id != team_b_player2_id AND
    team_a_player2_id != team_b_player1_id AND
    team_a_player2_id != team_b_player2_id AND
    team_b_player1_id != team_b_player2_id
  )
);

-- Create match_approvals table
CREATE TABLE IF NOT EXISTS match_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES profiles(id),
  approved boolean,
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(match_id, player_id)
);

-- Create queue_entries table
CREATE TABLE IF NOT EXISTS queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES profiles(id),
  partner_id uuid REFERENCES profiles(id),
  gender text NOT NULL CHECK (gender IN ('male', 'female')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'matched', 'cancelled')),
  average_ranking integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT different_duo_players CHECK (player_id != partner_id)
);

-- Create ranking_history table
CREATE TABLE IF NOT EXISTS ranking_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES profiles(id),
  match_id uuid NOT NULL REFERENCES matches(id),
  points_before integer NOT NULL,
  points_after integer NOT NULL,
  points_change integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_gender_ranking ON profiles(gender, ranking_points DESC);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_gender ON matches(gender);
CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_gender ON queue_entries(gender);
CREATE INDEX IF NOT EXISTS idx_match_approvals_match ON match_approvals(match_id);
CREATE INDEX IF NOT EXISTS idx_ranking_history_player ON ranking_history(player_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for matches
CREATE POLICY "Users can view all matches"
  ON matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Match participants can update results"
  ON matches FOR UPDATE
  TO authenticated
  USING (
    auth.uid() IN (team_a_player1_id, team_a_player2_id, team_b_player1_id, team_b_player2_id)
  )
  WITH CHECK (
    auth.uid() IN (team_a_player1_id, team_a_player2_id, team_b_player1_id, team_b_player2_id)
  );

-- RLS Policies for match_approvals
CREATE POLICY "Users can view approvals for their matches"
  ON match_approvals FOR SELECT
  TO authenticated
  USING (
    player_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = match_id
      AND auth.uid() IN (m.team_a_player1_id, m.team_a_player2_id, m.team_b_player1_id, m.team_b_player2_id)
    )
  );

CREATE POLICY "Users can insert own approvals"
  ON match_approvals FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "Users can update own approvals"
  ON match_approvals FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

-- RLS Policies for queue_entries
CREATE POLICY "Users can view all active queue entries"
  ON queue_entries FOR SELECT
  TO authenticated
  USING (status = 'active' OR player_id = auth.uid() OR partner_id = auth.uid());

CREATE POLICY "Users can insert own queue entries"
  ON queue_entries FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "Users can update own queue entries"
  ON queue_entries FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "Users can delete own queue entries"
  ON queue_entries FOR DELETE
  TO authenticated
  USING (player_id = auth.uid());

-- RLS Policies for ranking_history
CREATE POLICY "Users can view all ranking history"
  ON ranking_history FOR SELECT
  TO authenticated
  USING (true);

-- Function to update profile updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_queue_entries_updated_at
  BEFORE UPDATE ON queue_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate win rate
CREATE OR REPLACE FUNCTION calculate_win_rate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.total_matches > 0 THEN
    NEW.win_rate := ROUND((NEW.total_wins::numeric / NEW.total_matches::numeric) * 100, 2);
  ELSE
    NEW.win_rate := 0.00;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate win rate
CREATE TRIGGER update_win_rate
  BEFORE INSERT OR UPDATE OF total_matches, total_wins ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION calculate_win_rate();