-- Fix RLS policies for cities table to allow anon users to read all columns
-- This is needed for the hide_location feature to work properly

-- First, drop any existing conflicting policies
DROP POLICY IF EXISTS "Enable read access for anon users" ON cities;
DROP POLICY IF EXISTS "Enable read access for public" ON cities;

-- Create a single comprehensive policy for reading cities
CREATE POLICY "Allow public read access to active cities"
ON cities
FOR SELECT
TO public, anon, authenticated
USING (is_active = true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'cities';
