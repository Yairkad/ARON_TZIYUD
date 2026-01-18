-- ============================================================================
-- Cleanup Old Permissive RLS Policies
-- Created: 2026-01-14
-- Description: Remove ALL old permissive policies that were not caught
--              by previous migrations. These are duplicate/conflicting policies.
-- ============================================================================

-- ============================================================================
-- CRITICAL: Remove Old Permissive Policies
-- ============================================================================

-- admin_notifications
DROP POLICY IF EXISTS "Allow update reset_token" ON public.users;

-- alert_tracking
DROP POLICY IF EXISTS "Service role full access on alert_tracking" ON public.alert_tracking;

-- call_center_managers
DROP POLICY IF EXISTS "Allow public delete call_center_managers" ON public.call_center_managers;
DROP POLICY IF EXISTS "Allow public insert call_center_managers" ON public.call_center_managers;
DROP POLICY IF EXISTS "Allow public update call_center_managers" ON public.call_center_managers;

-- call_centers
DROP POLICY IF EXISTS "Allow public delete call_centers" ON public.call_centers;
DROP POLICY IF EXISTS "Allow public insert call_centers" ON public.call_centers;
DROP POLICY IF EXISTS "Allow public update call_centers" ON public.call_centers;

-- email_logs
DROP POLICY IF EXISTS "Service role can insert email logs" ON public.email_logs;

-- missing_vehicle_reports
DROP POLICY IF EXISTS "Allow all operations" ON public.missing_vehicle_reports;

-- operators
DROP POLICY IF EXISTS "Allow public delete operators" ON public.operators;
DROP POLICY IF EXISTS "Allow public insert operators" ON public.operators;
DROP POLICY IF EXISTS "Allow public update operators" ON public.operators;

-- push_subscriptions (CRITICAL - MANY OLD POLICIES!)
DROP POLICY IF EXISTS "Allow all for push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "City managers can delete their own push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "City managers can insert their own push subscriptions" ON public.push_subscriptions;

-- wheel_station_push_subscriptions (CRITICAL - MANY OLD POLICIES!)
DROP POLICY IF EXISTS "Anyone can create push subscriptions" ON public.wheel_station_push_subscriptions;
DROP POLICY IF EXISTS "Anyone can delete push subscriptions" ON public.wheel_station_push_subscriptions;
DROP POLICY IF EXISTS "Anyone can update push subscriptions" ON public.wheel_station_push_subscriptions;
DROP POLICY IF EXISTS "Public can delete own subscription by endpoint" ON public.wheel_station_push_subscriptions;
DROP POLICY IF EXISTS "Public can insert subscriptions" ON public.wheel_station_push_subscriptions;
DROP POLICY IF EXISTS "Service role has full access" ON public.wheel_station_push_subscriptions;

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Run this to verify all old policies are gone:
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    qual = 'true'
    OR with_check = 'true'
  )
  AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')
ORDER BY tablename, policyname;

-- Expected result: Only intentional permissive policies should remain:
-- - Equipment requests: "Anyone creates requests" (INSERT) - public feature
-- - Borrow history: "Public can create borrow records" (INSERT) - public borrowing
-- - Request items: "Anyone can create request_items" (INSERT) - public requests
-- - Error reports: "Public can insert error_reports" (INSERT) - public error reporting
-- - Missing vehicle reports: "Public can insert missing_vehicle_reports" (INSERT) - public reporting
-- - Signed forms: "System inserts signed_forms" (INSERT) - system only
-- - All "System inserts/updates" policies - system operations

-- ============================================================================
-- Migration Complete
-- ============================================================================

SELECT 'Old permissive policies cleaned up successfully!' as status;
