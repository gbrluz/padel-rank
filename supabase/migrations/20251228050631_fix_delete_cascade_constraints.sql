/*
  # Fix Foreign Key Delete Constraints

  1. Problem
    - Several foreign key constraints use NO ACTION which prevents deletion
    - This causes 409 Conflict errors when deleting matches or players

  2. Changes
    - Update foreign keys on ranking_history to CASCADE on delete
    - Update foreign keys on matches player references to SET NULL
    - Update foreign keys on queue_entries to CASCADE on delete
    - Update foreign keys on match_approvals to CASCADE on delete
    - Update foreign keys on match_chat_messages to CASCADE on delete
    - Update foreign keys on match_time_votes to CASCADE on delete
    - Update foreign keys on match_result_contestations to SET NULL
    - Update foreign keys on weekly_event_attendance optional refs to SET NULL
    - Update foreign keys on weekly_event_matches to SET NULL
    - Update foreign keys on league_join_requests.reviewed_by to SET NULL

  3. Notes
    - Using SET NULL for player references in matches preserves match history
    - Using CASCADE for auxiliary tables like approvals and chat messages
*/

-- ranking_history: CASCADE delete when match or player is deleted
ALTER TABLE ranking_history DROP CONSTRAINT IF EXISTS ranking_history_match_id_fkey;
ALTER TABLE ranking_history ADD CONSTRAINT ranking_history_match_id_fkey 
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE;

ALTER TABLE ranking_history DROP CONSTRAINT IF EXISTS ranking_history_player_id_fkey;
ALTER TABLE ranking_history ADD CONSTRAINT ranking_history_player_id_fkey 
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- queue_entries: CASCADE delete when player is deleted
ALTER TABLE queue_entries DROP CONSTRAINT IF EXISTS queue_entries_player_id_fkey;
ALTER TABLE queue_entries ADD CONSTRAINT queue_entries_player_id_fkey 
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

ALTER TABLE queue_entries DROP CONSTRAINT IF EXISTS queue_entries_partner_id_fkey;
ALTER TABLE queue_entries ADD CONSTRAINT queue_entries_partner_id_fkey 
  FOREIGN KEY (partner_id) REFERENCES players(id) ON DELETE SET NULL;

-- match_approvals: CASCADE on player delete
ALTER TABLE match_approvals DROP CONSTRAINT IF EXISTS match_approvals_player_id_fkey;
ALTER TABLE match_approvals ADD CONSTRAINT match_approvals_player_id_fkey 
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- match_chat_messages: CASCADE on player delete
ALTER TABLE match_chat_messages DROP CONSTRAINT IF EXISTS match_chat_messages_player_id_fkey;
ALTER TABLE match_chat_messages ADD CONSTRAINT match_chat_messages_player_id_fkey 
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- match_time_votes: CASCADE on player delete
ALTER TABLE match_time_votes DROP CONSTRAINT IF EXISTS match_time_votes_player_id_fkey;
ALTER TABLE match_time_votes ADD CONSTRAINT match_time_votes_player_id_fkey 
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;

-- match_result_contestations: SET NULL on player delete
ALTER TABLE match_result_contestations DROP CONSTRAINT IF EXISTS match_result_contestations_contested_by_fkey;
ALTER TABLE match_result_contestations ADD CONSTRAINT match_result_contestations_contested_by_fkey 
  FOREIGN KEY (contested_by) REFERENCES players(id) ON DELETE SET NULL;

ALTER TABLE match_result_contestations DROP CONSTRAINT IF EXISTS match_result_contestations_resolved_by_fkey;
ALTER TABLE match_result_contestations ADD CONSTRAINT match_result_contestations_resolved_by_fkey 
  FOREIGN KEY (resolved_by) REFERENCES players(id) ON DELETE SET NULL;

-- matches: SET NULL on player delete (preserves match history)
ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team_a_player1_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_team_a_player1_id_fkey 
  FOREIGN KEY (team_a_player1_id) REFERENCES players(id) ON DELETE SET NULL;

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team_a_player2_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_team_a_player2_id_fkey 
  FOREIGN KEY (team_a_player2_id) REFERENCES players(id) ON DELETE SET NULL;

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team_b_player1_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_team_b_player1_id_fkey 
  FOREIGN KEY (team_b_player1_id) REFERENCES players(id) ON DELETE SET NULL;

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_team_b_player2_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_team_b_player2_id_fkey 
  FOREIGN KEY (team_b_player2_id) REFERENCES players(id) ON DELETE SET NULL;

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_captain_id_fkey;
ALTER TABLE matches ADD CONSTRAINT matches_captain_id_fkey 
  FOREIGN KEY (captain_id) REFERENCES players(id) ON DELETE SET NULL;

-- weekly_event_attendance: SET NULL on optional player references
ALTER TABLE weekly_event_attendance DROP CONSTRAINT IF EXISTS weekly_event_attendance_duo_partner_id_fkey;
ALTER TABLE weekly_event_attendance ADD CONSTRAINT weekly_event_attendance_duo_partner_id_fkey 
  FOREIGN KEY (duo_partner_id) REFERENCES players(id) ON DELETE SET NULL;

ALTER TABLE weekly_event_attendance DROP CONSTRAINT IF EXISTS weekly_event_attendance_points_verified_by_fkey;
ALTER TABLE weekly_event_attendance ADD CONSTRAINT weekly_event_attendance_points_verified_by_fkey 
  FOREIGN KEY (points_verified_by) REFERENCES players(id) ON DELETE SET NULL;

-- weekly_event_matches: SET NULL on player delete
ALTER TABLE weekly_event_matches DROP CONSTRAINT IF EXISTS weekly_event_matches_team_a_player1_id_fkey;
ALTER TABLE weekly_event_matches ADD CONSTRAINT weekly_event_matches_team_a_player1_id_fkey 
  FOREIGN KEY (team_a_player1_id) REFERENCES players(id) ON DELETE SET NULL;

ALTER TABLE weekly_event_matches DROP CONSTRAINT IF EXISTS weekly_event_matches_team_a_player2_id_fkey;
ALTER TABLE weekly_event_matches ADD CONSTRAINT weekly_event_matches_team_a_player2_id_fkey 
  FOREIGN KEY (team_a_player2_id) REFERENCES players(id) ON DELETE SET NULL;

ALTER TABLE weekly_event_matches DROP CONSTRAINT IF EXISTS weekly_event_matches_team_b_player1_id_fkey;
ALTER TABLE weekly_event_matches ADD CONSTRAINT weekly_event_matches_team_b_player1_id_fkey 
  FOREIGN KEY (team_b_player1_id) REFERENCES players(id) ON DELETE SET NULL;

ALTER TABLE weekly_event_matches DROP CONSTRAINT IF EXISTS weekly_event_matches_team_b_player2_id_fkey;
ALTER TABLE weekly_event_matches ADD CONSTRAINT weekly_event_matches_team_b_player2_id_fkey 
  FOREIGN KEY (team_b_player2_id) REFERENCES players(id) ON DELETE SET NULL;

-- league_join_requests: SET NULL on reviewed_by delete
ALTER TABLE league_join_requests DROP CONSTRAINT IF EXISTS league_join_requests_reviewed_by_fkey;
ALTER TABLE league_join_requests ADD CONSTRAINT league_join_requests_reviewed_by_fkey 
  FOREIGN KEY (reviewed_by) REFERENCES players(id) ON DELETE SET NULL;
