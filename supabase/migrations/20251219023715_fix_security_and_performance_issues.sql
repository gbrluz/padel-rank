/*
  # Fix Security and Performance Issues

  ## Changes
  1. Add indexes for all foreign keys to improve query performance
  2. Optimize RLS policies to use (select auth.uid()) pattern for better performance
  3. Remove unused indexes
  4. Consolidate multiple permissive policies into single policies
  5. Fix function search_path to be immutable

  ## Performance Improvements
  - Foreign key indexes will significantly improve JOIN performance
  - RLS optimization reduces function re-evaluation overhead
  - Removing unused indexes reduces write overhead
  - Consolidated policies are easier to maintain and slightly more efficient

  ## Security
  - Fixed function search_path to prevent potential security issues
  - All existing security policies maintained or improved
*/

-- ============================================================
-- 1. Add indexes for foreign keys
-- ============================================================

-- match_approvals indexes
CREATE INDEX IF NOT EXISTS idx_match_approvals_player_id 
  ON match_approvals(player_id);

-- matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_team_a_player1_id 
  ON matches(team_a_player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_a_player2_id 
  ON matches(team_a_player2_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_b_player1_id 
  ON matches(team_b_player1_id);
CREATE INDEX IF NOT EXISTS idx_matches_team_b_player2_id 
  ON matches(team_b_player2_id);

-- queue_entries indexes
CREATE INDEX IF NOT EXISTS idx_queue_entries_partner_id 
  ON queue_entries(partner_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_player_id 
  ON queue_entries(player_id);

-- ranking_history indexes
CREATE INDEX IF NOT EXISTS idx_ranking_history_match_id 
  ON ranking_history(match_id);

-- ============================================================
-- 2. Remove unused indexes
-- ============================================================

DROP INDEX IF EXISTS idx_matches_gender;
DROP INDEX IF EXISTS idx_queue_entries_status;
DROP INDEX IF EXISTS idx_queue_entries_gender;
DROP INDEX IF EXISTS idx_match_approvals_match;
DROP INDEX IF EXISTS idx_ranking_history_player;

-- ============================================================
-- 3. Optimize RLS policies - profiles table
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

-- Create optimized consolidated policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can update profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR (select auth.uid()) = id
  )
  WITH CHECK (
    is_admin() OR (select auth.uid()) = id
  );

-- ============================================================
-- 4. Optimize RLS policies - matches table
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all matches" ON matches;
DROP POLICY IF EXISTS "Admins can view all matches" ON matches;
DROP POLICY IF EXISTS "Match participants can update results" ON matches;
DROP POLICY IF EXISTS "Admins can update all matches" ON matches;

-- Create optimized consolidated policies
CREATE POLICY "Users can view all matches"
  ON matches FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update matches"
  ON matches FOR UPDATE
  TO authenticated
  USING (
    is_admin() OR 
    (select auth.uid()) IN (team_a_player1_id, team_a_player2_id, team_b_player1_id, team_b_player2_id)
  )
  WITH CHECK (
    is_admin() OR 
    (select auth.uid()) IN (team_a_player1_id, team_a_player2_id, team_b_player1_id, team_b_player2_id)
  );

-- ============================================================
-- 5. Optimize RLS policies - match_approvals table
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view approvals for their matches" ON match_approvals;
DROP POLICY IF EXISTS "Admins can view all match approvals" ON match_approvals;
DROP POLICY IF EXISTS "Users can insert own approvals" ON match_approvals;
DROP POLICY IF EXISTS "Users can update own approvals" ON match_approvals;

-- Create optimized consolidated policies
CREATE POLICY "Users can view match approvals"
  ON match_approvals FOR SELECT
  TO authenticated
  USING (
    is_admin() OR 
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.id = match_approvals.match_id
      AND (select auth.uid()) IN (
        matches.team_a_player1_id,
        matches.team_a_player2_id,
        matches.team_b_player1_id,
        matches.team_b_player2_id
      )
    )
  );

CREATE POLICY "Users can insert own approvals"
  ON match_approvals FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = player_id);

CREATE POLICY "Users can update own approvals"
  ON match_approvals FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = player_id)
  WITH CHECK ((select auth.uid()) = player_id);

-- ============================================================
-- 6. Optimize RLS policies - queue_entries table
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all active queue entries" ON queue_entries;
DROP POLICY IF EXISTS "Admins can view all queue entries" ON queue_entries;
DROP POLICY IF EXISTS "Users can insert own queue entries" ON queue_entries;
DROP POLICY IF EXISTS "Users can update own queue entries" ON queue_entries;
DROP POLICY IF EXISTS "Users can delete own queue entries" ON queue_entries;
DROP POLICY IF EXISTS "Admins can delete queue entries" ON queue_entries;

-- Create optimized consolidated policies
CREATE POLICY "Users can view queue entries"
  ON queue_entries FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own queue entries"
  ON queue_entries FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = player_id);

CREATE POLICY "Users can update own queue entries"
  ON queue_entries FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = player_id)
  WITH CHECK ((select auth.uid()) = player_id);

CREATE POLICY "Users can delete queue entries"
  ON queue_entries FOR DELETE
  TO authenticated
  USING (
    is_admin() OR (select auth.uid()) = player_id
  );

-- ============================================================
-- 7. Optimize RLS policies - ranking_history table
-- ============================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all ranking history" ON ranking_history;
DROP POLICY IF EXISTS "Admins can view all ranking history" ON ranking_history;

-- Create optimized policy
CREATE POLICY "Users can view ranking history"
  ON ranking_history FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- 8. Fix function search_path
-- ============================================================

-- Recreate is_admin function with proper search_path
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$;

-- Recreate set_first_admin function with proper search_path
CREATE OR REPLACE FUNCTION set_first_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE is_admin = true) THEN
    NEW.is_admin := true;
  END IF;
  RETURN NEW;
END;
$$;

-- Recreate get_profiles_with_email function with proper search_path
CREATE OR REPLACE FUNCTION get_profiles_with_email()
RETURNS TABLE (
  id uuid,
  full_name text,
  gender text,
  birth_date date,
  phone text,
  preferred_side text,
  availability jsonb,
  photo_url text,
  category text,
  state text,
  city text,
  ranking_points integer,
  total_matches integer,
  total_wins integer,
  win_rate numeric,
  is_admin boolean,
  created_at timestamptz,
  email text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.gender,
    p.birth_date,
    p.phone,
    p.preferred_side,
    p.availability,
    p.photo_url,
    p.category,
    p.state,
    p.city,
    p.ranking_points,
    p.total_matches,
    p.total_wins,
    p.win_rate,
    p.is_admin,
    p.created_at,
    u.email
  FROM profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at DESC;
END;
$$;

-- Recreate update_updated_at_column function with proper search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

-- Recreate calculate_win_rate function with proper search_path
CREATE OR REPLACE FUNCTION calculate_win_rate()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.total_matches > 0 THEN
    NEW.win_rate := ROUND((NEW.total_wins::numeric / NEW.total_matches::numeric) * 100, 2);
  ELSE
    NEW.win_rate := 0;
  END IF;
  RETURN NEW;
END;
$$;
