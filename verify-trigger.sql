-- Verify that the trigger exists and is working
-- Run this in Supabase SQL Editor

-- 1. Check if the trigger exists
SELECT
  t.tgname AS trigger_name,
  c.relname AS table_name,
  p.proname AS function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';

-- 2. Check the function definition
SELECT pg_get_functiondef('public.handle_new_user()'::regprocedure);

-- 3. Check if enums exist
SELECT
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('user_role', 'permission_level', 'manager_role_type')
ORDER BY t.typname, e.enumsortorder;

-- 4. List all users in auth.users but not in public.users
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data,
  au.created_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.email IS NOT NULL
ORDER BY au.created_at DESC;
