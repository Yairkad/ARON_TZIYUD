-- Fix RLS policies for global_equipment_pool
-- The issue: policies check 'users' table but auth might be in auth.users

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "view_global_equipment" ON global_equipment_pool;
DROP POLICY IF EXISTS "city_managers_insert_pending" ON global_equipment_pool;
DROP POLICY IF EXISTS "super_admin_update_global_equipment" ON global_equipment_pool;
DROP POLICY IF EXISTS "super_admin_delete_global_equipment" ON global_equipment_pool;

-- Recreate with fixed logic
-- Policy 1: Everyone can view active equipment
CREATE POLICY "view_global_equipment"
  ON global_equipment_pool
  FOR SELECT
  USING (
    status = 'active'
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Policy 2: City managers can insert pending equipment
CREATE POLICY "city_managers_insert_pending"
  ON global_equipment_pool
  FOR INSERT
  WITH CHECK (
    status = 'pending_approval'
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'city_manager'
      AND users.permissions IN ('full_access', 'approve_requests')
    )
  );

-- Policy 3: Only super admin can update
CREATE POLICY "super_admin_update_global_equipment"
  ON global_equipment_pool
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Policy 4: Only super admin can delete
CREATE POLICY "super_admin_delete_global_equipment"
  ON global_equipment_pool
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

COMMIT;
