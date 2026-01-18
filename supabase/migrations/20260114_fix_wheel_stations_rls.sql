-- ============================================================================
-- Fix Wheel Stations RLS Security Issues
-- Created: 2026-01-14
-- Description: Remove overly permissive RLS policies and strengthen security
--              for Wheel Stations tables only
-- ============================================================================

-- ============================================================================
-- VEHICLE_MODELS TABLE
-- ============================================================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Managers can insert vehicle models" ON public.vehicle_models;
DROP POLICY IF EXISTS "Managers can update vehicle models" ON public.vehicle_models;

-- Keep: "Public read access to vehicle models" - already correct (SELECT only)

-- Only authenticated users can insert vehicle models
CREATE POLICY "Authenticated can insert vehicle_models" ON public.vehicle_models
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only authenticated users can update vehicle models
CREATE POLICY "Authenticated can update vehicle_models" ON public.vehicle_models
  FOR UPDATE
  TO authenticated
  USING (true);

-- Only super admins can delete vehicle models
CREATE POLICY "Super admins can delete vehicle_models" ON public.vehicle_models
  FOR DELETE
  USING (public.is_super_admin());

-- ============================================================================
-- DISTRICTS TABLE
-- ============================================================================

-- Drop overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can manage districts" ON public.districts;

-- Keep: "Anyone can view districts" - already correct (SELECT only)

-- Only super admins can manage districts
CREATE POLICY "Super admins manage districts" ON public.districts
  FOR ALL
  TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- ============================================================================
-- WHEEL_STATIONS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wheel_stations') THEN

    -- Enable RLS if not already enabled
    ALTER TABLE public.wheel_stations ENABLE ROW LEVEL SECURITY;

    -- Drop any overly permissive policies
    DROP POLICY IF EXISTS "Allow all access to wheel_stations" ON public.wheel_stations;
    DROP POLICY IF EXISTS "Public can insert wheel_stations" ON public.wheel_stations;
    DROP POLICY IF EXISTS "Anyone can manage wheel_stations" ON public.wheel_stations;

    -- Public can view wheel stations (for public wheel search feature)
    DROP POLICY IF EXISTS "Public can view wheel_stations" ON public.wheel_stations;
    CREATE POLICY "Public can view wheel_stations" ON public.wheel_stations
      FOR SELECT
      USING (true);

    -- Only super admins can manage wheel stations
    DROP POLICY IF EXISTS "Super admins manage wheel_stations" ON public.wheel_stations;
    CREATE POLICY "Super admins manage wheel_stations" ON public.wheel_stations
      FOR ALL
      TO authenticated
      USING (public.is_super_admin())
      WITH CHECK (public.is_super_admin());

  END IF;
END $$;

-- ============================================================================
-- CALL_CENTERS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_centers') THEN

    -- Enable RLS if not already enabled
    ALTER TABLE public.call_centers ENABLE ROW LEVEL SECURITY;

    -- Drop overly permissive policies
    DROP POLICY IF EXISTS "Allow all access to call_centers" ON public.call_centers;
    DROP POLICY IF EXISTS "Anyone can manage call_centers" ON public.call_centers;

    -- Public can view call centers (for displaying contact info)
    DROP POLICY IF EXISTS "Public can view call_centers" ON public.call_centers;
    CREATE POLICY "Public can view call_centers" ON public.call_centers
      FOR SELECT
      USING (true);

    -- Only super admins can manage call centers
    DROP POLICY IF EXISTS "Super admins manage call_centers" ON public.call_centers;
    CREATE POLICY "Super admins manage call_centers" ON public.call_centers
      FOR ALL
      TO authenticated
      USING (public.is_super_admin())
      WITH CHECK (public.is_super_admin());

  END IF;
END $$;

-- ============================================================================
-- CALL_CENTER_MANAGERS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_center_managers') THEN

    -- Enable RLS if not already enabled
    ALTER TABLE public.call_center_managers ENABLE ROW LEVEL SECURITY;

    -- Drop overly permissive policies
    DROP POLICY IF EXISTS "Allow all access to call_center_managers" ON public.call_center_managers;
    DROP POLICY IF EXISTS "Anyone can manage call_center_managers" ON public.call_center_managers;

    -- Only super admins can view call center managers
    DROP POLICY IF EXISTS "Super admins view call_center_managers" ON public.call_center_managers;
    CREATE POLICY "Super admins view call_center_managers" ON public.call_center_managers
      FOR SELECT
      TO authenticated
      USING (public.is_super_admin());

    -- Only super admins can manage call center managers
    DROP POLICY IF EXISTS "Super admins manage call_center_managers" ON public.call_center_managers;
    CREATE POLICY "Super admins manage call_center_managers" ON public.call_center_managers
      FOR ALL
      TO authenticated
      USING (public.is_super_admin())
      WITH CHECK (public.is_super_admin());

  END IF;
END $$;

-- ============================================================================
-- OPERATORS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'operators') THEN

    -- Enable RLS if not already enabled
    ALTER TABLE public.operators ENABLE ROW LEVEL SECURITY;

    -- Drop overly permissive policies
    DROP POLICY IF EXISTS "Allow all access to operators" ON public.operators;
    DROP POLICY IF EXISTS "Anyone can manage operators" ON public.operators;

    -- Only super admins can view operators
    DROP POLICY IF EXISTS "Super admins view operators" ON public.operators;
    CREATE POLICY "Super admins view operators" ON public.operators
      FOR SELECT
      TO authenticated
      USING (public.is_super_admin());

    -- Only super admins can manage operators
    DROP POLICY IF EXISTS "Super admins manage operators" ON public.operators;
    CREATE POLICY "Super admins manage operators" ON public.operators
      FOR ALL
      TO authenticated
      USING (public.is_super_admin())
      WITH CHECK (public.is_super_admin());

  END IF;
END $$;

-- ============================================================================
-- MISSING_VEHICLE_REPORTS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'missing_vehicle_reports') THEN

    -- Enable RLS if not already enabled
    ALTER TABLE public.missing_vehicle_reports ENABLE ROW LEVEL SECURITY;

    -- Drop overly permissive policies
    DROP POLICY IF EXISTS "Allow all access to missing_vehicle_reports" ON public.missing_vehicle_reports;
    DROP POLICY IF EXISTS "Anyone can manage missing_vehicle_reports" ON public.missing_vehicle_reports;
    DROP POLICY IF EXISTS "Public can insert missing_vehicle_reports" ON public.missing_vehicle_reports;

    -- Public can view missing vehicle reports (for public search)
    DROP POLICY IF EXISTS "Public can view missing_vehicle_reports" ON public.missing_vehicle_reports;
    CREATE POLICY "Public can view missing_vehicle_reports" ON public.missing_vehicle_reports
      FOR SELECT
      USING (true);

    -- Public can insert missing vehicle reports (for reporting lost vehicles)
    DROP POLICY IF EXISTS "Public can insert missing_vehicle_reports" ON public.missing_vehicle_reports;
    CREATE POLICY "Public can insert missing_vehicle_reports" ON public.missing_vehicle_reports
      FOR INSERT
      WITH CHECK (true);

    -- Only super admins can update reports
    DROP POLICY IF EXISTS "Super admins update missing_vehicle_reports" ON public.missing_vehicle_reports;
    CREATE POLICY "Super admins update missing_vehicle_reports" ON public.missing_vehicle_reports
      FOR UPDATE
      TO authenticated
      USING (public.is_super_admin());

    -- Only super admins can delete reports
    DROP POLICY IF EXISTS "Super admins delete missing_vehicle_reports" ON public.missing_vehicle_reports;
    CREATE POLICY "Super admins delete missing_vehicle_reports" ON public.missing_vehicle_reports
      FOR DELETE
      TO authenticated
      USING (public.is_super_admin());

  END IF;
END $$;

-- ============================================================================
-- EMAIL_LOGS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_logs') THEN

    -- Enable RLS if not already enabled
    ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

    -- Drop overly permissive policies
    DROP POLICY IF EXISTS "Allow all access to email_logs" ON public.email_logs;
    DROP POLICY IF EXISTS "Public can insert email_logs" ON public.email_logs;

    -- System can insert email logs
    DROP POLICY IF EXISTS "System inserts email_logs" ON public.email_logs;
    CREATE POLICY "System inserts email_logs" ON public.email_logs
      FOR INSERT
      WITH CHECK (true);

    -- Only super admins can view email logs
    DROP POLICY IF EXISTS "Super admins view email_logs" ON public.email_logs;
    CREATE POLICY "Super admins view email_logs" ON public.email_logs
      FOR SELECT
      TO authenticated
      USING (public.is_super_admin());

    -- Only super admins can delete email logs
    DROP POLICY IF EXISTS "Super admins delete email_logs" ON public.email_logs;
    CREATE POLICY "Super admins delete email_logs" ON public.email_logs
      FOR DELETE
      TO authenticated
      USING (public.is_super_admin());

  END IF;
END $$;

-- ============================================================================
-- ALERT_TRACKING TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alert_tracking') THEN

    -- Enable RLS if not already enabled
    ALTER TABLE public.alert_tracking ENABLE ROW LEVEL SECURITY;

    -- Drop overly permissive policies
    DROP POLICY IF EXISTS "Allow all access to alert_tracking" ON public.alert_tracking;
    DROP POLICY IF EXISTS "Anyone can manage alert_tracking" ON public.alert_tracking;

    -- System can insert alert tracking records
    DROP POLICY IF EXISTS "System inserts alert_tracking" ON public.alert_tracking;
    CREATE POLICY "System inserts alert_tracking" ON public.alert_tracking
      FOR INSERT
      WITH CHECK (true);

    -- Only super admins can view alert tracking
    DROP POLICY IF EXISTS "Super admins view alert_tracking" ON public.alert_tracking;
    CREATE POLICY "Super admins view alert_tracking" ON public.alert_tracking
      FOR SELECT
      TO authenticated
      USING (public.is_super_admin());

    -- Only super admins can update alert tracking
    DROP POLICY IF EXISTS "Super admins update alert_tracking" ON public.alert_tracking;
    CREATE POLICY "Super admins update alert_tracking" ON public.alert_tracking
      FOR UPDATE
      TO authenticated
      USING (public.is_super_admin());

    -- Only super admins can delete alert tracking
    DROP POLICY IF EXISTS "Super admins delete alert_tracking" ON public.alert_tracking;
    CREATE POLICY "Super admins delete alert_tracking" ON public.alert_tracking
      FOR DELETE
      TO authenticated
      USING (public.is_super_admin());

  END IF;
END $$;

-- ============================================================================
-- WHEEL_STATION_PUSH_SUBSCRIPTIONS TABLE (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wheel_station_push_subscriptions') THEN

    -- Enable RLS if not already enabled
    ALTER TABLE public.wheel_station_push_subscriptions ENABLE ROW LEVEL SECURITY;

    -- Drop overly permissive policies
    DROP POLICY IF EXISTS "Allow all access to wheel_station_push_subscriptions" ON public.wheel_station_push_subscriptions;
    DROP POLICY IF EXISTS "Anyone can manage subscriptions" ON public.wheel_station_push_subscriptions;

    -- System can insert push subscriptions
    DROP POLICY IF EXISTS "System inserts push_subscriptions" ON public.wheel_station_push_subscriptions;
    CREATE POLICY "System inserts push_subscriptions" ON public.wheel_station_push_subscriptions
      FOR INSERT
      WITH CHECK (true);

    -- System can update push subscriptions (for token refresh)
    DROP POLICY IF EXISTS "System updates push_subscriptions" ON public.wheel_station_push_subscriptions;
    CREATE POLICY "System updates push_subscriptions" ON public.wheel_station_push_subscriptions
      FOR UPDATE
      WITH CHECK (true);

    -- Only super admins can view push subscriptions
    DROP POLICY IF EXISTS "Super admins view push_subscriptions" ON public.wheel_station_push_subscriptions;
    CREATE POLICY "Super admins view push_subscriptions" ON public.wheel_station_push_subscriptions
      FOR SELECT
      TO authenticated
      USING (public.is_super_admin());

    -- System can delete expired subscriptions
    DROP POLICY IF EXISTS "System deletes push_subscriptions" ON public.wheel_station_push_subscriptions;
    CREATE POLICY "System deletes push_subscriptions" ON public.wheel_station_push_subscriptions
      FOR DELETE
      USING (true);

  END IF;
END $$;

-- ============================================================================
-- Grant necessary permissions (conditionally)
-- ============================================================================

DO $$
BEGIN
  -- Vehicle models
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_models') THEN
    GRANT SELECT ON public.vehicle_models TO anon, authenticated;
    GRANT INSERT, UPDATE ON public.vehicle_models TO authenticated;
    GRANT DELETE ON public.vehicle_models TO authenticated;
  END IF;

  -- Districts
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'districts') THEN
    GRANT SELECT ON public.districts TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON public.districts TO authenticated;
  END IF;

  -- Wheel stations
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wheel_stations') THEN
    GRANT SELECT ON public.wheel_stations TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON public.wheel_stations TO authenticated;
  END IF;

  -- Call centers
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_centers') THEN
    GRANT SELECT ON public.call_centers TO anon, authenticated;
    GRANT INSERT, UPDATE, DELETE ON public.call_centers TO authenticated;
  END IF;

  -- Call center managers
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_center_managers') THEN
    GRANT SELECT ON public.call_center_managers TO authenticated;
    GRANT INSERT, UPDATE, DELETE ON public.call_center_managers TO authenticated;
  END IF;

  -- Operators
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'operators') THEN
    GRANT SELECT ON public.operators TO authenticated;
    GRANT INSERT, UPDATE, DELETE ON public.operators TO authenticated;
  END IF;

  -- Missing vehicle reports
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'missing_vehicle_reports') THEN
    GRANT SELECT ON public.missing_vehicle_reports TO anon, authenticated;
    GRANT INSERT ON public.missing_vehicle_reports TO anon, authenticated;
    GRANT UPDATE, DELETE ON public.missing_vehicle_reports TO authenticated;
  END IF;

  -- Email logs
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_logs') THEN
    GRANT INSERT ON public.email_logs TO anon, authenticated;
    GRANT SELECT, DELETE ON public.email_logs TO authenticated;
  END IF;

  -- Alert tracking
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alert_tracking') THEN
    GRANT INSERT ON public.alert_tracking TO anon, authenticated;
    GRANT SELECT, UPDATE, DELETE ON public.alert_tracking TO authenticated;
  END IF;

  -- Wheel station push subscriptions
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wheel_station_push_subscriptions') THEN
    GRANT SELECT ON public.wheel_station_push_subscriptions TO authenticated;
    GRANT INSERT, UPDATE, DELETE ON public.wheel_station_push_subscriptions TO anon, authenticated;
  END IF;
END $$;

-- ============================================================================
-- Add comments for documentation (conditionally)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'vehicle_models') THEN
    COMMENT ON TABLE public.vehicle_models IS 'Vehicle make/model database with PCD info. Public read, authenticated users can add/edit.';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'districts') THEN
    COMMENT ON TABLE public.districts IS 'Geographic districts for wheel stations. Public read, only super admins can manage.';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wheel_stations') THEN
    COMMENT ON TABLE public.wheel_stations IS 'Wheel stations directory. Public read, only super admins can manage.';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_centers') THEN
    COMMENT ON TABLE public.call_centers IS 'Call centers for wheel station network. Public read, only super admins can manage.';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'call_center_managers') THEN
    COMMENT ON TABLE public.call_center_managers IS 'Call center manager assignments. Only super admins can view/manage.';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'operators') THEN
    COMMENT ON TABLE public.operators IS 'Wheel station operators. Only super admins can view/manage.';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'missing_vehicle_reports') THEN
    COMMENT ON TABLE public.missing_vehicle_reports IS 'Missing vehicle reports. Public can view/report, super admins manage.';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_logs') THEN
    COMMENT ON TABLE public.email_logs IS 'Email delivery logs. System inserts, only super admins can view/delete.';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'alert_tracking') THEN
    COMMENT ON TABLE public.alert_tracking IS 'Alert tracking for monitoring. System inserts, only super admins can view/manage.';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'wheel_station_push_subscriptions') THEN
    COMMENT ON TABLE public.wheel_station_push_subscriptions IS 'Push notification subscriptions for wheel stations. System manages, super admins can view.';
  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Summary of changes:
-- 1. vehicle_models: Restricted insert/update to authenticated, delete to super admins
-- 2. districts: Restricted all operations to super admins only
-- 3. wheel_stations: Public read, super admins manage
-- 4. call_centers: Public read, super admins manage
-- 5. call_center_managers: Super admins only
-- 6. operators: Super admins only
-- 7. missing_vehicle_reports: Public read/insert, super admins manage
-- 8. email_logs: System insert, super admins view/delete
-- 9. alert_tracking: System insert, super admins view/manage
-- 10. wheel_station_push_subscriptions: System manages, super admins view
