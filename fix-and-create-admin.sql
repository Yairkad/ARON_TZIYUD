-- Fix and Create Super Admin User
-- Copy and paste this into Supabase Dashboard → SQL Editor → New Query

-- =============================================
-- Step 1: Clean up any broken users
-- =============================================

-- Delete from public.users first (if exists)
DELETE FROM public.users WHERE email = 'yk74re@gmail.com';

-- Delete from auth.users (this is the problematic user)
DELETE FROM auth.users WHERE email = 'yk74re@gmail.com';

-- Also clean up any orphaned users in auth.users that don't have a corresponding public.users entry
DELETE FROM auth.users
WHERE id NOT IN (SELECT id FROM public.users);

-- =============================================
-- Step 2: Check if trigger exists and is working
-- =============================================

-- View the trigger
SELECT
  tgname AS trigger_name,
  tgenabled AS enabled,
  proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- =============================================
-- Step 3: Fix the trigger if needed
-- =============================================

-- Drop and recreate the trigger function with correct type name
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    role,
    city_id,
    full_name,
    permissions,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'city_manager'),
    (NEW.raw_user_meta_data->>'city_id')::UUID,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'permissions')::user_permission, 'full_access'),
    COALESCE((NEW.raw_user_meta_data->>'is_active')::BOOLEAN, true)
  );
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- Step 4: Verify cleanup
-- =============================================

-- Check auth.users
SELECT
  'auth.users' as table_name,
  COUNT(*) as user_count
FROM auth.users;

-- Check public.users
SELECT
  'public.users' as table_name,
  COUNT(*) as user_count
FROM public.users;

-- List any remaining users
SELECT
  id,
  email,
  created_at,
  email_confirmed_at
FROM auth.users;

SELECT
  id,
  email,
  role,
  permissions
FROM public.users;
