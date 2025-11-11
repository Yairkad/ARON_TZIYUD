-- ============================================================================
-- Migration Part 2: Update RLS Policies for existing tables
-- Created: 2025-11-11
-- Description: Add RLS policies to cities, equipment, borrow_history, etc.
-- ============================================================================

-- ============================================================================
-- CITIES TABLE RLS
-- ============================================================================

ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Drop old policies if exist
DROP POLICY IF EXISTS "Public view active cities" ON public.cities;
DROP POLICY IF EXISTS "City managers view own city" ON public.cities;
DROP POLICY IF EXISTS "Super admins view all cities" ON public.cities;
DROP POLICY IF EXISTS "Super admins manage cities" ON public.cities;

-- Public can view active cities (for homepage)
CREATE POLICY "Public view active cities" ON public.cities
  FOR SELECT USING (is_active = true);

-- City managers can view their own city
CREATE POLICY "City managers view own city" ON public.cities
  FOR SELECT USING (
    id = public.get_user_city_id()
  );

-- Super admins can view all cities
CREATE POLICY "Super admins view all cities" ON public.cities
  FOR SELECT USING (public.is_super_admin());

-- Super admins can manage all cities
CREATE POLICY "Super admins manage cities" ON public.cities
  FOR ALL USING (public.is_super_admin());

-- City managers can update their own city
CREATE POLICY "City managers update own city" ON public.cities
  FOR UPDATE USING (id = public.get_user_city_id());

-- ============================================================================
-- EQUIPMENT TABLE RLS
-- ============================================================================

ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view equipment" ON public.equipment;
DROP POLICY IF EXISTS "City managers manage own equipment" ON public.equipment;
DROP POLICY IF EXISTS "City managers view own equipment" ON public.equipment;
DROP POLICY IF EXISTS "City managers with full access manage equipment" ON public.equipment;
DROP POLICY IF EXISTS "Super admins manage all equipment" ON public.equipment;

-- Public can view equipment from active cities
CREATE POLICY "Public view equipment" ON public.equipment
  FOR SELECT USING (
    city_id IN (SELECT id FROM public.cities WHERE is_active = true)
  );

-- City managers with view_only can only SELECT
CREATE POLICY "City managers view own equipment" ON public.equipment
  FOR SELECT USING (city_id = public.get_user_city_id());

-- City managers with full_access can manage equipment
CREATE POLICY "City managers with full access manage equipment" ON public.equipment
  FOR ALL USING (
    city_id = public.get_user_city_id() AND public.has_full_access()
  );

-- Super admins manage all equipment
CREATE POLICY "Super admins manage all equipment" ON public.equipment
  FOR ALL USING (public.is_super_admin());

-- ============================================================================
-- BORROW_HISTORY TABLE RLS
-- ============================================================================

ALTER TABLE public.borrow_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view history" ON public.borrow_history;
DROP POLICY IF EXISTS "City managers manage own history" ON public.borrow_history;
DROP POLICY IF EXISTS "Super admins manage all history" ON public.borrow_history;

-- Public can view borrow history
CREATE POLICY "Public view history" ON public.borrow_history
  FOR SELECT USING (true);

-- City managers manage their city's history
CREATE POLICY "City managers manage own history" ON public.borrow_history
  FOR ALL USING (city_id = public.get_user_city_id());

-- Super admins manage all history
CREATE POLICY "Super admins manage all history" ON public.borrow_history
  FOR ALL USING (public.is_super_admin());

-- ============================================================================
-- EQUIPMENT_REQUESTS TABLE RLS
-- ============================================================================

ALTER TABLE public.equipment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone creates requests" ON public.equipment_requests;
DROP POLICY IF EXISTS "Anyone views requests" ON public.equipment_requests;
DROP POLICY IF EXISTS "City managers manage own requests" ON public.equipment_requests;
DROP POLICY IF EXISTS "Super admins manage all requests" ON public.equipment_requests;

-- Anyone can create requests (public feature)
CREATE POLICY "Anyone creates requests" ON public.equipment_requests
  FOR INSERT WITH CHECK (true);

-- Anyone can view requests (token verified in app logic)
CREATE POLICY "Anyone views requests" ON public.equipment_requests
  FOR SELECT USING (true);

-- City managers can view their city's requests
CREATE POLICY "City managers view own requests" ON public.equipment_requests
  FOR SELECT USING (city_id = public.get_user_city_id());

-- City managers with approve or full access can approve/reject requests
CREATE POLICY "City managers approve requests" ON public.equipment_requests
  FOR UPDATE USING (
    city_id = public.get_user_city_id() AND public.can_approve_requests()
  );

-- Only full access can delete requests
CREATE POLICY "City managers with full access delete requests" ON public.equipment_requests
  FOR DELETE USING (
    city_id = public.get_user_city_id() AND public.has_full_access()
  );

-- Super admins manage all requests
CREATE POLICY "Super admins manage all requests" ON public.equipment_requests
  FOR ALL USING (public.is_super_admin());

-- ============================================================================
-- ADMIN_NOTIFICATIONS TABLE RLS (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_notifications') THEN
    ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Super admins manage notifications" ON public.admin_notifications;

    CREATE POLICY "Super admins manage notifications" ON public.admin_notifications
      FOR ALL USING (public.is_super_admin());
  END IF;
END $$;

-- ============================================================================
-- ACTIVITY_LOGS TABLE RLS (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'activity_logs') THEN
    ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "City managers view own logs" ON public.activity_logs;
    DROP POLICY IF EXISTS "Super admins view all logs" ON public.activity_logs;
    DROP POLICY IF EXISTS "System inserts logs" ON public.activity_logs;

    CREATE POLICY "City managers view own logs" ON public.activity_logs
      FOR SELECT USING (city_id = public.get_user_city_id());

    CREATE POLICY "Super admins view all logs" ON public.activity_logs
      FOR SELECT USING (public.is_super_admin());

    CREATE POLICY "System inserts logs" ON public.activity_logs
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- ============================================================================
-- SETTINGS TABLE RLS (if exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'settings') THEN
    ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Super admins manage settings" ON public.settings;

    CREATE POLICY "Super admins manage settings" ON public.settings
      FOR ALL USING (public.is_super_admin());
  END IF;
END $$;

-- Grant additional permissions
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT SELECT ON public.equipment TO anon, authenticated;
GRANT SELECT ON public.borrow_history TO anon, authenticated;
GRANT ALL ON public.equipment_requests TO anon, authenticated;

-- ============================================================================
-- Migration Complete - Part 2/2
-- ============================================================================
