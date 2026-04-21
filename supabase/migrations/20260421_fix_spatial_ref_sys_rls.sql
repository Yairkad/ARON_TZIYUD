-- ============================================================================
-- Fix: Restrict access to spatial_ref_sys (PostGIS system table)
-- Created: 2026-04-21
-- Description:
--   spatial_ref_sys is owned by the PostGIS extension — we cannot ALTER TABLE
--   or enable RLS on it. Instead, revoke direct SELECT from anon/authenticated
--   roles so it is not exposed via the PostgREST API.
--   The app only accesses PostGIS functionality server-side via service_role,
--   so this has no effect on functionality.
-- ============================================================================

REVOKE SELECT ON public.spatial_ref_sys FROM anon, authenticated;
