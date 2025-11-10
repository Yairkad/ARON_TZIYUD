-- Add token_location_url field to cities table
-- This allows cities to have a separate location URL for tokens
-- while keeping location_url for the main page display

-- Add the new field
ALTER TABLE cities
ADD COLUMN IF NOT EXISTS token_location_url TEXT;

-- Verify the changes
SELECT id, name, location_url, token_location_url
FROM cities
ORDER BY name;
