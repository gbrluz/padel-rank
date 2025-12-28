/*
  # Allow league organizers to update attendance records

  1. Changes
    - Updates the existing policy for weekly_event_attendance to allow organizers
      from league_organizers table to update attendance records (for reset functionality)

  2. Security
    - Organizers can only update attendance for events in their leagues
    - Maintains existing permissions for players and admins
*/

DROP POLICY IF EXISTS "Players can update their own attendance" ON weekly_event_attendance;

CREATE POLICY "Players can update their own attendance"
  ON weekly_event_attendance
  FOR UPDATE
  TO authenticated
  USING (
    (player_id = auth.uid()) OR
    (EXISTS (
      SELECT 1
      FROM weekly_events we
      JOIN leagues l ON l.id = we.league_id
      WHERE we.id = weekly_event_attendance.event_id
      AND l.created_by = auth.uid()
    )) OR
    (EXISTS (
      SELECT 1
      FROM weekly_events we
      JOIN league_organizers lo ON lo.league_id = we.league_id
      WHERE we.id = weekly_event_attendance.event_id
      AND lo.player_id = auth.uid()
    )) OR
    is_admin()
  );