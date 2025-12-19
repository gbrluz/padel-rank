/*
  # Update Existing Player Categories Based on Points

  ## Description
  Updates the category field for all existing players based on their current ranking points.

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
*/

UPDATE profiles
SET category = get_category_from_points(ranking_points);
