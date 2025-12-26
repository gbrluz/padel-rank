/*
  # Fix League Attendance Insert Policy

  ## Changes
  
  ### Security Updates
    - Drop the admin-only insert policy for `league_attendance`
    - Add new policy allowing players to insert their own attendance records
    - Players can only create attendance for leagues they are members of
  
  ## Notes
    - This fixes the RLS error when players try to confirm attendance
    - Players can only insert records with their own player_id
    - Validates that the player is actually a member of the league
*/

-- Drop the old admin-only insert policy
DROP POLICY IF EXISTS "Admins can insert attendance records" ON league_attendance;

-- Allow players to insert their own attendance records for leagues they're in
CREATE POLICY "Players can insert own attendance"
  ON league_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM league_memberships
      WHERE league_memberships.league_id = league_attendance.league_id
      AND league_memberships.player_id = auth.uid()
      AND league_memberships.status = 'active'
    )
  );

-- Also allow admins to insert attendance records (for management purposes)
CREATE POLICY "Admins can insert any attendance"
  ON league_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid() AND players.is_admin = true
    )
  );