-- Add equipment_status and is_consumable columns to city_equipment table
-- Run this in Supabase SQL Editor

-- Add equipment_status column (working or faulty, default working)
ALTER TABLE city_equipment
ADD COLUMN IF NOT EXISTS equipment_status TEXT DEFAULT 'working'
CHECK (equipment_status IN ('working', 'faulty'));

-- Add is_consumable column (whether the equipment is consumable, default false)
ALTER TABLE city_equipment
ADD COLUMN IF NOT EXISTS is_consumable BOOLEAN DEFAULT false;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'city_equipment'
AND column_name IN ('equipment_status', 'is_consumable');
