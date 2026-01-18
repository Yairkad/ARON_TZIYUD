-- ============================================================================
-- Fix Multi-City Manager RLS Policies
-- Created: 2026-01-18
-- Description: Update RLS policies to support managers who manage multiple cities
--              The old policies only checked users.city_id, but managers can also
--              be assigned via cities.manager1_user_id or cities.manager2_user_id
-- ============================================================================

-- ============================================================================
-- Helper Function: Check if user is manager of a specific city
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_manager_of_city(city_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is manager of this city via manager1_user_id or manager2_user_id
  RETURN EXISTS (
    SELECT 1 FROM public.cities
    WHERE id = city_uuid
    AND (manager1_user_id = auth.uid() OR manager2_user_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Helper Function: Get all city IDs that user manages
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_managed_city_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
    SELECT id FROM public.cities
    WHERE manager1_user_id = auth.uid() OR manager2_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- BORROW_HISTORY TABLE - Fix RLS Policies
-- ============================================================================

-- Drop old policy
DROP POLICY IF EXISTS "City managers manage own history" ON public.borrow_history;

-- Create new policy that checks all managed cities
CREATE POLICY "City managers manage own history" ON public.borrow_history
  FOR ALL USING (
    city_id IN (SELECT public.get_user_managed_city_ids())
  );

-- ============================================================================
-- CITIES TABLE - Fix RLS Policies
-- ============================================================================

-- Drop old policy
DROP POLICY IF EXISTS "City managers view own city" ON public.cities;
DROP POLICY IF EXISTS "City managers update own city" ON public.cities;

-- Create new policies that check manager1_user_id and manager2_user_id
CREATE POLICY "City managers view own city" ON public.cities
  FOR SELECT USING (
    manager1_user_id = auth.uid() OR manager2_user_id = auth.uid()
  );

CREATE POLICY "City managers update own city" ON public.cities
  FOR UPDATE USING (
    manager1_user_id = auth.uid() OR manager2_user_id = auth.uid()
  );

-- ============================================================================
-- CITY_EQUIPMENT TABLE - Fix RLS Policies
-- ============================================================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "City managers view own equipment" ON public.city_equipment;
DROP POLICY IF EXISTS "City managers with full access manage equipment" ON public.city_equipment;
DROP POLICY IF EXISTS "manage_city_equipment" ON public.city_equipment;

-- Create new policies that check all managed cities
CREATE POLICY "City managers view own city_equipment" ON public.city_equipment
  FOR SELECT USING (
    city_id IN (SELECT public.get_user_managed_city_ids())
  );

CREATE POLICY "City managers manage own city_equipment" ON public.city_equipment
  FOR ALL USING (
    city_id IN (SELECT public.get_user_managed_city_ids())
    AND public.has_full_access()
  );

-- ============================================================================
-- EQUIPMENT_REQUESTS TABLE - Fix RLS Policies
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS "City managers view own requests" ON public.equipment_requests;
DROP POLICY IF EXISTS "City managers approve requests" ON public.equipment_requests;
DROP POLICY IF EXISTS "City managers with full access delete requests" ON public.equipment_requests;

-- Create new policies that check all managed cities
CREATE POLICY "City managers view own requests" ON public.equipment_requests
  FOR SELECT USING (
    city_id IN (SELECT public.get_user_managed_city_ids())
  );

CREATE POLICY "City managers approve requests" ON public.equipment_requests
  FOR UPDATE USING (
    city_id IN (SELECT public.get_user_managed_city_ids())
    AND public.can_approve_requests()
  );

CREATE POLICY "City managers with full access delete requests" ON public.equipment_requests
  FOR DELETE USING (
    city_id IN (SELECT public.get_user_managed_city_ids())
    AND public.has_full_access()
  );

-- ============================================================================
-- ADMIN_NOTIFICATIONS TABLE - Fix RLS Policies
-- ============================================================================

-- Drop old policy if exists
DROP POLICY IF EXISTS "Users view relevant notifications" ON public.admin_notifications;

-- Create new policy that checks all managed cities
CREATE POLICY "Users view relevant notifications" ON public.admin_notifications
  FOR SELECT USING (
    public.is_super_admin()
    OR city_id IN (SELECT public.get_user_managed_city_ids())
  );

-- ============================================================================
-- ACTIVITY_LOGS TABLE - Fix RLS Policies (if table exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    DROP POLICY IF EXISTS "City managers view own logs" ON public.activity_logs;

    CREATE POLICY "City managers view own logs" ON public.activity_logs
      FOR SELECT USING (
        city_id IN (SELECT public.get_user_managed_city_ids())
      );
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Summary of changes:
-- 1. Added is_manager_of_city() function to check if user is manager of specific city
-- 2. Added get_user_managed_city_ids() function to get all cities user manages
-- 3. Updated borrow_history RLS to check all managed cities
-- 4. Updated cities RLS to check manager1_user_id and manager2_user_id directly
-- 5. Updated city_equipment RLS to check all managed cities (note: old "equipment" table is deprecated)
-- 6. Updated equipment_requests RLS to check all managed cities
-- 7. Updated admin_notifications RLS to check all managed cities
-- 8. Updated activity_logs RLS to check all managed cities (if table exists)
