-- Check if RLS is enabled on cities table
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'cities';

-- Check all policies on cities
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'cities'
ORDER BY cmd, policyname;

-- Try to see what columns are accessible
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'cities'
ORDER BY ordinal_position;
