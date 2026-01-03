/*
  # Change Blowouts to Pair-Based System

  ## Problem
  
  Current system allows each player to register blowouts individually:
  - Player 1 registers → gets 1 point
  - Player 2 registers → gets 1 point
  - Total: 2 points for the same action (incorrect)

  ## Solution
  
  Register blowouts at the PAIR level:
  - One registration per pair
  - Both players in the pair automatically get credit
  - Simpler UI (show pairs instead of individual players)
  - No duplicate point problem

  ## Changes

  1. Add `applier_pair_id` to `weekly_event_blowouts`
  2. Remove old unique constraint
  3. Add new unique constraint (event_id, applier_pair_id, victim_player_id)
  4. Update sync trigger to distribute points to both players in the pair
  5. Backfill existing data

*/

-- Add applier_pair_id column
ALTER TABLE weekly_event_blowouts
ADD COLUMN IF NOT EXISTS applier_pair_id uuid REFERENCES weekly_event_pairs(id) ON DELETE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_weekly_blowouts_applier_pair ON weekly_event_blowouts(applier_pair_id);

-- Drop old constraint
ALTER TABLE weekly_event_blowouts
DROP CONSTRAINT IF EXISTS unique_event_applier_victim;

-- Add new constraint (pair-based)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_event_pair_victim'
  ) THEN
    ALTER TABLE weekly_event_blowouts
    ADD CONSTRAINT unique_event_pair_victim UNIQUE (event_id, applier_pair_id, victim_player_id);
  END IF;
END $$;

-- Update sync trigger to distribute points to both players in pair
CREATE OR REPLACE FUNCTION sync_blowouts_to_attendance()
RETURNS TRIGGER AS $$
DECLARE
  v_player1_id uuid;
  v_player2_id uuid;
BEGIN
  -- When a blowout is inserted or updated
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Update victim's blowouts_received (simple count)
    UPDATE weekly_event_attendance
    SET blowouts_received = (
      SELECT COUNT(*)
      FROM weekly_event_blowouts
      WHERE event_id = NEW.event_id
      AND victim_player_id = NEW.victim_player_id
    ),
    updated_at = now()
    WHERE event_id = NEW.event_id
    AND player_id = NEW.victim_player_id;

    -- Get both players from the applier pair
    SELECT player1_id, player2_id INTO v_player1_id, v_player2_id
    FROM weekly_event_pairs
    WHERE id = NEW.applier_pair_id;

    -- Update player 1's blowouts_applied
    IF v_player1_id IS NOT NULL THEN
      UPDATE weekly_event_attendance
      SET blowouts_applied = (
        SELECT COUNT(*)
        FROM weekly_event_blowouts web
        JOIN weekly_event_pairs wep ON wep.id = web.applier_pair_id
        WHERE web.event_id = NEW.event_id
        AND (wep.player1_id = v_player1_id OR wep.player2_id = v_player1_id)
      ),
      updated_at = now()
      WHERE event_id = NEW.event_id
      AND player_id = v_player1_id;
    END IF;

    -- Update player 2's blowouts_applied
    IF v_player2_id IS NOT NULL THEN
      UPDATE weekly_event_attendance
      SET blowouts_applied = (
        SELECT COUNT(*)
        FROM weekly_event_blowouts web
        JOIN weekly_event_pairs wep ON wep.id = web.applier_pair_id
        WHERE web.event_id = NEW.event_id
        AND (wep.player1_id = v_player2_id OR wep.player2_id = v_player2_id)
      ),
      updated_at = now()
      WHERE event_id = NEW.event_id
      AND player_id = v_player2_id;
    END IF;

    RETURN NEW;
  END IF;

  -- When a blowout is deleted
  IF (TG_OP = 'DELETE') THEN
    -- Update victim's blowouts_received
    UPDATE weekly_event_attendance
    SET blowouts_received = (
      SELECT COUNT(*)
      FROM weekly_event_blowouts
      WHERE event_id = OLD.event_id
      AND victim_player_id = OLD.victim_player_id
    ),
    updated_at = now()
    WHERE event_id = OLD.event_id
    AND player_id = OLD.victim_player_id;

    -- Get both players from the applier pair
    SELECT player1_id, player2_id INTO v_player1_id, v_player2_id
    FROM weekly_event_pairs
    WHERE id = OLD.applier_pair_id;

    -- Update player 1's blowouts_applied
    IF v_player1_id IS NOT NULL THEN
      UPDATE weekly_event_attendance
      SET blowouts_applied = (
        SELECT COUNT(*)
        FROM weekly_event_blowouts web
        JOIN weekly_event_pairs wep ON wep.id = web.applier_pair_id
        WHERE web.event_id = OLD.event_id
        AND (wep.player1_id = v_player1_id OR wep.player2_id = v_player1_id)
      ),
      updated_at = now()
      WHERE event_id = OLD.event_id
      AND player_id = v_player1_id;
    END IF;

    -- Update player 2's blowouts_applied
    IF v_player2_id IS NOT NULL THEN
      UPDATE weekly_event_attendance
      SET blowouts_applied = (
        SELECT COUNT(*)
        FROM weekly_event_blowouts web
        JOIN weekly_event_pairs wep ON wep.id = web.applier_pair_id
        WHERE web.event_id = OLD.event_id
        AND (wep.player1_id = v_player2_id OR wep.player2_id = v_player2_id)
      ),
      updated_at = now()
      WHERE event_id = OLD.event_id
      AND player_id = v_player2_id;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill existing blowouts with applier_pair_id
DO $$
DECLARE
  blowout_record RECORD;
  v_pair_id uuid;
BEGIN
  FOR blowout_record IN 
    SELECT * FROM weekly_event_blowouts WHERE applier_pair_id IS NULL
  LOOP
    -- Find the pair_id for this applier
    SELECT wep.id INTO v_pair_id
    FROM weekly_event_pairs wep
    JOIN weekly_event_draws wed ON wed.id = wep.draw_id
    JOIN weekly_events we ON we.league_id = wed.league_id AND we.event_date = wed.event_date
    WHERE we.id = blowout_record.event_id
    AND (wep.player1_id = blowout_record.applier_player_id OR wep.player2_id = blowout_record.applier_player_id)
    LIMIT 1;

    -- Update the blowout with the pair_id
    IF v_pair_id IS NOT NULL THEN
      UPDATE weekly_event_blowouts
      SET applier_pair_id = v_pair_id
      WHERE id = blowout_record.id;
    END IF;
  END LOOP;
END $$;

-- Remove old helper functions that are no longer needed
DROP FUNCTION IF EXISTS count_blowouts_received(uuid, uuid);
DROP FUNCTION IF EXISTS get_pair_partner(uuid, uuid);
DROP FUNCTION IF EXISTS check_duplicate_pair_blowout();

-- Resync all attendance records
DO $$
DECLARE
  event_record RECORD;
  player_record RECORD;
BEGIN
  -- For each event, update all attendances
  FOR event_record IN SELECT DISTINCT event_id FROM weekly_event_blowouts WHERE applier_pair_id IS NOT NULL LOOP
    -- Update each victim's blowouts_received
    FOR player_record IN
      SELECT DISTINCT victim_player_id as player_id
      FROM weekly_event_blowouts
      WHERE event_id = event_record.event_id
    LOOP
      UPDATE weekly_event_attendance
      SET blowouts_received = (
        SELECT COUNT(*)
        FROM weekly_event_blowouts
        WHERE event_id = event_record.event_id
        AND victim_player_id = player_record.player_id
      ),
      updated_at = now()
      WHERE event_id = event_record.event_id
      AND player_id = player_record.player_id;
    END LOOP;

    -- Update each player's blowouts_applied (checking all pairs they're in)
    FOR player_record IN
      SELECT DISTINCT player_id
      FROM weekly_event_attendance
      WHERE event_id = event_record.event_id
    LOOP
      UPDATE weekly_event_attendance
      SET blowouts_applied = (
        SELECT COUNT(*)
        FROM weekly_event_blowouts web
        JOIN weekly_event_pairs wep ON wep.id = web.applier_pair_id
        WHERE web.event_id = event_record.event_id
        AND (wep.player1_id = player_record.player_id OR wep.player2_id = player_record.player_id)
      ),
      updated_at = now()
      WHERE event_id = event_record.event_id
      AND player_id = player_record.player_id;
    END LOOP;
  END LOOP;
END $$;

-- Update RLS policies for the new structure
DROP POLICY IF EXISTS "League members can register blowouts" ON weekly_event_blowouts;

CREATE POLICY "League members can register blowouts"
  ON weekly_event_blowouts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM weekly_events we
      JOIN leagues l ON l.id = we.league_id
      JOIN league_memberships lm ON lm.league_id = l.id
      WHERE we.id = weekly_event_blowouts.event_id
      AND lm.player_id = auth.uid()
      AND lm.status = 'active'
    )
    AND EXISTS (
      SELECT 1
      FROM weekly_event_pairs wep
      WHERE wep.id = weekly_event_blowouts.applier_pair_id
      AND (wep.player1_id = auth.uid() OR wep.player2_id = auth.uid())
    )
  );

-- Add helpful comment
COMMENT ON COLUMN weekly_event_blowouts.applier_pair_id IS 'The pair that applied the blowout. Both players in the pair get credit automatically.';
