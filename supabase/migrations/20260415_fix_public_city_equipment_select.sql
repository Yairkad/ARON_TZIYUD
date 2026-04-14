-- ============================================================================
-- Fix: restore public SELECT access to city_equipment for active cities
-- Created: 2026-04-15
-- Description:
--   Migration 20260118_fix_multi_city_manager_rls replaced the original
--   "view_city_equipment" policy (which allowed anyone to SELECT equipment
--   for active cities) with a managers-only policy.
--   This caused public/unauthenticated users to receive an empty equipment
--   list on station pages.
--   This migration adds back a public SELECT policy alongside the managers
--   policy.
-- ============================================================================

-- Add public read policy: anyone can view equipment of active cities
CREATE POLICY "public_view_city_equipment"
  ON public.city_equipment
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cities
      WHERE cities.id = city_equipment.city_id
        AND cities.is_active = true
    )
  );
