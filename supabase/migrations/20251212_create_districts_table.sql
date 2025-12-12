-- Create districts table for dynamic district management
-- Allows admins to create custom districts with names and colors

CREATE TABLE IF NOT EXISTS districts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL, -- Hex color code (e.g., #ef4444)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraint for valid hex color
ALTER TABLE districts
ADD CONSTRAINT valid_hex_color CHECK (color ~ '^#[0-9A-Fa-f]{6}$');

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_districts_code ON districts(code);

-- Insert default districts
INSERT INTO districts (code, name, color) VALUES
  ('jerusalem', 'ירושלים', '#ef4444'),
  ('north', 'צפון', '#22c55e'),
  ('center', 'מרכז', '#3b82f6'),
  ('south', 'דרום', '#f59e0b'),
  ('haifa', 'חיפה', '#8b5cf6'),
  ('tel_aviv', 'תל אביב', '#ec4899')
ON CONFLICT (code) DO NOTHING;

-- Enable RLS
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read districts
CREATE POLICY "Anyone can view districts"
  ON districts
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Policy: Only authenticated users can manage (will be restricted to super_admin in app logic)
CREATE POLICY "Authenticated users can manage districts"
  ON districts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON districts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON districts TO authenticated;

-- Add comment
COMMENT ON TABLE districts IS 'Geographic districts/regions for organizing wheel stations. Admins can add/edit/delete districts.';

-- Update wheel_stations constraint to reference districts table dynamically
-- First, drop the old constraint
ALTER TABLE wheel_stations DROP CONSTRAINT IF EXISTS valid_district;

-- Add foreign key to districts table (nullable - stations can have no district)
ALTER TABLE wheel_stations
ADD CONSTRAINT fk_wheel_stations_district
FOREIGN KEY (district) REFERENCES districts(code)
ON DELETE SET NULL;
