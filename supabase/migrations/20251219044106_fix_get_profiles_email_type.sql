/*
  # Fix get_profiles_with_email Function - Email Type

  ## Issue
  The email column in auth.users is varchar(255), but function declared it as text.

  ## Changes
  - Drop existing function
  - Recreate with correct email type (varchar(255))
*/

DROP FUNCTION IF EXISTS get_profiles_with_email();

CREATE OR REPLACE FUNCTION get_profiles_with_email()
RETURNS TABLE (
  id uuid,
  full_name text,
  gender text,
  birth_date date,
  preferred_side text,
  availability jsonb,
  photo_url text,
  category text,
  state text,
  city text,
  ranking_points integer,
  total_matches integer,
  total_wins integer,
  win_rate numeric,
  is_admin boolean,
  created_at timestamptz,
  email varchar(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, pg_temp
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    p.gender,
    p.birth_date,
    p.preferred_side,
    p.availability,
    p.photo_url,
    p.category,
    p.state,
    p.city,
    p.ranking_points,
    p.total_matches,
    p.total_wins,
    p.win_rate,
    p.is_admin,
    p.created_at,
    u.email
  FROM public.profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_profiles_with_email() TO authenticated;
