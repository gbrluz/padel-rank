/*
  # Create Function to Get Profiles with Email

  ## Changes
  1. Create a function that returns profiles with email addresses
  2. Function checks if the user is an admin before returning data
  
  ## Security
  - Only admins can execute this function
  - Uses SECURITY DEFINER to access auth.users table
  - Function validates admin status before returning any data
*/

-- Create function to get profiles with email (admin only)
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
AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can access this function';
  END IF;

  -- Return profiles with emails
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_profiles_with_email() TO authenticated;
