/*
  # Add Trigger to Sync Blowouts to Attendance

  1. Problem
    - When a player records a blowout in `weekly_event_blowouts`, the victim's `blowouts_received`
      in `weekly_event_attendance` is not automatically updated
    - This causes the blowout ranking to not show received blowouts correctly

  2. Solution
    - Create a trigger that automatically updates `blowouts_received` and `blowouts_applied`
      in `weekly_event_attendance` whenever blowouts are inserted or deleted
    - This ensures data consistency between the two tables

  3. Security
    - No RLS changes needed - trigger runs with definer privileges
*/

-- Function to sync blowouts to attendance
CREATE OR REPLACE FUNCTION sync_blowouts_to_attendance()
RETURNS TRIGGER AS $$
BEGIN
  -- When a blowout is inserted or updated
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    -- Update victim's blowouts_received
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

    -- Update applier's blowouts_applied
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

    -- Update applier's blowouts_applied
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS sync_blowouts_trigger ON weekly_event_blowouts;

-- Create trigger
CREATE TRIGGER sync_blowouts_trigger
AFTER INSERT OR UPDATE OR DELETE ON weekly_event_blowouts
FOR EACH ROW
EXECUTE FUNCTION sync_blowouts_to_attendance();

-- Backfill existing blowouts to sync current data
DO $$
DECLARE
  event_record RECORD;
  player_record RECORD;
BEGIN
  -- For each event, update all attendances
  FOR event_record IN SELECT DISTINCT event_id FROM weekly_event_blowouts LOOP
    -- Update each player's blowouts_received
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

    -- Update each player's blowouts_applied
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