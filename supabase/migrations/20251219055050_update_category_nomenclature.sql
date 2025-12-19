/*
  # Update Category Nomenclature

  ## Description
  Updates the category function to use ordinal symbols (ª) and removes the "avancado" category.
  The highest category is now "1ª".

  ## Category Mapping
  - < 200 points = Iniciante
  - 200-399 points = 7ª
  - 400-599 points = 6ª
  - 600-799 points = 5ª
  - 800-999 points = 4ª
  - 1000-1199 points = 3ª
  - 1200-1399 points = 2ª
  - >= 1400 points = 1ª
*/

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

UPDATE profiles
SET category = get_category_from_points(ranking_points);
