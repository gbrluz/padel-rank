/*
  # Recreate Weekly Event Matches for Pair-Based Confrontos

  ## Problem

  The existing `weekly_event_matches` table has a different structure:
  - References `event_id` and individual players
  - Used for tracking actual game results

  We need a different structure for confrontos (match pairings):
  - References `draw_id` and pairs
  - Used for showing which pairs play against each other

  ## Solution

  1. Drop the old table (if it has no critical data)
  2. Create new table with pair-based structure
  3. Add RLS policies for league members to view

*/

-- Drop the old table structure
-- WARNING: This will delete any existing match data
DROP TABLE IF EXISTS public.weekly_event_matches CASCADE;

-- Create the new matches table for confrontos
CREATE TABLE public.weekly_event_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL REFERENCES weekly_event_draws(id) ON DELETE CASCADE,
  pair1_id uuid NOT NULL REFERENCES weekly_event_pairs(id) ON DELETE CASCADE,
  pair2_id uuid NOT NULL REFERENCES weekly_event_pairs(id) ON DELETE CASCADE,
  match_number integer NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- Ensure pair1 != pair2
  CONSTRAINT different_pairs CHECK (pair1_id != pair2_id),
  -- Unique match per draw (prevent duplicate pairings)
  CONSTRAINT unique_match_per_draw UNIQUE (draw_id, pair1_id, pair2_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_weekly_matches_draw ON weekly_event_matches(draw_id);
CREATE INDEX idx_weekly_matches_pair1 ON weekly_event_matches(pair1_id);
CREATE INDEX idx_weekly_matches_pair2 ON weekly_event_matches(pair2_id);

-- Enable RLS
ALTER TABLE weekly_event_matches ENABLE ROW LEVEL SECURITY;

-- Policy: League members can view matches
CREATE POLICY "League members can view matches"
  ON weekly_event_matches FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM weekly_event_draws wed
      JOIN league_memberships lm ON lm.league_id = wed.league_id
      WHERE wed.id = weekly_event_matches.draw_id
      AND lm.player_id = auth.uid()
      AND lm.status = 'active'
    )
  );

-- Policy: Organizers can insert matches
CREATE POLICY "Organizers can create matches"
  ON weekly_event_matches FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM weekly_event_draws wed
      JOIN league_organizers lo ON lo.league_id = wed.league_id
      WHERE wed.id = weekly_event_matches.draw_id
      AND lo.player_id = auth.uid()
    )
  );

-- Policy: Organizers can delete matches
CREATE POLICY "Organizers can delete matches"
  ON weekly_event_matches FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM weekly_event_draws wed
      JOIN league_organizers lo ON lo.league_id = wed.league_id
      WHERE wed.id = weekly_event_matches.draw_id
      AND lo.player_id = auth.uid()
    )
  );

-- Add helpful comments
COMMENT ON TABLE weekly_event_matches IS
  'Stores match pairings (confrontos) between pairs. Each pair typically plays 4 matches per event. This is different from actual game results.';

COMMENT ON COLUMN weekly_event_matches.draw_id IS
  'References the draw that generated these match pairings';

COMMENT ON COLUMN weekly_event_matches.pair1_id IS
  'First pair in the confronto';

COMMENT ON COLUMN weekly_event_matches.pair2_id IS
  'Second pair in the confronto';

COMMENT ON COLUMN weekly_event_matches.match_number IS
  'Sequential match number for display ordering (1, 2, 3, 4...)';
