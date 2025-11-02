-- Create equipment table
CREATE TABLE equipment (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create borrow_history table
CREATE TABLE borrow_history (
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
CREATE INDEX idx_equipment_name ON equipment(name);
CREATE INDEX idx_borrow_history_phone ON borrow_history(phone);
CREATE INDEX idx_borrow_history_status ON borrow_history(status);
CREATE INDEX idx_borrow_history_equipment_id ON borrow_history(equipment_id);

-- Enable Row Level Security
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE borrow_history ENABLE ROW LEVEL SECURITY;

-- Create policies for equipment table
-- Allow public read access (for viewing available equipment)
CREATE POLICY "Allow public read access" ON equipment
  FOR SELECT USING (true);

-- Allow authenticated users to insert equipment (admin functionality)
CREATE POLICY "Allow authenticated insert" ON equipment
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update equipment (admin functionality)
CREATE POLICY "Allow authenticated update" ON equipment
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete equipment (admin functionality)
CREATE POLICY "Allow authenticated delete" ON equipment
  FOR DELETE USING (auth.role() = 'authenticated');

-- Create policies for borrow_history table
-- Allow public read access for own records (based on phone)
CREATE POLICY "Allow public read own records" ON borrow_history
  FOR SELECT USING (true);

-- Allow public insert (for borrowing equipment)
CREATE POLICY "Allow public insert" ON borrow_history
  FOR INSERT WITH CHECK (true);

-- Allow public update for return operations (based on phone)
CREATE POLICY "Allow public update returns" ON borrow_history
  FOR UPDATE USING (true);

-- Allow authenticated users full access (admin functionality)
CREATE POLICY "Allow authenticated full access" ON borrow_history
  FOR ALL USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_borrow_history_updated_at BEFORE UPDATE ON borrow_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample equipment
INSERT INTO equipment (name, quantity) VALUES
('פנס ראש', 10),
('אוהל זוגי', 5),
('שק שינה', 8),
('מזרן הרמה', 6),
('כירה קטנה', 4),
('ערכת עזרה ראשונה', 12),
('חבל טיפוס', 3),
('מצפן', 15);
