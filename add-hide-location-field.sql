-- Add hide_location field to cities table
-- This allows cities to hide the location/cabinet info from the main page
-- while still including it in the token link

ALTER TABLE cities
ADD COLUMN IF NOT EXISTS hide_location BOOLEAN DEFAULT false;

-- Update existing cities to show location by default
UPDATE cities
SET hide_location = false
WHERE hide_location IS NULL;
