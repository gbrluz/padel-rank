/*
  # Update Category to Use Ordinal Indicator (ª)

  ## Problem
  Categories were using "a" instead of the proper ordinal indicator "ª" (7a vs 7ª).
  This affects both the database function and existing player categories.

  ## Solution
  1. Update get_category_from_points function to return "ª" instead of "a"
  2. Update get_initial_points_for_category function to accept "ª" format
  3. Update existing player categories from "a" to "ª" format

  ## Changes
  - Modify get_category_from_points function
  - Modify get_initial_points_for_category function
  - Update all profiles with old format categories
*/

-- Update the category calculation function
CREATE OR REPLACE FUNCTION get_category_from_points(points integer)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN points < 200 THEN 'Iniciante'
    WHEN points < 400 THEN '7ª'
    WHEN points < 600 THEN '6ª'
    WHEN points < 800 THEN '5ª'
    WHEN points < 1000 THEN '4ª'
    WHEN points < 1200 THEN '3ª'
    WHEN points < 1400 THEN '2ª'
    ELSE '1ª'
  END;
END;
$$;

-- Update the initial points function to handle both old and new formats
CREATE OR REPLACE FUNCTION get_initial_points_for_category(category_name text)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE
    WHEN lower(category_name) = 'iniciante' THEN 100
    WHEN category_name IN ('7ª', '7a') THEN 300
    WHEN category_name IN ('6ª', '6a') THEN 500
    WHEN category_name IN ('5ª', '5a') THEN 700
    WHEN category_name IN ('4ª', '4a') THEN 900
    WHEN category_name IN ('3ª', '3a') THEN 1100
    WHEN category_name IN ('2ª', '2a') THEN 1300
    WHEN category_name IN ('1ª', '1a') THEN 1500
    WHEN lower(category_name) = 'avancado' THEN 1700
    ELSE 100
  END;
END;
$$;

-- Update existing player categories from old format to new format
UPDATE profiles
SET category = CASE
  WHEN category = '7a' THEN '7ª'
  WHEN category = '6a' THEN '6ª'
  WHEN category = '5a' THEN '5ª'
  WHEN category = '4a' THEN '4ª'
  WHEN category = '3a' THEN '3ª'
  WHEN category = '2a' THEN '2ª'
  WHEN category = '1a' THEN '1ª'
  WHEN category = 'iniciante' THEN 'Iniciante'
  WHEN category = 'avancado' THEN 'Avançado'
  ELSE category
END
WHERE category IN ('7a', '6a', '5a', '4a', '3a', '2a', '1a', 'iniciante', 'avancado');