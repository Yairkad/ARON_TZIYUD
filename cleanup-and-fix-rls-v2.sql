-- Cleanup and fix RLS policies - Version 2 (FIXED)
-- Run this in Supabase SQL Editor

-- ================================================
-- STEP 1: Drop ALL existing policies on all tables
-- ================================================

-- Settings table
DROP POLICY IF EXISTS "Deny all access to settings" ON public.settings;
DROP POLICY IF EXISTS "Block public access to settings" ON public.settings;

-- Cities table
DROP POLICY IF EXISTS "Public can read active cities" ON public.cities;
DROP POLICY IF EXISTS "Deny direct insert to cities" ON public.cities;
DROP POLICY IF EXISTS "Deny direct update to cities" ON public.cities;
DROP POLICY IF EXISTS "Block public updates to cities" ON public.cities;
DROP POLICY IF EXISTS "Block public deletes to cities" ON public.cities;
DROP POLICY IF EXISTS "Deny direct delete to cities" ON public.cities;

-- Equipment table
DROP POLICY IF EXISTS "Public can read equipment" ON public.equipment;
DROP POLICY IF EXISTS "Deny direct insert to equipment" ON public.equipment;
DROP POLICY IF EXISTS "Deny direct update to equipment" ON public.equipment;
DROP POLICY IF EXISTS "Deny direct delete to equipment" ON public.equipment;
DROP POLICY IF EXISTS "Block public modifications to equipment" ON public.equipment;

-- Borrow History table
DROP POLICY IF EXISTS "Public can read borrow_history" ON public.borrow_history;
DROP POLICY IF EXISTS "Deny direct insert to borrow_history" ON public.borrow_history;
DROP POLICY IF EXISTS "Deny direct update to borrow_history" ON public.borrow_history;
DROP POLICY IF EXISTS "Deny direct delete to borrow_history" ON public.borrow_history;
DROP POLICY IF EXISTS "Block public modifications to borrow_history" ON public.borrow_history;

-- ================================================
-- STEP 2: Verify RLS is enabled on all tables
-- ================================================

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.borrow_history ENABLE ROW LEVEL SECURITY;

-- ================================================
-- STEP 3: Create NEW policies (with service role bypass)
-- ================================================

-- **Settings Table**
-- Block ALL access from browser clients (anon/authenticated)
-- Service role can still access (bypasses RLS automatically)
CREATE POLICY "Block public access to settings"
ON public.settings FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- **Cities Table**
-- Allow reading active cities, block updates/deletes from browser
CREATE POLICY "Public can read active cities"
ON public.cities FOR SELECT
TO anon, authenticated
USING (is_active = true);

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
-- Allow reading, block modifications from browser
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
-- Allow reading, block modifications from browser
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
-- DONE! Summary:
-- ================================================
-- ✅ Browser clients (anon key) can:
--    - Read active cities
--    - Read equipment
--    - Read borrow history
--    - CANNOT access settings
--    - CANNOT modify anything
--
-- ✅ API Routes (service role key) can:
--    - Do EVERYTHING (bypasses RLS automatically)
--    - Read/update settings
--    - Read/update cities
--    - Read/update equipment
--    - Read/update borrow_history
-- ================================================
