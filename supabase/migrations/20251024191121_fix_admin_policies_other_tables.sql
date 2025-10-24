/*
  # Fix Admin Policies for Other Tables

  ## Changes
  Update admin policies on other tables to use the is_admin() function
  to avoid any potential recursion issues.

  ## Tables Updated
  - matches
  - queue_entries
  - match_approvals
  - ranking_history
*/

-- Drop existing admin policies
DROP POLICY IF EXISTS "Admins can view all matches" ON matches;
DROP POLICY IF EXISTS "Admins can update all matches" ON matches;
DROP POLICY IF EXISTS "Admins can delete matches" ON matches;
DROP POLICY IF EXISTS "Admins can view all queue entries" ON queue_entries;
DROP POLICY IF EXISTS "Admins can delete queue entries" ON queue_entries;
DROP POLICY IF EXISTS "Admins can view all match approvals" ON match_approvals;
DROP POLICY IF EXISTS "Admins can view all ranking history" ON ranking_history;

-- Matches: Admin full access
CREATE POLICY "Admins can view all matches"
  ON matches FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all matches"
  ON matches FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete matches"
  ON matches FOR DELETE
  TO authenticated
  USING (is_admin());

-- Queue Entries: Admin access
CREATE POLICY "Admins can view all queue entries"
  ON queue_entries FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can delete queue entries"
  ON queue_entries FOR DELETE
  TO authenticated
  USING (is_admin());

-- Match Approvals: Admin view access
CREATE POLICY "Admins can view all match approvals"
  ON match_approvals FOR SELECT
  TO authenticated
  USING (is_admin());

-- Ranking History: Admin view access
CREATE POLICY "Admins can view all ranking history"
  ON ranking_history FOR SELECT
  TO authenticated
  USING (is_admin());
