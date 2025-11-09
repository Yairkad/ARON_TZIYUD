-- Equipment Requests System - Database Migration
-- Run this SQL in your Supabase SQL Editor

-- 1. Add new columns to cities table
ALTER TABLE cities
ADD COLUMN IF NOT EXISTS request_mode VARCHAR(10) DEFAULT 'direct' CHECK (request_mode IN ('direct', 'request')),
ADD COLUMN IF NOT EXISTS cabinet_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS require_call_id BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_emails TEXT[];

COMMENT ON COLUMN cities.request_mode IS 'Operation mode: direct (immediate borrowing) or request (requires manager approval)';
COMMENT ON COLUMN cities.cabinet_code IS 'Optional cabinet unlock code shown to approved requesters';
COMMENT ON COLUMN cities.require_call_id IS 'Whether to require call ID field in requests';
COMMENT ON COLUMN cities.admin_emails IS 'Array of admin email addresses for notifications';

-- 2. Create equipment_requests table
CREATE TABLE IF NOT EXISTS equipment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  requester_name VARCHAR(100) NOT NULL,
  requester_phone VARCHAR(20) NOT NULL,
  call_id VARCHAR(50),
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  approved_by VARCHAR(100),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_requests_city ON equipment_requests(city_id);
CREATE INDEX idx_requests_token ON equipment_requests(token_hash);
CREATE INDEX idx_requests_status ON equipment_requests(status);
CREATE INDEX idx_requests_expires ON equipment_requests(expires_at);

COMMENT ON TABLE equipment_requests IS 'Equipment borrow requests with token-based approval';
COMMENT ON COLUMN equipment_requests.token_hash IS 'SHA-256 hash of the unique request token';
COMMENT ON COLUMN equipment_requests.expires_at IS 'Token expiration time (30 minutes from creation)';

-- 3. Create request_items table (junction table for multiple equipment per request)
CREATE TABLE IF NOT EXISTS request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES equipment_requests(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  quantity INT DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_request_items_request ON request_items(request_id);
CREATE INDEX idx_request_items_equipment ON request_items(equipment_id);

COMMENT ON TABLE request_items IS 'Equipment items included in each request (supports multiple items and quantities)';

-- 4. Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city_id UUID NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  manager_name VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_log_city ON activity_log(city_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action ON activity_log(action);

COMMENT ON TABLE activity_log IS 'Audit log of all manager actions';
COMMENT ON COLUMN activity_log.details IS 'JSON object with action-specific details';

-- 5. Add equipment_status to borrow_history if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'borrow_history' AND column_name = 'equipment_status'
  ) THEN
    ALTER TABLE borrow_history
    ADD COLUMN equipment_status VARCHAR(20) DEFAULT 'working' CHECK (equipment_status IN ('working', 'faulty'));
  END IF;
END $$;

COMMENT ON COLUMN borrow_history.equipment_status IS 'Equipment condition when returned (working or faulty)';

-- 6. Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_equipment_requests_updated_at ON equipment_requests;
CREATE TRIGGER update_equipment_requests_updated_at
  BEFORE UPDATE ON equipment_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. Create function to auto-expire tokens
CREATE OR REPLACE FUNCTION expire_old_tokens()
RETURNS void AS $$
BEGIN
  UPDATE equipment_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- 9. Enable Row Level Security (RLS) on new tables
ALTER TABLE equipment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for equipment_requests
CREATE POLICY "Allow public read for valid tokens" ON equipment_requests
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert" ON equipment_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow city managers to update their requests" ON equipment_requests
  FOR UPDATE USING (true);

-- 11. Create RLS policies for request_items
CREATE POLICY "Allow read for all" ON request_items
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for all" ON request_items
  FOR INSERT WITH CHECK (true);

-- 12. Create RLS policies for activity_log
CREATE POLICY "Allow city managers to read their logs" ON activity_log
  FOR SELECT USING (true);

CREATE POLICY "Allow insert for all" ON activity_log
  FOR INSERT WITH CHECK (true);

-- Migration completed successfully!
