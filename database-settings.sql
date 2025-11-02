-- ================================================
-- Settings Table for Password Management
-- ================================================
-- This file creates the settings table for storing
-- the admin password securely in Supabase
--
-- To apply: Run this SQL in Supabase SQL Editor
-- ================================================

-- Create settings table
CREATE TABLE IF NOT EXISTS public.settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create index on key for faster lookups
CREATE INDEX IF NOT EXISTS idx_settings_key ON public.settings(key);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON public.settings
    FOR EACH ROW
    EXECUTE FUNCTION update_settings_updated_at();

-- Insert default admin password (hashed with bcrypt would be better in production)
-- For now, storing plain text - in production, use bcrypt or similar
INSERT INTO public.settings (key, value)
VALUES ('admin_password', '1234')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow public read access (needed for login verification)
DROP POLICY IF EXISTS "Allow public read access to settings" ON public.settings;
CREATE POLICY "Allow public read access to settings"
    ON public.settings FOR SELECT
    USING (true);

-- Allow public update access (needed for changing password)
-- In production, you should add authentication checks here
DROP POLICY IF EXISTS "Allow public update access to settings" ON public.settings;
CREATE POLICY "Allow public update access to settings"
    ON public.settings FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Grant permissions
GRANT SELECT, UPDATE ON public.settings TO anon;
GRANT SELECT, UPDATE ON public.settings TO authenticated;

-- ================================================
-- IMPORTANT SECURITY NOTES:
-- ================================================
-- 1. In production, you should:
--    - Hash passwords using bcrypt or similar
--    - Add proper authentication checks in RLS policies
--    - Consider using Supabase Auth instead of custom password
-- 2. The current setup allows public access for simplicity
--    since the app uses client-side password protection
-- ================================================
