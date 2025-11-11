-- Check RLS policies on users table
-- Run this in Supabase SQL Editor

-- Check if RLS is enabled on users table
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'users' AND schemaname = 'public';

-- List all policies on users table
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users' AND schemaname = 'public';

-- Show detailed policy definitions
SELECT
  pol.polname AS policy_name,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS command,
  CASE pol.polpermissive
    WHEN true THEN 'PERMISSIVE'
    WHEN false THEN 'RESTRICTIVE'
  END AS type,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
JOIN pg_namespace pn ON pc.relnamespace = pn.oid
WHERE pc.relname = 'users'
  AND pn.nspname = 'public';
