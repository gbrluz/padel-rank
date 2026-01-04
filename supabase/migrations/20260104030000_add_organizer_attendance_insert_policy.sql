/*
  # Add Organizer INSERT Policy for Weekly Event Attendance

  ## Problem

  When organizers try to edit player scores using UPSERT, they get RLS error.
  The current policies allow organizers to UPDATE, but not INSERT.

  Since UPSERT tries INSERT first, then UPDATE on conflict, organizers need
  INSERT permission as well.

  ## Solution

  Add a policy that allows organizers to INSERT attendance records for any
  player in their leagues.

*/

-- Add INSERT policy for organizers
CREATE POLICY "Organizers can insert attendance"
  ON weekly_event_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM weekly_events we
      JOIN league_organizers lo ON lo.league_id = we.league_id
      WHERE we.id = weekly_event_attendance.event_id
      AND lo.player_id = auth.uid()
    )
  );
