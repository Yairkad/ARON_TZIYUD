-- Fix RLS - Final Version
-- This ensures all tables have proper RLS and Service Role Key works

-- ================================================
-- STEP 1: Enable RLS on ALL tables
-- ================================================

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 2: Drop ALL existing policies
-- ================================================

-- Settings
DROP POLICY IF EXISTS "Block public access to settings" ON public.settings;

-- Cities
DROP POLICY IF EXISTS "Public can read active cities" ON public.cities;
DROP POLICY IF EXISTS "Block public inserts to cities" ON public.cities;
DROP POLICY IF EXISTS "Block public updates to cities" ON public.cities;
DROP POLICY IF EXISTS "Block public deletes to cities" ON public.cities;

-- Equipment
DROP POLICY IF EXISTS "Public can read equipment" ON public.equipment;
DROP POLICY IF EXISTS "Block public inserts to equipment" ON public.equipment;
DROP POLICY IF EXISTS "Block public updates to equipment" ON public.equipment;
DROP POLICY IF EXISTS "Block public deletes to equipment" ON public.equipment;

-- Borrow History
DROP POLICY IF EXISTS "Public can read borrow_history" ON public.borrow_history;
DROP POLICY IF EXISTS "Block public inserts to borrow_history" ON public.borrow_history;
DROP POLICY IF EXISTS "Block public updates to borrow_history" ON public.borrow_history;
DROP POLICY IF EXISTS "Block public deletes to borrow_history" ON public.borrow_history;

-- Admin Notifications
DROP POLICY IF EXISTS "Block public access to admin_notifications" ON public.admin_notifications;

-- ================================================
-- STEP 3: Create NEW policies
-- ================================================

-- **Settings Table** - Block ALL public access
CREATE POLICY "Block public access to settings"
ON public.settings FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- **Cities Table** - Allow read active, block modifications
CREATE POLICY "Public can read active cities"
ON public.cities FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Block public inserts to cities"
ON public.cities FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block public updates to cities"
ON public.cities FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block public deletes to cities"
ON public.cities FOR DELETE
TO anon, authenticated
USING (false);

-- **Equipment Table** - Allow read, block modifications
CREATE POLICY "Public can read equipment"
ON public.equipment FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Block public inserts to equipment"
ON public.equipment FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block public updates to equipment"
ON public.equipment FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block public deletes to equipment"
ON public.equipment FOR DELETE
TO anon, authenticated
USING (false);

-- **Borrow History Table** - Allow read, block modifications
CREATE POLICY "Public can read borrow_history"
ON public.borrow_history FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Block public inserts to borrow_history"
ON public.borrow_history FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "Block public updates to borrow_history"
ON public.borrow_history FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "Block public deletes to borrow_history"
ON public.borrow_history FOR DELETE
TO anon, authenticated
USING (false);

-- **Admin Notifications Table** - Block ALL public access
CREATE POLICY "Block public access to admin_notifications"
ON public.admin_notifications FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- ================================================
-- STEP 4: Grant FULL permissions to service_role
-- ================================================

GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

-- ================================================
-- STEP 5: Verify everything
-- ================================================

SELECT
  tablename,
  rowsecurity as rls_enabled,
  CASE
    WHEN rowsecurity THEN '✅ ENABLED'
    ELSE '❌ DISABLED'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('settings', 'cities', 'equipment', 'borrow_history', 'admin_notifications')
ORDER BY tablename;

-- ================================================
-- Expected: All tables should show ✅ ENABLED
-- ================================================
