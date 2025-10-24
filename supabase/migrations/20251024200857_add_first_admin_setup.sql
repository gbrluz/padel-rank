/*
  # Add First Admin Setup

  ## Changes
  1. Create a function to set the first admin (only works if no admin exists)
  2. Set the first user as admin (Gabriel Luz)
  
  ## Security
  - The function can only be used when no admin exists
  - After first admin is set, only admins can create other admins
*/

-- Function to set first admin (only works if no admin exists yet)
CREATE OR REPLACE FUNCTION set_first_admin(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_count integer;
BEGIN
  -- Check if any admin exists
  SELECT COUNT(*) INTO admin_count
  FROM profiles
  WHERE is_admin = true;
  
  -- Only allow if no admin exists
  IF admin_count = 0 THEN
    UPDATE profiles
    SET is_admin = true
    WHERE id = user_id;
  ELSE
    RAISE EXCEPTION 'An admin already exists. Only admins can create other admins.';
  END IF;
END;
$$;

-- Set Gabriel Luz as the first admin
SELECT set_first_admin('e0e31e80-0cd1-4a2c-b2ce-38d366f39061');
