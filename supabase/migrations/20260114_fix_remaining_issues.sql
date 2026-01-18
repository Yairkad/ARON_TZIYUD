-- ============================================================================
-- Fix Remaining Security Issues
-- Created: 2026-01-14
-- Description: Fix security definer functions and other remaining issues
-- ============================================================================

-- ============================================================================
-- FIX SECURITY DEFINER FUNCTIONS - Add search_path
-- ============================================================================

-- Function: update_vehicle_models_updated_at
-- Issue: Missing search_path in SECURITY DEFINER function
CREATE OR REPLACE FUNCTION update_vehicle_models_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function: handle_new_user
-- Issue: Missing search_path in SECURITY DEFINER function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, city_id, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'city_manager'),
    (NEW.raw_user_meta_data->>'city_id')::UUID,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$;

-- Update all existing helper functions to include search_path
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'super_admin'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_city_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT city_id FROM public.users WHERE id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_user_permissions()
RETURNS user_permission
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT permissions FROM public.users WHERE id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_full_access()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND (role = 'super_admin' OR permissions = 'full_access')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.can_approve_requests()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND (role = 'super_admin' OR permissions IN ('approve_requests', 'full_access'))
  );
END;
$$;

-- ============================================================================
-- ERROR_REPORTS TABLE
-- ============================================================================

-- This table appears in linter warnings but doesn't exist in migrations
-- If it exists, we'll secure it. If not, this will be skipped.

DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'error_reports') THEN

    -- Enable RLS if not already enabled
    ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

    -- Drop overly permissive policies
    DROP POLICY IF EXISTS "Anyone can report errors" ON public.error_reports;
    DROP POLICY IF EXISTS "Anyone can view reports" ON public.error_reports;

    -- Public can insert error reports
    CREATE POLICY "Public can insert error_reports" ON public.error_reports
      FOR INSERT
      WITH CHECK (true);

    -- Only super admins can view error reports
    CREATE POLICY "Super admins view error_reports" ON public.error_reports
      FOR SELECT
      TO authenticated
      USING (public.is_super_admin());

    -- Only super admins can delete error reports
    CREATE POLICY "Super admins delete error_reports" ON public.error_reports
      FOR DELETE
      TO authenticated
      USING (public.is_super_admin());

    -- Grant permissions
    GRANT INSERT ON public.error_reports TO anon, authenticated;
    GRANT SELECT, DELETE ON public.error_reports TO authenticated;

    -- Add comment
    COMMENT ON TABLE public.error_reports IS 'Error reports from users. Public can report, only super admins can view/delete.';

  END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Summary of changes:
-- 1. Added search_path to all SECURITY DEFINER functions (prevents search_path injection attacks)
-- 2. Secured error_reports table (if it exists)
--
-- Security improvements:
-- - All SECURITY DEFINER functions now have explicit search_path
-- - This prevents malicious users from creating tables/functions in their schema
--   that could be executed with elevated privileges
