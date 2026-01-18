-- Migration: Add separate contact fields to cities table
-- This allows having different contacts displayed to volunteers vs. managers who manage the cabinet
--
-- Logic: If contact1_name is NULL, fall back to manager1_name (backwards compatibility)

-- Add contact fields to cities table
ALTER TABLE cities
ADD COLUMN IF NOT EXISTS contact1_name TEXT,
ADD COLUMN IF NOT EXISTS contact1_phone TEXT,
ADD COLUMN IF NOT EXISTS contact2_name TEXT,
ADD COLUMN IF NOT EXISTS contact2_phone TEXT;

-- Add comments for documentation
COMMENT ON COLUMN cities.contact1_name IS 'Primary contact name shown to volunteers. Falls back to manager1_name if NULL.';
COMMENT ON COLUMN cities.contact1_phone IS 'Primary contact phone shown to volunteers. Falls back to manager1_phone if NULL.';
COMMENT ON COLUMN cities.contact2_name IS 'Secondary contact name shown to volunteers. Falls back to manager2_name if NULL.';
COMMENT ON COLUMN cities.contact2_phone IS 'Secondary contact phone shown to volunteers. Falls back to manager2_phone if NULL.';
