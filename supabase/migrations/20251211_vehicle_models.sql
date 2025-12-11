-- Create vehicle_models table for PCD database
CREATE TABLE IF NOT EXISTS vehicle_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT NOT NULL,                    -- Manufacturer in English (e.g., "toyota")
  make_he TEXT NOT NULL,                 -- Manufacturer in Hebrew (e.g., "טויוטה")
  model TEXT NOT NULL,                   -- Model name (e.g., "corolla")
  variants TEXT,                         -- Alternative names/spellings
  year_from INTEGER,                     -- First production year
  year_to INTEGER,                       -- Last production year (NULL = current)
  bolt_count INTEGER NOT NULL,           -- Number of bolts (4, 5, 6)
  bolt_spacing NUMERIC(5,1) NOT NULL,    -- PCD - bolt pattern diameter (e.g., 114.3)
  center_bore NUMERIC(5,1),              -- Center bore diameter (optional)
  rim_size TEXT,                         -- Rim sizes (e.g., "15, 16, 17")
  tire_size_front TEXT,                  -- Front tire size (e.g., "195/60R15")
  source TEXT DEFAULT 'import',          -- 'import' or 'manual'
  added_by TEXT,                         -- Phone of manager who added (for manual entries)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_vehicle_models_make ON vehicle_models(make);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_model ON vehicle_models(model);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_year_range ON vehicle_models(year_from, year_to);
CREATE INDEX IF NOT EXISTS idx_vehicle_models_pcd ON vehicle_models(bolt_spacing);

-- Enable RLS
ALTER TABLE vehicle_models ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can search vehicle models)
CREATE POLICY "Public read access to vehicle models"
  ON vehicle_models
  FOR SELECT
  USING (true);

-- Only authenticated managers can insert/update
CREATE POLICY "Managers can insert vehicle models"
  ON vehicle_models
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Managers can update vehicle models"
  ON vehicle_models
  FOR UPDATE
  USING (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vehicle_models_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicle_models_updated_at
  BEFORE UPDATE ON vehicle_models
  FOR EACH ROW
  EXECUTE FUNCTION update_vehicle_models_updated_at();
