/*
  # Clean Up Weekly Event Blowouts RLS Policies

  ## Problem

  Multiple duplicate policies exist for weekly_event_blowouts causing conflicts.
  Need to remove ALL existing policies and create clean ones.

  ## Solution

  1. Drop ALL existing policies (old and new)
  2. Create fresh, clean policies for:
     - SELECT (view)
     - INSERT (players and organizers)
     - DELETE (players and organizers)

*/

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "League members can view event blowouts" ON weekly_event_blowouts;
DROP POLICY IF EXISTS "Players can record blowouts they applied" ON weekly_event_blowouts;
DROP POLICY IF EXISTS "Players can delete own blowout records" ON weekly_event_blowouts;
DROP POLICY IF EXISTS "Organizers can manage blowouts" ON weekly_event_blowouts;
DROP POLICY IF EXISTS "League members can register blowouts" ON weekly_event_blowouts;
DROP POLICY IF EXISTS "Organizers can insert blowouts" ON weekly_event_blowouts;
DROP POLICY IF EXISTS "Organizers can delete blowouts" ON weekly_event_blowouts;
DROP POLICY IF EXISTS "Players and organizers can insert blowouts" ON weekly_event_blowouts;
DROP POLICY IF EXISTS "Players and organizers can delete blowouts" ON weekly_event_blowouts;

-- Policy 1: League members can VIEW blowouts
CREATE POLICY "League members can view blowouts"
  ON weekly_event_blowouts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM weekly_events we
      JOIN league_memberships lm ON lm.league_id = we.league_id
      WHERE we.id = weekly_event_blowouts.event_id
      AND lm.player_id = auth.uid()
      AND lm.status = 'active'
    )
  );

-- Policy 2: Players and organizers can INSERT blowouts
CREATE POLICY "Players and organizers can insert blowouts"
  ON weekly_event_blowouts FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if user is in the pair (player registering their own blowout)
    (
      EXISTS (
        SELECT 1
        FROM weekly_events we
        JOIN league_memberships lm ON lm.league_id = we.league_id
        WHERE we.id = weekly_event_blowouts.event_id
        AND lm.player_id = auth.uid()
        AND lm.status = 'active'
      )
      AND EXISTS (
        SELECT 1
        FROM weekly_event_pairs wep
        WHERE wep.id = weekly_event_blowouts.applier_pair_id
        AND (wep.player1_id = auth.uid() OR wep.player2_id = auth.uid())
      )
    )
    OR
    -- OR allow if user is an organizer
    EXISTS (
      SELECT 1
      FROM weekly_events we
      JOIN league_organizers lo ON lo.league_id = we.league_id
      WHERE we.id = weekly_event_blowouts.event_id
      AND lo.player_id = auth.uid()
    )
  );

-- Policy 3: Players and organizers can DELETE blowouts
CREATE POLICY "Players and organizers can delete blowouts"
  ON weekly_event_blowouts FOR DELETE
  TO authenticated
  USING (
    -- Allow if user is deleting their own blowouts
    applier_player_id = auth.uid()
    OR
    -- OR allow if user is an organizer
    EXISTS (
      SELECT 1
      FROM weekly_events we
      JOIN league_organizers lo ON lo.league_id = we.league_id
      WHERE we.id = weekly_event_blowouts.event_id
      AND lo.player_id = auth.uid()
    )
  );

-- Helpful comment
COMMENT ON TABLE weekly_event_blowouts IS
  'Blowout tracking. Players mark their own blowouts. Organizers can manage all blowouts in their leagues.';
