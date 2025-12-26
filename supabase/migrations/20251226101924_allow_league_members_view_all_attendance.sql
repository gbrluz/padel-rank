/*
  # Allow League Members to View All Attendance

  ## Changes
  
  ### Security Updates
    - Drop the restrictive SELECT policy for `league_attendance`
    - Add new policy allowing league members to view all attendance records of their league
    - Admins can still view all records
  
  ## Notes
    - This allows players to see who confirmed attendance in the league ranking
    - Only members of the league can view attendance records
*/

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Players can view own attendance" ON league_attendance;

-- Allow league members to view all attendance records of their league
CREATE POLICY "League members can view attendance"
  ON league_attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_memberships.league_id = league_attendance.league_id
      AND league_memberships.player_id = auth.uid()
      AND league_memberships.status = 'active'
    )
    OR
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid() AND players.is_admin = true
    )
  );