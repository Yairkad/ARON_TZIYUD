-- FIXED DATABASE SCHEMA
-- This version allows public access with client-side auth protection

-- Create equipment table
CREATE TABLE IF NOT EXISTS equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create borrow_history table
CREATE TABLE IF NOT EXISTS borrow_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
  equipment_name TEXT NOT NULL,
  borrow_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  return_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed', 'returned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_equipment_name ON equipment(name);
CREATE INDEX IF NOT EXISTS idx_borrow_history_phone ON borrow_history(phone);
CREATE INDEX IF NOT EXISTS idx_borrow_history_status ON borrow_history(status);
CREATE INDEX IF NOT EXISTS idx_borrow_history_equipment_id ON borrow_history(equipment_id);

-- Enable Row Level Security
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_history ENABLE ROW LEVEL SECURITY;

-- FIXED POLICIES - Allow all public access
-- (Security is handled by client-side password protection)

-- Equipment table policies
DROP POLICY IF EXISTS "Allow public read access" ON equipment;
DROP POLICY IF EXISTS "Allow authenticated insert" ON equipment;
DROP POLICY IF EXISTS "Allow authenticated update" ON equipment;
DROP POLICY IF EXISTS "Allow authenticated delete" ON equipment;

CREATE POLICY "Allow all access to equipment" ON equipment
  FOR ALL USING (true) WITH CHECK (true);

-- Borrow history policies
DROP POLICY IF EXISTS "Allow public read own records" ON borrow_history;
DROP POLICY IF EXISTS "Allow public insert" ON borrow_history;
DROP POLICY IF EXISTS "Allow public update returns" ON borrow_history;
DROP POLICY IF EXISTS "Allow authenticated full access" ON borrow_history;

CREATE POLICY "Allow all access to borrow_history" ON borrow_history
  FOR ALL USING (true) WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_borrow_history_updated_at ON borrow_history;
CREATE TRIGGER update_borrow_history_updated_at BEFORE UPDATE ON borrow_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample equipment (if not exists)
INSERT INTO equipment (name, quantity) VALUES
('פנס ראש', 10),
('אוהל זוגי', 5),
('שק שינה', 8),
('מזרן הרמה', 6),
('כירה קטנה', 4),
('ערכת עזרה ראשונה', 12),
('חבל טיפוס', 3),
('מצפן', 15)
ON CONFLICT DO NOTHING;
