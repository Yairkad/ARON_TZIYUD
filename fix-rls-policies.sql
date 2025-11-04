-- Fix RLS Policies to allow Service Role Key to update passwords
-- This script fixes the overly restrictive policies that block password updates

-- ================================================
-- STEP 1: Drop existing restrictive policies
-- ================================================

DROP POLICY IF EXISTS "Deny all access to settings" ON public.settings;
DROP POLICY IF EXISTS "Deny direct update to cities" ON public.cities;

-- ================================================
-- STEP 2: Create new policies that allow Service Role
-- ================================================

-- Settings Table: Block public access but allow service role
-- Note: Service role bypasses RLS by default, but we make it explicit
CREATE POLICY "Block public access to settings"
ON public.settings FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- Cities Table: Allow reading active cities, block direct updates from public only
CREATE POLICY "Block public updates to cities"
ON public.cities FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

-- ================================================
-- Explanation:
-- ================================================
-- By using "TO anon, authenticated" instead of "TO public",
-- we specifically target browser clients while allowing
-- the service role (used by API Routes) to bypass these restrictions.
--
-- Service Role Key automatically bypasses RLS, so API Routes can:
-- ✅ Read from settings table
-- ✅ Update passwords in settings table
-- ✅ Update passwords in cities table
--
-- But browser clients (with anon key) cannot:
-- ❌ Access settings table at all
-- ❌ Directly update cities table
-- ================================================
