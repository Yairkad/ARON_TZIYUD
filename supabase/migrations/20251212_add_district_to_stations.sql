-- Add district field to wheel_stations table
-- This allows grouping stations by geographic regions (e.g., Jerusalem, North, Center, South)

-- Add district column
ALTER TABLE wheel_stations
ADD COLUMN IF NOT EXISTS district TEXT;

-- Define allowed districts as a check constraint
ALTER TABLE wheel_stations
ADD CONSTRAINT valid_district CHECK (
  district IS NULL OR district IN (
    'jerusalem',    -- ירושלים
    'north',        -- צפון
    'center',       -- מרכז
    'south',        -- דרום
    'haifa',        -- חיפה
    'tel_aviv'      -- תל אביב
  )
);

-- Add index for filtering by district
CREATE INDEX IF NOT EXISTS idx_wheel_stations_district
  ON wheel_stations(district)
  WHERE district IS NOT NULL;

-- Update existing stations with their districts (examples)
-- You can update these manually in Supabase or via admin panel
UPDATE wheel_stations SET district = 'jerusalem' WHERE name IN ('בית שמש', 'ירושלים', 'קרית ארבע');

-- Add comment
COMMENT ON COLUMN wheel_stations.district IS 'Geographic district/region for the station: jerusalem, north, center, south, haifa, tel_aviv';
