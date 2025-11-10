-- Add location description and image URL fields to cities table
-- These will be displayed in the token page to help users find the cabinet

-- Add location description field (text instructions)
ALTER TABLE cities
ADD COLUMN IF NOT EXISTS location_description TEXT;

-- Add location image URL field (can be uploaded to Supabase storage or external URL)
ALTER TABLE cities
ADD COLUMN IF NOT EXISTS location_image_url TEXT;

-- Verify the changes
SELECT id, name,
       location_url,
       token_location_url,
       location_description,
       location_image_url
FROM cities
ORDER BY name;
