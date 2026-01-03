/*
  # Create Weekly Event Matches Table

  ## Purpose
  Store match pairings (confrontos) between pairs for each event.
  Each pair plays 4 matches against different pairs.

  ## Table Structure
  - id: unique match ID
  - draw_id: references the draw this match belongs to
  - pair1_id: first pair in the match
  - pair2_id: second pair in the match
  - match_number: sequential number for ordering (1-based)
  - created_at: timestamp

  ## Constraints
  - Both pairs must be from the same draw
  - A pair cannot play against itself
  - Match combination (pair1 + pair2) should be unique per draw
  - Ordered storage: pair1_id < pair2_id (prevents duplicates like A-B and B-A)

  ## RLS Policies
  - League members can view matches for their leagues
  - Organizers can create/update/delete matches

*/

-- Create the matches table
CREATE TABLE IF NOT EXISTS weekly_event_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id uuid NOT NULL REFERENCES weekly_event_draws(id) ON DELETE CASCADE,
  pair1_id uuid NOT NULL REFERENCES weekly_event_pairs(id) ON DELETE CASCADE,
  pair2_id uuid NOT NULL REFERENCES weekly_event_pairs(id) ON DELETE CASCADE,
  match_number integer NOT NULL,
  created_at timestamptz DEFAULT now(),

  -- Ensure pair1 < pair2 for consistent ordering
  CONSTRAINT different_pairs CHECK (pair1_id != pair2_id),
  -- Unique match per draw
  CONSTRAINT unique_match_per_draw UNIQUE (draw_id, pair1_id, pair2_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_weekly_matches_draw ON weekly_event_matches(draw_id);
CREATE INDEX IF NOT EXISTS idx_weekly_matches_pair1 ON weekly_event_matches(pair1_id);
CREATE INDEX IF NOT EXISTS idx_weekly_matches_pair2 ON weekly_event_matches(pair2_id);

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

-- Add helpful comment
COMMENT ON TABLE weekly_event_matches IS
  'Stores match pairings (confrontos) between pairs. Each pair typically plays 4 matches per event.';

COMMENT ON COLUMN weekly_event_matches.match_number IS
  'Sequential match number for display ordering (1, 2, 3, 4...)';
