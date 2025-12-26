/*
  # Rename profiles table to players

  ## Changes
  This migration renames the `profiles` table to `players` for consistency.
  All foreign key constraints, indexes, policies, and triggers are updated accordingly.

  ## Tables Modified
  - `profiles` → renamed to `players`
  
  ## Updated References
  - All foreign key constraints
  - All RLS policies
  - All indexes
  - All triggers and functions
  - Storage bucket policies (avatars)
*/

-- Rename the table
ALTER TABLE IF EXISTS profiles RENAME TO players;

-- Update indexes
ALTER INDEX IF EXISTS idx_profiles_gender_ranking RENAME TO idx_players_gender_ranking;

-- Update triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON players;
CREATE TRIGGER update_players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_win_rate ON players;
CREATE TRIGGER update_win_rate
  BEFORE INSERT OR UPDATE OF total_matches, total_wins ON players
  FOR EACH ROW
  EXECUTE FUNCTION calculate_win_rate();

-- Rename RLS policies
DROP POLICY IF EXISTS "Users can view all profiles" ON players;
CREATE POLICY "Users can view all players"
  ON players FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON players;
CREATE POLICY "Users can update own player"
  ON players FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON players;
CREATE POLICY "Users can insert own player"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Update the get_profiles_with_email function to get_players_with_email
DROP FUNCTION IF EXISTS get_profiles_with_email();
CREATE OR REPLACE FUNCTION get_players_with_email(search_term text DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  gender text,
  state text,
  city text,
  category text,
  ranking_points integer,
  total_matches integer,
  total_wins integer,
  is_admin boolean,
  is_provisional boolean,
  can_join_leagues boolean
) 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    u.email,
    p.gender,
    p.state,
    p.city,
    p.category,
    p.ranking_points,
    p.total_matches,
    p.total_wins,
    p.is_admin,
    p.is_provisional,
    p.can_join_leagues
  FROM players p
  INNER JOIN auth.users u ON p.id = u.id
  WHERE search_term IS NULL 
    OR p.full_name ILIKE '%' || search_term || '%'
    OR u.email ILIKE '%' || search_term || '%'
  ORDER BY p.full_name;
END;
$$;

-- Update storage policies for avatars bucket
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'avatars'
  ) THEN
    DROP POLICY IF EXISTS "Users can view all avatars" ON storage.objects;
    CREATE POLICY "Users can view all avatars"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'avatars');

    DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
    CREATE POLICY "Users can upload own avatar"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
    CREATE POLICY "Users can update own avatar"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
    CREATE POLICY "Users can delete own avatar"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;