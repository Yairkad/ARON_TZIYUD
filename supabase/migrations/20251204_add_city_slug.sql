-- Add slug column to cities table for friendly URLs
-- Slug is the Hebrew city name with spaces replaced by hyphens

-- Add slug column
ALTER TABLE cities ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index for fast lookup
CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);

-- Update existing cities with slugs based on their names (Hebrew)
-- Replace spaces with hyphens and make lowercase for consistency
UPDATE cities
SET slug = REPLACE(TRIM(name), ' ', '-')
WHERE slug IS NULL;

-- Make slug NOT NULL after populating
-- ALTER TABLE cities ALTER COLUMN slug SET NOT NULL;

-- Add comment
COMMENT ON COLUMN cities.slug IS 'URL-friendly identifier for the city (Hebrew name with hyphens)';
