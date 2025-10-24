/*
  # Fix Infinite Recursion in Admin Policies

  ## Problem
  The admin policies cause infinite recursion because they query the profiles table
  within policies that apply to the profiles table itself.

  ## Solution
  1. Drop all existing admin policies that cause recursion
  2. Create a security definer function to check admin status (bypasses RLS)
  3. Recreate admin policies using the new function

  ## Changes
  - Drop problematic admin policies from profiles table
  - Create `is_admin()` function with SECURITY DEFINER
  - Recreate admin policies using the new function
  - Keep existing user policies intact
*/

-- Drop existing admin policies that cause recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON profiles;

-- Create a function to check admin status (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
$$;

-- Recreate admin policies using the function
CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE
  TO authenticated
  USING (is_admin());
