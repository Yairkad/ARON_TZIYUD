-- Migration: Global Equipment Pool System
-- Description: Create global equipment pool with city linking, migrate existing equipment
-- Date: 2025-11-19

BEGIN;

-- =========================================
-- Step 1: Create global_equipment_pool table
-- =========================================
CREATE TABLE IF NOT EXISTS global_equipment_pool (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,  -- Unique equipment name across the system
  image_url TEXT,
  category_id UUID REFERENCES equipment_categories(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending_approval', 'archived'))
);

-- Index for faster lookups
CREATE INDEX idx_global_equipment_status ON global_equipment_pool(status);
CREATE INDEX idx_global_equipment_name ON global_equipment_pool(name);
CREATE INDEX idx_global_equipment_category ON global_equipment_pool(category_id);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_global_equipment_pool_updated_at
  BEFORE UPDATE ON global_equipment_pool
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- Step 2: Create city_equipment linking table
-- =========================================
CREATE TABLE IF NOT EXISTS city_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  global_equipment_id UUID NOT NULL REFERENCES global_equipment_pool(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 0,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(city_id, global_equipment_id)  -- Each city can only link to an equipment once
);

-- Indexes for performance
CREATE INDEX idx_city_equipment_city ON city_equipment(city_id);
CREATE INDEX idx_city_equipment_global ON city_equipment(global_equipment_id);
CREATE INDEX idx_city_equipment_display_order ON city_equipment(city_id, display_order);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_city_equipment_updated_at
  BEFORE UPDATE ON city_equipment
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- Step 3: Add global_equipment_id to existing tables
-- =========================================

-- Add to borrow_history (keep equipment_id for backwards compatibility)
ALTER TABLE borrow_history
ADD COLUMN IF NOT EXISTS global_equipment_id UUID REFERENCES global_equipment_pool(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_borrow_history_global_equipment ON borrow_history(global_equipment_id);

-- Add to request_items (keep equipment_id for backwards compatibility)
ALTER TABLE request_items
ADD COLUMN IF NOT EXISTS global_equipment_id UUID REFERENCES global_equipment_pool(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_request_items_global_equipment ON request_items(global_equipment_id);

-- =========================================
-- Step 4: RLS Policies for global_equipment_pool
-- =========================================

-- Enable RLS
ALTER TABLE global_equipment_pool ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view active equipment, only super admin can view pending/archived
CREATE POLICY "view_global_equipment"
  ON global_equipment_pool
  FOR SELECT
  USING (
    status = 'active'
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Policy: City managers can insert pending equipment
CREATE POLICY "city_managers_insert_pending"
  ON global_equipment_pool
  FOR INSERT
  WITH CHECK (
    status = 'pending_approval'
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'city_manager'
      AND users.permissions IN ('full_access', 'approve_requests')
    )
  );

-- Policy: Only super admin can update
CREATE POLICY "super_admin_update_global_equipment"
  ON global_equipment_pool
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- Policy: Only super admin can delete
CREATE POLICY "super_admin_delete_global_equipment"
  ON global_equipment_pool
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
    )
  );

-- =========================================
-- Step 5: RLS Policies for city_equipment
-- =========================================

-- Enable RLS
ALTER TABLE city_equipment ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view equipment from active cities
CREATE POLICY "view_city_equipment"
  ON city_equipment
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM cities
      WHERE cities.id = city_equipment.city_id
      AND cities.is_active = true
    )
  );

-- Policy: City managers can manage their city's equipment
CREATE POLICY "city_managers_manage_equipment"
  ON city_equipment
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (
        users.role = 'super_admin'
        OR (
          users.city_id = city_equipment.city_id
          AND users.permissions = 'full_access'
        )
      )
    )
  );

-- =========================================
-- Step 6: Migrate existing equipment to global pool
-- =========================================

-- Insert unique equipment into global pool (merge duplicates by name)
INSERT INTO global_equipment_pool (name, image_url, category_id, status, created_at, updated_at)
SELECT DISTINCT ON (LOWER(TRIM(name)))
  TRIM(name) as name,
  FIRST_VALUE(image_url) OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY updated_at DESC NULLS LAST) as image_url,
  FIRST_VALUE(category_id) OVER (PARTITION BY LOWER(TRIM(name)) ORDER BY updated_at DESC NULLS LAST) as category_id,
  'active' as status,
  MIN(created_at) OVER (PARTITION BY LOWER(TRIM(name))) as created_at,
  MAX(updated_at) OVER (PARTITION BY LOWER(TRIM(name))) as updated_at
FROM equipment
WHERE name IS NOT NULL AND TRIM(name) != ''
ORDER BY LOWER(TRIM(name)), updated_at DESC;

-- Create city_equipment links from existing equipment
INSERT INTO city_equipment (city_id, global_equipment_id, quantity, display_order, created_at, updated_at)
SELECT DISTINCT
  e.city_id,
  gep.id as global_equipment_id,
  e.quantity,
  e.display_order,
  e.created_at,
  e.updated_at
FROM equipment e
INNER JOIN global_equipment_pool gep ON LOWER(TRIM(e.name)) = LOWER(TRIM(gep.name))
WHERE e.name IS NOT NULL AND TRIM(e.name) != ''
ON CONFLICT (city_id, global_equipment_id) DO NOTHING;

-- Update borrow_history to reference global_equipment_id
UPDATE borrow_history bh
SET global_equipment_id = gep.id
FROM equipment e
INNER JOIN global_equipment_pool gep ON LOWER(TRIM(e.name)) = LOWER(TRIM(gep.name))
WHERE bh.equipment_id = e.id
  AND bh.global_equipment_id IS NULL;

-- Update request_items to reference global_equipment_id
UPDATE request_items ri
SET global_equipment_id = gep.id
FROM equipment e
INNER JOIN global_equipment_pool gep ON LOWER(TRIM(e.name)) = LOWER(TRIM(gep.name))
WHERE ri.equipment_id = e.id
  AND ri.global_equipment_id IS NULL;

-- =========================================
-- Step 7: Add comment to old equipment table
-- =========================================

COMMENT ON TABLE equipment IS 'DEPRECATED (2025-11-19): This table is kept for historical reference and backwards compatibility. New system uses global_equipment_pool + city_equipment. DO NOT add new data here.';

COMMIT;
