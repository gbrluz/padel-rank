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

-- Create separate policies for organizers

-- Organizers can INSERT blowouts for any player
CREATE POLICY "Organizers can insert blowouts"
  ON weekly_event_blowouts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM weekly_events we
      JOIN league_organizers lo ON lo.league_id = we.league_id
      WHERE we.id = weekly_event_blowouts.event_id
      AND lo.player_id = auth.uid()
    )
  );

-- Organizers can DELETE blowouts for any player in their leagues
CREATE POLICY "Organizers can delete blowouts"
  ON weekly_event_blowouts FOR DELETE
  TO authenticated
  USING (
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
