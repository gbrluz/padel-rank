/*
  # Allow Both Partners to Register Blowouts with Smart Deduplication

  ## Changes
  
  This migration changes the blowout system to allow both partners to register
  blowouts while ensuring victims only receive 1 blowout per pair.

  ## Previous Behavior
  
  - Player1 registers blowout on Player3 ✓ (allowed)
  - Player2 registers blowout on Player3 ✗ (blocked)
  - Result: Only Player1 gets "blowouts_applied" credit

  ## New Behavior
  
  - Player1 registers blowout on Player3 ✓ (allowed, Player3 gets +1 blowout)
  - Player2 registers blowout on Player3 ✓ (allowed, Player2 gets +1 blowouts_applied, but Player3 stays at 1 blowout)
  - Result: Both partners get "blowouts_applied" credit, victim gets only 1 blowout

  ## Implementation

  1. Remove the blocking trigger
  2. Modify sync trigger to deduplicate by pair when counting blowouts_received
  3. Keep normal counting for blowouts_applied (each player gets their own count)

*/

-- Drop the blocking trigger
DROP TRIGGER IF EXISTS prevent_duplicate_pair_blowouts ON weekly_event_blowouts;

-- Helper function to get a player's partner for a given event
CREATE OR REPLACE FUNCTION get_pair_partner(
  p_event_id uuid,
  p_player_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
  -- Find the pair this player is in for this event
  SELECT
    CASE
      WHEN wep.player1_id = p_player_id THEN wep.player2_id
      WHEN wep.player2_id = p_player_id THEN wep.player1_id
      ELSE NULL
    END INTO v_partner_id
  FROM weekly_event_pairs wep
  JOIN weekly_event_draws wed ON wed.id = wep.draw_id
  JOIN weekly_events we ON we.league_id = wed.league_id AND we.event_date = wed.event_date
  WHERE we.id = p_event_id
  AND (wep.player1_id = p_player_id OR wep.player2_id = p_player_id)
  LIMIT 1;

  RETURN v_partner_id;
END;
$$;

-- Function to count unique blowouts received (deduplicated by pair)
CREATE OR REPLACE FUNCTION count_blowouts_received(
  p_event_id uuid,
  p_victim_player_id uuid
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer := 0;
  v_blowout_record RECORD;
  v_partner_id uuid;
  v_processed_pairs uuid[] := ARRAY[]::uuid[];
  v_pair_key uuid;
BEGIN
  -- Loop through all blowouts against this victim
  FOR v_blowout_record IN
    SELECT applier_player_id
    FROM weekly_event_blowouts
    WHERE event_id = p_event_id
    AND victim_player_id = p_victim_player_id
  LOOP
    -- Find if applier has a partner
    v_partner_id := get_pair_partner(p_event_id, v_blowout_record.applier_player_id);
    
    -- Create a consistent pair key (smaller UUID first)
    IF v_partner_id IS NULL THEN
      -- Solo player, use their own ID as key
      v_pair_key := v_blowout_record.applier_player_id;
    ELSIF v_blowout_record.applier_player_id < v_partner_id THEN
      v_pair_key := v_blowout_record.applier_player_id;
    ELSE
      v_pair_key := v_partner_id;
    END IF;
    
    -- Check if we've already counted this pair
    IF NOT (v_pair_key = ANY(v_processed_pairs)) THEN
      v_count := v_count + 1;
      v_processed_pairs := array_append(v_processed_pairs, v_pair_key);
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$;

-- Update the sync trigger to use the new deduplication logic
CREATE OR REPLACE FUNCTION sync_blowouts_to_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- When a blowout is inserted or updated
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Update victim's blowouts_received (with pair deduplication)
    UPDATE weekly_event_attendance
    SET blowouts_received = count_blowouts_received(NEW.event_id, NEW.victim_player_id),
    updated_at = now()
    WHERE event_id = NEW.event_id
    AND player_id = NEW.victim_player_id;

    -- Update applier's blowouts_applied (normal count - each gets credit)
    UPDATE weekly_event_attendance
    SET blowouts_applied = (
      SELECT COUNT(*)
      FROM weekly_event_blowouts
      WHERE event_id = NEW.event_id
      AND applier_player_id = NEW.applier_player_id
    ),
    updated_at = now()
    WHERE event_id = NEW.event_id
    AND player_id = NEW.applier_player_id;

    RETURN NEW;
  END IF;

  -- When a blowout is deleted
  IF (TG_OP = 'DELETE') THEN
    -- Update victim's blowouts_received (with pair deduplication)
    UPDATE weekly_event_attendance
    SET blowouts_received = count_blowouts_received(OLD.event_id, OLD.victim_player_id),
    updated_at = now()
    WHERE event_id = OLD.event_id
    AND player_id = OLD.victim_player_id;

    -- Update applier's blowouts_applied (normal count)
    UPDATE weekly_event_attendance
    SET blowouts_applied = (
      SELECT COUNT(*)
      FROM weekly_event_blowouts
      WHERE event_id = OLD.event_id
      AND applier_player_id = OLD.applier_player_id
    ),
    updated_at = now()
    WHERE event_id = OLD.event_id
    AND player_id = OLD.applier_player_id;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill existing data with correct deduplication
DO $$
DECLARE
  event_record RECORD;
  player_record RECORD;
BEGIN
  -- For each event, update all attendances
  FOR event_record IN SELECT DISTINCT event_id FROM weekly_event_blowouts LOOP
    -- Update each victim's blowouts_received (with deduplication)
    FOR player_record IN
      SELECT DISTINCT victim_player_id as player_id
      FROM weekly_event_blowouts
      WHERE event_id = event_record.event_id
    LOOP
      UPDATE weekly_event_attendance
      SET blowouts_received = count_blowouts_received(event_record.event_id, player_record.player_id),
      updated_at = now()
      WHERE event_id = event_record.event_id
      AND player_id = player_record.player_id;
    END LOOP;

    -- Update each applier's blowouts_applied (normal count)
    FOR player_record IN
      SELECT DISTINCT applier_player_id as player_id
      FROM weekly_event_blowouts
      WHERE event_id = event_record.event_id
    LOOP
      UPDATE weekly_event_attendance
      SET blowouts_applied = (
        SELECT COUNT(*)
        FROM weekly_event_blowouts
        WHERE event_id = event_record.event_id
        AND applier_player_id = player_record.player_id
      ),
      updated_at = now()
      WHERE event_id = event_record.event_id
      AND player_id = player_record.player_id;
    END LOOP;
  END LOOP;
END $$;

-- Add helpful comments
COMMENT ON FUNCTION count_blowouts_received IS 'Counts unique blowouts received by a player, deduplicating by pair (both partners count as 1 blowout)';
