/*
  # Add Weekly Event Pair Draws

  ## New Tables

  ### `weekly_event_draws`
  Stores the pair draw results for weekly events.
  - `id` (uuid, primary key) - Unique identifier for the draw
  - `league_id` (uuid, foreign key) - Reference to the league
  - `event_date` (date) - Date of the weekly event
  - `drawn_at` (timestamptz) - When the draw was performed
  - `drawn_by` (uuid, foreign key) - Who performed the draw (organizer)
  - `created_at` (timestamptz) - Record creation timestamp

  ### `weekly_event_pairs`
  Stores individual pairs from the draw.
  - `id` (uuid, primary key) - Unique identifier for the pair
  - `draw_id` (uuid, foreign key) - Reference to the draw
  - `player1_id` (uuid, foreign key) - First player in the pair
  - `player2_id` (uuid, foreign key, nullable) - Second player (null if wildcard/coringa)
  - `pair_number` (integer) - Order/number of the pair in the draw
  - `is_top_12` (boolean) - Whether this pair was drawn from top 12 players
  - `created_at` (timestamptz) - Record creation timestamp

  ## Security
  - Enable RLS on both tables
  - League members can view draws for their leagues
  - Only organizers can create draws
*/

-- Create weekly_event_draws table
CREATE TABLE IF NOT EXISTS weekly_event_draws (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  event_date date NOT NULL,
  drawn_at timestamptz NOT NULL DEFAULT now(),
  drawn_by uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(league_id, event_date)
);

-- Create weekly_event_pairs table
CREATE TABLE IF NOT EXISTS weekly_event_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL REFERENCES weekly_event_draws(id) ON DELETE CASCADE,
  player1_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player2_id uuid REFERENCES players(id) ON DELETE CASCADE,
  pair_number integer NOT NULL,
  is_top_12 boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE weekly_event_draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_event_pairs ENABLE ROW LEVEL SECURITY;

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_weekly_event_draws_league_date ON weekly_event_draws(league_id, event_date);
CREATE INDEX IF NOT EXISTS idx_weekly_event_pairs_draw ON weekly_event_pairs(draw_id);
CREATE INDEX IF NOT EXISTS idx_weekly_event_pairs_players ON weekly_event_pairs(player1_id, player2_id);

-- RLS Policies for weekly_event_draws

-- League members can view draws for their leagues
CREATE POLICY "League members can view draws"
  ON weekly_event_draws FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_memberships.league_id = weekly_event_draws.league_id
      AND league_memberships.player_id = auth.uid()
      AND league_memberships.status = 'active'
    )
  );

-- Organizers can insert draws
CREATE POLICY "Organizers can create draws"
  ON weekly_event_draws FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_organizers
      WHERE league_organizers.league_id = weekly_event_draws.league_id
      AND league_organizers.player_id = auth.uid()
    )
  );

-- Organizers can delete draws (to redo if needed)
CREATE POLICY "Organizers can delete draws"
  ON weekly_event_draws FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_organizers
      WHERE league_organizers.league_id = weekly_event_draws.league_id
      AND league_organizers.player_id = auth.uid()
    )
  );

-- RLS Policies for weekly_event_pairs

-- League members can view pairs for draws they can see
CREATE POLICY "League members can view pairs"
  ON weekly_event_pairs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_event_draws wed
      JOIN league_memberships lm ON lm.league_id = wed.league_id
      WHERE wed.id = weekly_event_pairs.draw_id
      AND lm.player_id = auth.uid()
      AND lm.status = 'active'
    )
  );

-- Organizers can insert pairs
CREATE POLICY "Organizers can create pairs"
  ON weekly_event_pairs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_event_draws wed
      JOIN league_organizers lo ON lo.league_id = wed.league_id
      WHERE wed.id = weekly_event_pairs.draw_id
      AND lo.player_id = auth.uid()
    )
  );

-- Organizers can delete pairs
CREATE POLICY "Organizers can delete pairs"
  ON weekly_event_pairs FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM weekly_event_draws wed
      JOIN league_organizers lo ON lo.league_id = wed.league_id
      WHERE wed.id = weekly_event_pairs.draw_id
      AND lo.player_id = auth.uid()
    )
  );