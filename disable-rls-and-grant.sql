-- Disable RLS and Grant Permissions - FINAL FIX
-- Run this in Supabase SQL Editor

-- ================================================
-- STEP 1: Disable RLS on all tables
-- ================================================

ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_history DISABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 2: Grant full permissions to service_role
-- ================================================

GRANT ALL PRIVILEGES ON public.settings TO service_role;
GRANT ALL PRIVILEGES ON public.cities TO service_role;
GRANT ALL PRIVILEGES ON public.equipment TO service_role;
GRANT ALL PRIVILEGES ON public.borrow_history TO service_role;

-- ================================================
-- STEP 3: Grant usage on sequences (for auto-increment IDs)
-- ================================================

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ================================================
-- STEP 4: Verify RLS is disabled
-- ================================================

SELECT
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN '❌ ENABLED (BAD)' ELSE '✅ DISABLED (GOOD)' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('settings', 'cities', 'equipment', 'borrow_history')
ORDER BY tablename;

-- Expected output:
-- All tables should show: rls_enabled = false, status = '✅ DISABLED (GOOD)'

-- ================================================
-- DONE!
-- ================================================
