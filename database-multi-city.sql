-- ================================================
-- Multi-City System Database Structure
-- ================================================
-- This file creates the multi-city infrastructure
-- for the equipment management system
--
-- To apply: Run this SQL in Supabase SQL Editor
-- ================================================

-- ================================================
-- STEP 1: Create Cities Table
-- ================================================

CREATE TABLE IF NOT EXISTS public.cities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    manager1_name TEXT NOT NULL,
    manager1_phone TEXT NOT NULL CHECK (manager1_phone ~ '^[0-9]{10}$'),
    manager2_name TEXT,
    manager2_phone TEXT CHECK (manager2_phone IS NULL OR manager2_phone ~ '^[0-9]{10}$'),
    location_url TEXT,
    password TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_cities_name ON public.cities(name);
CREATE INDEX IF NOT EXISTS idx_cities_is_active ON public.cities(is_active);

-- Create updated_at trigger function for cities
CREATE OR REPLACE FUNCTION update_cities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_cities_updated_at ON public.cities;
CREATE TRIGGER update_cities_updated_at
    BEFORE UPDATE ON public.cities
    FOR EACH ROW
    EXECUTE FUNCTION update_cities_updated_at();

-- ================================================
-- STEP 2: Add city_id to Equipment Table
-- ================================================

-- Add city_id column to equipment table
ALTER TABLE public.equipment
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE;

-- Create index on city_id for faster queries
CREATE INDEX IF NOT EXISTS idx_equipment_city_id ON public.equipment(city_id);

-- ================================================
-- STEP 3: Add city_id to Borrow History Table
-- ================================================

-- Add city_id column to borrow_history table
ALTER TABLE public.borrow_history
ADD COLUMN IF NOT EXISTS city_id UUID REFERENCES public.cities(id) ON DELETE CASCADE;

-- Create index on city_id for faster queries
CREATE INDEX IF NOT EXISTS idx_borrow_history_city_id ON public.borrow_history(city_id);

-- ================================================
-- STEP 4: Update Settings Table for Super Admin
-- ================================================

-- Update the admin password key to super_admin_password
UPDATE public.settings
SET key = 'super_admin_password'
WHERE key = 'admin_password';

-- Insert super admin password if not exists
INSERT INTO public.settings (key, value)
VALUES ('super_admin_password', '1234')
ON CONFLICT (key) DO NOTHING;

-- ================================================
-- STEP 5: Row Level Security for Cities
-- ================================================

-- Enable Row Level Security on cities
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;

-- Allow public read access to ALL cities (including inactive for super-admin)
DROP POLICY IF EXISTS "Allow public read access to active cities" ON public.cities;
DROP POLICY IF EXISTS "Allow public read access to cities" ON public.cities;
CREATE POLICY "Allow public read access to cities"
    ON public.cities FOR SELECT
    USING (true);

-- Allow public update access (needed for password verification)
-- In production, you should add authentication checks here
DROP POLICY IF EXISTS "Allow public update access to cities" ON public.cities;
CREATE POLICY "Allow public update access to cities"
    ON public.cities FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Allow public delete access (needed for super-admin to delete cities)
-- In production, you should add authentication checks here
DROP POLICY IF EXISTS "Allow public delete access to cities" ON public.cities;
CREATE POLICY "Allow public delete access to cities"
    ON public.cities FOR DELETE
    USING (true);

-- Allow public insert access (needed for super-admin to add cities)
DROP POLICY IF EXISTS "Allow public insert access to cities" ON public.cities;
CREATE POLICY "Allow public insert access to cities"
    ON public.cities FOR INSERT
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cities TO authenticated;

-- ================================================
-- STEP 6: Insert Sample Cities (for testing)
-- ================================================

-- Insert sample cities
INSERT INTO public.cities (name, manager1_name, manager1_phone, manager2_name, manager2_phone, location_url, password) VALUES
    ('ירושלים', 'יוסי כהן', '0501234567', 'דוד לוי', '0507654321', 'https://maps.google.com/?q=31.7683,35.2137', '1111'),
    ('תל אביב', 'דני שלום', '0502345678', 'משה גולן', '0508765432', 'https://maps.google.com/?q=32.0853,34.7818', '2222'),
    ('חיפה', 'אבי ישראל', '0503456789', 'יעקב כהן', '0509876543', 'https://maps.google.com/?q=32.7940,34.9896', '3333')
ON CONFLICT (name) DO NOTHING;

-- ================================================
-- IMPORTANT NOTES:
-- ================================================
-- 1. After running this SQL, you need to:
--    - Manually assign city_id to existing equipment records
--    - Manually assign city_id to existing borrow_history records
--    - OR delete existing data if this is a fresh start
--
-- 2. In production, you should:
--    - Hash passwords using bcrypt or similar
--    - Add proper authentication for RLS policies
--    - Consider using Supabase Auth
--
-- 3. Data integrity:
--    - Foreign keys use ON DELETE CASCADE
--    - This means deleting a city will delete all related equipment and history
--    - For soft delete, set is_active = false instead
-- ================================================
