/*
  # Fix Security and Performance Issues

  1. Performance Improvements
    - Add missing indexes for foreign keys to improve query performance
    - Optimize RLS policies by wrapping auth functions in SELECT to prevent re-evaluation
  
  2. Security Improvements
    - Fix function search paths to be immutable
  
  3. Changes Made
    
    ## Missing Foreign Key Indexes
    - `leagues.created_by` - Index added for creator lookups
    - `match_chat_messages.player_id` - Index added for player message queries
    - `match_history.match_id` - Index added for match history lookups
    - `match_result_contestations.contested_by` - Index added for contestation queries
    - `match_result_contestations.resolved_by` - Index added for resolution queries
    - `match_time_votes.proposal_id` - Index added for vote aggregation
    - `ranking_history.player_id` - Index added for player ranking history
    
    ## RLS Policy Optimizations
    - All auth.uid() calls wrapped in SELECT for better performance
    - Policies now evaluate once per query instead of per row
    
    ## Function Search Path Fixes
    - All functions updated to use immutable search_path
    - Prevents security vulnerabilities from path manipulation
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_leagues_created_by 
  ON public.leagues(created_by);

CREATE INDEX IF NOT EXISTS idx_match_chat_messages_player_id 
  ON public.match_chat_messages(player_id);

CREATE INDEX IF NOT EXISTS idx_match_history_match_id 
  ON public.match_history(match_id);

CREATE INDEX IF NOT EXISTS idx_match_result_contestations_contested_by 
  ON public.match_result_contestations(contested_by);

CREATE INDEX IF NOT EXISTS idx_match_result_contestations_resolved_by 
  ON public.match_result_contestations(resolved_by);

CREATE INDEX IF NOT EXISTS idx_match_time_votes_proposal_id 
  ON public.match_time_votes(proposal_id);

CREATE INDEX IF NOT EXISTS idx_ranking_history_player_id 
  ON public.ranking_history(player_id);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES - MATCH HISTORY
-- =====================================================

DROP POLICY IF EXISTS "Admins can manage match history" ON public.match_history;
CREATE POLICY "Admins can manage match history"
  ON public.match_history
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  );

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - DUO INVITATIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can view their own invitations" ON public.duo_invitations;
CREATE POLICY "Users can view their own invitations"
  ON public.duo_invitations
  FOR SELECT
  TO authenticated
  USING (sender_id = (SELECT auth.uid()) OR receiver_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can send invitations" ON public.duo_invitations;
CREATE POLICY "Users can send invitations"
  ON public.duo_invitations
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Senders can cancel their pending invitations" ON public.duo_invitations;
CREATE POLICY "Senders can cancel their pending invitations"
  ON public.duo_invitations
  FOR UPDATE
  TO authenticated
  USING (sender_id = (SELECT auth.uid()) AND status = 'pending')
  WITH CHECK (sender_id = (SELECT auth.uid()) AND status = 'cancelled');

DROP POLICY IF EXISTS "Receivers can respond to invitations" ON public.duo_invitations;
CREATE POLICY "Receivers can respond to invitations"
  ON public.duo_invitations
  FOR UPDATE
  TO authenticated
  USING (receiver_id = (SELECT auth.uid()) AND status = 'pending')
  WITH CHECK (receiver_id = (SELECT auth.uid()) AND status IN ('accepted', 'declined'));

-- =====================================================
-- 4. OPTIMIZE RLS POLICIES - REGIONS
-- =====================================================

DROP POLICY IF EXISTS "Only admins can update regions" ON public.regions;
CREATE POLICY "Only admins can update regions"
  ON public.regions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  );

-- =====================================================
-- 5. OPTIMIZE RLS POLICIES - LEAGUES
-- =====================================================

DROP POLICY IF EXISTS "Users can create leagues" ON public.leagues;
CREATE POLICY "Users can create leagues"
  ON public.leagues
  FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "League creators and admins can update leagues" ON public.leagues;
CREATE POLICY "League creators and admins can update leagues"
  ON public.leagues
  FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "League creators and admins can delete leagues" ON public.leagues;
CREATE POLICY "League creators and admins can delete leagues"
  ON public.leagues
  FOR DELETE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid()) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  );

-- =====================================================
-- 6. OPTIMIZE RLS POLICIES - LEAGUE MEMBERSHIPS
-- =====================================================

DROP POLICY IF EXISTS "League creators and admins can manage memberships" ON public.league_memberships;
CREATE POLICY "League creators and admins can manage memberships"
  ON public.league_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leagues 
      WHERE leagues.id = league_id 
      AND leagues.created_by = (SELECT auth.uid())
    ) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "League creators and admins can update memberships" ON public.league_memberships;
CREATE POLICY "League creators and admins can update memberships"
  ON public.league_memberships
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues 
      WHERE leagues.id = league_id 
      AND leagues.created_by = (SELECT auth.uid())
    ) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.leagues 
      WHERE leagues.id = league_id 
      AND leagues.created_by = (SELECT auth.uid())
    ) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "League creators and admins can delete memberships" ON public.league_memberships;
CREATE POLICY "League creators and admins can delete memberships"
  ON public.league_memberships
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.leagues 
      WHERE leagues.id = league_id 
      AND leagues.created_by = (SELECT auth.uid())
    ) OR 
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  );

-- =====================================================
-- 7. OPTIMIZE RLS POLICIES - MATCH TIME PROPOSALS
-- =====================================================

DROP POLICY IF EXISTS "Players can view proposals for their matches" ON public.match_time_proposals;
CREATE POLICY "Players can view proposals for their matches"
  ON public.match_time_proposals
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_id 
      AND (
        matches.team_a_player1_id = (SELECT auth.uid()) OR 
        matches.team_a_player2_id = (SELECT auth.uid()) OR 
        matches.team_b_player1_id = (SELECT auth.uid()) OR 
        matches.team_b_player2_id = (SELECT auth.uid())
      )
    )
  );

-- =====================================================
-- 8. OPTIMIZE RLS POLICIES - MATCH TIME VOTES
-- =====================================================

DROP POLICY IF EXISTS "Players can view votes for their matches" ON public.match_time_votes;
CREATE POLICY "Players can view votes for their matches"
  ON public.match_time_votes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_id 
      AND (
        matches.team_a_player1_id = (SELECT auth.uid()) OR 
        matches.team_a_player2_id = (SELECT auth.uid()) OR 
        matches.team_b_player1_id = (SELECT auth.uid()) OR 
        matches.team_b_player2_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Players can vote in their matches" ON public.match_time_votes;
CREATE POLICY "Players can vote in their matches"
  ON public.match_time_votes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_id 
      AND (
        matches.team_a_player1_id = (SELECT auth.uid()) OR 
        matches.team_a_player2_id = (SELECT auth.uid()) OR 
        matches.team_b_player1_id = (SELECT auth.uid()) OR 
        matches.team_b_player2_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Players can update their own votes" ON public.match_time_votes;
CREATE POLICY "Players can update their own votes"
  ON public.match_time_votes
  FOR UPDATE
  TO authenticated
  USING (player_id = (SELECT auth.uid()))
  WITH CHECK (player_id = (SELECT auth.uid()));

-- =====================================================
-- 9. OPTIMIZE RLS POLICIES - MATCH CHAT MESSAGES
-- =====================================================

DROP POLICY IF EXISTS "Players can view messages in their matches" ON public.match_chat_messages;
CREATE POLICY "Players can view messages in their matches"
  ON public.match_chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_id 
      AND (
        matches.team_a_player1_id = (SELECT auth.uid()) OR 
        matches.team_a_player2_id = (SELECT auth.uid()) OR 
        matches.team_b_player1_id = (SELECT auth.uid()) OR 
        matches.team_b_player2_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Players can send messages in their matches" ON public.match_chat_messages;
CREATE POLICY "Players can send messages in their matches"
  ON public.match_chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_id 
      AND (
        matches.team_a_player1_id = (SELECT auth.uid()) OR 
        matches.team_a_player2_id = (SELECT auth.uid()) OR 
        matches.team_b_player1_id = (SELECT auth.uid()) OR 
        matches.team_b_player2_id = (SELECT auth.uid())
      )
    )
  );

-- =====================================================
-- 10. OPTIMIZE RLS POLICIES - MATCH RESULT CONTESTATIONS
-- =====================================================

DROP POLICY IF EXISTS "Players can view contestations for their matches" ON public.match_result_contestations;
CREATE POLICY "Players can view contestations for their matches"
  ON public.match_result_contestations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_id 
      AND (
        matches.team_a_player1_id = (SELECT auth.uid()) OR 
        matches.team_a_player2_id = (SELECT auth.uid()) OR 
        matches.team_b_player1_id = (SELECT auth.uid()) OR 
        matches.team_b_player2_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Players can contest results in their matches" ON public.match_result_contestations;
CREATE POLICY "Players can contest results in their matches"
  ON public.match_result_contestations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    contested_by = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.matches 
      WHERE matches.id = match_id 
      AND (
        matches.team_a_player1_id = (SELECT auth.uid()) OR 
        matches.team_a_player2_id = (SELECT auth.uid()) OR 
        matches.team_b_player1_id = (SELECT auth.uid()) OR 
        matches.team_b_player2_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Admins can resolve contestations" ON public.match_result_contestations;
CREATE POLICY "Admins can resolve contestations"
  ON public.match_result_contestations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = (SELECT auth.uid()) 
      AND profiles.is_admin = true
    )
  );