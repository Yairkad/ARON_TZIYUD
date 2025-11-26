-- Add location_description column to cities table
ALTER TABLE cities ADD COLUMN IF NOT EXISTS location_description TEXT;

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'cities' AND column_name = 'location_description';
