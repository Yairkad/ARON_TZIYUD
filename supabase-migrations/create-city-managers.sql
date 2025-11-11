-- Create city_managers table for individual manager authentication
CREATE TABLE IF NOT EXISTS city_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager1', 'manager2')),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Email verification
  email_verified BOOLEAN DEFAULT FALSE,
  verification_token TEXT,
  verification_token_expires_at TIMESTAMPTZ,

  -- Password reset
  reset_token TEXT,
  reset_token_expires_at TIMESTAMPTZ,

  -- Permissions (JSON for future expansion)
  permissions JSONB DEFAULT '{"can_edit_equipment": true, "can_approve_requests": true, "can_view_history": true}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_city_managers_city_id ON city_managers(city_id);
CREATE INDEX IF NOT EXISTS idx_city_managers_email ON city_managers(email);
CREATE INDEX IF NOT EXISTS idx_city_managers_verification_token ON city_managers(verification_token);
CREATE INDEX IF NOT EXISTS idx_city_managers_reset_token ON city_managers(reset_token);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_city_managers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_city_managers_updated_at
  BEFORE UPDATE ON city_managers
  FOR EACH ROW
  EXECUTE FUNCTION update_city_managers_updated_at();

-- Enable Row Level Security
ALTER TABLE city_managers ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Super admins can do everything
CREATE POLICY "Super admins can manage all city managers"
  ON city_managers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id::text = current_setting('request.jwt.claims', true)::json->>'sub'
      AND users.role = 'super_admin'
    )
  );

-- City managers can view and update their own record
CREATE POLICY "City managers can view their own record"
  ON city_managers
  FOR SELECT
  USING (
    id::text = current_setting('request.jwt.claims', true)::json->>'sub'
  );

CREATE POLICY "City managers can update their own record"
  ON city_managers
  FOR UPDATE
  USING (
    id::text = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- Migration script to create initial manager accounts from existing cities data
-- This will create temporary accounts that need email verification
INSERT INTO city_managers (city_id, email, password_hash, role, name, phone, email_verified)
SELECT
  id as city_id,
  LOWER(REPLACE(manager1_name, ' ', '.')) || '@temp.local' as email,
  '$2a$10$defaultHashForInitialSetup' as password_hash, -- This will need to be reset
  'manager1' as role,
  manager1_name as name,
  manager1_phone as phone,
  FALSE as email_verified
FROM cities
WHERE manager1_name IS NOT NULL AND manager1_name != ''
ON CONFLICT (email) DO NOTHING;

-- Add manager2 where exists
INSERT INTO city_managers (city_id, email, password_hash, role, name, phone, email_verified)
SELECT
  id as city_id,
  LOWER(REPLACE(manager2_name, ' ', '.')) || '@temp.local' as email,
  '$2a$10$defaultHashForInitialSetup' as password_hash,
  'manager2' as role,
  manager2_name as name,
  manager2_phone as phone,
  FALSE as email_verified
FROM cities
WHERE manager2_name IS NOT NULL AND manager2_name != ''
ON CONFLICT (email) DO NOTHING;

COMMENT ON TABLE city_managers IS 'City managers with individual authentication and email verification';
COMMENT ON COLUMN city_managers.email IS 'Manager email address - must be unique and verified';
COMMENT ON COLUMN city_managers.role IS 'Manager role: manager1 or manager2';
COMMENT ON COLUMN city_managers.permissions IS 'JSON object with granular permissions for future expansion';
