/*
  # Allow League Members to Insert Weekly Events
  
  1. Security Changes
    - Add INSERT policy for league members on weekly_events table
    - Members can create events for leagues they belong to
    
  2. Notes
    - This allows the scoring submission feature to work properly
    - Events are auto-created when members submit their scores
*/

CREATE POLICY "Members can insert events for their leagues"
  ON weekly_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM league_memberships lm
      WHERE lm.league_id = weekly_events.league_id
      AND lm.player_id = auth.uid()
      AND lm.status = 'active'
    )
    OR is_admin()
  );