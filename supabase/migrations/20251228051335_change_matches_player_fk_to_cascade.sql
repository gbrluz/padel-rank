/*
  # Change Matches Player Foreign Keys to CASCADE Delete

  1. Problem
    - SET NULL on player delete conflicts with CHECK constraint different_players
    - NULL values in player columns cause constraint violations

  2. Solution
    - Change foreign keys to CASCADE delete
    - When a player is deleted, all their matches are also deleted
    - This is cleaner since a match without all players has no meaning

  3. Changes
    - matches.team_a_player1_id -> ON DELETE CASCADE
    - matches.team_a_player2_id -> ON DELETE CASCADE
    - matches.team_b_player1_id -> ON DELETE CASCADE
    - matches.team_b_player2_id -> ON DELETE CASCADE
    - matches.captain_id remains SET NULL (captain is optional)
*/

-- Update matches foreign keys to CASCADE
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team_a_player1_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_team_a_player1_id_fkey 
  FOREIGN KEY (team_a_player1_id) REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team_a_player2_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_team_a_player2_id_fkey 
  FOREIGN KEY (team_a_player2_id) REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team_b_player1_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_team_b_player1_id_fkey 
  FOREIGN KEY (team_b_player1_id) REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team_b_player2_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_team_b_player2_id_fkey 
  FOREIGN KEY (team_b_player2_id) REFERENCES players(id) ON DELETE CASCADE;

-- Also update weekly_event_matches to CASCADE
ALTER TABLE weekly_event_matches DROP CONSTRAINT IF EXISTS weekly_event_matches_team_a_player1_id_fkey;
ALTER TABLE weekly_event_matches ADD CONSTRAINT weekly_event_matches_team_a_player1_id_fkey 
  FOREIGN KEY (team_a_player1_id) REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE weekly_event_matches DROP CONSTRAINT IF EXISTS weekly_event_matches_team_a_player2_id_fkey;
ALTER TABLE weekly_event_matches ADD CONSTRAINT weekly_event_matches_team_a_player2_id_fkey 
  FOREIGN KEY (team_a_player2_id) REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE weekly_event_matches DROP CONSTRAINT IF EXISTS weekly_event_matches_team_b_player1_id_fkey;
ALTER TABLE weekly_event_matches ADD CONSTRAINT weekly_event_matches_team_b_player1_id_fkey 
  FOREIGN KEY (team_b_player1_id) REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE weekly_event_matches DROP CONSTRAINT IF EXISTS weekly_event_matches_team_b_player2_id_fkey;
ALTER TABLE weekly_event_matches ADD CONSTRAINT weekly_event_matches_team_b_player2_id_fkey 
  FOREIGN KEY (team_b_player2_id) REFERENCES players(id) ON DELETE CASCADE;
