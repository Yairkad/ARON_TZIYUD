-- ============================================================================
-- Fix: Enable RLS on spatial_ref_sys (PostGIS system table)
-- Created: 2026-04-21
-- Description:
--   spatial_ref_sys is a PostGIS reference table exposed in the public schema
--   without RLS, triggering a Supabase security linter ERROR.
--   It contains only public coordinate system data (EPSG codes) — no sensitive
--   info. We enable RLS with a permissive SELECT so behaviour is unchanged.
-- ============================================================================

ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_spatial_ref_sys"
  ON public.spatial_ref_sys
  FOR SELECT
  USING (true);
