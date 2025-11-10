-- Final fix for RLS policies on cities table
-- The issue is that SELECT policies only work for 'public' role, not 'anon' or 'authenticated'

-- Drop all existing SELECT policies
DROP POLICY IF EXISTS "Enable read access for anon users" ON cities;
DROP POLICY IF EXISTS "Enable read access for public" ON cities;
DROP POLICY IF EXISTS "Enable read access for active cities" ON cities;
DROP POLICY IF EXISTS "Allow public read access to active cities" ON cities;

-- Create a new policy that explicitly allows anon and authenticated roles
CREATE POLICY "Enable read access for all users"
ON cities
FOR SELECT
USING (is_active = true);

-- Verify the policy
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'cities' AND cmd = 'SELECT';
