-- Verify and Fix Settings Table - Run this in Supabase SQL Editor
-- This will check the current state and fix if needed

-- ================================================
-- STEP 1: Check current RLS status
-- ================================================

SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'settings';

-- Expected: rls_enabled should be false (we disabled it)

-- ================================================
-- STEP 2: Check if settings table has data
-- ================================================

SELECT * FROM public.settings;

-- Expected: Should show at least one row with key='super_admin_password'

-- ================================================
-- STEP 3: Count rows
-- ================================================

SELECT COUNT(*) as total_rows FROM public.settings;

-- Expected: At least 1 row

-- ================================================
-- STEP 4: Check specifically for super_admin_password
-- ================================================

SELECT
  key,
  value,
  LENGTH(value) as password_length,
  CASE
    WHEN value LIKE '$2a$%' OR value LIKE '$2b$%' THEN 'encrypted'
    ELSE 'plain_text'
  END as password_type
FROM public.settings
WHERE key = 'super_admin_password';

-- Expected: One row with key='super_admin_password'

-- ================================================
-- STEP 5: If row doesn't exist, create it
-- ================================================

-- Only run this if the above query returned 0 rows:
INSERT INTO public.settings (key, value)
VALUES ('super_admin_password', '1234')
ON CONFLICT (key) DO NOTHING;

-- ================================================
-- STEP 6: Verify RLS is disabled
-- ================================================

-- If RLS is still enabled, disable it:
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 7: Grant permissions to service_role
-- ================================================

-- Make sure service_role has full access:
GRANT ALL ON public.settings TO service_role;
GRANT ALL ON public.cities TO service_role;
GRANT ALL ON public.equipment TO service_role;
GRANT ALL ON public.borrow_history TO service_role;

-- ================================================
-- STEP 8: Final verification
-- ================================================

SELECT
  'Settings table check:' as check_type,
  COUNT(*) as row_count,
  MAX(CASE WHEN key = 'super_admin_password' THEN 'EXISTS' ELSE 'MISSING' END) as super_admin_password_status
FROM public.settings;

-- Expected: row_count >= 1, super_admin_password_status = 'EXISTS'

-- ================================================
-- DONE! Run all commands above in order
-- ================================================
