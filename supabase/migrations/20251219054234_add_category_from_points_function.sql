/*
  # Add Category Calculation Function

  ## Description
  Creates a function to calculate player category based on ranking points.
  Categories are determined by 200-point ranges.

  ## Category Mapping
  - < 200 points = iniciante
  - 200-399 points = 7a
  - 400-599 points = 6a
  - 600-799 points = 5a
  - 800-999 points = 4a
  - 1000-1199 points = 3a
  - 1200-1399 points = 2a
  - 1400-1599 points = 1a
  - >= 1600 points = avancado

  ## Changes
  1. Create get_category_from_points function
  2. This function is PUBLIC and can be used by anyone
*/

CREATE OR REPLACE FUNCTION get_category_from_points(points integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN points < 200 THEN 'iniciante'
    WHEN points < 400 THEN '7a'
    WHEN points < 600 THEN '6a'
    WHEN points < 800 THEN '5a'
    WHEN points < 1000 THEN '4a'
    WHEN points < 1200 THEN '3a'
    WHEN points < 1400 THEN '2a'
    WHEN points < 1600 THEN '1a'
    ELSE 'avancado'
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION get_category_from_points(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_from_points(integer) TO anon;
