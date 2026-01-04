/*
  # Add Organizer Policies for Blowout Management

  ## Problem

  When organizers try to edit player scores and manage blowouts, RLS policies
  are blocking the operations because organizers might not be in the player's pair.

  ## Solution

  Add explicit policies that allow organizers to:
  - INSERT blowouts for any player in their league
  - DELETE blowouts for any player in their league
  - UPDATE is not needed (we delete and re-insert)

  The existing "Organizers can manage blowouts" policy with FOR ALL might not be
  working correctly, so we'll create separate explicit policies.

*/

-- Drop the old generic "FOR ALL" policy if it exists
DROP POLICY IF EXISTS "Organizers can manage blowouts" ON weekly_event_blowouts;

-- Drop and recreate the INSERT policy to include organizers
DROP POLICY IF EXISTS "League members can register blowouts" ON weekly_event_blowouts;
DROP POLICY IF EXISTS "Players can record blowouts they applied" ON weekly_event_blowouts;

-- Create new INSERT policy that allows both players AND organizers
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
    -- OR allow if user is an organizer (organizer editing any player's blowouts)
    EXISTS (
      SELECT 1
      FROM weekly_events we
      JOIN league_organizers lo ON lo.league_id = we.league_id
      WHERE we.id = weekly_event_blowouts.event_id
      AND lo.player_id = auth.uid()
    )
  );

-- Drop and recreate DELETE policy to include organizers
DROP POLICY IF EXISTS "Players can delete own blowout records" ON weekly_event_blowouts;

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

-- Note: We don't need UPDATE policy because the app deletes and re-inserts blowouts

-- Add helpful comment
COMMENT ON TABLE weekly_event_blowouts IS
  'Stores blowout records. Each player can mark blowouts independently. Organizers can manage all blowouts in their leagues.';
