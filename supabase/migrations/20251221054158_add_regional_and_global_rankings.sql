/*
  # Regional and Global Ranking System with Leagues

  ## Overview
  This migration implements a comprehensive multi-tier ranking system:
  - Regional rankings (primary, used for matchmaking)
  - Global rankings (comparative, calculated from regional performance and region strength)
  - Leagues system (parallel rankings for clubs, friends, official competitions)

  ## Changes to Existing Tables

  ### `profiles`
  - Add `global_ranking_points` (numeric) - Calculated global ranking considering region strength
  - Rename `ranking_points` conceptually remains as regional ranking

  ## New Tables

  ### 1. `regions`
  Tracks strength of each geographic region
  - `id` (uuid, primary key)
  - `state` (text) - Brazilian state code
  - `city` (text) - City name
  - `strength_factor` (numeric) - Region competitive strength (default 1.0)
  - `total_players` (integer) - Active players in region
  - `total_matches` (integer) - Matches played in region
  - `inter_regional_wins` (integer) - Wins against other regions
  - `inter_regional_losses` (integer) - Losses against other regions
  - `updated_at` (timestamptz)
  - `created_at` (timestamptz)

  ### 2. `leagues`
  Different competition leagues (club, friends, official)
  - `id` (uuid, primary key)
  - `name` (text) - League name
  - `type` (text) - 'club', 'friends', 'official'
  - `description` (text) - League description
  - `created_by` (uuid) - Creator user id
  - `affects_regional_ranking` (boolean) - Whether matches affect regional ranking
  - `region_state` (text, nullable) - State if region-specific
  - `region_city` (text, nullable) - City if region-specific
  - `is_active` (boolean) - League active status
  - `start_date` (date) - League start date
  - `end_date` (date, nullable) - League end date
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. `league_memberships`
  Players participating in leagues
  - `id` (uuid, primary key)
  - `league_id` (uuid) - Reference to league
  - `player_id` (uuid) - Reference to player
  - `joined_at` (timestamptz)
  - `status` (text) - 'active', 'inactive'

  ### 4. `league_rankings`
  Rankings within each league
  - `id` (uuid, primary key)
  - `league_id` (uuid) - Reference to league
  - `player_id` (uuid) - Reference to player
  - `points` (integer) - Points in this league
  - `matches_played` (integer) - Matches in this league
  - `wins` (integer) - Wins in this league
  - `losses` (integer) - Losses in this league
  - `win_rate` (numeric) - Calculated win percentage
  - `updated_at` (timestamptz)

  ## Changes to Matches Table
  - Add `league_id` (uuid, nullable) - Reference to league if league match
  - Add `is_inter_regional` (boolean) - Flag for matches between different regions

  ## Functions

  ### `calculate_global_ranking(player_id uuid)`
  Calculates global ranking based on regional points and region strength

  ### `update_region_strength(state text, city text, won boolean, opponent_state text, opponent_city text)`
  Updates region strength after inter-regional matches

  ## Security
  - RLS enabled on all new tables
  - Users can view all leagues
  - Only league creators and admins can modify leagues
  - Users can view league rankings
  - League memberships managed by league admins

  ## Notes
  1. Regional ranking remains the primary ranking for matchmaking
  2. Global ranking is comparative only, calculated periodically
  3. Region strength starts at 1.0 and adjusts gradually based on inter-regional results
  4. Leagues have independent rankings that may or may not affect regional ranking
*/

-- Add global ranking field to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS global_ranking_points numeric DEFAULT 0;

-- Create regions table
CREATE TABLE IF NOT EXISTS regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state text NOT NULL,
  city text NOT NULL,
  strength_factor numeric DEFAULT 1.0 CHECK (strength_factor >= 0.5 AND strength_factor <= 2.0),
  total_players integer DEFAULT 0,
  total_matches integer DEFAULT 0,
  inter_regional_wins integer DEFAULT 0,
  inter_regional_losses integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(state, city)
);

-- Create leagues table
CREATE TABLE IF NOT EXISTS leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('club', 'friends', 'official')),
  description text DEFAULT '',
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  affects_regional_ranking boolean DEFAULT false,
  region_state text,
  region_city text,
  is_active boolean DEFAULT true,
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create league memberships table
CREATE TABLE IF NOT EXISTS league_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(league_id, player_id)
);

-- Create league rankings table
CREATE TABLE IF NOT EXISTS league_rankings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points integer DEFAULT 0,
  matches_played integer DEFAULT 0,
  wins integer DEFAULT 0,
  losses integer DEFAULT 0,
  win_rate numeric DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(league_id, player_id)
);

-- Add league reference to matches
ALTER TABLE matches
ADD COLUMN IF NOT EXISTS league_id uuid REFERENCES leagues(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_inter_regional boolean DEFAULT false;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_regions_state_city ON regions(state, city);
CREATE INDEX IF NOT EXISTS idx_leagues_type ON leagues(type);
CREATE INDEX IF NOT EXISTS idx_leagues_active ON leagues(is_active);
CREATE INDEX IF NOT EXISTS idx_league_memberships_league ON league_memberships(league_id);
CREATE INDEX IF NOT EXISTS idx_league_memberships_player ON league_memberships(player_id);
CREATE INDEX IF NOT EXISTS idx_league_rankings_league ON league_rankings(league_id);
CREATE INDEX IF NOT EXISTS idx_league_rankings_player ON league_rankings(player_id);
CREATE INDEX IF NOT EXISTS idx_matches_league ON matches(league_id);

-- Function to calculate global ranking
CREATE OR REPLACE FUNCTION calculate_global_ranking(p_player_id uuid)
RETURNS numeric AS $$
DECLARE
  v_regional_points integer;
  v_state text;
  v_city text;
  v_strength_factor numeric;
  v_global_points numeric;
BEGIN
  SELECT ranking_points, state, city
  INTO v_regional_points, v_state, v_city
  FROM profiles
  WHERE id = p_player_id;

  SELECT COALESCE(strength_factor, 1.0)
  INTO v_strength_factor
  FROM regions
  WHERE state = v_state AND city = v_city;

  IF v_strength_factor IS NULL THEN
    v_strength_factor := 1.0;
  END IF;

  v_global_points := v_regional_points * v_strength_factor;

  RETURN v_global_points;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update region strength after inter-regional match
CREATE OR REPLACE FUNCTION update_region_strength(
  p_winner_state text,
  p_winner_city text,
  p_loser_state text,
  p_loser_city text
)
RETURNS void AS $$
DECLARE
  v_adjustment numeric := 0.01;
  v_max_strength numeric := 2.0;
  v_min_strength numeric := 0.5;
BEGIN
  INSERT INTO regions (state, city, inter_regional_wins, inter_regional_losses)
  VALUES (p_winner_state, p_winner_city, 1, 0)
  ON CONFLICT (state, city) DO UPDATE SET
    inter_regional_wins = regions.inter_regional_wins + 1,
    strength_factor = LEAST(v_max_strength, regions.strength_factor + v_adjustment),
    updated_at = now();

  INSERT INTO regions (state, city, inter_regional_wins, inter_regional_losses)
  VALUES (p_loser_state, p_loser_city, 0, 1)
  ON CONFLICT (state, city) DO UPDATE SET
    inter_regional_losses = regions.inter_regional_losses + 1,
    strength_factor = GREATEST(v_min_strength, regions.strength_factor - v_adjustment),
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update league rankings after match
CREATE OR REPLACE FUNCTION update_league_ranking(
  p_league_id uuid,
  p_player_id uuid,
  p_points_change integer,
  p_won boolean
)
RETURNS void AS $$
BEGIN
  INSERT INTO league_rankings (league_id, player_id, points, matches_played, wins, losses)
  VALUES (p_league_id, p_player_id, p_points_change, 1, CASE WHEN p_won THEN 1 ELSE 0 END, CASE WHEN p_won THEN 0 ELSE 1 END)
  ON CONFLICT (league_id, player_id) DO UPDATE SET
    points = league_rankings.points + p_points_change,
    matches_played = league_rankings.matches_played + 1,
    wins = league_rankings.wins + CASE WHEN p_won THEN 1 ELSE 0 END,
    losses = league_rankings.losses + CASE WHEN p_won THEN 0 ELSE 1 END,
    win_rate = (league_rankings.wins + CASE WHEN p_won THEN 1 ELSE 0 END)::numeric /
               (league_rankings.matches_played + 1)::numeric * 100,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update global ranking when regional ranking changes
CREATE OR REPLACE FUNCTION update_global_ranking_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.global_ranking_points := calculate_global_ranking(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_global_ranking ON profiles;
CREATE TRIGGER trigger_update_global_ranking
BEFORE UPDATE OF ranking_points ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_global_ranking_trigger();

-- Enable RLS
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE league_rankings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for regions
CREATE POLICY "Regions are viewable by everyone"
  ON regions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update regions"
  ON regions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for leagues
CREATE POLICY "Leagues are viewable by everyone"
  ON leagues FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create leagues"
  ON leagues FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "League creators and admins can update leagues"
  ON leagues FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "League creators and admins can delete leagues"
  ON leagues FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- RLS Policies for league memberships
CREATE POLICY "League memberships are viewable by everyone"
  ON league_memberships FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "League creators and admins can manage memberships"
  ON league_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = league_id
      AND (leagues.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      ))
    )
  );

CREATE POLICY "League creators and admins can update memberships"
  ON league_memberships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = league_id
      AND (leagues.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      ))
    )
  );

CREATE POLICY "League creators and admins can delete memberships"
  ON league_memberships FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM leagues
      WHERE leagues.id = league_id
      AND (leagues.created_by = auth.uid() OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
      ))
    )
  );

-- RLS Policies for league rankings
CREATE POLICY "League rankings are viewable by everyone"
  ON league_rankings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "System can update league rankings"
  ON league_rankings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update league rankings update"
  ON league_rankings FOR UPDATE
  TO authenticated
  USING (true);