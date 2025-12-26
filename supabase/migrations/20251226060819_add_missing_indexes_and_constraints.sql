/*
  # Add Missing Indexes and Constraints

  This migration adds missing indexes for query performance and constraints
  for data integrity.

  ## Indexes Added
  1. `idx_match_approvals_match_id` - For JOIN performance on match_approvals
  2. `idx_league_rankings_leaderboard` - For efficient leaderboard queries
  3. `idx_league_rankings_player_league` - For player-league lookups
  4. `idx_league_memberships_player` - For finding player's leagues
  5. `idx_ranking_history_player_date` - For player ranking history queries

  ## Constraints Added
  1. CHECK constraint on players.category for valid values
  2. CHECK constraint on players.preferred_side for valid values
  3. NOT NULL constraint on match_chat_messages.message
  4. NOT NULL constraint on match_result_contestations.reason

  ## Notes
  - All indexes use IF NOT EXISTS for safe re-runs
  - Constraints are added conditionally to avoid errors on re-run
*/

-- Index for match_approvals.match_id (was dropped in a previous migration)
CREATE INDEX IF NOT EXISTS idx_match_approvals_match_id 
  ON match_approvals(match_id);

-- Compound index for league leaderboard queries
CREATE INDEX IF NOT EXISTS idx_league_rankings_leaderboard 
  ON league_rankings(league_id, points DESC, updated_at DESC);

-- Index for player-league relationship lookups
CREATE INDEX IF NOT EXISTS idx_league_rankings_player_league 
  ON league_rankings(player_id, league_id);

-- Index for finding player's league memberships
CREATE INDEX IF NOT EXISTS idx_league_memberships_player 
  ON league_memberships(player_id);

-- Index for player ranking history queries
CREATE INDEX IF NOT EXISTS idx_ranking_history_player_date 
  ON ranking_history(player_id, created_at DESC);

-- Index for queue entries by status (common filter)
CREATE INDEX IF NOT EXISTS idx_queue_entries_status 
  ON queue_entries(status) WHERE status = 'active';

-- Index for matches by status (common filter)
CREATE INDEX IF NOT EXISTS idx_matches_status 
  ON matches(status);

-- Index for duo invitations by receiver (for inbox queries)
CREATE INDEX IF NOT EXISTS idx_duo_invitations_receiver_pending 
  ON duo_invitations(receiver_id, status) WHERE status = 'pending';

-- Add CHECK constraint for players.category
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_player_category'
  ) THEN
    ALTER TABLE players ADD CONSTRAINT valid_player_category 
      CHECK (category IN ('Iniciante', '1a', '2a', '3a', '4a', '5a', '6a', '7a', '1ª', '2ª', '3ª', '4ª', '5ª', '6ª', '7ª'));
  END IF;
END $$;

-- Add CHECK constraint for players.preferred_side
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_preferred_side'
  ) THEN
    ALTER TABLE players ADD CONSTRAINT valid_preferred_side 
      CHECK (preferred_side IN ('left', 'right', 'both', 'any'));
  END IF;
END $$;

-- Add CHECK constraint for queue_entries.preferred_side
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_queue_preferred_side'
  ) THEN
    ALTER TABLE queue_entries ADD CONSTRAINT valid_queue_preferred_side 
      CHECK (preferred_side IS NULL OR preferred_side IN ('left', 'right', 'both', 'any'));
  END IF;
END $$;

-- Add CHECK constraint for matches.status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_match_status'
  ) THEN
    ALTER TABLE matches ADD CONSTRAINT valid_match_status 
      CHECK (status IN ('pending_approval', 'scheduling', 'scheduled', 'cancelled', 'completed'));
  END IF;
END $$;

-- Add NOT NULL constraint to match_chat_messages.message (if column allows null)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_chat_messages' 
    AND column_name = 'message'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE match_chat_messages ALTER COLUMN message SET NOT NULL;
  END IF;
END $$;

-- Add NOT NULL constraint to match_result_contestations.reason (if column allows null)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'match_result_contestations' 
    AND column_name = 'reason'
    AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE match_result_contestations ALTER COLUMN reason SET NOT NULL;
  END IF;
END $$;

-- Add CHECK constraint for players.gender
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_player_gender'
  ) THEN
    ALTER TABLE players ADD CONSTRAINT valid_player_gender 
      CHECK (gender IN ('male', 'female'));
  END IF;
END $$;

-- Add CHECK constraint for leagues.type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'valid_league_type'
  ) THEN
    ALTER TABLE leagues ADD CONSTRAINT valid_league_type 
      CHECK (type IN ('club', 'friends', 'official'));
  END IF;
END $$;
