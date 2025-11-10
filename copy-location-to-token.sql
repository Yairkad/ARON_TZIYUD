-- Copy location_url to token_location_url for all cities that have location_url
-- This ensures the location appears in both main page AND token page

UPDATE cities
SET token_location_url = location_url
WHERE location_url IS NOT NULL
  AND token_location_url IS NULL;

-- Verify the changes
SELECT id, name,
       SUBSTRING(location_url, 1, 50) as location_url,
       SUBSTRING(token_location_url, 1, 50) as token_location_url
FROM cities
ORDER BY name;
