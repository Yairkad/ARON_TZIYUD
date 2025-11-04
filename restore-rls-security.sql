-- Restore RLS Security - Final Version
-- This restores RLS on all tables while keeping Service Role Key working

-- ================================================
-- STEP 1: Enable RLS on all tables
-- ================================================

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_history ENABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 2: Drop any existing policies
-- ================================================

-- Settings table
DROP POLICY IF EXISTS "Block public access to settings" ON public.settings;

-- Cities table
DROP POLICY IF EXISTS "Public can read active cities" ON public.cities;
DROP POLICY IF EXISTS "Block public updates to cities" ON public.cities;
DROP POLICY IF EXISTS "Block public deletes to cities" ON public.cities;
DROP POLICY IF EXISTS "Block public inserts to cities" ON public.cities;

-- Equipment table
DROP POLICY IF EXISTS "Public can read equipment" ON public.equipment;
DROP POLICY IF EXISTS "Block public inserts to equipment" ON public.equipment;
DROP POLICY IF EXISTS "Block public updates to equipment" ON public.equipment;
DROP POLICY IF EXISTS "Block public deletes to equipment" ON public.equipment;

-- Borrow History table
DROP POLICY IF EXISTS "Public can read borrow_history" ON public.borrow_history;
DROP POLICY IF EXISTS "Block public inserts to borrow_history" ON public.borrow_history;
DROP POLICY IF EXISTS "Block public updates to borrow_history" ON public.borrow_history;
DROP POLICY IF EXISTS "Block public deletes to borrow_history" ON public.borrow_history;

-- ================================================
-- STEP 3: Create secure policies
-- ================================================

-- **Settings Table**
-- Block ALL access from browser (anon/authenticated)
-- Service role bypasses RLS automatically
CREATE POLICY "Block public access to settings"
ON public.settings FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- **Cities Table**
-- Allow reading active cities, block all modifications from browser
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

-- **Equipment Table**
-- Allow reading, block all modifications from browser
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

-- **Borrow History Table**
-- Allow reading, block all modifications from browser
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

-- ================================================
-- STEP 4: Grant full permissions to service_role
-- ================================================

GRANT ALL PRIVILEGES ON public.settings TO service_role;
GRANT ALL PRIVILEGES ON public.cities TO service_role;
GRANT ALL PRIVILEGES ON public.equipment TO service_role;
GRANT ALL PRIVILEGES ON public.borrow_history TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ================================================
-- STEP 5: Verify RLS is enabled
-- ================================================

SELECT
  tablename,
  rowsecurity as rls_enabled,
  CASE WHEN rowsecurity THEN '✅ ENABLED (SECURE)' ELSE '❌ DISABLED (INSECURE)' END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('settings', 'cities', 'equipment', 'borrow_history')
ORDER BY tablename;

-- ================================================
-- DONE! Summary:
-- ================================================
-- ✅ Browser clients (anon key) can:
--    - Read active cities
--    - Read equipment
--    - Read borrow history
--    - CANNOT access settings table
--    - CANNOT modify anything
--
-- ✅ API Routes (service role key) can:
--    - Do EVERYTHING (bypasses RLS automatically)
--    - Full access to all tables
--
-- ✅ Security:
--    - RLS protects all tables from direct browser access
--    - Service Role Key works for all API operations
--    - Passwords are safe from browser inspection
-- ================================================
