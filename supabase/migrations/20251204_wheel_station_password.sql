-- Add manager_password column to wheel_stations table
-- This password is shared among all station managers for authentication

ALTER TABLE wheel_stations
ADD COLUMN IF NOT EXISTS manager_password TEXT;

-- Add a comment explaining the column
COMMENT ON COLUMN wheel_stations.manager_password IS 'Shared password for station managers to authenticate. Set by super admin.';
