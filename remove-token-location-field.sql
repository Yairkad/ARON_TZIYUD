-- Remove token_location_url field - using simpler approach
-- We'll just use location_url for everything

-- First, copy any token_location_url back to location_url if needed
UPDATE cities
SET location_url = token_location_url
WHERE location_url IS NULL AND token_location_url IS NOT NULL;

-- Drop the token_location_url column
ALTER TABLE cities
DROP COLUMN IF EXISTS token_location_url;

-- Verify
SELECT id, name, location_url
FROM cities
ORDER BY name;
