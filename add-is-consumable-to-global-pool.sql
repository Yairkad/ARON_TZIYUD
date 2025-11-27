-- Add is_consumable column to global_equipment_pool table
-- Run this in Supabase SQL Editor

-- Add the column with default value false
ALTER TABLE global_equipment_pool
ADD COLUMN IF NOT EXISTS is_consumable BOOLEAN DEFAULT false;

-- Update comment
COMMENT ON COLUMN global_equipment_pool.is_consumable IS 'Whether this equipment is consumable (does not require return)';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'global_equipment_pool'
AND column_name = 'is_consumable';
