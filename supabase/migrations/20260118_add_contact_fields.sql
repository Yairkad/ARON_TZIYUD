-- Migration: Add contact visibility settings to cities table
-- This allows hiding manager contact info and optionally showing alternative contact
--
-- Logic:
-- - If show_manager1_contact = true (default), show manager1 info
-- - If show_manager1_contact = false AND override fields are set, show override info
-- - If show_manager1_contact = false AND override fields are empty, hide completely

-- Add contact visibility and override fields to cities table
ALTER TABLE cities
ADD COLUMN IF NOT EXISTS show_manager1_contact BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS override_manager1_name TEXT,
ADD COLUMN IF NOT EXISTS override_manager1_phone TEXT,
ADD COLUMN IF NOT EXISTS show_manager2_contact BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS override_manager2_name TEXT,
ADD COLUMN IF NOT EXISTS override_manager2_phone TEXT;

-- Add comments for documentation
COMMENT ON COLUMN cities.show_manager1_contact IS 'Whether to show manager1 contact info to volunteers. Default true.';
COMMENT ON COLUMN cities.override_manager1_name IS 'Alternative contact name to show instead of manager1. Only used if show_manager1_contact is false.';
COMMENT ON COLUMN cities.override_manager1_phone IS 'Alternative contact phone to show instead of manager1. Only used if show_manager1_contact is false.';
COMMENT ON COLUMN cities.show_manager2_contact IS 'Whether to show manager2 contact info to volunteers. Default true.';
COMMENT ON COLUMN cities.override_manager2_name IS 'Alternative contact name to show instead of manager2. Only used if show_manager2_contact is false.';
COMMENT ON COLUMN cities.override_manager2_phone IS 'Alternative contact phone to show instead of manager2. Only used if show_manager2_contact is false.';

-- Drop old contact fields if they exist (from previous migration attempt)
ALTER TABLE cities DROP COLUMN IF EXISTS contact1_name;
ALTER TABLE cities DROP COLUMN IF EXISTS contact1_phone;
ALTER TABLE cities DROP COLUMN IF EXISTS contact2_name;
ALTER TABLE cities DROP COLUMN IF EXISTS contact2_phone;
