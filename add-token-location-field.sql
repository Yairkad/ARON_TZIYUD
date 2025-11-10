-- Add token_location_url field to cities table
-- This allows cities to have a separate location URL for tokens
-- while keeping location_url for the main page display

-- Add the new field
ALTER TABLE cities
ADD COLUMN IF NOT EXISTS token_location_url TEXT;

-- For cities that currently have hide_location = true,
-- copy their location_url to token_location_url and clear location_url
UPDATE cities
SET token_location_url = location_url,
    location_url = NULL
WHERE hide_location = true AND location_url IS NOT NULL;

-- We can now drop the hide_location field as it's no longer needed
ALTER TABLE cities
DROP COLUMN IF EXISTS hide_location;

-- Verify the changes
SELECT id, name, location_url, token_location_url
FROM cities
ORDER BY name;
