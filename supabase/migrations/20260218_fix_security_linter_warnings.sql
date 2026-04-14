-- ============================================================================
-- Fix Security Linter Warnings - ARON_TZIYUD
-- Created: 2026-02-18
-- Description: Fix two categories of Supabase security linter warnings:
--   1. function_search_path_mutable: Add SET search_path to SECURITY DEFINER functions
--   2. rls_policy_always_true: Remove/replace overly permissive INSERT/UPDATE/DELETE
--      policies that use WITH CHECK (true) or USING (true).
--
-- All "System" operations in this project go through server-side API routes
-- that use the service_role client, which bypasses RLS entirely.
-- Therefore these permissive policies are unnecessary and should be removed.
-- ============================================================================


-- ============================================================================
-- 1. FIX FUNCTION SEARCH_PATH
-- SECURITY DEFINER functions with a mutable search_path are vulnerable to
-- search_path injection. Adding SET search_path = public pins the schema.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_manager_of_city(city_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.cities
    WHERE id = city_uuid
    AND (manager1_user_id = auth.uid() OR manager2_user_id = auth.uid())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_managed_city_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
    SELECT id FROM public.cities
    WHERE manager1_user_id = auth.uid() OR manager2_user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- ============================================================================
-- 2. ADMIN_NOTIFICATIONS - Remove INSERT policy with WITH CHECK (true)
-- All inserts come from server-side API routes using service_role,
-- which bypasses RLS. No anon/authenticated user should insert directly.
-- ============================================================================

DROP POLICY IF EXISTS "System can insert admin_notifications" ON public.admin_notifications;


-- ============================================================================
-- 3. BORROW_HISTORY - Remove INSERT policy with WITH CHECK (true)
-- All borrow record creation goes through /api/requests/* routes (service_role).
-- ============================================================================

DROP POLICY IF EXISTS "Public can create borrow records" ON public.borrow_history;


-- ============================================================================
-- 4. EMAIL_LOGS - Remove INSERT policy with WITH CHECK (true)
-- All email log inserts are done server-side via service_role.
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_logs') THEN
    DROP POLICY IF EXISTS "System inserts email_logs" ON public.email_logs;
  END IF;
END $$;


-- ============================================================================
-- 5. EQUIPMENT_REQUESTS - Remove INSERT policy with WITH CHECK (true)
-- All requests are created via /api/requests/create route (service_role).
-- ============================================================================

DROP POLICY IF EXISTS "Anyone creates requests" ON public.equipment_requests;


-- ============================================================================
-- 6. PUSH_SUBSCRIPTIONS - Remove all permissive policies
-- All push subscription management goes through /api/push/subscribe (service_role).
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'push_subscriptions') THEN
    DROP POLICY IF EXISTS "System inserts push_subscriptions" ON public.push_subscriptions;
    DROP POLICY IF EXISTS "System updates push_subscriptions" ON public.push_subscriptions;
    DROP POLICY IF EXISTS "System deletes push_subscriptions" ON public.push_subscriptions;
    -- Also drop the original permissive policies from add-push-subscriptions.sql
    DROP POLICY IF EXISTS "City managers can insert their own push subscriptions" ON public.push_subscriptions;
    DROP POLICY IF EXISTS "City managers can update their own push subscriptions" ON public.push_subscriptions;
    DROP POLICY IF EXISTS "City managers can delete their own push subscriptions" ON public.push_subscriptions;
  END IF;
END $$;


-- ============================================================================
-- 7. REQUEST_ITEMS - Remove INSERT policy with WITH CHECK (true)
-- All request item creation goes through /api/requests/create route (service_role).
-- ============================================================================

DROP POLICY IF EXISTS "Anyone can create request_items" ON public.request_items;


-- ============================================================================
-- 8. USERS - Remove UPDATE policy with USING (true) / WITH CHECK (true)
-- Password reset token updates go through /api/managers/reset-password (service_role).
-- Super admins manage users via service_role. No need for a permissive UPDATE policy.
-- ============================================================================

DROP POLICY IF EXISTS "System updates reset tokens" ON public.users;


-- ============================================================================
-- 9. VEHICLE_MODELS - Restrict INSERT/UPDATE to managers only
-- Replace the open authenticated policies with proper manager-only checks.
-- ============================================================================

-- Drop old permissive policies (both possible naming conventions)
DROP POLICY IF EXISTS "Authenticated can insert vehicle_models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Authenticated can update vehicle_models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Managers can insert vehicle models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Managers can update vehicle models" ON public.vehicle_models;

-- Only super admins or users with full_access can insert vehicle models
CREATE POLICY "Managers can insert vehicle_models" ON public.vehicle_models
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin() OR public.has_full_access());

-- Only super admins or users with full_access can update vehicle models
CREATE POLICY "Managers can update vehicle_models" ON public.vehicle_models
  FOR UPDATE
  TO authenticated
  USING (public.is_super_admin() OR public.has_full_access())
  WITH CHECK (public.is_super_admin() OR public.has_full_access());


-- ============================================================================
-- Migration Complete
-- ============================================================================
-- Summary:
-- 1. is_manager_of_city()         - Added SET search_path = public
-- 2. get_user_managed_city_ids()  - Added SET search_path = public
-- 3. admin_notifications          - Removed INSERT WITH CHECK (true)
-- 4. borrow_history               - Removed INSERT WITH CHECK (true)
-- 5. email_logs                   - Removed INSERT WITH CHECK (true)
-- 6. equipment_requests           - Removed INSERT WITH CHECK (true)
-- 7. push_subscriptions           - Removed INSERT/UPDATE/DELETE USING/CHECK (true)
-- 8. request_items                - Removed INSERT WITH CHECK (true)
-- 9. users                        - Removed UPDATE USING/CHECK (true)
-- 10. vehicle_models              - Restricted INSERT/UPDATE to managers only
