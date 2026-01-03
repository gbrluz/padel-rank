-- Check if required tables exist
SELECT
  table_name,
  CASE
    WHEN table_name = 'weekly_event_draws' THEN 'Required for matches'
    WHEN table_name = 'weekly_event_pairs' THEN 'Required for matches'
    WHEN table_name = 'weekly_event_blowouts' THEN 'Required for constraint fix'
    WHEN table_name = 'weekly_events' THEN 'Required for events'
  END as purpose
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('weekly_event_draws', 'weekly_event_pairs', 'weekly_event_blowouts', 'weekly_events')
ORDER BY table_name;

-- Check columns in weekly_event_pairs if it exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'weekly_event_pairs'
ORDER BY ordinal_position;

-- Check columns in weekly_event_blowouts if it exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'weekly_event_blowouts'
ORDER BY ordinal_position;
