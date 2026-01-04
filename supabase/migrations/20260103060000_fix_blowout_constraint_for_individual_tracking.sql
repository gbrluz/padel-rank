/*
  # Fix Blowout Constraint for Individual Player Tracking

  ## Problem

  Current constraint `unique_event_pair_victim` uses:
  - (event_id, applier_pair_id, victim_player_id)

  This prevents BOTH partners from marking the same victim, but we WANT them to!

  ## Correct Logic

  Each partner should be able to mark blowouts INDIVIDUALLY:
  - Player 1 marks Dupla 2 → creates 2 records (victim3, victim4)
  - Player 2 marks Dupla 2 → creates 2 MORE records (victim3, victim4)
  - Total: 4 records (both partners can mark the same victims)

  Then we deduplicate when COUNTING:
  - blowouts_applied: group victims by pair → each partner gets +1
  - blowouts_received: group appliers by pair → each victim gets +1

  ## Solution

  Change constraint to use applier_player_id instead of applier_pair_id:
  - (event_id, applier_player_id, victim_player_id)

  This allows:
  - ✅ Both partners can mark the same victim
  - ✅ Same player cannot accidentally mark same victim twice

*/

-- Drop old constraint (pair-based)
ALTER TABLE weekly_event_blowouts
DROP CONSTRAINT IF EXISTS unique_event_pair_victim;

-- Add new constraint (player-based)
ALTER TABLE weekly_event_blowouts
ADD CONSTRAINT unique_event_applier_victim UNIQUE (event_id, applier_player_id, victim_player_id);

-- Drop the automatic sync trigger since we handle counting manually in the app
DROP TRIGGER IF EXISTS sync_blowouts_trigger ON weekly_event_blowouts;
DROP FUNCTION IF EXISTS sync_blowouts_to_attendance();

-- Add helpful comment
COMMENT ON CONSTRAINT unique_event_applier_victim ON weekly_event_blowouts IS
  'Prevents same player from marking same victim twice, but allows both partners to mark the same victim independently';
