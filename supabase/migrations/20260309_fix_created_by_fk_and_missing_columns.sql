-- ============================================================================
-- Fix: global_equipment_pool.created_by FK and missing columns
-- Created: 2026-03-09
-- Description:
--   1. Change created_by FK from auth.users to public.users so PostgREST can
--      resolve the "creator:users!created_by(...)" join in the GET query.
--      Without this, the pending equipment query fails silently and the admin
--      sees an empty list despite receiving a notification.
--   2. Add missing is_consumable column to global_equipment_pool.
--   3. Add missing equipment_status and is_consumable columns to city_equipment.
-- ============================================================================


-- ============================================================================
-- 1. Fix created_by FK: auth.users → public.users
-- ============================================================================

ALTER TABLE public.global_equipment_pool
  DROP CONSTRAINT IF EXISTS global_equipment_pool_created_by_fkey;

ALTER TABLE public.global_equipment_pool
  ADD CONSTRAINT global_equipment_pool_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


-- ============================================================================
-- 2. Add missing is_consumable to global_equipment_pool
-- ============================================================================

ALTER TABLE public.global_equipment_pool
  ADD COLUMN IF NOT EXISTS is_consumable BOOLEAN NOT NULL DEFAULT false;


-- ============================================================================
-- 3. Add missing columns to city_equipment
-- ============================================================================

ALTER TABLE public.city_equipment
  ADD COLUMN IF NOT EXISTS equipment_status TEXT NOT NULL DEFAULT 'working'
    CHECK (equipment_status IN ('working', 'faulty'));

ALTER TABLE public.city_equipment
  ADD COLUMN IF NOT EXISTS is_consumable BOOLEAN NOT NULL DEFAULT false;
