-- Simple fix for user_name trigger issue
-- This script removes all triggers and recreates them correctly

-- Drop all existing triggers from all tables
DROP TRIGGER IF EXISTS update_borrow_history_updated_at ON borrow_history;
DROP TRIGGER IF EXISTS set_updated_at ON borrow_history;
DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
DROP TRIGGER IF EXISTS update_cities_updated_at ON cities;
DROP TRIGGER IF EXISTS update_equipment_requests_updated_at ON equipment_requests;

-- Drop the old function (this will cascade to any remaining triggers)
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Recreate the trigger function correctly (without user_name reference)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger on borrow_history
CREATE TRIGGER update_borrow_history_updated_at
    BEFORE UPDATE ON borrow_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Also apply to other tables that need it
CREATE TRIGGER update_equipment_updated_at
    BEFORE UPDATE ON equipment
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cities_updated_at
    BEFORE UPDATE ON cities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_requests_updated_at
    BEFORE UPDATE ON equipment_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
