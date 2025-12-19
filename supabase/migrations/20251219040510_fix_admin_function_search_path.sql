/*
  # Fix Admin Function Search Path

  ## Issue
  The is_admin() function needs access to the auth schema to call auth.uid().
  The previous migration set search_path to only 'public, pg_temp' which prevented
  access to auth functions.

  ## Changes
  - Update is_admin() function to include auth schema in search_path
  - Update get_profiles_with_email() function to include auth schema in search_path
  - Keep pg_temp for security and public for main schema access

  ## Security
  - Maintains SECURITY DEFINER for secure access
  - Uses explicit search_path including auth schema for proper function resolution
*/

-- Recreate is_admin function with auth schema in search_path
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = auth, public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$;

-- Recreate get_profiles_with_email function with auth schema in search_path
CREATE OR REPLACE FUNCTION get_profiles_with_email()
RETURNS TABLE (
  id uuid,
  full_name text,
  gender text,
  birth_date date,
  phone text,
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
  email text
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
    p.phone,
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
  FROM profiles p
  LEFT JOIN auth.users u ON p.id = u.id
  ORDER BY p.created_at DESC;
END;
$$;
